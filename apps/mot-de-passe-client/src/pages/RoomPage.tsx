import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { socket } from '../socket'
import type { PublicRoom, PlayerResult, RoundSummary, Theme, Difficulty, GameMode } from '../types'
import AvatarPicker from '../components/AvatarPicker'
import AvatarToken from '../components/AvatarToken'
import QRJoin from '../components/QRJoin'
import Timer from '../components/Timer'
import PlayerList from '../components/PlayerList'
import ResultsCinematic from '../components/ResultsCinematic'
import GameLogo from '../components/GameLogo'
import SoundToggle from '../components/SoundToggle'
import { sound } from '../audio/sound'
import { currentPlayerIdKey, hostTokenKey, playerIdKey, roomCodeKey } from '../storage'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'mix', label: 'Mix' },
  { value: 'quotidien', label: 'Quotidien' },
  { value: 'animaux', label: 'Animaux' },
  { value: 'nourriture', label: 'Nourriture' },
  { value: 'cinema', label: 'Cinéma' },
  { value: 'sport', label: 'Sport' },
  { value: 'geographie', label: 'Géographie' },
  { value: 'objets', label: 'Objets' },
  { value: 'absurde', label: 'Absurde' },
]

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'facile', label: 'Facile' },
  { value: 'normal', label: 'Normal' },
  { value: 'expert', label: 'Expert' },
]

const MODES: { value: GameMode; label: string; desc: string }[] = [
  { value: 'irl', label: 'IRL', desc: 'Indices à voix haute, le téléphone valide' },
  { value: 'online', label: 'En ligne', desc: 'Indices tapés dans l\'app, détection auto' },
]

