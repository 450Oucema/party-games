import { describe, it, expect, beforeAll } from 'vitest'
import { getSolutionWords, loadDictionary, isValidWord, normalize, randomWord } from './dictionary.js'

beforeAll(() => loadDictionary())

describe('normalize', () => {
  it('uppercases', () => expect(normalize('chien')).toBe('CHIEN'))
  it('strips accents é', () => expect(normalize('été')).toBe('ETE'))
  it('strips accents è', () => expect(normalize('mère')).toBe('MERE'))
  it('strips ç', () => expect(normalize('façon')).toBe('FACON'))
  it('strips ê', () => expect(normalize('fête')).toBe('FETE'))
  it('strips ü', () => expect(normalize('naïf')).toBe('NAIF'))
})

describe('isValidWord', () => {
  it('accepts common 5-letter French word', () => expect(isValidWord('chien')).toBe(true))
  it('accepts with accents after normalization', () => expect(isValidWord('façon')).toBe(true))
  it('rejects made-up word', () => expect(isValidWord('xzqwvb')).toBe(false))
  it('rejects words shorter than 5', () => {
    expect(isValidWord('ab')).toBe(false)
  })
})

describe('classified solution pools', () => {
  it('has solution words for every difficulty', () => {
    expect(getSolutionWords('easy').length).toBeGreaterThan(0)
    expect(getSolutionWords('normal').length).toBeGreaterThan(0)
    expect(getSolutionWords('hard').length).toBeGreaterThan(0)
    expect(getSolutionWords('extreme').length).toBeGreaterThan(0)
    expect(getSolutionWords('mixed').length).toBeGreaterThan(0)
  })

  it('draws a word from the requested pool', () => {
    const easyWords = getSolutionWords('easy')
    expect(easyWords).toContain(randomWord('easy'))
  })
})
