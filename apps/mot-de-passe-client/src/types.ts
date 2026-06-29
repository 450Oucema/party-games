export type RoomPhase = 'lobby' | 'playing' | 'results'

export type Theme =
  | 'quotidien'
  | 'animaux'
  | 'nourriture'
  | 'cinema'
  | 'sport'
  | 'geographie'
  | 'objets'
  | 'absurde'
  | 'mix'

export type Difficulty = 'facile' | 'normal' | 'expert'
export type GameMode = 'irl' | 'online'

export type PublicClue = {
  text: string
  forbidden: boolean
  reason?: string
}

export type PublicRound = {
  roundIndex: number
  giverId: string
  guesserId: string
  theme: Theme
  clues: PublicClue[]
  status: 'active' | 'found' | 'passed' | 'forbidden' | 'timeout'
  endsAt?: number
  clueCount: number
  finalScore: number
}

export type RoundSummary = {
  roundIndex: number
  giverId: string
  guesserId: string
  secret: string
  theme: Theme
  clues: PublicClue[]
  status: PublicRound['status']
  clueCount: number
  finalScore: number
}

export type PublicPlayer = {
  id: string
  name: string
  avatar: number
  color: string
  connected: boolean
  score: number
}

export type PublicRoom = {
  code: string
  phase: RoomPhase
  mode: GameMode
  theme: Theme
  difficulty: Difficulty
  maxClues: number
  roundsPerPlayer: number
  roundSec: number
  players: PublicPlayer[]
  currentRound?: PublicRound
  history: RoundSummary[]
  totalRounds: number
}

export type PlayerResult = {
  playerId: string
  playerName: string
  avatar: number
  color: string
  totalScore: number
  roundsWon: number
  bestWord: string | null
}
