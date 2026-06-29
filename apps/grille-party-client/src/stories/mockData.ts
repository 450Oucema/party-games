import type { GridCell, PlayerResult, PublicPlayer } from '../types'

export const mockPlayers: PublicPlayer[] = [
  { id: 'p1', name: 'Austin', avatar: 0, color: '#FF4DB8', connected: true, wordCount: 12, score: 28 },
  { id: 'p2', name: 'Nina', avatar: 1, color: '#39E5B7', connected: true, wordCount: 9, score: 21 },
  { id: 'p3', name: 'Milo', avatar: 2, color: '#FFD94A', connected: false, wordCount: 6, score: 16 },
]

const letters = [
  ['R', 'N', 'A', 'R', 'A', 'R'],
  ['O', 'U', 'A', 'R', 'P', 'N'],
  ['N', 'S', 'I', 'A', 'N', 'R'],
  ['O', 'L', 'A', 'R', 'G', 'E'],
  ['D', 'L', 'S', 'T', 'A', 'D'],
  ['E', 'T', 'F', 'U', 'E', 'H'],
]

export const mockGrid: GridCell[][] = letters.map((row, r) =>
  row.map((letter, c) => ({ letter, row: r, col: c }))
)

export const mockResults: PlayerResult[] = [
  {
    playerId: 'p1',
    playerName: 'Austin',
    avatar: 0,
    color: '#FF4DB8',
    totalScore: 124,
    wordCount: 12,
    bestWord: 'LARGE',
    words: [
      { word: 'LARGE', validDictionary: true, validPath: true, path: [{ r: 3, c: 2 }, { r: 3, c: 3 }, { r: 3, c: 4 }, { r: 3, c: 5 }, { r: 2, c: 5 }], duplicateCount: 1, score: 8 },
      { word: 'RANGE', validDictionary: true, validPath: true, path: [{ r: 1, c: 3 }, { r: 2, c: 4 }, { r: 2, c: 5 }, { r: 3, c: 4 }, { r: 3, c: 5 }], duplicateCount: 2, score: 6 },
      { word: 'TARD', validDictionary: true, validPath: true, path: [{ r: 4, c: 3 }, { r: 4, c: 4 }, { r: 3, c: 3 }, { r: 4, c: 5 }], duplicateCount: 1, score: 5 },
    ],
  },
  {
    playerId: 'p2',
    playerName: 'Nina',
    avatar: 1,
    color: '#39E5B7',
    totalScore: 98,
    wordCount: 9,
    bestWord: 'RANGE',
    words: [
      { word: 'RANGE', validDictionary: true, validPath: true, path: [{ r: 1, c: 3 }, { r: 2, c: 4 }, { r: 2, c: 5 }, { r: 3, c: 4 }, { r: 3, c: 5 }], duplicateCount: 2, score: 6 },
      { word: 'SAGE', validDictionary: true, validPath: true, path: [{ r: 4, c: 2 }, { r: 4, c: 4 }, { r: 3, c: 4 }, { r: 3, c: 5 }], duplicateCount: 1, score: 5 },
    ],
  },
  {
    playerId: 'p3',
    playerName: 'Milo',
    avatar: 2,
    color: '#FFD94A',
    totalScore: 74,
    wordCount: 6,
    bestWord: 'FARD',
    words: [
      { word: 'FARD', validDictionary: true, validPath: true, path: [{ r: 5, c: 2 }, { r: 4, c: 4 }, { r: 3, c: 3 }, { r: 4, c: 5 }], duplicateCount: 1, score: 8 },
    ],
  },
]
