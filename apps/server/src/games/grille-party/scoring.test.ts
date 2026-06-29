import { describe, it, expect, beforeAll } from 'vitest'
import { computeResults, rareLetterScore, wordScore } from './scoring.js'
import { loadDictionary } from './dictionary.js'
import type { Player, GridCell } from './types.js'

beforeAll(() => loadDictionary())

const GRID: GridCell[][] = [
  [
    { letter: 'C', row: 0, col: 0 },
    { letter: 'H', row: 0, col: 1 },
    { letter: 'A', row: 0, col: 2 },
    { letter: 'T', row: 0, col: 3 },
  ],
  [
    { letter: 'I', row: 1, col: 0 },
    { letter: 'E', row: 1, col: 1 },
    { letter: 'N', row: 1, col: 2 },
    { letter: 'S', row: 1, col: 3 },
  ],
  [
    { letter: 'O', row: 2, col: 0 },
    { letter: 'L', row: 2, col: 1 },
    { letter: 'A', row: 2, col: 2 },
    { letter: 'P', row: 2, col: 3 },
  ],
  [
    { letter: 'U', row: 3, col: 0 },
    { letter: 'R', row: 3, col: 1 },
    { letter: 'E', row: 3, col: 2 },
    { letter: 'S', row: 3, col: 3 },
  ],
]

function makePlayer(id: string, words: string[]): Player {
  return {
    id,
    socketId: `s${id}`,
    name: `Player${id}`,
    words: new Set(words),
    connected: true,
    avatar: 0,
    color: '#FF4DB8',
  }
}

describe('wordScore', () => {
  it('3 letters = 3 pts', () => expect(wordScore('CAT')).toBe(3))
  it('4 letters = 4 pts', () => expect(wordScore('CHAT')).toBe(4))
  it('5 letters = 5 pts', () => expect(wordScore('CHIEN')).toBe(5))
  it('6 letters = 6 pts', () => expect(wordScore('CHIENA')).toBe(6))
  it('7 letters = 7 pts', () => expect(wordScore('CHIENSE')).toBe(7))
  it('8 letters = 8 pts', () => expect(wordScore('CHIENSEN')).toBe(8))
})

describe('rareLetterScore', () => {
  it('scores words with French Scrabble letter values', () => {
    expect(rareLetterScore('CHAT')).toBe(9) // C3 + H4 + A1 + T1
  })

  it('counts QU as Q + U', () => {
    expect(rareLetterScore('QUEUE')).toBe(12) // Q8 + U1 + E1 + U1 + E1
  })
})

describe('computeResults', () => {
  it('duplicate words: both players score base points but no bonus', () => {
    const players = new Map<string, Player>([
      ['p1', makePlayer('p1', ['CHAT'])],
      ['p2', makePlayer('p2', ['CHAT'])],
    ])
    const results = computeResults(players, GRID)
    const p1 = results.find(r => r.playerId === 'p1')!
    const p2 = results.find(r => r.playerId === 'p2')!
    // CHAT = 4 pts (wordScore), no +1 bonus since duplicated
    expect(p1.totalScore).toBe(4)
    expect(p2.totalScore).toBe(4)
  })

  it('unique words get base score + 1 bonus', () => {
    const players = new Map<string, Player>([
      ['p1', makePlayer('p1', ['CHAT'])],
      ['p2', makePlayer('p2', ['CHIEN'])],
    ])
    const results = computeResults(players, GRID)
    const p1 = results.find(r => r.playerId === 'p1')!
    const p2 = results.find(r => r.playerId === 'p2')!
    expect(p1.totalScore).toBe(5) // CHAT = 4 + 1 bonus = 5
    expect(p2.totalScore).toBe(6) // CHIEN = 5 + 1 bonus = 6
  })

  it('rejects words not in grid', () => {
    const players = new Map<string, Player>([
      ['p1', makePlayer('p1', ['ZZZ'])],
    ])
    const results = computeResults(players, GRID)
    expect(results[0].totalScore).toBe(0)
  })

  it('sorts by score descending', () => {
    const players = new Map<string, Player>([
      ['p1', makePlayer('p1', ['CHAT'])],
      ['p2', makePlayer('p2', ['CHIEN'])],
    ])
    const results = computeResults(players, GRID)
    expect(results[0].totalScore).toBeGreaterThanOrEqual(results[1].totalScore)
  })

  it('rare letters mode: unique words get rare letter score + 1 bonus', () => {
    const players = new Map<string, Player>([
      ['p1', makePlayer('p1', ['CHAT'])],
    ])
    const results = computeResults(players, GRID, 'rareLetters')
    expect(results[0].totalScore).toBe(10) // CHAT = 9 + 1 bonus
  })

  it('rare letters mode: duplicate words get rare letter score but no bonus', () => {
    const players = new Map<string, Player>([
      ['p1', makePlayer('p1', ['CHAT'])],
      ['p2', makePlayer('p2', ['CHAT'])],
    ])
    const results = computeResults(players, GRID, 'rareLetters')
    const p1 = results.find(r => r.playerId === 'p1')!
    const p2 = results.find(r => r.playerId === 'p2')!
    expect(p1.totalScore).toBe(9)
    expect(p2.totalScore).toBe(9)
  })

  it('rare letters mode: sorts by rare letter score', () => {
    const players = new Map<string, Player>([
      ['p1', makePlayer('p1', ['CHAT'])],
      ['p2', makePlayer('p2', ['CHIEN'])],
    ])
    const results = computeResults(players, GRID, 'rareLetters')
    expect(results[0].playerId).toBe('p2') // CHIEN = 10 + 1, CHAT = 9 + 1
  })
})
