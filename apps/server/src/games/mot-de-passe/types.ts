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

export type Player = {
  id: string
  socketId: string
  name: string
  connected: boolean
  avatar: number
  color: string
  score: number
}

export type ClueEntry = {
  text: string
  forbidden: boolean
  reason?: string
}

export type RoundState = {
  roundIndex: number            // 0-based
  giverId: string
  guesserId: string
  secret: string                // only sent to giver
  theme: Theme
  clues: ClueEntry[]            // ordered list of accepted clues
  status: 'active' | 'found' | 'passed' | 'forbidden' | 'timeout'
  endsAt?: number
  clueCount: number
  usedWords: Set<string>        // clues already submitted (normalized)
  finalScore: number
}

export type RoundSummary = {
  roundIndex: number
  giverId: string
  guesserId: string
  secret: string
  theme: Theme
  clues: ClueEntry[]
  status: RoundState['status']
  clueCount: number
  finalScore: number
}

export type Room = {
  code: string
  phase: RoomPhase
  createdAt: number
  hostSocketId?: string
  hostToken: string
  players: Map<string, Player>
  mode: GameMode
  theme: Theme
  difficulty: Difficulty
  maxClues: number
  roundsPerPlayer: number
  roundSec: number
  currentRoundIndex: number
  currentRound?: RoundState
  history: RoundSummary[]
  lastResults?: PlayerResult[]
}

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
  status: RoundState['status']
  endsAt?: number
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

export type PrivatePlayerState = {
  id: string
  secret?: string
}
