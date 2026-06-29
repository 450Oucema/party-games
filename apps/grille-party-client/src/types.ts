export type RoomPhase = 'lobby' | 'playing' | 'results'
export type ScoreMode = 'classic' | 'rareLetters'

export type GridCell = {
  letter: string
  row: number
  col: number
}

export type CellPos = {
  r: number
  c: number
}

export type PublicPlayer = {
  id: string
  name: string
  avatar: number
  color: string
  connected: boolean
  wordCount: number
  score: number
}

export type PublicRoom = {
  code: string
  phase: RoomPhase
  players: PublicPlayer[]
  endsAt?: number
  grid?: GridCell[][]
  gridSize: number
  durationSec: number
  scoreMode: ScoreMode
}

export type WordResult = {
  word: string
  validDictionary: boolean
  validPath: boolean
  path: CellPos[]
  duplicateCount: number
  score: number
}

export type PlayerResult = {
  playerId: string
  playerName: string
  avatar: number
  color: string
  totalScore: number
  wordCount: number
  words: WordResult[]
  bestWord: string | null
}
