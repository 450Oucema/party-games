import { describe, it, expect } from 'vitest'
import { canFormWord, generateGrid } from './grid.js'
import type { GridCell } from './types.js'

// Fixed grid for deterministic tests
const FIXED_GRID: GridCell[][] = [
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

describe('canFormWord', () => {
  it('finds CHAT (adjacent path)', () => {
    expect(canFormWord('CHAT', FIXED_GRID)).toBe(true)
  })

  it('finds CHIEN (multi-step path)', () => {
    // C(0,0)->H(0,1)->I(1,0)->E(1,1)->N(1,2)
    expect(canFormWord('CHIEN', FIXED_GRID)).toBe(true)
  })

  it('rejects word that cannot be formed', () => {
    expect(canFormWord('ZZZ', FIXED_GRID)).toBe(false)
  })

  it('rejects reuse of same cell', () => {
    // "HH" would need H used twice
    expect(canFormWord('HH', FIXED_GRID)).toBe(false)
  })

  it('handles QU cell', () => {
    // QUEUE = QU(0,0) -> E(0,1) -> U(0,2) -> E(0,3)
    const gridWithQu: GridCell[][] = [
      [
        { letter: 'QU', row: 0, col: 0 },
        { letter: 'E', row: 0, col: 1 },
        { letter: 'U', row: 0, col: 2 },
        { letter: 'E', row: 0, col: 3 },
      ],
      [
        { letter: 'A', row: 1, col: 0 },
        { letter: 'L', row: 1, col: 1 },
        { letter: 'L', row: 1, col: 2 },
        { letter: 'S', row: 1, col: 3 },
      ],
      ...FIXED_GRID.slice(2),
    ]
    expect(canFormWord('QUEUE', gridWithQu)).toBe(true)
  })
})

describe('generateGrid', () => {
  it('generates a 6x6 grid by default', () => {
    const g = generateGrid()
    expect(g).toHaveLength(6)
    g.forEach(row => expect(row).toHaveLength(6))
  })

  it('generates a 4x4 grid when specified', () => {
    const g = generateGrid(4)
    expect(g).toHaveLength(4)
    g.forEach(row => expect(row).toHaveLength(4))
  })

  it('all cells have a letter', () => {
    const g = generateGrid(6)
    g.forEach(row => row.forEach(cell => expect(cell.letter.length).toBeGreaterThan(0)))
  })
})