function CountdownOverlay({ onDone }: { onDone: () => void }) {
  const [num, setNum] = useState(3)

  useEffect(() => {
    sound.playCountdownTick(3)
    const timers = [
      window.setTimeout(() => { setNum(2); sound.playCountdownTick(2) }, 700),
      window.setTimeout(() => { setNum(1); sound.playCountdownTick(1) }, 1400),
      window.setTimeout(() => { setNum(0); sound.playCountdownTick(0) }, 2100),
      window.setTimeout(() => onDone(), 2600),
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
            style={{ fontSize: 'clamp(7rem,30vw,18rem)', WebkitTextStroke: '6px #17012E', color: '#FFD94A' }}
          >
            {num}
          </div>
        ) : (
          <div
            className="cartoon-title leading-none"
            style={{ fontSize: 'clamp(4.5rem,22vw,13rem)', WebkitTextStroke: '5px #17012E', color: '#39E5B7' }}
          >
            GO !
          </div>
        )}
      </div>
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
  const [secret, setSecret] = useState<string | null>(null)
  const [clueInput, setClueInput] = useState('')
  const [guessInput, setGuessInput] = useState('')
  const [roundEnded, setRoundEnded] = useState<{ status: string; secret: string } | null>(null)
  const [soundMuted, setSoundMuted] = useState(sound.isMuted())
  const [roomError, setRoomError] = useState<string | null>(null)
  const [playerSessionLost, setPlayerSessionLost] = useState(false)
  const [hostSessionLost, setHostSessionLost] = useState(false)
  const [socketConnected, setSocketConnected] = useState(socket.connected)
  const [showCountdown, setShowCountdown] = useState(false)

  const isHost = !!hostToken
  const currentPlayer = room?.players.find(p => p.id === playerId)
  const phase = room?.phase ?? 'lobby'
  const isPlayerView = !!playerId && (!isHost || hostView === 'player')

  // Redirect non-host visitors without a player session to the join page
  const navigate = useNavigate()
  useEffect(() => {
    if (!roomCode) return
    if (!hostToken && !playerId) {
      navigate(`/join/${roomCode}`, { replace: true })
    }
  }, [roomCode, hostToken, playerId, navigate])

  const roomRef = useRef<PublicRoom | null>(null)
  useEffect(() => { roomRef.current = room }, [room])

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
    socket.connect()

    socket.on('room:state', (r: PublicRoom) => {
      setRoomError(null)
      setRoom(r)
      // Reset round-ended overlay when a new round starts
      if (r.currentRound && r.currentRound.status === 'active') {
        setRoundEnded(null)
      }
    })

    socket.on('player:state', ({ id }: { id: string }) => {
      setPlayerSessionLost(false)
      playerIdRef.current = id
      setPlayerId(id)
      if (roomCode) {
        sessionStorage.setItem(playerIdKey(roomCode), id)
        sessionStorage.setItem(roomCodeKey, roomCode)
      }
      sessionStorage.setItem(currentPlayerIdKey, id)
    })

    socket.on('round:secret', ({ secret: s }: { secret: string }) => {
      setSecret(s)
      setShowCountdown(true)
    })

    socket.on('round:started', () => {
      setRoundEnded(null)
    })

    socket.on('round:ended', ({ round }: { round: RoundSummary }) => {
      setRoundEnded({ status: round.status, secret: round.secret })
      if (round.status === 'found') sound.playFound()
      else if (round.status === 'forbidden') sound.playForbidden()
      else sound.playPass()
    })

    socket.on('game:ended', ({ results: r }: { results: PlayerResult[] }) => {
      setResults(r)
    })

    socket.on('error', ({ message }: { message: string }) => {
      if (message === 'Salle introuvable.') {
        setRoom(null)
        setResults(null)
        setRoomError('Salon introuvable')
        return
      }
      if (message === 'Session joueur introuvable.') {
        if (roomCode) sessionStorage.removeItem(playerIdKey(roomCode))
        sessionStorage.removeItem(currentPlayerIdKey)
        playerIdRef.current = null
        setPlayerId(null)
        setPlayerSessionLost(true)
        return
      }
      if (message === 'Session hôte introuvable.') {
        if (roomCode) sessionStorage.removeItem(hostTokenKey(roomCode))
        setHostSessionLost(true)
        return
      }
      console.error(message)
    })

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
      socket.off('round:secret')
      socket.off('round:started')
      socket.off('round:ended')
      socket.off('game:ended')
      socket.off('error')
    }
  }, [roomCode, playerId, hostToken])

  // Silence unused warning — soundMuted tracked via subscription
  void soundMuted

  const handleStart = () => {
    sound.playStart()
    emitWhenConnected('room:start', { roomCode, hostToken: hostToken ?? undefined })
  }

  const handleSettings = (partial: { theme?: Theme; difficulty?: Difficulty; mode?: GameMode; maxClues?: number; roundsPerPlayer?: number; roundSec?: number }) => {
    sound.playSetting()
    emitWhenConnected('room:settings', {
      roomCode,
      ...partial,
      hostToken: hostToken ?? undefined,
    })
  }

  const handleRestart = () => {
    emitWhenConnected('room:restart', { roomCode, hostToken: hostToken ?? undefined })
    setResults(null)
    setSecret(null)
    setRoundEnded(null)
    if (isHost) setHostView('host')
  }

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
  }

  const submitClue = () => {
    const text = clueInput.trim()
    if (!text || !playerId || !roomCode) return
    const event = room?.mode === 'online' ? 'round:clue' : 'round:irl-clue'
    emitWhenConnected(event, { roomCode, playerId, clue: text })
    setClueInput('')
  }

  const submitGuess = () => {
    const text = guessInput.trim()
    if (!text || !playerId || !roomCode) return
    emitWhenConnected('round:guess', { roomCode, playerId, guess: text })
    setGuessInput('')
  }

  const markFound = () => {
    if (!playerId || !roomCode) return
    sound.playFound()
    emitWhenConnected('round:found', { roomCode, playerId })
  }

  const passRound = () => {
    if (!playerId || !roomCode) return
    sound.playPass()
    emitWhenConnected('round:pass', { roomCode, playerId })
  }

  // ─── Error screens ──────────────────────────────────────────────────────
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
            Retour à l'accueil
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
            Rejoindre à nouveau
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
            Créer un nouveau salon
          </Link>
        </div>
      </div>
    )
  }

  // ─── MOBILE PLAYER VIEW ──────────────────────────────────────────────────
  if (isPlayerView) {
    if (phase === 'results' && results && room) {
      return <ResultsCinematic results={results} history={room.history} onDone={handleRestart} hideReplay={!isHost} roomCode={isHost ? roomCode : undefined} />
    }

    const currentRound = room?.currentRound
    const isGiver = currentRound?.giverId === playerId
    const isGuesser = currentRound?.guesserId === playerId
    const roundActive = currentRound?.status === 'active'

    return (
      <div className="game-screen flex flex-col items-stretch">
        {showCountdown && phase === 'playing' && <CountdownOverlay onDone={() => setShowCountdown(false)} />}
        <SoundToggle className="absolute bottom-3 right-3 z-20 px-2 py-1 text-xs" />
        {!socketConnected && (
          <div className="absolute left-3 top-3 z-30 rounded-full border-[3px] border-game-purple bg-game-yellow px-3 py-1 text-xs font-black text-game-purple shadow-cartoon-sm">
            Reconnexion...
          </div>
        )}

        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          {/* Header */}
          <div className="game-content flex items-center justify-between gap-2 px-3 py-3">
            <div className="status-pill bg-game-yellow px-3 py-2 text-lg text-game-purple">{roomCode}</div>
            <div className="min-w-0 truncate rounded-full bg-white px-3 py-2 text-sm font-black text-game-purple shadow-cartoon-sm">
              {currentPlayer?.name ?? ''}
            </div>
            {phase === 'playing' && currentRound?.endsAt && (
              <div className="scale-[.62] origin-right">
                <Timer endsAt={currentRound.endsAt} />
              </div>
            )}
          </div>

          {/* Round ended overlay */}
          {phase === 'playing' && roundEnded && (
            <div className="game-content flex flex-1 flex-col items-center justify-center gap-5 p-6">
              <div
                className={`cartoon-card w-full max-w-sm p-6 text-center ${
                  roundEnded.status === 'found' ? 'bg-game-green' : roundEnded.status === 'forbidden' ? 'bg-game-red' : 'bg-game-orange'
                }`}
              >
                <div className="text-sm font-black uppercase text-game-purple/70">Mot secret</div>
                <div className="cartoon-title-sm font-display text-5xl text-game-purple">{roundEnded.secret}</div>
                <div className="mt-3 text-xl font-black text-game-purple">
                  {roundEnded.status === 'found' && 'Trouvé ! 🎉'}
                  {roundEnded.status === 'passed' && 'Passé'}
                  {roundEnded.status === 'forbidden' && 'Indice interdit'}
                  {roundEnded.status === 'timeout' && 'Temps écoulé'}
                </div>
              </div>
            </div>
          )}

          {/* Playing — Giver view */}
          {phase === 'playing' && roundActive && isGiver && !roundEnded && (
            <div className="game-content flex flex-1 flex-col gap-4 p-4">
              {secret && (
                <div className="cartoon-card w-full p-5 text-center">
                  <div className="text-sm font-black uppercase text-game-magenta">Mot à faire deviner</div>
                  <div className="cartoon-title-sm mt-1 font-display text-6xl text-game-yellow">{secret}</div>
                </div>
              )}

              {room?.mode === 'online' ? (
                <>
                  <div className="cartoon-panel w-full p-4">
                    <div className="mb-2 text-sm font-black uppercase text-game-purple">Donne un indice (1 mot)</div>
                    <div className="flex gap-2">
                      <input
                        value={clueInput}
                        onChange={(e) => setClueInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submitClue()}
                        placeholder="Ex : vol"
                        className="min-w-0 flex-1 rounded-2xl border-[3px] border-game-purple bg-white px-3 py-3 text-lg font-black text-game-purple placeholder-game-purple/40 shadow-cartoon-sm outline-none focus:bg-game-lilac"
                      />
                      <button onClick={submitClue} disabled={!clueInput.trim()} className="btn-primary px-5 py-3 text-lg">
                        Envoyer
                      </button>
                    </div>
                  </div>

                  <div className="cartoon-panel w-full p-4">
                    <div className="mb-2 text-sm font-black uppercase text-game-purple">Indices donnés</div>
                    {currentRound && currentRound.clues.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {currentRound.clues.map((c, i) => (
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
                    ) : (
                      <div className="text-sm font-black text-game-purple/40">Aucun indice encore</div>
                    )}
                  </div>
                </>
              ) : null}

              <div className="flex gap-3">
                <button onClick={markFound} className="btn-primary flex-1 py-4 text-xl">✅ Trouvé</button>
                <button onClick={passRound} className="btn-danger flex-1 py-4 text-xl">Passer</button>
              </div>
            </div>
          )}

          {/* Playing — Guesser view */}
          {phase === 'playing' && roundActive && isGuesser && !roundEnded && (
            <div className="game-content flex flex-1 flex-col gap-4 p-4">
              <div className="cartoon-card w-full p-5 text-center">
                <div className="text-sm font-black uppercase text-game-violet">À toi de deviner</div>
                <div className="mt-1 text-lg font-extrabold text-game-purple">
                  {room?.mode === 'online'
                    ? 'Ton partenaire t\'envoie des indices.'
                    : 'Écoute les indices de ton partenaire.'}
                </div>
              </div>

              <div className="cartoon-panel w-full p-4">
                <div className="mb-2 text-sm font-black uppercase text-game-purple">Indices</div>
                {currentRound && currentRound.clues.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {currentRound.clues.map((c, i) => (
                      <span
                        key={i}
                        className="animate-word-burst rounded-full border-2 border-game-purple bg-game-yellow px-3 py-1 text-sm font-black text-game-purple shadow-cartoon-sm"
                      >
                        {c.text}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm font-black text-game-purple/40">En attente du premier indice...</div>
                )}
              </div>

              {room?.mode === 'online' && (
                <div className="cartoon-panel w-full p-4">
                  <div className="mb-2 text-sm font-black uppercase text-game-purple">Ta réponse</div>
                  <div className="flex gap-2">
                    <input
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitGuess()}
                      placeholder="Ex : avion"
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      className="min-w-0 flex-1 rounded-2xl border-[3px] border-game-purple bg-white px-3 py-3 text-lg font-black text-game-purple placeholder-game-purple/40 shadow-cartoon-sm outline-none focus:bg-game-lilac"
                    />
                    <button onClick={submitGuess} disabled={!guessInput.trim()} className="btn-primary px-5 py-3 text-lg">
                      Valider
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Playing — spectator / waiting */}
          {phase === 'playing' && roundActive && !isGiver && !isGuesser && !roundEnded && (
            <div className="game-content flex flex-1 flex-col items-center justify-center gap-4 p-6">
              <div className="cartoon-card w-full max-w-sm p-6 text-center">
                <div className="text-2xl font-black text-game-purple">Manche en cours...</div>
                <div className="mt-2 font-extrabold text-game-blue">
                  Manche {(currentRound?.roundIndex ?? 0) + 1} / {room?.totalRounds}
                </div>
              </div>
            </div>
          )}

          {/* Lobby on mobile */}
          {phase === 'lobby' && (
            <div className="game-content flex flex-1 flex-col items-center justify-center gap-6 p-6">
              <GameLogo size="sm" />
              <div className="cartoon-card w-full max-w-sm p-6 text-center">
                <div className="text-2xl font-black text-game-purple">En attente du lancement...</div>
                <div className="mt-2 font-extrabold text-game-blue">
                  {isHost ? 'Reviens au salon pour lancer' : "L'hôte prépare la partie"}
                </div>
                {currentPlayer && (
                  <div className="mt-5 text-left">
                    <div className="mb-2 text-xs font-black uppercase text-game-purple">Avatar</div>
                    <AvatarPicker value={currentPlayer.avatar} onChange={handleAvatarChange} compact />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── HOST / TV VIEW ──────────────────────────────────────────────────────
  return (
    <div className="game-screen flex flex-col lg:h-screen lg:overflow-hidden">
      <SoundToggle className="absolute right-4 top-4 z-20" />
      {!socketConnected && (
        <div className="absolute left-4 top-4 z-30 rounded-full border-[3px] border-game-purple bg-game-yellow px-4 py-2 text-sm font-black text-game-purple shadow-cartoon-sm">
          Reconnexion...
        </div>
      )}

      {/* LOBBY */}
      {phase === 'lobby' && (
        <div className="game-content flex flex-1 flex-col items-stretch gap-5 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="flex justify-center">
            <GameLogo size="room" subtitle="Duel de mots à deux" />
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-center lg:gap-8">
            {/* QR + code */}
            <div className="flex flex-col items-center gap-4 lg:shrink-0 lg:pt-1">
              {roomCode && <QRJoin roomCode={roomCode} />}
            </div>

            {/* Settings */}
            <div className="flex w-full flex-col gap-4 lg:w-[320px] lg:shrink-0">
              <div className="cartoon-panel flex flex-col gap-4 p-4 sm:p-5">
                <div className="status-pill self-start bg-game-purple px-4 py-1 text-white">Paramètres</div>

                <div className="flex flex-col gap-2">
                  <div className="text-sm font-black uppercase text-game-purple">Mode</div>
                  <div className="grid grid-cols-2 gap-2">
                    {MODES.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => handleSettings({ mode: m.value })}
                        className={`segmented-option flex-1 text-sm ${(room?.mode ?? 'irl') === m.value ? 'segmented-option-selected text-game-purple' : 'text-game-purple'}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs font-extrabold text-game-purple/60">
                    {MODES.find(m => m.value === (room?.mode ?? 'irl'))?.desc}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-sm font-black uppercase text-game-purple">Thème</div>
                  <div className="grid grid-cols-3 gap-2">
                    {THEMES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => handleSettings({ theme: t.value })}
                        className={`segmented-option flex-1 text-xs ${(room?.theme ?? 'mix') === t.value ? 'segmented-option-selected text-game-purple' : 'text-game-purple'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-sm font-black uppercase text-game-purple">Difficulté</div>
                  <div className="grid grid-cols-3 gap-2">
                    {DIFFICULTIES.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => handleSettings({ difficulty: d.value })}
                        className={`segmented-option flex-1 text-sm ${(room?.difficulty ?? 'normal') === d.value ? 'segmented-option-selected text-game-purple' : 'text-game-purple'}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-sm font-black uppercase text-game-purple">Indices max</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 4, 5, 6].map(n => (
                      <button
                        key={n}
                        onClick={() => handleSettings({ maxClues: n })}
                        className={`segmented-option flex-1 text-sm ${(room?.maxClues ?? 5) === n ? 'segmented-option-selected text-game-purple' : 'text-game-purple'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-sm font-black uppercase text-game-purple">Manches par joueur</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 5, 7, 10].map(n => (
                      <button
                        key={n}
                        onClick={() => handleSettings({ roundsPerPlayer: n })}
                        className={`segmented-option flex-1 text-sm ${(room?.roundsPerPlayer ?? 5) === n ? 'segmented-option-selected text-game-purple' : 'text-game-purple'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-sm font-black uppercase text-game-purple">Temps par manche</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[30, 45, 60, 90].map(n => (
                      <button
                        key={n}
                        onClick={() => handleSettings({ roundSec: n })}
                        className={`segmented-option flex-1 text-sm ${(room?.roundSec ?? 60) === n ? 'segmented-option-selected text-game-purple' : 'text-game-purple'}`}
                      >
                        {n}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Players + start */}
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
                  {room?.players.length ?? 0} / 2
                </div>
              </div>

              <div className="max-h-[280px] overflow-auto pr-1">
                {room && room.players.length > 0 ? (
                  <PlayerList players={room.players} showScore />
                ) : (
                  <div className="rounded-[22px] border-[3px] border-dashed border-game-purple/30 py-6 text-center text-base font-black text-game-purple/40">
                    En attente de joueurs...
                  </div>
                )}
              </div>

              <button
                onClick={handleStart}
                disabled={(room?.players.length ?? 0) < 2}
                className="btn-primary py-5 text-3xl"
              >
                Lancer la partie !
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING — TV scoreboard */}
      {phase === 'playing' && room?.currentRound && (
        <>
          {showCountdown && <CountdownOverlay onDone={() => setShowCountdown(false)} />}
          <div className="game-content flex flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:gap-6 lg:overflow-hidden lg:p-6">
            {/* Left: scores */}
            <div className="cartoon-panel flex shrink-0 flex-col gap-4 p-4 lg:w-64">
              <div className="status-pill self-start bg-game-purple px-4 py-1 text-white">Scores</div>
              <div className="flex flex-col gap-3">
                {room.players.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border-[3px] border-game-purple p-3 shadow-cartoon-sm"
                    style={{ background: p.color }}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <AvatarToken avatar={p.avatar} className="h-10 w-10 rounded-xl" />
                      <span className="truncate text-base font-black text-game-purple">{p.name}</span>
                    </div>
                    <span className="font-display text-3xl font-extrabold leading-none text-game-purple">
                      {p.score}
                    </span>
                  </div>
                ))}
              </div>

              <div className="status-pill self-start bg-game-magenta px-4 py-1 text-sm text-white">
                Manche {(room.currentRound.roundIndex ?? 0) + 1} / {room.totalRounds}
              </div>
            </div>

            {/* Center: round info (without revealing secret) */}
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              {room.currentRound.endsAt && <Timer endsAt={room.currentRound.endsAt} />}

              <div className="cartoon-card max-w-md p-6 text-center">
                <div className="text-sm font-black uppercase text-game-violet">Indices</div>
                <div className="mt-1 font-display text-5xl font-black text-game-purple">
                  {room.currentRound.clueCount} / {room.maxClues}
                </div>
              </div>

              {room.currentRound.clues.length > 0 && (
                <div className="flex max-w-lg flex-wrap justify-center gap-2">
                  {room.currentRound.clues.map((c, i) => (
                    <span
                      key={i}
                      className={`animate-word-burst rounded-full border-2 border-game-purple px-3 py-1 text-sm font-black shadow-cartoon-sm ${
                        c.forbidden ? 'bg-game-red text-white' : 'bg-white text-game-purple'
                      }`}
                    >
                      {c.text}
                    </span>
                  ))}
                </div>
              )}

              <div className="cartoon-panel max-w-md p-4 text-center">
                <div className="text-xs font-black uppercase text-game-purple">Thème</div>
                <div className="text-xl font-black text-game-purple">
                  {THEMES.find(t => t.value === room.currentRound?.theme)?.label ?? room.currentRound.theme}
                </div>
              </div>
            </div>

            {/* Right: switch to player view */}
            <div className="flex shrink-0 flex-col gap-4 lg:w-64">
              {isHost && currentPlayer && (
                <button
                  onClick={() => {
                    sound.playUiClick()
                    setHostView('player')
                  }}
                  className="btn-primary text-xl"
                >
                  Ma manche
                </button>
              )}
              <div className="cartoon-panel flex flex-col gap-3 p-4">
                <div className="status-pill self-start bg-game-purple px-3 py-1 text-sm text-white">
                  Qui joue ?
                </div>
                {(() => {
                  const giver = room.players.find(p => p.id === room.currentRound?.giverId)
                  const guesser = room.players.find(p => p.id === room.currentRound?.guesserId)
                  return (
                    <div className="flex items-center justify-around gap-3">
                      {giver && (
                        <div className="flex flex-col items-center gap-1">
                          <AvatarToken avatar={giver.avatar} className="h-12 w-12" />
                          <span className="text-xs font-black text-game-purple">Donne</span>
                          <span className="text-sm font-black text-game-purple">{giver.name}</span>
                        </div>
                      )}
                      <span className="text-2xl font-black text-game-purple">→</span>
                      {guesser && (
                        <div className="flex flex-col items-center gap-1">
                          <AvatarToken avatar={guesser.avatar} className="h-12 w-12" />
                          <span className="text-xs font-black text-game-purple">Devine</span>
                          <span className="text-sm font-black text-game-purple">{guesser.name}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </>
      )}

      {/* RESULTS */}
      {phase === 'results' && results && room && (
        <ResultsCinematic results={results} history={room.history} onDone={handleRestart} roomCode={roomCode} />
      )}
    </div>
  )
}
