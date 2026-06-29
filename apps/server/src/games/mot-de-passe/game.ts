import type { Server } from 'socket.io'
import type { Room, RoundState, RoundSummary } from './types.js'
import { toPublicRoom, summarizeRound } from './rooms.js'
import { pickOne, isForbiddenClue, normalize, getWords } from './words.js'
import { scoreForClue, applyRoundResult, computeResults } from './scoring.js'

const COUNTDOWN_BUFFER_MS = 3200

function nextGiverGuesserIds(room: Room): { giverId: string; guesserId: string } {
  const ids = [...room.players.keys()]
  if (ids.length < 2) throw new Error('2 joueurs requis')
  const idx = room.currentRoundIndex % ids.length
  const giverId = ids[idx]
  const guesserId = ids[(idx + 1) % ids.length]
  return { giverId, guesserId }
}

function usedSecrets(room: Room): Set<string> {
  const set = new Set<string>()
  for (const r of room.history) set.add(normalize(r.secret))
  if (room.currentRound) set.add(normalize(room.currentRound.secret))
  return set
}

export function startGame(io: Server, room: Room): void {
  room.phase = 'playing'
  room.currentRoundIndex = 0
  room.history = []
  for (const p of room.players.values()) p.score = 0

  startRound(io, room)
}

export function startRound(io: Server, room: Room): void {
  const { giverId, guesserId } = nextGiverGuesserIds(room)
  const excluded = usedSecrets(room)
  const secret = pickOne(room.theme, room.difficulty, excluded, getWords().all)
  const round: RoundState = {
    roundIndex: room.currentRoundIndex,
    giverId,
    guesserId,
    secret,
    theme: room.theme,
    clues: [],
    status: 'active',
    clueCount: 0,
    usedWords: new Set(),
    finalScore: 0,
  }
  round.endsAt = Date.now() + room.roundSec * 1000 + COUNTDOWN_BUFFER_MS
  room.currentRound = round

  io.to(room.code).emit('round:started', toPublicRoom(room))
  io.to(room.code).emit('room:state', toPublicRoom(room))

  const giver = room.players.get(giverId)
  if (giver) {
    io.to(giver.socketId).emit('round:secret', { secret })
  }
}

function endRound(io: Server, room: Room, status: RoundState['status']): void {
  const round = room.currentRound
  if (!round || round.status !== 'active') return
  round.status = status
  if (status === 'found') {
    round.finalScore = scoreForClue(round.clueCount + 1, room.maxClues)
    applyRoundResult(room.players, round)
  }
  const summary: RoundSummary = summarizeRound(round)
  room.history.push(summary)

  io.to(room.code).emit('round:ended', {
    round: summary,
    scores: [...room.players.values()].map((p) => ({ id: p.id, score: p.score })),
  })
  io.to(room.code).emit('room:state', toPublicRoom(room))

  room.currentRound = undefined

  const totalRounds = room.roundsPerPlayer * 2
  if (room.currentRoundIndex + 1 >= totalRounds) {
    endGame(io, room)
    return
  }
  room.currentRoundIndex += 1
  setTimeout(() => startRound(io, room), 1800)
}

export function submitClue(io: Server, room: Room, playerId: string, clueText: string): void {
  const round = room.currentRound
  if (!round || round.status !== 'active') return
  if (playerId !== round.giverId) return
  if (room.mode !== 'online') return

  const norm = normalize(clueText)
  if (!norm) return
  if (round.usedWords.has(norm)) {
    io.to(room.code).emit('round:clue-rejected', { reason: 'deja_utilise' })
    return
  }
  if (norm.split(' ').length > 1 && room.mode === 'online') {
    io.to(room.code).emit('round:clue-rejected', { reason: 'mot_multiple' })
    return
  }

  const check = isForbiddenClue(clueText, round.secret)
  round.clues.push({ text: clueText.trim(), forbidden: check.forbidden, reason: check.reason })
  round.clueCount += 1
  round.usedWords.add(norm)

  io.to(room.code).emit('round:clue', toPublicRoom(room))

  if (check.forbidden) {
    endRound(io, room, 'forbidden')
    return
  }
  if (round.clueCount >= room.maxClues) {
    endRound(io, room, 'timeout')
  }
}

export function submitGuess(io: Server, room: Room, playerId: string, guess: string): void {
  const round = room.currentRound
  if (!round || round.status !== 'active') return
  if (playerId !== round.guesserId) return

  const norm = normalize(guess)
  if (norm === normalize(round.secret)) {
    endRound(io, room, 'found')
  }
}

export function passRound(io: Server, room: Room, playerId: string): void {
  const round = room.currentRound
  if (!round || round.status !== 'active') return
  if (playerId !== round.guesserId && playerId !== round.giverId) return
  endRound(io, room, 'passed')
}

export function addClueIrl(io: Server, room: Room, playerId: string, clueText: string): void {
  const round = room.currentRound
  if (!round || round.status !== 'active') return
  if (playerId !== round.giverId) return
  if (room.mode !== 'irl') return

  const norm = normalize(clueText)
  if (!norm) return
  if (round.usedWords.has(norm)) {
    io.to(room.code).emit('round:clue-rejected', { reason: 'deja_utilise' })
    return
  }
  const check = isForbiddenClue(clueText, round.secret)
  round.clues.push({ text: clueText.trim(), forbidden: check.forbidden, reason: check.reason })
  round.clueCount += 1
  round.usedWords.add(norm)
  io.to(room.code).emit('round:clue', toPublicRoom(room))

  if (round.clueCount >= room.maxClues) {
    endRound(io, room, 'timeout')
  }
}

export function markFound(io: Server, room: Room, playerId: string): void {
  const round = room.currentRound
  if (!round || round.status !== 'active') return
  if (playerId !== round.giverId && playerId !== round.guesserId) return
  endRound(io, room, 'found')
}

export function endGame(io: Server, room: Room): void {
  if (room.phase !== 'playing') return
  room.phase = 'results'
  const results = computeResults(room.players, room.history)
  room.lastResults = results
  io.to(room.code).emit('game:ended', { results })
  io.to(room.code).emit('room:state', toPublicRoom(room))
}

export function resetGame(io: Server, room: Room): void {
  room.phase = 'lobby'
  room.currentRound = undefined
  room.currentRoundIndex = 0
  room.history = []
  room.lastResults = undefined
  for (const p of room.players.values()) p.score = 0
  io.to(room.code).emit('room:state', toPublicRoom(room))
}

export { COUNTDOWN_BUFFER_MS }
