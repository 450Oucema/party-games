import type { Server } from 'socket.io'
import type { Room } from './types.js'
import { toPublicRoom } from './rooms.js'
import { randomWord } from './dictionary.js'
import { rankPlayers } from './wordle.js'

// Extra time added to endsAt so the client countdown (≈3s) doesn't eat into game time.
const COUNTDOWN_BUFFER_MS = 3200

export function startGame(io: Server, room: Room): void {
  room.phase = 'playing'
  room.targetWord = randomWord(room.difficulty)
  room.startedAt = Date.now()
  room.endsAt = room.startedAt + room.durationSec * 1000 + COUNTDOWN_BUFFER_MS
  room.lastResults = undefined

  for (const player of room.players.values()) {
    player.guesses = []
    player.solvedAt = undefined
    player.finished = false
  }

  io.to(room.code).emit('game:started', {
    endsAt: room.endsAt,
  })

  io.to(room.code).emit('room:state', toPublicRoom(room))

  setTimeout(() => endGame(io, room), room.durationSec * 1000 + COUNTDOWN_BUFFER_MS + 500)
}

export function endGame(io: Server, room: Room): void {
  if (room.phase !== 'playing') return
  room.phase = 'results'

  const results = rankPlayers(room.players.values(), room.startedAt)
  room.lastResults = results

  io.to(room.code).emit('game:ended', {
    results,
    targetWord: room.targetWord,
  })
  io.to(room.code).emit('room:state', toPublicRoom(room))
}
