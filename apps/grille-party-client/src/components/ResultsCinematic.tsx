import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CellPos, GridCell, PlayerResult } from '../types'
import AvatarToken from './AvatarToken'
import { sound } from '../audio/sound'

type Props = {
  results: PlayerResult[]
  grid?: GridCell[][]
  longestWord?: { word: string; path: CellPos[] } | null
  onDone: () => void
  hideReplay?: boolean
  roomCode?: string
}

type RevealWord = {
  word: string
  score: number
  bonus: number
  path: CellPos[]
  players: { id: string; name: string; avatar: number; color: string }[]
  isShared: boolean
}

type Phase = 'buzzer' | 'words' | 'awards' | 'longest' | 'podium'

type Award = {
  title: string
  subtitle: string
  playerId: string
  playerName: string
  playerAvatar: number
  playerColor: string
}

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1100, delay = 0): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const started = Date.now() + delay
    const frame = () => {
      const elapsed = Date.now() - started
      if (elapsed < 0) { requestAnimationFrame(frame); return }
      const t = Math.min(elapsed / duration, 1)
      // ease-out cubic
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) requestAnimationFrame(frame)
    }
    const raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay])
  return value
}

// Scrabble FR letter values — used to find the "rarest" word independently of score mode
const SCRABBLE_FR: Record<string, number> = {
  A:1,E:1,I:1,L:1,N:1,O:1,R:1,S:1,T:1,U:1,
  D:2,G:2,M:2,B:3,C:3,P:3,F:4,H:4,V:4,
  J:8,Q:8,K:10,W:10,X:10,Y:10,Z:10,
}
function scrabbleScore(word: string): number {
  return word.toUpperCase().split('').reduce((s, c) => s + (SCRABBLE_FR[c] ?? 0), 0)
}

// ─── Awards computation ────────────────────────────────────────────────────────
function computeAwards(results: PlayerResult[]): Award[] {
  if (results.length < 2) return []
  const awards: Award[] = []

  const wordShareCount = new Map<string, number>()
  for (const r of results) {
    for (const w of r.words) {
      if (w.validDictionary && w.validPath) {
        wordShareCount.set(w.word, (wordShareCount.get(w.word) ?? 0) + 1)
      }
    }
  }

  const pick = (r: PlayerResult) => ({
    playerId: r.playerId,
    playerName: r.playerName,
    playerAvatar: r.avatar,
    playerColor: r.color,
  })

  // Longest valid word
  let longestLen = 0, longestWordStr = '', longestResult: PlayerResult | null = null
  for (const r of results) {
    for (const w of r.words) {
      if (w.validDictionary && w.validPath && w.word.length > longestLen) {
        longestLen = w.word.length
        longestWordStr = w.word
        longestResult = r
      }
    }
  }
  if (longestResult && longestLen >= 5) {
    awards.push({ title: 'Mot le plus long', subtitle: longestWordStr, ...pick(longestResult) })
  }

  // Most exclusive words
  let maxUnique = 0, uniqueResult: PlayerResult | null = null
  for (const r of results) {
    const n = r.words.filter(w => w.validDictionary && w.validPath && wordShareCount.get(w.word) === 1).length
    if (n > maxUnique) { maxUnique = n; uniqueResult = r }
  }
  if (uniqueResult && maxUnique >= 2) {
    awards.push({ title: 'Explorateur unique', subtitle: `${maxUnique} mots en exclusivité`, ...pick(uniqueResult) })
  }

  // Rarest word (highest Scrabble letter value) — distinct from "longest"
  let bestRare = 0, rareWordStr = '', rareResult: PlayerResult | null = null
  for (const r of results) {
    for (const w of r.words) {
      if (w.validDictionary && w.validPath) {
        const s = scrabbleScore(w.word)
        if (s > bestRare) { bestRare = s; rareWordStr = w.word; rareResult = r }
      }
    }
  }
  if (rareResult && rareWordStr !== longestWordStr && bestRare >= 10) {
    awards.push({ title: 'Mot le plus rare', subtitle: rareWordStr, ...pick(rareResult) })
  }

  // Most words found (only if notably ahead)
  const wordCounts = results.map(r => r.wordCount)
  const maxWords = Math.max(...wordCounts)
  const topWordsResult = results.find(r => r.wordCount === maxWords)
  const secondMax = wordCounts.filter(n => n < maxWords)[0] ?? 0
  if (topWordsResult && maxWords >= 5 && maxWords - secondMax >= 2) {
    awards.push({ title: 'Plus productif', subtitle: `${maxWords} mots valides`, ...pick(topWordsResult) })
  }

  return awards.slice(0, 3)
}

