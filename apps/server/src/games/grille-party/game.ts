import type { Server } from 'socket.io'
import type { Room } from './types.js'
import { generateGrid } from './grid.js'
import { toPublicRoom } from './rooms.js'
import { computeResults } from './scoring.js'
import { getTrie } from './dictionary.js'
import { findLongestWord } from './solver.js'

// Extra time added to endsAt so the client countdown (≈3s) doesn't eat into game time.
const COUNTDOWN_BUFFER_MS = 3200

export function startGame(io: Server, room: Room): void {
  room.phase = 'playing'
  room.grid = generateGrid(room.gridSize)
  room.startedAt = Date.now()
  room.endsAt = room.startedAt + room.durationSec * 1000 + COUNTDOWN_BUFFER_MS

  // Reset word sets
  for (const player of room.players.values()) {
    player.words = new Set()
  }

  io.to(room.code).emit('game:started', {
    grid: room.grid,
    endsAt: room.endsAt,
  })

  io.to(room.code).emit('room:state', toPublicRoom(room))

  // Solve the grid asynchronously so game:started isn't delayed
  const grid = room.grid
  setImmediate(() => {
    const result = findLongestWord(grid, getTrie())
    room.longestPossibleWord = result?.word
    room.longestPossiblePath = result?.path
    if (result) console.log(`[solver] Longest word: ${result.word} (${result.word.length} letters)`)
  })

  // Auto-end after full duration (including countdown buffer)
  setTimeout(() => endGame(io, room), room.durationSec * 1000 + COUNTDOWN_BUFFER_MS + 500)
}

export function endGame(io: Server, room: Room): void {
  if (room.phase !== 'playing') return
  room.phase = 'results'

  const results = computeResults(room.players, room.grid!, room.scoreMode)
  room.lastResults = results

  io.to(room.code).emit('game:ended', {
    results,
    longestPossibleWord: room.longestPossibleWord,
    longestPossiblePath: room.longestPossiblePath,
  })
  io.to(room.code).emit('room:state', toPublicRoom(room))
}
