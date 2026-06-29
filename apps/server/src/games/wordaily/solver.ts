import type { GridCell, CellPos } from './types.js'
import type { TrieNode } from './dictionary.js'

export type SolverResult = {
  word: string
  path: CellPos[]
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

export function findLongestWord(grid: GridCell[][], root: TrieNode): SolverResult | null {
  const size = grid.length
  let best: SolverResult | null = null

  // Reuse a single visited array and path array with backtracking
  const visited = new Uint8Array(size * size)
  const path: CellPos[] = []

  function dfs(r: number, c: number, node: TrieNode, wordLen: number, prefix: string): void {
    const letters = grid[r][c].letter

    // Traverse trie for each char in this cell's letter string (handles "QU" → Q→U)
    let cur = node
    for (const ch of letters) {
      const child = cur.children[ch]
      if (!child) return
      cur = child
    }

    const cellIdx = r * size + c
    path.push({ r, c })
    visited[cellIdx] = 1
    const newLen = wordLen + letters.length
    const newPrefix = prefix + letters

    if (cur.isWord && newLen > (best?.word.length ?? 0)) {
      best = { word: newPrefix, path: [...path] }
    }

    for (const [nr, nc] of getNeighbors(r, c, size)) {
      if (!visited[nr * size + nc]) {
        dfs(nr, nc, cur, newLen, newPrefix)
      }
    }

    path.pop()
    visited[cellIdx] = 0
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      dfs(r, c, root, 0, '')
    }
  }

  return best
}
