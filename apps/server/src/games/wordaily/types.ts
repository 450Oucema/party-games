export type RoomPhase = 'lobby' | 'playing' | 'results'
export type ScoreMode = 'race' | 'classic' | 'rareLetters'
export type WordDifficulty = 'easy' | 'normal' | 'hard' | 'extreme' | 'mixed'
export type GridCell = {
  letter: string
  row: number
  col: number
}
export type CellPos = {
  r: number
  c: number
}
export type LetterStatus = 'correct' | 'present' | 'absent'

export type GuessLetter = {
  value: string
  status: LetterStatus
}

export type Guess = {
  word: string
  letters: GuessLetter[]
  submittedAt: number
  attempt: number
}

export type Player = {
  id: string
  socketId: string
  name: string
  guesses: Guess[]
  solvedAt?: number
  finished: boolean
  connected: boolean
  avatar: number
  color: string
}

export type Room = {
  code: string
  phase: RoomPhase
  createdAt: number
  hostSocketId?: string
  hostToken: string
  players: Map<string, Player>
  startedAt?: number
  endsAt?: number
  durationSec: number
  scoreMode: ScoreMode
  difficulty: WordDifficulty
  lastResults?: PlayerResult[]
  targetWord?: string
}

export type PlayerResult = {
  playerId: string
  playerName: string
  avatar: number
  color: string
  solved: boolean
  finished: boolean
  attemptCount: number
  solvedInMs?: number
  guesses: Guess[]
  totalScore: number
  wordCount: number
  words: WordResult[]
  bestWord: string | null
}

export type WordResult = {
  word: string
  validDictionary: boolean
  validPath: boolean
  path: CellPos[]
  duplicateCount: number
  score: number
}

export type PublicPlayer = {
  id: string
  name: string
  avatar: number
  color: string
  connected: boolean
  attemptCount: number
  wordCount: number
  score: number
  solved: boolean
  finished: boolean
  solvedInMs?: number
  guesses?: Guess[]
}

export type PublicRoom = {
  code: string
  phase: RoomPhase
  players: PublicPlayer[]
  endsAt?: number
  startedAt?: number
  durationSec: number
  scoreMode: ScoreMode
  difficulty: WordDifficulty
  targetWord?: string
}

export type PrivatePlayerState = {
  id: string
  guesses: Guess[]
}