function buildRevealList(results: PlayerResult[]): RevealWord[] {
  const seen = new Map<string, { score: number; path: CellPos[]; players: RevealWord['players'] }>()
  for (const r of results) {
    for (const w of r.words) {
      if (!w.validDictionary || !w.validPath) continue
      if (!seen.has(w.word)) seen.set(w.word, { score: w.score, path: w.path, players: [] })
      seen.get(w.word)!.players.push({ id: r.playerId, name: r.playerName, avatar: r.avatar, color: r.color })
    }
  }
  const list: RevealWord[] = []
  for (const [word, { score, path, players }] of seen) {
    const isShared = players.length > 1
    const bonus = isShared ? 0 : 1
    const baseScore = score - bonus
    list.push({ word, score: baseScore, bonus, path, players, isShared })
  }
  // Ascending: shortest/lowest first → crescendo toward the best words
  return list.sort((a, b) => (a.score + a.bonus) - (b.score + b.bonus))
}

const MEDALS = ['🥇', '🥈', '🥉']

// ─── Confetti for #1 ─────────────────────────────────────────────────────────
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
        await navigator.share({ title: 'Rejoins ma partie Grille Party !', url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // user dismissed
    }
    sound.playUiClick()
  }

  return (
    <button onClick={handleShare} className="btn-secondary py-3 text-lg">
      {copied ? 'Lien copié !' : 'Partager le lien'}
    </button>
  )
}

