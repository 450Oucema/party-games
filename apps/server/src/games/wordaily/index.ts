import { Server } from 'socket.io'
import { loadDictionary, isValidWord, normalize } from './dictionary.js'
import {
  createRoom,
  getRoom,
  addPlayer,
  removePlayerBySocket,
  toPublicRoom,
  getRoomBySocket,
  updateRoomSettings,
} from './rooms.js'
import { startGame, endGame } from './game.js'
import { makeGuess, MAX_ATTEMPTS, WORD_LENGTH } from './wordle.js'

let dictionaryLoaded = false
function ensureDictionaryLoaded() {
  if (dictionaryLoaded) return
  loadDictionary()
  dictionaryLoaded = true
}

// Rate limiting per socket for word:submit
function rateLimitWord(wordSubmitTimestamps: Map<string, number[]>, socketId: string): boolean {
  const now = Date.now()
  const ts = wordSubmitTimestamps.get(socketId) ?? []
  const recent = ts.filter(t => now - t < 1000)
  if (recent.length >= 5) return false
  recent.push(now)
  wordSubmitTimestamps.set(socketId, recent)
  return true
}

function isRoomHost(room: { hostSocketId?: string; hostToken: string }, socketId: string, hostToken?: string): boolean {
  return room.hostSocketId === socketId || (!!hostToken && hostToken === room.hostToken)
}

