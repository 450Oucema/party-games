import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../socket'
import GameLogo from '../components/GameLogo'
import { sound } from '../audio/sound'
import { hostTokenKey } from '../storage'

export default function HostPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [joinCode, setJoinCode] = useState('')

  useEffect(() => {
    socket.connect()

    socket.on('room:created', ({ roomCode, hostToken }: { roomCode: string; hostToken: string }) => {
      setLoading(false)
      setError('')
      sessionStorage.setItem(hostTokenKey(roomCode), hostToken)
      navigate(`/room/${roomCode}`)
    })

    socket.on('connect_error', () => {
      setLoading(false)
      setError('Serveur introuvable. Verifie que le serveur dev est lance.')
    })

    socket.on('error', ({ message }: { message: string }) => {
      setLoading(false)
      setError(message)
    })

    return () => {
      socket.off('room:created')
      socket.off('connect_error')
      socket.off('error')
    }
  }, [navigate])

  const createRoom = () => {
    void sound.unlock()
    sound.playJoin()
    setLoading(true)
    setError('')
    if (socket.connected) {
      socket.emit('room:create')
      return
    }
    socket.connect()
    socket.once('connect', () => socket.emit('room:create'))
    window.setTimeout(() => {
      setLoading((current) => {
        if (current) setError('Impossible de creer la partie. Verifie le serveur dev.')
        return false
      })
    }, 5000)
  }

  const joinWithCode = () => {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    sound.playUiClick()
    navigate(`/join/${code}`)
  }

  return (
    <div className="game-screen flex flex-col items-center justify-center gap-8 overflow-y-auto p-4 pb-safe sm:p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 28 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full border-2 border-game-purple opacity-70"
            style={{
              width: Math.random() * 12 + 6,
              height: Math.random() * 12 + 6,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: ['#FFD94A', '#FF4DB8', '#39E5B7', '#E9D6FF'][i % 4],
              animation: `bounceSoft ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="game-content flex w-full max-w-md flex-col items-center gap-6 py-6 sm:gap-8">
        <GameLogo size="md" subtitle="Duel de mots à deux" />

        <button
          onClick={createRoom}
          disabled={loading}
          className="btn-primary w-full py-4 text-2xl sm:py-5 sm:text-3xl"
        >
          {loading ? '...' : 'Créer une partie'}
        </button>

        {error && (
          <div className="status-pill w-full bg-game-red px-4 py-3 text-center text-white">
            {error}
          </div>
        )}

        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-game-purple/20" />
          <span className="text-sm font-black text-game-purple/40">ou</span>
          <div className="h-px flex-1 bg-game-purple/20" />
        </div>

        <div className="cartoon-panel w-full p-4">
          <div className="mb-3 text-sm font-black uppercase text-game-purple">Rejoindre avec un code</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && joinWithCode()}
              placeholder="Ex : AJ42M"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="go"
              className="min-w-0 flex-1 rounded-2xl border-[3px] border-game-purple bg-white px-3 py-3
                         text-center text-xl font-black uppercase tracking-widest text-game-purple
                         placeholder-game-purple/30 shadow-cartoon-sm outline-none transition-colors
                         focus:bg-game-lilac"
            />
            <button
              onClick={joinWithCode}
              disabled={joinCode.trim().length < 4}
              className="btn-primary px-5 py-3 text-lg"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
