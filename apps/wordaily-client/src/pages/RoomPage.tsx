import {useEffect, useState, useCallback, useRef, useMemo} from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { socket } from '../socket'
import type { Guess, PublicPlayer, PublicRoom, PlayerResult, WordDifficulty } from '../types'
import AvatarPicker from '../components/AvatarPicker'
import AvatarToken from '../components/AvatarToken'
import QRJoin from '../components/QRJoin'
import Timer from '../components/Timer'
import PlayerList from '../components/PlayerList'
import GameLogo from '../components/GameLogo'
import SoundToggle from '../components/SoundToggle'
import { sound } from '../audio/sound'
import { currentPlayerIdKey, hostTokenKey, playerIdKey, roomCodeKey } from '../storage'
import WordGrid from '../components/WordGrid'

type Feedback = {
  word: string
  status: 'accepted' | 'rejected' | 'duplicate'
  reason?: string
}

type FeedEvent = {
  id: number
  playerId: string
  playerName: string
  avatar: number
  color: string
  word: string
}

const DIFFICULTIES: Array<{ label: string; value: WordDifficulty }> = [
  { label: 'Facile', value: 'easy' },
  { label: 'Normal', value: 'normal' },
  { label: 'Difficile', value: 'hard' },
  { label: 'Extreme', value: 'extreme' },
  { label: 'Mix', value: 'mixed' },
]

