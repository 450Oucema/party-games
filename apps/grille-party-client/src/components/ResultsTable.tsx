import type { PlayerResult } from '../types'
import AvatarToken from './AvatarToken'

type Props = {
  results: PlayerResult[]
  myPlayerId?: string
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function ResultsTable({ results, myPlayerId }: Props) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {results.map((r, i) => (
        <div
          key={r.playerId}
          className={`flex items-center gap-4 rounded-[24px] border-4 border-game-purple p-4 shadow-cartoon ${
            r.playerId === myPlayerId
              ? 'bg-game-yellow'
              : 'bg-white'
          }`}
        >
          <div className="w-10 text-center text-3xl">
            {MEDALS[i] ?? <span className="text-gray-400">{i + 1}</span>}
          </div>
          <AvatarToken avatar={r.avatar} className="h-12 w-12" />
          <div className="flex-1 min-w-0">
            <div className="truncate text-xl font-black text-game-purple">{r.playerName}</div>
            <div className="text-sm font-extrabold text-game-blue">
              {r.wordCount} mot{r.wordCount !== 1 ? 's' : ''} valide{r.wordCount !== 1 ? 's' : ''}
              {r.bestWord && <span> · meilleur : <span className="text-game-purple font-black">{r.bestWord}</span></span>}
            </div>
          </div>
          <div className="font-display text-4xl font-extrabold text-game-magenta">
            {r.totalScore}
          </div>
        </div>
      ))}
    </div>
  )
}
