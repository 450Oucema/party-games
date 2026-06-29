import { describe, it, expect } from 'vitest'
import { buildWords, pickOne, isForbiddenClue, normalize } from './words.js'

const SAMPLE = [
  'CHAT', 'CHIEN', 'AVION', 'BANANE', 'POMME', 'CINEMA', 'FOOTBALL', 'FRANCE',
  'CHAISE', 'ELEPHANT', 'CROISSANT', 'TENNIS', 'PARIS', 'ORDINATEUR',
  'VOITURE', 'MAISON', 'JOUR', 'NUIT', 'ARBRE', 'FLEUR', 'SOLEIL', 'LUNE',
  'ECOLE', 'TRAVAIL', 'AMOUR', 'MUSIQUE', 'LIVRE', 'TABLE', 'EAU', 'FEU',
]

describe('words module', () => {
  it('builds words module with themes', () => {
    const mod = buildWords(SAMPLE)
    expect(mod.all.length).toBeGreaterThan(0)
    expect(mod.byTheme['animaux']).toContain('CHAT')
    expect(mod.byTheme['animaux']).toContain('CHIEN')
    expect(mod.byTheme['nourriture']).toContain('POMME')
    expect(mod.byTheme['mix'].length).toBeGreaterThan(0)
  })

  it('picks a word respecting difficulty length', () => {
    const mod = buildWords(SAMPLE)
    const w = pickOne('mix', 'facile', new Set(), mod.all, mod)
    expect(w.length).toBeGreaterThanOrEqual(4)
    expect(w.length).toBeLessThanOrEqual(6)
  })

  it('excludes already used words', () => {
    const mod = buildWords(SAMPLE)
    const used = new Set<string>(['CHAT'])
    const w = pickOne('mix', 'facile', used, mod.all, mod)
    expect(w).not.toBe('CHAT')
  })

  it('detects identical clue as forbidden', () => {
    expect(isForbiddenClue('AVION', 'AVION').forbidden).toBe(true)
  })

  it('detects clue contained in secret', () => {
    expect(isForbiddenClue('AVI', 'AVION').forbidden).toBe(true)
  })

  it('detects secret contained in clue', () => {
    expect(isForbiddenClue('AVIONS', 'AVION').forbidden).toBe(true)
  })

  it('allows unrelated clue', () => {
    expect(isForbiddenClue('CIEL', 'AVION').forbidden).toBe(false)
  })

  it('detects too-close clue (Levenshtein 1)', () => {
    expect(isForbiddenClue('AVIONS', 'AVION').forbidden).toBe(true)
  })

  it('normalizes accents and case', () => {
    expect(normalize('éléphant')).toBe('ELEPHANT')
    expect(normalize('ÉTÉ')).toBe('ETE')
  })
})