function CountdownOverlay({ onDone }: { onDone: () => void }) {
  const [num, setNum] = useState(3)

  useEffect(() => {
    sound.playCountdownTick(3)
    const timers = [
      window.setTimeout(() => { setNum(2); sound.playCountdownTick(2) }, 700),
      window.setTimeout(() => { setNum(1); sound.playCountdownTick(1) }, 1400),
      window.setTimeout(() => { setNum(0); sound.playCountdownTick(0) }, 2100),
      window.setTimeout(() => { onDone() }, 2600),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-game-purple/80 backdrop-blur-sm" />
      <div key={num} className="relative flex flex-col items-center animate-countdown-zoom">
        {num > 0 ? (
          <div
            className="cartoon-title leading-none"
            style={{ fontSize: 'clamp(7rem, 30vw, 18rem)', WebkitTextStroke: '6px #17012E', color: '#FFD94A' }}
          >
            {num}
          </div>
        ) : (
          <div
            className="cartoon-title leading-none"
            style={{ fontSize: 'clamp(4.5rem, 22vw, 13rem)', WebkitTextStroke: '5px #17012E', color: '#39E5B7' }}
          >
            GO !
          </div>
        )}
      </div>
    </div>
  )
}

function PlayingScoreCards({ players }: { players: PublicPlayer[] }) {
  const sortedPlayers = rankPublicPlayers(players)

  return (
    <div className="flex flex-col gap-3">
      {sortedPlayers.map((p) => (
        <div
          key={p.id}
          className={`flex items-center justify-between gap-3 rounded-2xl border-[3px] border-game-purple p-3 shadow-cartoon-sm transition-all ${
            p.connected ? '' : 'opacity-60'
          }`}
          style={{ background: p.color }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <AvatarToken avatar={p.avatar} className="h-10 w-10 rounded-xl" />
            <span className="truncate text-base font-black text-game-purple">{p.name}</span>
          </div>
          <span className="font-display text-3xl font-extrabold leading-none text-game-purple">
            {p.solved ? `${p.attemptCount ?? 0}/6` : p.finished ? 'KO' : `${p.attemptCount ?? 0}/6`}
          </span>
        </div>
      ))}
    </div>
  )
}

function MobilePlayerWordCounts({ players }: { players: PublicPlayer[] }) {
  const sortedPlayers = rankPublicPlayers(players)

  return (
    <div className="mx-3 mb-3 mt-2 flex-1 overflow-auto rounded-[24px] border-4 border-game-purple bg-white/90 px-3 pb-3 pt-3 pb-safe shadow-cartoon">
      <div className="mb-2 text-xs font-black uppercase text-game-purple">
        Joueurs
      </div>
      <div className="grid grid-cols-1 gap-2">
        {sortedPlayers.map((p) => (
          <div
            key={p.id}
            className={`flex items-center justify-between gap-3 rounded-2xl border-[3px] border-game-purple px-3 py-2 shadow-cartoon-sm ${
              p.connected ? 'bg-white' : 'bg-game-lilac opacity-60'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <AvatarToken avatar={p.avatar} className="h-10 w-10 rounded-xl" />
              <span className="truncate text-base font-black text-game-purple">{p.name}</span>
            </div>
            <span className="status-pill shrink-0 bg-game-yellow px-3 py-1 text-sm text-game-purple">
              {p.solved ? `${p.attemptCount ?? 0} essais` : p.finished ? 'Termine' : `${p.attemptCount ?? 0}/6`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function rankPublicPlayers(players: PublicPlayer[]): PublicPlayer[] {
  return [...players].sort((a, b) => {
    if (!!a.solved !== !!b.solved) return a.solved ? -1 : 1
    if (a.solved && b.solved) {
      if ((a.attemptCount ?? 0) !== (b.attemptCount ?? 0)) return (a.attemptCount ?? 0) - (b.attemptCount ?? 0)
      return (a.solvedInMs ?? Infinity) - (b.solvedInMs ?? Infinity)
    }
    if (!!a.finished !== !!b.finished) return a.finished ? -1 : 1
    return (b.attemptCount ?? 0) - (a.attemptCount ?? 0)
  })
}

function formatMs(ms?: number): string {
  if (ms === undefined) return '-'
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function ResultsPanel({ room, results, onRestart, isHost }: { room: PublicRoom | null; results: PlayerResult[] | null; onRestart: () => void; isHost: boolean }) {
  const rows = results ?? room?.players.map((player): PlayerResult => ({
    playerId: player.id,
    playerName: player.name,
    avatar: player.avatar,
    color: player.color,
    solved: !!player.solved,
    finished: !!player.finished,
    attemptCount: player.attemptCount ?? 0,
    solvedInMs: player.solvedInMs,
    guesses: player.guesses ?? [],
    totalScore: player.score,
    wordCount: player.wordCount,
    words: [],
    bestWord: null,
  })) ?? []

  return (
    <div className="game-content flex min-h-dvh flex-col items-center justify-center gap-5 p-4">
      <GameLogo size="room" />
      <div className="cartoon-card w-full max-w-2xl p-5 text-center">
        <div className="text-sm font-black uppercase text-game-magenta">Mot secret</div>
        <div className="mt-2 font-display text-6xl font-extrabold tracking-normal text-game-purple">
          {room?.targetWord ?? '?????'}
        </div>
      </div>
      <div className="cartoon-panel w-full max-w-2xl p-4">
        <div className="mb-3 status-pill inline-flex bg-game-purple px-4 py-1 text-white">Classement</div>
        <div className="flex flex-col gap-3">
          {rows.map((result, index) => (
            <div key={result.playerId} className="grid grid-cols-[2rem_3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border-[3px] border-game-purple bg-white px-3 py-2 shadow-cartoon-sm">
              <div className="font-display text-2xl font-extrabold text-game-purple">#{index + 1}</div>
              <AvatarToken avatar={result.avatar} className="h-11 w-11" />
              <div className="min-w-0">
                <div className="truncate text-lg font-black text-game-purple">{result.playerName}</div>
                <div className="text-sm font-extrabold text-game-blue">
                  {result.solved ? `Trouve en ${result.attemptCount ?? 0} essais` : 'Pas trouve'}
                </div>
              </div>
              <div className="status-pill bg-game-yellow px-3 py-1 text-sm text-game-purple">
                {formatMs(result.solvedInMs)}
              </div>
            </div>
          ))}
        </div>
      </div>
      {isHost && (
        <button onClick={onRestart} className="btn-primary text-2xl">
          Rejouer
        </button>
      )}
    </div>
  )
}

export default function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const [searchParams] = useSearchParams()
  const hostToken = roomCode ? sessionStorage.getItem(hostTokenKey(roomCode)) : null
  const initialPlayerId =
    searchParams.get('player') ??
    (roomCode ? sessionStorage.getItem(playerIdKey(roomCode)) : null)

  const [playerId, setPlayerId] = useState<string | null>(initialPlayerId)
  const playerIdRef = useRef<string | null>(initialPlayerId)
  const [hostView, setHostView] = useState<'host' | 'player'>('host')
  const [hostPlayerName, setHostPlayerName] = useState('')
  const [hostPlayerAvatar, setHostPlayerAvatar] = useState(0)
  const [room, setRoom] = useState<PublicRoom | null>(null)
  const [results, setResults] = useState<PlayerResult[] | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [soundMuted, setSoundMuted] = useState(sound.isMuted())
  const [roomError, setRoomError] = useState<string | null>(null)
  const [playerSessionLost, setPlayerSessionLost] = useState(false)
  const [hostSessionLost, setHostSessionLost] = useState(false)
  const [socketConnected, setSocketConnected] = useState(socket.connected)
  const [showCountdown, setShowCountdown] = useState(false)
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([])
  const [recentJoinIds, setRecentJoinIds] = useState<Set<string>>(new Set())
  const roomRef = useRef<PublicRoom | null>(null)
  const feedIdRef = useRef(0)
  const prevPlayerIdsRef = useRef<string[]>([])

  const isHost = !!hostToken
  const phase = room?.phase ?? 'lobby'
  const isPlayerView = !!playerId && (!isHost || hostView === 'player')
  const currentPlayer = useMemo<PublicPlayer | null>(() => {
    return room?.players.find((p) => p.id === playerId) ?? null
  }, [room, playerId])

  // Keep roomRef in sync for use inside socket handlers
  useEffect(() => { roomRef.current = room }, [room])

  // Detect new player joins for lobby animation
  const playerIdsKey = room?.players.map(p => p.id).join(',') ?? ''
  useEffect(() => {
    if (!room) return
    const currentIds = room.players.map(p => p.id)
    const prevIds = prevPlayerIdsRef.current
    const newIds = currentIds.filter(id => !prevIds.includes(id))
    prevPlayerIdsRef.current = currentIds
    if (newIds.length > 0 && prevIds.length > 0) {
      sound.playJoin()
      setRecentJoinIds(prev => new Set([...prev, ...newIds]))
      const timer = window.setTimeout(() => {
        setRecentJoinIds(prev => {
          const next = new Set(prev)
          newIds.forEach(id => next.delete(id))
          return next
        })
      }, 2500)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerIdsKey])

  const emitWhenConnected = useCallback((event: string, payload: unknown) => {
    void sound.unlock()
    if (socket.connected) {
      socket.emit(event, payload)
      return
    }
    socket.connect()
    socket.once('connect', () => socket.emit(event, payload))
  }, [])

  useEffect(() => sound.subscribe((state) => setSoundMuted(state.muted)), [])

  useEffect(() => {
    if (phase === 'playing' && room?.endsAt && !soundMuted) {
      sound.startMusic(room.endsAt)
    } else {
      sound.stopMusic()
    }
    return () => sound.stopMusic()
  }, [phase, room?.endsAt, soundMuted])

  useEffect(() => {
    socket.connect()

    socket.on('room:state', (r: PublicRoom) => {
      setRoomError(null)
      setRoom(r)
    })

    socket.on('player:state', ({ id }: { id: string; guesses: Guess[] }) => {
      setPlayerSessionLost(false)
      playerIdRef.current = id
      setPlayerId(id)
      if (roomCode) {
        sessionStorage.setItem(playerIdKey(roomCode), id)
        sessionStorage.setItem(roomCodeKey, roomCode)
      }
      sessionStorage.setItem(currentPlayerIdKey, id)
    })

    socket.on('game:started', () => {
      setResults(null)
      setFeedEvents([])
      setFeedback(null)
      setShowCountdown(true)
      if (playerIdRef.current) setHostView('player')
      else setHostView('host')
    })

    socket.on('game:ended', ({ results: r }: { results: PlayerResult[]; targetWord?: string }) => {
      setResults(r)
    })

    socket.on('word:accepted-local', ({ guess }: { guess: Guess; solved: boolean; finished: boolean }) => {
      setFeedback({ word: guess.word, status: 'accepted' })
      sound.playAccepted(currentPlayer?.avatar ?? 0)
    })

    socket.on('word:rejected-local', ({ word, reason }: { word: string; reason: string }) => {
      sound.playRejected()
      if (reason === 'deja_envoye') {
        setFeedback({ word, status: 'duplicate', reason })
      } else {
        setFeedback({ word, status: 'rejected', reason })
      }
    })

    socket.on('word:found-public', ({ playerId, avatar, solved }: { playerId: string; avatar: number; attemptCount: number; solved: boolean }) => {
      sound.playOpponentFound(avatar)
      const player = roomRef.current?.players.find(p => p.id === playerId)
      if (player) {
        setFeedEvents(prev => [
          { id: ++feedIdRef.current, playerId, playerName: player.name, avatar, color: player.color, word: solved ? 'Trouve !' : 'Essai envoye' },
          ...prev,
        ].slice(0, 6))
      }
    })

    socket.on('error', ({ message }: { message: string }) => {
      if (message === 'Salle introuvable.' || message === 'Salon introuvable.') {
        setRoom(null)
        setResults(null)
        setRoomError('Salon introuvable')
        return
      }
      if (message === 'Session joueur introuvable.') {
        if (roomCode) {
          sessionStorage.removeItem(playerIdKey(roomCode))
        }
        sessionStorage.removeItem(currentPlayerIdKey)
        playerIdRef.current = null
        setPlayerId(null)
        setPlayerSessionLost(true)
        return
      }
      if (message === 'Session hôte introuvable.') {
        if (roomCode) {
          sessionStorage.removeItem(hostTokenKey(roomCode))
        }
        setHostSessionLost(true)
        return
      }
      console.error(message)
    })

    // Request current room state on (re)connect
    const syncRoom = () => {
      setSocketConnected(socket.connected)
      if (roomCode) {
        socket.emit('room:sync', {
          roomCode,
          playerId: playerId ?? undefined,
          hostToken: hostToken ?? undefined,
        })
      }
    }
    const markDisconnected = () => setSocketConnected(false)
    socket.on('connect', syncRoom)
    socket.on('disconnect', markDisconnected)
    syncRoom()

    return () => {
      socket.off('connect', syncRoom)
      socket.off('disconnect', markDisconnected)
      socket.off('room:state')
      socket.off('player:state')
      socket.off('game:started')
      socket.off('game:ended')
      socket.off('word:accepted-local')
      socket.off('word:rejected-local')
      socket.off('word:found-public')
      socket.off('error')
    }
  }, [roomCode, playerId, hostToken, currentPlayer?.avatar])

  const handleStart = () => {
    sound.playStart()
    emitWhenConnected('room:start', { roomCode, hostToken: hostToken ?? undefined })
  }

  const handleSettings = (settings: { durationSec?: number; difficulty?: WordDifficulty }) => {
    sound.playSetting()
    emitWhenConnected('room:settings', {
      roomCode,
      durationSec: settings.durationSec ?? room?.durationSec ?? 120,
      difficulty: settings.difficulty ?? room?.difficulty ?? 'mixed',
      scoreMode: 'race',
      hostToken: hostToken ?? undefined,
    })
  }

  const handleRestart = () => {
    emitWhenConnected('room:restart', { roomCode, hostToken: hostToken ?? undefined })
    setResults(null)
    if (isHost) setHostView('host')
  }

  const handleWordSubmit = useCallback((word: string) => {
    emitWhenConnected('word:submit', { roomCode, playerId, word })
  }, [emitWhenConnected, roomCode, playerId])

  const handleHostJoinAsPlayer = () => {
    const playerName = hostPlayerName.trim()
    if (!roomCode || !playerName) return
    sound.playJoin()
    emitWhenConnected('room:join', { roomCode, playerName, avatar: hostPlayerAvatar })
  }

  const handleAvatarChange = (avatar: number) => {
    if (!roomCode || !playerId) {
      setHostPlayerAvatar(avatar)
      return
    }
    emitWhenConnected('player:avatar', { roomCode, playerId, avatar })
  };

  if (roomError) {
    return (
      <div className="game-screen flex min-h-dvh items-center justify-center p-6">
        <div className="game-content cartoon-card flex w-full max-w-md flex-col items-center gap-5 p-6 text-center">
          <GameLogo size="sm" />
          <div>
            <div className="font-display text-4xl font-black text-game-purple">{roomError}</div>
            <div className="mt-2 text-lg font-extrabold text-game-blue">
              Le salon {roomCode} n'existe plus ou le code est incorrect.
            </div>
          </div>
          <Link to="/" className="btn-primary w-full py-3 text-xl">
            Retour a l'accueil
          </Link>
        </div>
      </div>
    )
  }

  if (playerSessionLost) {
    return (
      <div className="game-screen flex min-h-dvh items-center justify-center p-6">
        <div className="game-content cartoon-card flex w-full max-w-md flex-col items-center gap-5 p-6 text-center">
          <GameLogo size="sm" />
          <div>
            <div className="font-display text-4xl font-black text-game-purple">Session perdue</div>
            <div className="mt-2 text-lg font-extrabold text-game-blue">
              Ton ancienne session joueur n'est plus reconnue dans le salon {roomCode}.
            </div>
          </div>
          <Link to={`/join/${roomCode}`} className="btn-primary w-full py-3 text-xl">
            Rejoindre a nouveau
          </Link>
        </div>
      </div>
    )
  }

  if (hostSessionLost) {
    return (
      <div className="game-screen flex min-h-dvh items-center justify-center p-6">
        <div className="game-content cartoon-card flex w-full max-w-md flex-col items-center gap-5 p-6 text-center">
          <GameLogo size="sm" />
          <div>
            <div className="font-display text-4xl font-black text-game-purple">Session hôte perdue</div>
            <div className="mt-2 text-lg font-extrabold text-game-blue">
              Ce navigateur ne peut plus administrer le salon {roomCode}.
            </div>
          </div>
          <Link to="/" className="btn-primary w-full py-3 text-xl">
            Creer un nouveau salon
          </Link>
        </div>
      </div>
    )
  }

  // ─── MOBILE PLAYER VIEW ───────────────────────────────────────────────────
  if (isPlayerView) {
    if (phase === 'results') {
      return <ResultsPanel room={room} results={results} onRestart={handleRestart} isHost={isHost} />
    }

    return (
      <div className="game-screen flex flex-col items-stretch">
        {showCountdown && phase === 'playing' && <CountdownOverlay onDone={() => setShowCountdown(false)} />}
        <SoundToggle className="absolute bottom-3 right-3 z-20 px-2 py-1 text-xs" />
        {!socketConnected && (
          <div className="absolute left-3 top-3 z-30 rounded-full border-[3px] border-game-purple bg-game-yellow px-3 py-1 text-xs font-black text-game-purple shadow-cartoon-sm">
            Reconnexion...
          </div>
        )}
        {/* Centered column for desktop */}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        {/* Header */}
        <div className="game-content flex items-center justify-between gap-2 px-3 py-3">
          <div className="status-pill bg-game-yellow px-3 py-2 text-lg text-game-purple">{roomCode}</div>
          <div className="min-w-0 truncate rounded-full bg-white px-3 py-2 text-sm font-black text-game-purple shadow-cartoon-sm">
            {currentPlayer?.name ?? ''}
          </div>
          {phase === 'playing' && room?.endsAt && (
            <div className="scale-[.62] origin-right">
              <Timer endsAt={room.endsAt} />
            </div>
          )}
        </div>

        {/* Playing phase */}
        {phase === 'playing' && (
          <div className="game-content flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 items-center justify-center overflow-auto p-2 pb-0">
              <WordGrid
                guesses={currentPlayer?.guesses ?? []}
                onSubmit={handleWordSubmit}
                lastFeedback={feedback}
                disabled={!currentPlayer || currentPlayer.finished}
              />
            </div>

            <MobilePlayerWordCounts players={room?.players ?? []} />
          </div>
        )}

        {/* Lobby */}
        {phase === 'lobby' && (
          <div className="game-content flex flex-1 flex-col items-center justify-center gap-6 p-6">
            <GameLogo size="sm" />
            <div className="cartoon-card w-full max-w-sm p-6 text-center">
              <div className="text-2xl font-black text-game-purple">En attente du lancement...</div>
              <div className="mt-2 font-extrabold text-game-blue">
                {isHost ? 'Tu peux revenir au salon pour lancer la partie' : "L'hôte prépare la grille"}
              </div>
              {currentPlayer && (
                <div className="mt-5 text-left">
                  <div className="mb-2 text-xs font-black uppercase text-game-purple">Avatar</div>
                  <AvatarPicker value={currentPlayer.avatar} onChange={handleAvatarChange} compact />
                </div>
              )}
            </div>
            <div className="cartoon-panel w-full max-w-sm p-4">
              <div className="text-sm font-black uppercase text-game-magenta">Astuce</div>
              <div className="mt-1 text-lg font-extrabold text-game-purple">
                Chaque essai doit faire exactement 5 lettres.
              </div>
            </div>
          </div>
        )}

        </div>{/* end centered column */}
      </div>
    )
  }

  // ─── HOST / TV VIEW ───────────────────────────────────────────────────────
  return (
    <div className="game-screen flex flex-col lg:h-screen lg:overflow-hidden">
      <SoundToggle className="absolute right-4 top-4 z-20" />
      {!socketConnected && (
        <div className="absolute left-4 top-4 z-30 rounded-full border-[3px] border-game-purple bg-game-yellow px-4 py-2 text-sm font-black text-game-purple shadow-cartoon-sm">
          Reconnexion...
        </div>
      )}
      {/* ── LOBBY ── */}
      {phase === 'lobby' && (
        <div className="game-content flex flex-1 flex-col items-stretch gap-5 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Logo centré en haut sur desktop */}
          <div className="flex justify-center">
            <GameLogo size="room" />
          </div>

          {/* Trois colonnes sur desktop */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-center lg:gap-8">

            {/* Col 1 : QR code */}
            <div className="flex flex-col items-center gap-4 lg:shrink-0 lg:pt-1">
              {roomCode && <QRJoin roomCode={roomCode} />}
            </div>

            {/* Col 2 : Paramètres */}
            <div className="flex w-full flex-col gap-4 lg:w-[300px] lg:shrink-0">
              <div className="cartoon-panel flex flex-col gap-4 p-4 sm:p-5">
                <div className="status-pill self-start bg-game-purple px-4 py-1 text-white">Parametres</div>
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-black uppercase text-game-purple">Difficulte</div>
                  <div className="grid grid-cols-2 gap-2">
                    {DIFFICULTIES.map(({ label, value }) => (
                      <button
                        key={value}
                        onClick={() => handleSettings({ difficulty: value })}
                        className={`segmented-option flex-1 text-sm ${
                          (room?.difficulty ?? 'mixed') === value ? 'segmented-option-selected text-game-purple' : 'text-game-purple'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-black uppercase text-game-purple">Durée</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[{label:'⚡ 1 min', s:60},{label:'2 min', s:120},{label:'3 min', s:180},{label:'5 min', s:300}].map(({label, s}) => (
                      <button
                        key={s}
                        onClick={() => handleSettings({ durationSec: s })}
                        className={`segmented-option flex-1 text-sm ${
                          (room?.durationSec ?? 120) === s ? 'segmented-option-selected text-game-purple' : 'text-game-purple'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border-[3px] border-game-purple bg-white px-3 py-2 text-sm font-extrabold text-game-purple shadow-cartoon-sm">
                  Le mot est tire dans la liste {DIFFICULTIES.find(item => item.value === (room?.difficulty ?? 'mixed'))?.label.toLowerCase()}.
                </div>
              </div>
            </div>

            {/* Col 3 : Tu participes + Joueurs + Lancer */}
            <div className="flex w-full flex-col gap-4 lg:w-[320px] lg:shrink-0">
              {isHost && (
                <div className="cartoon-card p-4">
                  {currentPlayer ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <AvatarToken avatar={currentPlayer.avatar} className="h-14 w-14" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-black uppercase text-game-purple">Tu participes aussi</div>
                          <div className="truncate text-lg font-black text-game-blue">{currentPlayer.name}</div>
                        </div>
                      </div>
                      <AvatarPicker value={currentPlayer.avatar} onChange={handleAvatarChange} compact />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div>
                        <div className="text-sm font-black uppercase text-game-magenta">Depuis cet appareil</div>
                        <div className="text-lg font-black text-game-purple">Je participe aussi</div>
                      </div>
                      <AvatarPicker value={hostPlayerAvatar} onChange={setHostPlayerAvatar} compact />
                      <div className="flex gap-2">
                        <input
                          value={hostPlayerName}
                          onChange={(e) => setHostPlayerName(e.target.value.slice(0, 20))}
                          onKeyDown={(e) => e.key === 'Enter' && handleHostJoinAsPlayer()}
                          placeholder="Ton pseudo"
                          maxLength={20}
                          className="min-w-0 flex-1 rounded-2xl border-[3px] border-game-purple bg-white px-3 py-3 text-base font-black text-game-purple placeholder-game-purple/45 shadow-cartoon-sm outline-none"
                        />
                        <button
                          onClick={handleHostJoinAsPlayer}
                          disabled={!hostPlayerName.trim()}
                          className="btn-primary px-4 py-3 text-base"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="status-pill bg-game-yellow px-4 py-1 text-xl text-game-purple">Joueurs</div>
                <div className="font-display text-3xl font-extrabold text-game-purple">
                  {room?.players.length ?? 0}
                </div>
              </div>
              <div className="max-h-[280px] overflow-auto pr-1">
                {room && room.players.length > 0 ? (
                  <PlayerList players={room.players} recentJoinIds={recentJoinIds} />
                ) : (
                  <div className="rounded-[22px] border-[3px] border-dashed border-game-purple/30 py-6 text-center text-base font-black text-game-purple/40">
                    En attente de joueurs...
                  </div>
                )}
              </div>

              <button
                onClick={handleStart}
                disabled={(room?.players.length ?? 0) === 0}
                className="btn-primary py-5 text-3xl"
              >
                Lancer la partie !
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === 'playing' && room?.endsAt && (
        <>
          {showCountdown && <CountdownOverlay onDone={() => setShowCountdown(false)} />}
          <div className="game-content flex flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:gap-6 lg:overflow-hidden lg:p-6">
            {/* Left: player scores */}
            <div className="cartoon-panel flex shrink-0 flex-col gap-4 p-4 lg:w-64">
              <div className="status-pill self-start bg-game-purple px-4 py-1 text-white">Scores</div>
              <PlayingScoreCards players={room.players} />
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
              <Timer endsAt={room.endsAt} />
              <div className="cartoon-card max-w-xl p-6">
                <div className="text-sm font-black uppercase text-game-magenta">Course commune</div>
                <div className="mt-2 font-display text-5xl font-extrabold text-game-purple">5 lettres</div>
                <div className="mt-2 text-lg font-black text-game-blue">
                  Le mot sera revele a la fin.
                </div>
              </div>
            </div>

            {/* Right: action + event feed */}
            <div className="flex shrink-0 flex-col gap-4 lg:w-64">
              {isHost && currentPlayer && (
                <button
                  onClick={() => {
                    sound.playUiClick()
                    setHostView('player')
                  }}
                  className="btn-primary text-xl"
                >
                  Jouer mes mots
                </button>
              )}
              <div className="cartoon-panel flex flex-col gap-3 p-4">
                <div className="status-pill self-start bg-game-purple px-3 py-1 text-sm text-white">
                  En direct
                </div>
                {feedEvents.length === 0 ? (
                  <div className="py-3 text-center text-sm font-black text-game-purple/40">
                    Les mots trouvés<br />apparaissent ici
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {feedEvents.map((ev, i) => (
                      <div
                        key={ev.id}
                        className="flex animate-fade-slide-up items-center gap-2 rounded-2xl border-2 border-game-purple px-3 py-2 shadow-cartoon-sm"
                        style={{ background: ev.color, opacity: i === 0 ? 1 : Math.max(0.45, 1 - i * 0.12) }}
                      >
                        <AvatarToken avatar={ev.avatar} className="h-8 w-8 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[10px] font-black uppercase tracking-wide text-game-purple/60">
                            {ev.playerName}
                          </div>
                          <div className="truncate font-display text-base font-extrabold leading-none text-game-purple">
                            {ev.word}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {phase === 'results' && (
        <ResultsPanel room={room} results={results} onRestart={handleRestart} isHost={isHost} />
      )}
    </div>
  )
}
