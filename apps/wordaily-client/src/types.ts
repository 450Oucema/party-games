export type RoomPhase = 'lobby' | 'playing' | 'results'
export type ScoreMode = 'race' | 'classic' | 'rareLetters'
export type WordDifficulty = 'easy' | 'normal' | 'hard' | 'extreme' | 'mixed'
export type LetterStatus = 'correct' | 'present' | 'absent'

export type GridCell = {
  letter: string
  row: number
  col: number
}

export type CellPos = {
  r: number
  c: number
}

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

export type PublicPlayer = {
  id: string
  name: string
  avatar: number
  color: string
  connected: boolean
  attemptCount?: number
  solved?: boolean
  finished?: boolean
  solvedInMs?: number
  guesses?: Guess[]
  wordCount: number
  score: number
}

export type PublicRoom = {
  code: string
  phase: RoomPhase
  players: PublicPlayer[]
  endsAt?: number
  startedAt?: number
  grid?: GridCell[][]
  gridSize?: number
  durationSec: number
  scoreMode: ScoreMode,
  difficulty: WordDifficulty,
  targetWord?: string,
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
  solved?: boolean
  finished?: boolean
  attemptCount?: number
  solvedInMs?: number
  guesses?: Guess[]
  totalScore: number
  wordCount: number
  words: WordResult[]
  bestWord: string | null
}

export type WordGridContextType = {
  currentRow: number,
  setCurrentRow: (_row: number) => void,
  maxRows: number,
  data: WordGridData,
};

export type WordGridData = {
  rows: WordGridRow[],
}

export type WordGridRow = {
  columns: WordGridLetter[]
};

export type WordGridLetter = {
  typed: boolean,
  valid: boolean,
  value: string,
  somewhere_else: boolean
};
