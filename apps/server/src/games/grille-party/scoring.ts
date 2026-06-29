import type { Player, WordResult, PlayerResult, ScoreMode } from './types.js'
import { isValidWord, normalize } from './dictionary.js'
import { findWordPath } from './grid.js'
import type { GridCell } from './types.js'

export function wordScore(word: string): number {
  const normLen = normalize(word).length
  return 3 + Math.max(0, normLen - 3)
}

const SCRABBLE_FR_LETTER_POINTS: Record<string, number> = {
  A: 1,
  E: 1,
  I: 1,
  L: 1,
  N: 1,
  O: 1,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  D: 2,
  G: 2,
  M: 2,
  B: 3,
  C: 3,
  P: 3,
  F: 4,
  H: 4,
  V: 4,
  J: 8,
  Q: 8,
  K: 10,
  W: 10,
  X: 10,
  Y: 10,
  Z: 10,
}

export function rareLetterScore(word: string): number {
  return normalize(word)
    .split('')
    .reduce((sum, letter) => sum + (SCRABBLE_FR_LETTER_POINTS[letter] ?? 0), 0)
}

function scoreWordByMode(word: string, scoreMode: ScoreMode): number {
  return scoreMode === 'rareLetters' ? rareLetterScore(word) : wordScore(word)
}

export function computeResults(
  players: Map<string, Player>,
  grid: GridCell[][],
  scoreMode: ScoreMode = 'classic'
): PlayerResult[] {
  // Count how many players submitted each word
  const wordCounts = new Map<string, number>()
  for (const player of players.values()) {
    for (const word of player.words) {
      const norm = normalize(word)
      wordCounts.set(norm, (wordCounts.get(norm) ?? 0) + 1)
    }
  }

  const results: PlayerResult[] = []

  for (const player of players.values()) {
    const wordResults: WordResult[] = []
    let totalScore = 0
    let bestWord: string | null = null
    let bestScore = -1

    for (const word of player.words) {
      const norm = normalize(word)
      const validDict = isValidWord(norm)
      const path = validDict ? findWordPath(norm, grid) : null
      const validPath = !!path
      const dupCount = wordCounts.get(norm) ?? 0
      const isDuplicated = dupCount > 1

      let score = 0
      if (validDict && validPath) {
        // Tous les mots valides rapportent des points ; +1 bonus si personne d'autre ne l'a trouvé
        score = scoreWordByMode(norm, scoreMode) + (isDuplicated ? 0 : 1)
      }

      totalScore += score

      if (score > bestScore) {
        bestScore = score
        bestWord = word
      }

      wordResults.push({
        word,
        validDictionary: validDict,
        validPath,
        path: path ?? [],
        duplicateCount: dupCount,
        score,
      })
    }

    results.push({
      playerId: player.id,
      playerName: player.name,
      avatar: player.avatar,
      color: player.color,
      totalScore,
      wordCount: wordResults.filter(w => w.validDictionary && w.validPath).length,
      words: wordResults,
      bestWord: bestScore > 0 ? bestWord : null,
    })
  }

  results.sort((a, b) => b.totalScore - a.totalScore)
  return results
}
