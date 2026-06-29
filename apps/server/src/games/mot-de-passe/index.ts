import { Server } from 'socket.io'
import frenchWords from 'an-array-of-french-words'
import { loadWords, getWords } from './words.js'
import {
  createRoom,
  getRoom,
  addPlayer,
  removePlayerBySocket,
  toPublicRoom,
  getRoomBySocket,
  updateRoomSettings,
} from './rooms.js'
import {
  startGame,
  submitClue,
  submitGuess,
  passRound,
  addClueIrl,
  markFound,
  endGame,
  resetGame,
  COUNTDOWN_BUFFER_MS,
} from './game.js'
import type { Theme, Difficulty, GameMode } from './types.js'

let wordsLoaded = false
function ensureWordsLoaded() {
  if (wordsLoaded) return
  loadDictionaryAndWords()
  wordsLoaded = true
}

function loadDictionaryAndWords() {
  loadWords(frenchWords as string[])
  console.log(`[words] Loaded ${getWords().all.length} French words`)
}

function isRoomHost(room: { hostSocketId?: string; hostToken: string }, socketId: string, hostToken?: string): boolean {
  return room.hostSocketId === socketId || (!!hostToken && hostToken === room.hostToken)
}

export function registerMotDePasseSockets(io: Server): void {
  ensureWordsLoaded()

  // Track round timeouts per room
  const roundTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

  function scheduleRoundTimeout(roomCode: string) {
    const room = getRoom(roomCode)
    if (!room || !room.currentRound || !room.currentRound.endsAt) return
    const ms = room.currentRound.endsAt - Date.now()
    if (ms <= 0) return
    const t: ReturnType<typeof setTimeout> = setTimeout(() => {
      const r = getRoom(roomCode)
      if (!r || !r.currentRound || r.currentRound.status !== 'active') return
      endGame(io, r)
      io.to(roomCode).emit('round:ended', {
        round: {
          roundIndex: r.currentRound.roundIndex,
          giverId: r.currentRound.giverId,
          guesserId: r.currentRound.guesserId,
          secret: r.currentRound.secret,
          theme: r.currentRound.theme,
          clues: r.currentRound.clues,
          status: 'timeout',
          clueCount: r.currentRound.clueCount,
          finalScore: 0,
        },
        scores: [...r.players.values()].map((p) => ({ id: p.id, score: p.score })),
      })
    }, ms + 200)
    roundTimeouts.set(roomCode, t)
  }

  io.on('connection', (socket) => {
    socket.on('room:sync', ({ roomCode, playerId, hostToken }: { roomCode: string; playerId?: string; hostToken?: string }) => {
      const room = getRoom(roomCode)
      if (!room) {
        socket.emit('error', { message: 'Salle introuvable.' })
        return
      }
      socket.join(room.code)
      if (playerId) {
        const player = room.players.get(playerId)
        if (player) {
          player.socketId = socket.id
          player.connected = true
          socket.emit('player:state', { id: player.id })
          if (room.currentRound && room.currentRound.giverId === player.id && room.currentRound.status === 'active') {
            socket.emit('round:secret', { secret: room.currentRound.secret })
          }
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
      if (room.players.size >= 2) {
        socket.emit('error', { message: 'Salle pleine (2 joueurs).' })
        return
      }
      if (!playerName?.trim()) {
        socket.emit('error', { message: 'Pseudo invalide.' })
        return
      }
      try {
        const player = addPlayer(room, socket.id, playerName, avatar)
        socket.join(room.code)
        socket.emit('player:state', { id: player.id })
        io.to(room.code).emit('room:state', toPublicRoom(room))
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erreur'
        socket.emit('error', { message: msg })
      }
    })

    socket.on('room:settings', ({ roomCode, theme, difficulty, mode, maxClues, roundsPerPlayer, roundSec, hostToken }: { roomCode: string; theme?: Theme; difficulty?: Difficulty; mode?: GameMode; maxClues?: number; roundsPerPlayer?: number; roundSec?: number; hostToken?: string }) => {
      const room = getRoom(roomCode)
      if (!room || !isRoomHost(room, socket.id, hostToken) || room.phase !== 'lobby') return
      room.hostSocketId = socket.id
      updateRoomSettings(room, { theme, difficulty, mode, maxClues, roundsPerPlayer, roundSec })
      io.to(room.code).emit('room:state', toPublicRoom(room))
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
      if (room.players.size < 2) {
        socket.emit('error', { message: '2 joueurs requis.' })
        return
      }
      startGame(io, room)
      scheduleRoundTimeout(room.code)
    })

    socket.on('round:clue', ({ roomCode, playerId, clue }: { roomCode: string; playerId: string; clue: string }) => {
      const room = getRoom(roomCode)
      if (!room || room.phase !== 'playing') return
      submitClue(io, room, playerId, clue)
      io.to(room.code).emit('room:state', toPublicRoom(room))
    })

    socket.on('round:irl-clue', ({ roomCode, playerId, clue }: { roomCode: string; playerId: string; clue: string }) => {
      const room = getRoom(roomCode)
      if (!room || room.phase !== 'playing') return
      addClueIrl(io, room, playerId, clue)
      io.to(room.code).emit('room:state', toPublicRoom(room))
      if (room.currentRound && room.currentRound.clueCount >= room.maxClues) {
        const t = roundTimeouts.get(room.code)
        if (t) clearTimeout(t)
      }
    })

    socket.on('round:guess', ({ roomCode, playerId, guess }: { roomCode: string; playerId: string; guess: string }) => {
      const room = getRoom(roomCode)
      if (!room || room.phase !== 'playing') return
      submitGuess(io, room, playerId, guess)
    })

    socket.on('round:found', ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
      const room = getRoom(roomCode)
      if (!room || room.phase !== 'playing') return
      markFound(io, room, playerId)
      const t = roundTimeouts.get(room.code)
      if (t) clearTimeout(t)
    })

    socket.on('round:pass', ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
      const room = getRoom(roomCode)
      if (!room || room.phase !== 'playing') return
      passRound(io, room, playerId)
      const t = roundTimeouts.get(room.code)
      if (t) clearTimeout(t)
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
      const t = roundTimeouts.get(room.code)
      if (t) clearTimeout(t)
      resetGame(io, room)
    })

    socket.on('disconnect', () => {
      const result = removePlayerBySocket(socket.id)
      if (result) {
        const { room } = result
        io.to(room.code).emit('room:state', toPublicRoom(room))
      }
    })
  })

}

export { COUNTDOWN_BUFFER_MS }
