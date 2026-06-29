import type { Guess, GuessLetter, Player, PlayerResult } from './types.js'

export const WORD_LENGTH = 5
export const MAX_ATTEMPTS = 6

export function evaluateGuess(guess: string, target: string): GuessLetter[] {
  const guessLetters = guess.split('')
  const targetLetters = target.split('')
  const result: GuessLetter[] = guessLetters.map(value => ({ value, status: 'absent' }))
  const remaining = new Map<string, number>()

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (guessLetters[i] === targetLetters[i]) {
      result[i].status = 'correct'
    } else {
      remaining.set(targetLetters[i], (remaining.get(targetLetters[i]) ?? 0) + 1)
    }
  }

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (result[i].status === 'correct') continue
    const count = remaining.get(guessLetters[i]) ?? 0
    if (count > 0) {
      result[i].status = 'present'
      remaining.set(guessLetters[i], count - 1)
    }
  }

  return result
}

export function makeGuess(word: string, target: string, submittedAt: number, attempt: number): Guess {
  return {
    word,
    letters: evaluateGuess(word, target),
    submittedAt,
    attempt,
  }
}

export function rankPlayers(players: Iterable<Player>, startedAt = Date.now()): PlayerResult[] {
  const results = [...players].map((player): PlayerResult => ({
    playerId: player.id,
    playerName: player.name,
    avatar: player.avatar,
    color: player.color,
    solved: !!player.solvedAt,
    finished: player.finished,
    attemptCount: player.guesses.length,
    solvedInMs: player.solvedAt ? player.solvedAt - startedAt : undefined,
    guesses: player.guesses,
    totalScore: player.solvedAt ? Math.max(1, MAX_ATTEMPTS - player.guesses.length + 1) : 0,
    wordCount: player.guesses.length,
    words: [],
    bestWord: player.solvedAt ? player.guesses[player.guesses.length - 1]?.word ?? null : null,
  }))

  return results.sort((a, b) => {
    if (a.solved !== b.solved) return a.solved ? -1 : 1
    if (a.solved && b.solved) {
      if (a.attemptCount !== b.attemptCount) return a.attemptCount - b.attemptCount
      return (a.solvedInMs ?? Infinity) - (b.solvedInMs ?? Infinity)
    }
    if (a.finished !== b.finished) return a.finished ? -1 : 1
    if (a.attemptCount !== b.attemptCount) return b.attemptCount - a.attemptCount
    return a.playerName.localeCompare(b.playerName)
  })
}
