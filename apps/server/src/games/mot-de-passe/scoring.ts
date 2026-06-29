import type { Player, PlayerResult, RoundState, RoundSummary } from './types.js'

export function scoreForClue(clueCount: number, maxClues: number): number {
  if (clueCount < 1) return 0
  if (clueCount > maxClues) return 0
  const clamped = Math.min(clueCount, maxClues)
  const points = Math.max(0, maxClues - clamped + 1)
  return points
}

export function applyRoundResult(
  players: Map<string, Player>,
  round: RoundState,
): void {
  if (round.status !== 'found') return
  const target = players.get(round.giverId)
  if (!target) return
  target.score += round.finalScore
}

export function computeResults(
  players: Map<string, Player>,
  history: RoundSummary[],
): PlayerResult[] {
  const results: PlayerResult[] = []
  for (const p of players.values()) {
    const roundsWon = history.filter(
      (r) => r.status === 'found' && r.giverId === p.id,
    ).length
    let bestWord: string | null = null
    let bestScore = -1
    for (const r of history) {
      if (r.giverId === p.id && r.status === 'found' && r.finalScore > bestScore) {
        bestScore = r.finalScore
        bestWord = r.secret
      }
    }
    results.push({
      playerId: p.id,
      playerName: p.name,
      avatar: p.avatar,
      color: p.color,
      totalScore: p.score,
      roundsWon,
      bestWord: bestScore > 0 ? bestWord : null,
    })
  }
  results.sort((a, b) => b.totalScore - a.totalScore)
  return results
}