export function registerWordailySockets(io: Server): void {
  ensureDictionaryLoaded()
  const wordSubmitTimestamps = new Map<string, number[]>()

  io.on('connection', (socket) => {
  // Client requests current room state (reconnect / navigation)
  socket.on('room:sync', ({ roomCode, playerId, hostToken }: { roomCode: string; playerId?: string; hostToken?: string }) => {
    const room = getRoom(roomCode)
    if (!room) {
      socket.emit('error', { message: 'Salle introuvable.' })
      return
    }
    // Re-attach socket to room channel
    socket.join(room.code)
    // Update socket id for the player if reconnecting
    if (playerId) {
      const player = room.players.get(playerId)
      if (player) {
        player.socketId = socket.id
        player.connected = true
        socket.emit('player:state', { id: player.id, guesses: player.guesses })
      } else {
        socket.emit('error', { message: 'Session joueur introuvable.' })
      }
    }
    if (hostToken) {
      if (hostToken === room.hostToken) {
        room.hostSocketId = socket.id
      } else {
        socket.emit('error', { message: 'Session hôte introuvable.' })
      }
    }
    socket.emit('room:state', toPublicRoom(room))
    if (room.phase === 'playing' && room.endsAt) {
      socket.emit('game:started', { endsAt: room.endsAt })
    }
    if (room.phase === 'results' && room.lastResults) {
      socket.emit('game:ended', {
        results: room.lastResults,
        targetWord: room.targetWord,
      })
    }
  })

  socket.on('room:create', () => {
    const room = createRoom()
    room.hostSocketId = socket.id
    socket.join(room.code)
    socket.emit('room:created', { roomCode: room.code, hostToken: room.hostToken })
    socket.emit('room:state', toPublicRoom(room))
  })

  socket.on('room:join', ({ roomCode, playerName, avatar }: { roomCode: string; playerName: string; avatar?: number }) => {
    const room = getRoom(roomCode)
    if (!room) {
      socket.emit('error', { message: 'Salle introuvable.' })
      return
    }
    if (room.phase !== 'lobby') {
      socket.emit('error', { message: 'La partie a déjà commencé.' })
      return
    }
    if (room.players.size >= 12) {
      socket.emit('error', { message: 'Salle pleine (max 12 joueurs).' })
      return
    }
    if (!playerName?.trim()) {
      socket.emit('error', { message: 'Pseudo invalide.' })
      return
    }

    const player = addPlayer(room, socket.id, playerName, avatar)
    socket.join(room.code)
    socket.emit('player:state', { id: player.id, guesses: [] })

    io.to(room.code).emit('room:state', toPublicRoom(room))
  })

  socket.on('room:settings', ({ roomCode, durationSec, scoreMode, difficulty, hostToken }: { roomCode: string; durationSec?: number; scoreMode?: 'race'; difficulty?: 'easy' | 'normal' | 'hard' | 'extreme' | 'mixed'; hostToken?: string }) => {
    const room = getRoom(roomCode)
    if (!room || !isRoomHost(room, socket.id, hostToken) || room.phase !== 'lobby') return
    room.hostSocketId = socket.id
    updateRoomSettings(room, { durationSec, scoreMode, difficulty })

    io.to(room.code).emit('room:state', toPublicRoom(room));
  })

  socket.on('room:start', ({ roomCode, hostToken }: { roomCode: string; hostToken?: string }) => {
    const room = getRoom(roomCode)
    if (!room) return
    if (!isRoomHost(room, socket.id, hostToken)) {
      socket.emit('error', { message: 'Seul le host peut lancer la partie.' })
      return
    }

    room.hostSocketId = socket.id
    if (room.phase !== 'lobby') return
    if (room.players.size < 1) {
      socket.emit('error', { message: 'Au moins 1 joueur requis.' })
      return
    }
    startGame(io, room)
  })

  socket.on('word:submit', ({ roomCode, playerId, word }: { roomCode: string; playerId: string; word: string }) => {
    if (!rateLimitWord(wordSubmitTimestamps, socket.id)) {
      socket.emit('word:rejected-local', { word, reason: 'trop_vite' })
      return
    }

    const room = getRoom(roomCode)
    if (!room || room.phase !== 'playing') {
      socket.emit('word:rejected-local', { word, reason: 'partie_inactive' })
      return
    }

    if (Date.now() > (room.endsAt ?? 0)) {
      socket.emit('word:rejected-local', { word, reason: 'temps_ecoule' })
      return
    }

    const player = room.players.get(playerId)
    if (!player || player.socketId !== socket.id) {
      socket.emit('word:rejected-local', { word, reason: 'joueur_invalide' })
      return
    }

    const norm = normalize(word)

    if (player.finished) {
      socket.emit('word:rejected-local', { word: norm, reason: 'deja_termine' })
      return
    }

    if (player.guesses.length >= MAX_ATTEMPTS) {
      socket.emit('word:rejected-local', { word: norm, reason: 'limite_atteinte' })
      return
    }

    if (norm.length !== WORD_LENGTH) {
      socket.emit('word:rejected-local', { word: norm, reason: 'longueur_invalide' })
      return
    }

    if (!/^[A-Z]+$/.test(norm)) {
      socket.emit('word:rejected-local', { word, reason: 'caracteres_invalides' })
      return
    }

    if (player.guesses.some(guess => guess.word === norm)) {
      socket.emit('word:rejected-local', { word, reason: 'deja_envoye' })
      return
    }

    if (!isValidWord(norm)) {
      socket.emit('word:rejected-local', { word, reason: 'hors_dictionnaire' })
      return
    }

    const submittedAt = Date.now()
    const guess = makeGuess(norm, room.targetWord!, submittedAt, player.guesses.length + 1)
    player.guesses.push(guess)
    if (norm === room.targetWord) {
      player.solvedAt = submittedAt
      player.finished = true
    } else if (player.guesses.length >= MAX_ATTEMPTS) {
      player.finished = true
    }

    socket.emit('word:accepted-local', { guess, solved: !!player.solvedAt, finished: player.finished })
    socket.to(room.code).emit('word:found-public', {
      playerId: player.id,
      avatar: player.avatar,
      attemptCount: player.guesses.length,
      solved: !!player.solvedAt,
    })

    io.to(room.code).emit('room:state', toPublicRoom(room))

    const allDone = [...room.players.values()].every(p => p.finished || !p.connected)
    if (allDone) endGame(io, room)
  })

  socket.on('player:avatar', ({ roomCode, playerId, avatar }: { roomCode: string; playerId: string; avatar: number }) => {
    const room = getRoom(roomCode)
    if (!room) {
      socket.emit('error', { message: 'Salle introuvable.' })
      return
    }
    const player = room.players.get(playerId)
    if (!player || player.socketId !== socket.id) {
      socket.emit('error', { message: 'Joueur invalide.' })
      return
    }
    if (!Number.isInteger(avatar) || avatar < 0 || avatar > 7) return
    player.avatar = avatar
    io.to(room.code).emit('room:state', toPublicRoom(room))
  })

  socket.on('room:restart', ({ roomCode, hostToken }: { roomCode?: string; hostToken?: string } = {}) => {
    const room = roomCode ? getRoom(roomCode) : getRoomBySocket(socket.id)
    if (!room || !isRoomHost(room, socket.id, hostToken)) return
    room.hostSocketId = socket.id
    room.phase = 'lobby'
    room.startedAt = undefined
    room.endsAt = undefined
    room.lastResults = undefined
    room.targetWord = undefined
    for (const p of room.players.values()) {
      p.guesses = []
      p.solvedAt = undefined
      p.finished = false
    }
    io.to(room.code).emit('room:state', toPublicRoom(room))
  })

  socket.on('disconnect', () => {
    wordSubmitTimestamps.delete(socket.id)
    const result = removePlayerBySocket(socket.id)
    if (result) {
      const { room } = result
      io.to(room.code).emit('room:state', toPublicRoom(room))

      // If game is playing and all disconnected, end it
      if (room.phase === 'playing') {
        const anyConnected = [...room.players.values()].some(p => p.connected)
        if (!anyConnected) endGame(io, room)
      }
    }
  })
  })

}
