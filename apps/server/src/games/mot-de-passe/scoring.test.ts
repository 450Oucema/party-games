import { describe, it, expect } from 'vitest'
import { scoreForClue } from './scoring.js'

describe('scoring', () => {
  it('scores 5 on first clue when maxClues=5', () => {
    expect(scoreForClue(1, 5)).toBe(5)
  })

  it('scores 4 on second clue', () => {
    expect(scoreForClue(2, 5)).toBe(4)
  })

  it('scores 1 on fifth clue', () => {
    expect(scoreForClue(5, 5)).toBe(1)
  })

  it('scores 0 on failure', () => {
    expect(scoreForClue(0, 5)).toBe(0)
  })

  it('clamps clue count beyond maxClues', () => {
    expect(scoreForClue(10, 5)).toBe(0)
  })
})