// ─── Running scoreboard during word reveal ───────────────────────────────────
function RunningScores({ results, revealList, upToIdx }: {
  results: PlayerResult[]
  revealList: RevealWord[]
  upToIdx: number
}) {
  const scores = new Map<string, number>()
  for (const r of results) scores.set(r.playerId, 0)
  for (let i = 0; i <= upToIdx && i < revealList.length; i++) {
    const w = revealList[i]
    const contribution = w.score + w.bonus
    for (const p of w.players) {
      scores.set(p.id, (scores.get(p.id) ?? 0) + contribution)
    }
  }
  const sorted = [...results].sort((a, b) => (scores.get(b.playerId) ?? 0) - (scores.get(a.playerId) ?? 0))

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {sorted.map(r => {
        const score = scores.get(r.playerId) ?? 0
        return (
          <div
            key={r.playerId}
            className="flex items-center gap-1.5 rounded-full border-2 border-game-purple px-3 py-1 shadow-cartoon-sm"
            style={{ background: r.color }}
          >
            <AvatarToken avatar={r.avatar} className="h-6 w-6" />
            <span className="max-w-[80px] truncate text-xs font-black text-game-purple">{r.playerName}</span>
            <span key={score} className="animate-bounce-in font-display text-base font-extrabold text-game-purple">
              {score}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function pathKey(pos: CellPos): string { return `${pos.r},${pos.c}` }

function RevealGrid({ grid, active, colorOverride }: { grid: GridCell[][]; active?: RevealWord; colorOverride?: string }) {
  const activePath = new Map(active?.path.map((pos, index) => [pathKey(pos), index]) ?? [])
  const activeColor = colorOverride ?? active?.players[0]?.color ?? '#FFD94A'
  const size = grid.length

  return (
    <div className="w-full max-w-[min(78vw,520px)]">
      <div
        className="grid rounded-[24px] border-4 border-game-purple bg-white/85 p-2 shadow-cartoon sm:p-3"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gap: size > 4 ? 6 : 9 }}
      >
        {grid.flatMap((row) =>
          row.map((cell) => {
            const index = activePath.get(`${cell.row},${cell.col}`)
            const isActive = index !== undefined
            return (
              <div
                key={`${cell.row}-${cell.col}`}
                className="relative grid aspect-square place-items-center rounded-xl border-[3px] font-display text-[clamp(1.35rem,7vw,3.1rem)] font-extrabold text-white transition-all duration-200"
                style={{
                  background: isActive
                    ? `linear-gradient(180deg, ${activeColor} 0%, ${activeColor}CC 100%)`
                    : 'linear-gradient(180deg, #895DFF 0%, #6138D8 100%)',
                  borderColor: '#28104B',
                  boxShadow: isActive
                    ? `0 5px 0 #17012E, 0 0 0 4px ${activeColor}66, inset 0 3px 0 rgba(255,255,255,.45)`
                    : '0 5px 0 #17012E, inset 0 -7px 0 rgba(23,1,46,.22), inset 0 3px 0 rgba(255,255,255,.45)',
                  transform: isActive ? 'scale(1.06)' : undefined,
                  zIndex: isActive ? 2 : 1,
                }}
              >
                {cell.letter === 'QU' ? <span className="text-[0.68em]">Qu</span> : cell.letter}
                {isActive && (
                  <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-game-purple bg-white text-[10px] font-black leading-none text-game-purple">
                    {index + 1}
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Longest word cinematic reveal ────────────────────────────────────────────
function LongestWordReveal({
  longestWord,
  grid,
  results,
  onNext,
}: {
  longestWord: { word: string; path: CellPos[] }
  grid: GridCell[][]
  results: PlayerResult[]
  onNext: () => void
}) {
  const [step, setStep] = useState(-1)
  const [showConclusion, setShowConclusion] = useState(false)

  const { word, path } = longestWord

  // Check if any player found this exact word
  const finders = results.filter(r =>
    r.words.some(w => w.word === word && w.validDictionary && w.validPath)
  )

  // Build the cell-by-cell letter display from the grid path
  const cellLetters = path.map(pos => grid[pos.r]?.[pos.c]?.letter ?? '')

  useEffect(() => {
    sound.playAward()
    const timers: number[] = []
    let delay = 700

    for (let i = 0; i < path.length; i++) {
      const idx = i
      timers.push(window.setTimeout(() => {
        setStep(idx)
        sound.playUiClick()
      }, delay))
      delay += 260
    }

    timers.push(window.setTimeout(() => setShowConclusion(true), delay + 400))

    return () => timers.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Active grid cells up to current step
  const activeFakeReveal: RevealWord | undefined = step >= 0 ? {
    word,
    score: 0,
    bonus: 0,
    path: path.slice(0, step + 1),
    players: [],
    isShared: false,
  } : undefined

  return (
    <div className="game-content flex h-full w-full flex-col items-center justify-center gap-5 px-5 py-8 sm:px-8 overflow-hidden">
      <div className="animate-bounce-in text-center">
        <div
          className="cartoon-title text-game-cyan"
          style={{ fontSize: 'clamp(2rem,9vw,4.5rem)', WebkitTextStroke: '3px #17012E' }}
        >
          Le mot fantôme
        </div>
        <div className="mt-1 text-base font-black text-game-purple/70">
          Le plus long mot possible dans cette grille
        </div>
      </div>

      <RevealGrid grid={grid} active={activeFakeReveal} colorOverride="#21E0D6" />

      {/* Tile-by-tile word display */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {cellLetters.map((letter, i) => (
          <div
            key={i}
            className={`grid place-items-center rounded-xl border-[3px] border-game-purple font-display font-extrabold text-white shadow-cartoon-sm transition-all duration-200 ${
              i <= step ? 'animate-word-burst opacity-100' : 'opacity-0 scale-75'
            }`}
            style={{
              width: 'clamp(2.4rem,9vw,3.8rem)',
              height: 'clamp(2.4rem,9vw,3.8rem)',
              fontSize: letter === 'QU' ? 'clamp(0.9rem,3.5vw,1.5rem)' : 'clamp(1.2rem,5vw,2.1rem)',
              background: i <= step
                ? 'linear-gradient(180deg, #21E0D6 0%, #17B8AE 100%)'
                : 'linear-gradient(180deg, #895DFF 0%, #6138D8 100%)',
              animationDelay: `0ms`,
            }}
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Word length label */}
      {step >= 0 && (
        <div className="animate-fade-slide-up status-pill bg-game-purple px-4 py-1 text-sm text-white">
          {word.length} lettre{word.length > 1 ? 's' : ''}
        </div>
      )}

      {/* Conclusion */}
      {showConclusion && (
        <div className={`animate-bounce-in rounded-[24px] border-4 border-game-purple px-5 py-3 text-center shadow-cartoon ${
          finders.length > 0 ? 'bg-game-green' : 'bg-game-yellow'
        }`}>
          {finders.length > 0 ? (
            <div>
              <div className="text-lg font-black text-game-purple">
                {finders.map(f => f.playerName).join(' et ')} {finders.length > 1 ? "l'ont trouvé" : "l'a trouvé"} !
              </div>
            </div>
          ) : (
            <div className="text-lg font-black text-game-purple">
              Personne ne l'a trouvé !
            </div>
          )}
        </div>
      )}

      {showConclusion && (
        <button onClick={onNext} className="btn-primary animate-bounce-in px-10 py-4 text-xl">
          Voir le classement
        </button>
      )}
    </div>
  )
}

// ─── Podium row with count-up score ───────────────────────────────────────────
function PodiumRow({ result, rank, delay, isActive }: { result: PlayerResult; rank: number; delay: number; isActive: boolean }) {
  const score = useCountUp(isActive ? result.totalScore : 0, 1100, delay + 200)

  return (
    <div
      className={`animate-podium-entry grid grid-cols-[2.25rem_3.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[24px] border-4 border-game-purple px-3 py-3 shadow-cartoon sm:grid-cols-[3rem_4rem_minmax(0,1fr)_auto] sm:gap-4 sm:p-4 ${
        rank === 0 ? 'scale-[1.03] bg-game-yellow' : rank === 1 ? 'bg-game-lilac' : 'bg-white'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-center text-2xl sm:text-4xl">{MEDALS[rank] ?? `${rank + 1}`}</div>
      <AvatarToken avatar={result.avatar} className="h-12 w-12 sm:h-14 sm:w-14" />
      <div className="min-w-0">
        <div className="truncate text-xl font-black leading-tight text-game-purple sm:text-2xl">{result.playerName}</div>
        <div className="text-sm font-extrabold leading-snug text-game-blue sm:text-base">
          {result.wordCount} mot{result.wordCount !== 1 ? 's' : ''}
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

// ─── Main component ────────────────────────────────────────────────────────────
export default function ResultsCinematic({ results, grid, longestWord, onDone, hideReplay, roomCode }: Props) {
  const [phase, setPhase] = useState<Phase>('buzzer')
  const [revealIdx, setRevealIdx] = useState(-1)
  const [allRevealed, setAllRevealed] = useState(false)
  const [awardsVisible, setAwardsVisible] = useState(false)
  const [podiumActive, setPodiumActive] = useState(false)
  const playedRevealIdx = useRef(-1)
  const playedPodium = useRef(false)
  const awardTimers = useRef<number[]>([])

  const revealList = buildRevealList(results)
  const awards = computeAwards(results)
  const activeReveal = revealIdx >= 0 ? revealList[revealIdx] : undefined
  const revealedWords = revealList.slice(0, revealIdx + 1).slice(-5)

  // Phase machine
  useEffect(() => {
    if (phase === 'buzzer') {
      sound.stopMusic()
      sound.playGameEnd()
      const t = setTimeout(() => setPhase('words'), 1800)
      return () => clearTimeout(t)
    }

    if (phase === 'words') {
      setRevealIdx(-1)
      setAllRevealed(false)
      if (revealList.length === 0) { setAllRevealed(true); return }
      let i = 0
      let timer: ReturnType<typeof setTimeout>
      const next = () => {
        setRevealIdx(i++)
        if (i < revealList.length) timer = setTimeout(next, 1250)
        else setAllRevealed(true)
      }
      timer = setTimeout(next, 300)
      return () => clearTimeout(timer)
    }

    if (phase === 'awards') {
      setAwardsVisible(false)
      const t1 = window.setTimeout(() => setAwardsVisible(true), 100)
      awardTimers.current.push(t1)
      // Play award sound for each badge
      awards.forEach((_, i) => {
        const t = window.setTimeout(() => sound.playAward(), 300 + i * 500)
        awardTimers.current.push(t)
      })
      return () => {
        awardTimers.current.forEach(clearTimeout)
        awardTimers.current = []
      }
    }

    if (phase === 'podium') {
      const t = setTimeout(() => setPodiumActive(true), 100)
      return () => clearTimeout(t)
    }
  }, [phase, revealList.length, awards.length])

  useEffect(() => {
    if (phase !== 'words' || !activeReveal || revealIdx === playedRevealIdx.current) return
    playedRevealIdx.current = revealIdx
    sound.playRevealWord(activeReveal.players[0]?.avatar ?? 0, activeReveal.bonus > 0)
  }, [activeReveal, phase, revealIdx])

  useEffect(() => {
    if (phase !== 'podium' || playedPodium.current) return
    playedPodium.current = true
    sound.playPodium()
  }, [phase])

  const showLongest = !!(longestWord && longestWord.word.length >= 5 && grid)

  const goToNextPhase = () => {
    sound.playUiClick()
    if (phase === 'words') {
      if (awards.length > 0) setPhase('awards')
      else if (showLongest) setPhase('longest')
      else setPhase('podium')
    } else if (phase === 'awards') {
      if (showLongest) setPhase('longest')
      else setPhase('podium')
    } else if (phase === 'longest') {
      setPhase('podium')
    }
  }

  return (
    <div className="game-screen flex flex-col items-center justify-center overflow-hidden">

      {/* ── BUZZER ── */}
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

      {/* ── WORD REVEAL ── */}
      {phase === 'words' && (
        <div className="game-content flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden px-4 py-5 sm:px-6">
          <div className="status-pill mx-auto shrink-0 bg-game-purple px-6 py-2 text-xl text-white">
            Comparaison des mots
          </div>

          <RunningScores results={results} revealList={revealList} upToIdx={revealIdx} />

          {grid && <RevealGrid grid={grid} active={activeReveal} />}

          <div className="flex min-h-[118px] w-full max-w-2xl flex-col items-center justify-center gap-3">
            {activeReveal ? (
              <div
                className="flex max-w-full animate-bounce-in items-center gap-3 rounded-[24px] border-4 border-game-purple px-4 py-3 shadow-cartoon"
                style={{ background: activeReveal.players[0]?.color ?? '#FFD94A' }}
              >
                <div className="flex -space-x-2">
                  {activeReveal.players.map((p) => (
                    <AvatarToken key={p.id} avatar={p.avatar} className="h-11 w-11" />
                  ))}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-display text-3xl font-extrabold leading-none text-game-purple">
                    {activeReveal.word}
                  </div>
                  <div className="mt-1 truncate text-sm font-black text-game-purple">
                    {activeReveal.players.map(p => p.name).join(' + ')} · +{activeReveal.score}{activeReveal.bonus > 0 ? ` +${activeReveal.bonus}` : ''}
                  </div>
                </div>
              </div>
            ) : (
              <div className="status-pill bg-white px-5 py-2 text-sm text-game-purple">
                Préparation des chemins...
              </div>
            )}

            <div className="flex max-w-full flex-wrap justify-center gap-2">
              {revealedWords.map((w) => (
                <span
                  key={w.word}
                  className="rounded-full border-2 border-game-purple px-3 py-1 text-xs font-black text-game-purple shadow-cartoon-sm"
                  style={{ background: w.players[0]?.color ?? '#FFD94A' }}
                >
                  {w.word}
                </span>
              ))}
            </div>
          </div>

          {allRevealed && (
            <button onClick={goToNextPhase} className="btn-primary self-center shrink-0 animate-bounce-in">
              {awards.length > 0 ? 'Voir les récompenses' : 'Voir le classement'}
            </button>
          )}
        </div>
      )}

      {/* ── AWARDS ── */}
      {phase === 'awards' && (
        <div className="game-content flex h-full w-full flex-col items-center justify-center gap-5 overflow-y-auto px-5 py-8 sm:px-8">
          <div className="cartoon-title w-full text-center text-[clamp(2.2rem,10vw,4.8rem)] text-game-yellow">
            Récompenses
          </div>
          <div className="flex w-full max-w-2xl flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-center">
            {awards.map((award, i) => (
              <div
                key={award.title}
                className={`flex-1 min-w-[220px] animate-award-reveal rounded-[24px] border-4 border-game-purple p-5 shadow-cartoon ${
                  awardsVisible ? '' : 'opacity-0'
                }`}
                style={{
                  animationDelay: `${i * 220}ms`,
                  background: award.playerColor,
                }}
              >
                <div className="font-display text-xl font-extrabold text-game-purple leading-tight">{award.title}</div>
                <div className="mt-1 font-black text-base text-game-purple/70 truncate">{award.subtitle}</div>
                <div className="mt-3 flex items-center gap-2">
                  <AvatarToken avatar={award.playerAvatar} className="h-9 w-9" />
                  <span className="font-black text-game-purple truncate">{award.playerName}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={goToNextPhase} className="btn-primary animate-bounce-in mt-2 px-10 py-4 text-xl">
            Voir le classement 🏆
          </button>
        </div>
      )}

      {/* ── LONGEST WORD ── */}
      {phase === 'longest' && longestWord && grid && (
        <LongestWordReveal
          longestWord={longestWord}
          grid={grid}
          results={results}
          onNext={goToNextPhase}
        />
      )}

      {/* ── PODIUM ── */}
      {phase === 'podium' && (
        <div className="game-content relative flex h-full w-full animate-bounce-in flex-col items-center justify-center gap-5 overflow-y-auto px-5 py-8 sm:px-8">
          {/* Confetti for #1 */}
          {results[0] && <Confetti />}

          <div className="cartoon-title w-full text-center text-[clamp(2.6rem,11vw,5.4rem)] text-game-yellow">
            Classement final
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
