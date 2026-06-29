import { describe, expect, it } from 'vitest'
import { evaluateGuess, rankPlayers } from './wordle.js'
import type { Player } from './types.js'

describe('evaluateGuess', () => {
  it('marks exact letters as correct', () => {
    expect(evaluateGuess('CHIEN', 'CHIEN').map(l => l.status)).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ])
  })

  it('marks present letters in other positions', () => {
    expect(evaluateGuess('ROUES', 'SOUPE').map(l => l.status)).toEqual([
      'absent',
      'correct',
      'correct',
      'present',
      'present',
    ])
  })

  it('does not over-credit repeated letters', () => {
    expect(evaluateGuess('ALLEE', 'ALORS').map(l => l.status)).toEqual([
      'correct',
      'correct',
      'absent',
      'absent',
      'absent',
    ])
  })
})

describe('rankPlayers', () => {
  function player(id: string, guesses: number, solvedAt?: number): Player {
    return {
      id,
      socketId: id,
      name: id,
      guesses: Array.from({ length: guesses }, (_, index) => ({
        word: `MOT${index}S`.slice(0, 5),
        letters: [],
        submittedAt: 1000 + index,
        attempt: index + 1,
      })),
      solvedAt,
      finished: !!solvedAt || guesses >= 6,
      connected: true,
      avatar: 0,
      color: '#fff',
    }
  }

  it('ranks solved players by attempts then time before failures', () => {
    const results = rankPlayers([
      player('late', 3, 9000),
      player('fail', 6),
      player('fast', 2, 8000),
    ], 1000)

    expect(results.map(r => r.playerId)).toEqual(['fast', 'late', 'fail'])
  })
})
