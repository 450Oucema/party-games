export type RoomPhase = 'lobby' | 'playing' | 'results'
export type ScoreMode = 'classic' | 'rareLetters'

export type GridCell = {
  letter: string // may be "QU"
  row: number
  col: number
}

export type CellPos = {
  r: number
  c: number
}

export type Player = {
  id: string
  socketId: string
  name: string
  words: Set<string>
  connected: boolean
  avatar: number // 0-7 index for emoji avatar
  color: string
}

export type Room = {
  code: string
  phase: RoomPhase
  createdAt: number
  hostSocketId?: string
  hostToken: string
  players: Map<string, Player>
  grid?: GridCell[][]
  startedAt?: number
  endsAt?: number
  durationSec: number
  gridSize: number  // 4 or 6
  scoreMode: ScoreMode
  lastResults?: PlayerResult[]
  longestPossibleWord?: string
  longestPossiblePath?: CellPos[]
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

export type PrivatePlayerState = {
  id: string
  words: string[]
}
