import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PlayerResult, RoundSummary } from '../types'
import AvatarToken from './AvatarToken'
import { sound } from '../audio/sound'

type Props = {
  results: PlayerResult[]
  history: RoundSummary[]
  onDone: () => void
  hideReplay?: boolean
  roomCode?: string
}

type Phase = 'buzzer' | 'recap' | 'podium'

function useCountUp(target: number, duration = 1100, delay = 0): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const started = Date.now() + delay
    const frame = () => {
      const elapsed = Date.now() - started
      if (elapsed < 0) { requestAnimationFrame(frame); return }
      const t = Math.min(elapsed / duration, 1)
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) requestAnimationFrame(frame)
    }
    const raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay])
  return value
}

const MEDALS = ['🥇', '🥈']

function Confetti() {
  const pieces = Array.from({ length: 22 }, (_, i) => ({
    left: `${5 + Math.random() * 90}%`,
    delay: `${Math.random() * 1.1}s`,
    color: ['#FFD94A', '#FF4DB8', '#39E5B7', '#7B49FF', '#FF9B52'][i % 5],
    size: 8 + Math.random() * 9,
    rotate: Math.random() * 360,
  }))
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <div
          key={i}
          className="absolute animate-confetti-fall rounded-sm border-[1.5px] border-game-purple"
          style={{
            left: p.left,
            top: '-12px',
            width: p.size,
            height: p.size * (0.6 + Math.random() * 0.8),
            background: p.color,
            animationDelay: p.delay,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}

function ShareButton({ roomCode }: { roomCode?: string }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    if (!roomCode) return
    const url = `${window.location.origin}${import.meta.env.BASE_URL}join/${roomCode}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Rejoins ma partie Mot de passe !', url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // dismissed
    }
    sound.playUiClick()
  }

  return (
    <button onClick={handleShare} className="btn-secondary py-3 text-lg">
      {copied ? 'Lien copié !' : 'Partager le lien'}
    </button>
  )
}

function PodiumRow({ result, rank, delay, isActive }: { result: PlayerResult; rank: number; delay: number; isActive: boolean }) {
  const score = useCountUp(isActive ? result.totalScore : 0, 1100, delay + 200)

  return (
    <div
      className={`animate-podium-entry grid grid-cols-[2.25rem_3.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[24px] border-4 border-game-purple px-3 py-3 shadow-cartoon sm:grid-cols-[3rem_4rem_minmax(0,1fr)_auto] sm:gap-4 sm:p-4 ${
        rank === 0 ? 'scale-[1.03] bg-game-yellow' : 'bg-game-lilac'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-center text-2xl sm:text-4xl">{MEDALS[rank] ?? `${rank + 1}`}</div>
      <AvatarToken avatar={result.avatar} className="h-12 w-12 sm:h-14 sm:w-14" />
      <div className="min-w-0">
        <div className="truncate text-xl font-black leading-tight text-game-purple sm:text-2xl">{result.playerName}</div>
        <div className="text-sm font-extrabold leading-snug text-game-blue sm:text-base">
          {result.roundsWon} mot{result.roundsWon !== 1 ? 's' : ''} deviné{result.roundsWon !== 1 ? 's' : ''}
          {result.bestWord && (
            <>
              <span className="hidden sm:inline"> · meilleur : </span>
              <span className="block sm:inline font-black text-game-purple">{result.bestWord}</span>
            </>
          )}
        </div>
      </div>
      <div
        className={`min-w-[3.5rem] text-right font-display font-extrabold leading-none sm:min-w-[5rem] ${
          rank === 0 ? 'text-game-magenta' : 'text-game-violet'
        }`}
        style={{ fontSize: 'clamp(2.4rem,11vw,4rem)' }}
      >
        {score}
      </div>
    </div>
  )
}

export default function ResultsCinematic({ results, history, onDone, hideReplay, roomCode }: Props) {
  const [phase, setPhase] = useState<Phase>('buzzer')
  const [recapIdx, setRecapIdx] = useState(-1)
  const [podiumActive, setPodiumActive] = useState(false)
  const playedRecap = useRef(-1)
  const playedPodium = useRef(false)

  useEffect(() => {
    if (phase === 'buzzer') {
      sound.playGameEnd()
      const t = setTimeout(() => setPhase('recap'), 1800)
      return () => clearTimeout(t)
    }

    if (phase === 'recap') {
      setRecapIdx(-1)
      if (history.length === 0) {
        const t = setTimeout(() => setPhase('podium'), 500)
        return () => clearTimeout(t)
      }
      let i = 0
      let timer: ReturnType<typeof setTimeout>
      const next = () => {
        setRecapIdx(i++)
        if (i < history.length) timer = setTimeout(next, 1400)
        else {
          timer = setTimeout(() => setPhase('podium'), 600)
        }
      }
      timer = setTimeout(next, 300)
      return () => clearTimeout(timer)
    }

    if (phase === 'podium') {
      const t = setTimeout(() => setPodiumActive(true), 100)
      return () => clearTimeout(t)
    }
  }, [phase, history.length])

  useEffect(() => {
    if (phase !== 'recap' || recapIdx < 0 || recapIdx === playedRecap.current) return
    playedRecap.current = recapIdx
    const round = history[recapIdx]
    if (round?.status === 'found') sound.playFound()
    else sound.playPass()
  }, [phase, recapIdx, history])

  useEffect(() => {
    if (phase !== 'podium' || playedPodium.current) return
    playedPodium.current = true
    sound.playPodium()
  }, [phase])

  const activeRound = recapIdx >= 0 ? history[recapIdx] : undefined

  const winner = results[0]
  const isTie = results.length === 2 && results[0].totalScore === results[1].totalScore

  return (
    <div className="game-screen flex flex-col items-center justify-center overflow-hidden">
      {/* BUZZER */}
      {phase === 'buzzer' && (
        <div className="game-content flex flex-col items-center gap-7 animate-bounce-in">
          <div className="grid h-44 w-44 place-items-center rounded-full border-4 border-game-purple bg-game-red shadow-cartoon-lg">
            <div className="grid h-28 w-28 place-items-center rounded-full border-4 border-game-purple bg-game-yellow font-display text-6xl font-extrabold text-game-purple shadow-cartoon-sm">
              !
            </div>
          </div>
          <div className="cartoon-title text-center text-7xl text-game-red">
            Fin de la partie !
          </div>
        </div>
      )}

      {/* RECAP */}
      {phase === 'recap' && (
        <div className="game-content flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden px-4 py-5 sm:px-6">
          <div className="status-pill mx-auto shrink-0 bg-game-purple px-6 py-2 text-xl text-white">
            Manche {activeRound ? activeRound.roundIndex + 1 : ''} / {history.length}
          </div>

          {activeRound && (
            <div className="flex max-w-2xl flex-col items-center gap-3 animate-bounce-in">
              <div
                className={`rounded-[24px] border-4 border-game-purple px-5 py-4 shadow-cartoon ${
                  activeRound.status === 'found'
                    ? 'bg-game-green'
                    : activeRound.status === 'forbidden'
                    ? 'bg-game-red'
                    : 'bg-game-orange'
                }`}
              >
                <div className="text-center text-sm font-black uppercase text-game-purple/70">
                  Mot secret
                </div>
                <div className="cartoon-title-sm text-center font-display text-5xl text-game-purple">
                  {activeRound.secret}
                </div>
                <div className="mt-2 text-center text-base font-black text-game-purple">
                  {activeRound.status === 'found' && `Trouvé en ${activeRound.clueCount} indice${activeRound.clueCount > 1 ? 's' : ''} · +${activeRound.finalScore} pts`}
                  {activeRound.status === 'passed' && 'Passé · 0 pt'}
                  {activeRound.status === 'forbidden' && 'Indice interdit · 0 pt'}
                  {activeRound.status === 'timeout' && 'Temps écoulé · 0 pt'}
                </div>
              </div>

              {activeRound.clues.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {activeRound.clues.map((c, i) => (
                    <span
                      key={i}
                      className={`rounded-full border-2 border-game-purple px-3 py-1 text-sm font-black shadow-cartoon-sm ${
                        c.forbidden ? 'bg-game-red text-white' : 'bg-white text-game-purple'
                      }`}
                    >
                      {c.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {!activeRound && (
            <div className="status-pill bg-white px-5 py-2 text-sm text-game-purple">
              Préparation du classement...
            </div>
          )}
        </div>
      )}

      {/* PODIUM */}
      {phase === 'podium' && (
        <div className="game-content relative flex h-full w-full animate-bounce-in flex-col items-center justify-center gap-5 overflow-y-auto px-5 py-8 sm:px-8">
          {winner && <Confetti />}

          <div className="cartoon-title w-full text-center text-[clamp(2.6rem,11vw,5.4rem)] text-game-yellow">
            {isTie ? 'Égalité !' : 'Classement final'}
          </div>

          <div className="flex w-full max-w-3xl flex-col gap-3">
            {results.map((r, i) => (
              <PodiumRow
                key={r.playerId}
                result={r}
                rank={i}
                delay={i * 160}
                isActive={podiumActive}
              />
            ))}
          </div>

          {!hideReplay && (
            <div className="mt-2 flex w-full max-w-3xl flex-col gap-3 animate-podium-entry" style={{ animationDelay: `${results.length * 160 + 80}ms` }}>
              <button
                onClick={() => {
                  sound.playReplay()
                  onDone()
                }}
                className="btn-primary py-4 text-2xl"
              >
                Rejouer
              </button>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/" className="btn-secondary py-3 text-center text-lg whitespace-nowrap" onClick={() => sound.playUiClick()}>
                  Nouveau salon
                </Link>
                <ShareButton roomCode={roomCode} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
