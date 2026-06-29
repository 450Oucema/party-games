import type { CellPos, GridCell } from './types.js'

// 36 dice for 6x6 grid (French frequency weighted)
const DICE_6x6: string[][] = [
  // 4x4 original 16
  ['A', 'A', 'E', 'I', 'O', 'T'],
  ['A', 'B', 'D', 'E', 'N', 'S'],
  ['A', 'C', 'E', 'L', 'R', 'S'],
  ['A', 'D', 'E', 'N', 'S', 'T'],
  ['A', 'E', 'E', 'I', 'O', 'U'],
  ['A', 'E', 'G', 'M', 'N', 'R'],
  ['A', 'E', 'I', 'L', 'N', 'R'],
  ['A', 'E', 'I', 'N', 'R', 'T'],
  ['C', 'E', 'I', 'L', 'P', 'T'],
  ['D', 'E', 'I', 'L', 'R', 'U'],
  ['E', 'E', 'N', 'O', 'S', 'U'],
  ['E', 'E', 'R', 'S', 'T', 'U'],
  ['E', 'G', 'I', 'N', 'S', 'T'],
  ['E', 'I', 'O', 'R', 'S', 'T'],
  ['L', 'M', 'N', 'O', 'R', 'U'],
  ['QU', 'A', 'E', 'I', 'O', 'N'],
  // 20 extra for 6x6
  ['A', 'E', 'F', 'I', 'R', 'S'],
  ['A', 'L', 'O', 'P', 'R', 'T'],
  ['B', 'E', 'I', 'L', 'N', 'S'],
  ['C', 'E', 'H', 'O', 'R', 'S'],
  ['D', 'E', 'M', 'O', 'R', 'S'],
  ['E', 'F', 'I', 'N', 'S', 'T'],
  ['E', 'L', 'N', 'O', 'R', 'T'],
  ['G', 'I', 'L', 'O', 'R', 'U'],
  ['H', 'I', 'N', 'O', 'R', 'T'],
  ['I', 'L', 'M', 'N', 'O', 'R'],
  ['A', 'C', 'E', 'I', 'N', 'R'],
  ['A', 'D', 'E', 'L', 'O', 'S'],
  ['B', 'O', 'R', 'S', 'T', 'U'],
  ['C', 'H', 'I', 'N', 'O', 'S'],
  ['D', 'E', 'I', 'N', 'R', 'S'],
  ['E', 'I', 'L', 'M', 'N', 'T'],
  ['A', 'E', 'I', 'O', 'P', 'R'],
  ['C', 'E', 'L', 'O', 'S', 'T'],
  ['F', 'I', 'N', 'O', 'R', 'S'],
  ['A', 'E', 'I', 'N', 'R', 'S'],
  ['D', 'E', 'G', 'I', 'N', 'S'],
]

// 16 dice for 4x4 grid
const DICE_4x4: string[][] = DICE_6x6.slice(0, 16)

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateGrid(size: number = 6): GridCell[][] {
  const pool = size === 4 ? DICE_4x4 : DICE_6x6
  const count = size * size
  // Shuffle and take exactly count dice (repeat pool if somehow short)
  const shuffled = shuffle(pool.slice(0, count))
  const grid: GridCell[][] = []
  let idx = 0
  for (let r = 0; r < size; r++) {
    grid[r] = []
    for (let c = 0; c < size; c++) {
      const die = shuffled[idx++]
      const face = die[Math.floor(Math.random() * die.length)]
      grid[r][c] = { letter: face, row: r, col: c }
    }
  }
  return grid
}

function getNeighbors(r: number, c: number, size: number): [number, number][] {
  const neighbors: [number, number][] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        neighbors.push([nr, nc])
      }
    }
  }
  return neighbors
}

export function findWordPath(word: string, grid: GridCell[][]): CellPos[] | null {
  const upper = word.toUpperCase()
  const size = grid.length

  function dfs(remaining: string, r: number, c: number, visited: Set<string>, path: CellPos[]): CellPos[] | null {
    const letter = grid[r][c].letter
    if (!remaining.startsWith(letter)) return null
    const rest = remaining.slice(letter.length)
    const nextPath = [...path, { r, c }]
    if (rest.length === 0) return nextPath

    const key = `${r},${c}`
    const newVisited = new Set(visited)
    newVisited.add(key)

    for (const [nr, nc] of getNeighbors(r, c, size)) {
      if (!newVisited.has(`${nr},${nc}`)) {
        const found = dfs(rest, nr, nc, newVisited, nextPath)
        if (found) return found
      }
    }
    return null
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const found = dfs(upper, r, c, new Set(), [])
      if (found) return found
    }
  }
  return null
}

export function canFormWord(word: string, grid: GridCell[][]): boolean {
  return findWordPath(word, grid) !== null
}
