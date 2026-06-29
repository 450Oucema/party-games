import type { PublicPlayer } from '../types'
import AvatarToken from './AvatarToken'

type Props = {
  players: PublicPlayer[]
  showWordCount?: boolean
  recentJoinIds?: Set<string>
}

export default function PlayerList({ players, showWordCount = false, recentJoinIds }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {players.map((p) => {
        const isNew = recentJoinIds?.has(p.id) ?? false
        return (
          <div
            key={p.id}
            className={`flex items-center gap-3 rounded-3xl border-[3px] p-3 shadow-cartoon-sm transition-all ${
              isNew ? 'animate-join-flash' : ''
            } ${
              p.connected
                ? 'border-game-purple'
                : 'border-game-purple opacity-60'
            }`}
            style={{ background: p.color }}
          >
            <AvatarToken avatar={p.avatar} className="h-12 w-12" />
            <div className="flex-1 min-w-0">
              <div className="truncate text-lg font-black text-game-purple">{p.name}</div>
              {showWordCount && (
                <div className="text-sm font-extrabold text-game-purple/70">{p.wordCount} mots</div>
              )}
            </div>
            {!p.connected && (
              <div className="rounded-full bg-game-purple px-2 py-1 text-xs font-black text-white">déco</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
