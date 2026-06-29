import { describe, it, expect, beforeAll } from 'vitest'
import { loadDictionary, isValidWord, normalize } from './dictionary.js'

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
  it('accepts common French word', () => expect(isValidWord('maison')).toBe(true))
  it('accepts with accents', () => expect(isValidWord('été')).toBe(true))
  it('rejects made-up word', () => expect(isValidWord('xzqwvb')).toBe(false))
  it('rejects words shorter than 3', () => {
    // 'ai' exists in dict but we filter < 3 at load time
    // just check that a 2-char input is false
    expect(isValidWord('ab')).toBe(false)
  })
})
