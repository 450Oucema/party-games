import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { socket } from '../socket'
import AvatarPicker from '../components/AvatarPicker'
import AvatarToken from '../components/AvatarToken'
import GameLogo from '../components/GameLogo'
import { sound } from '../audio/sound'
import { currentPlayerIdKey, playerIdKey, roomCodeKey } from '../storage'

export default function JoinPage() {
  const { roomCode: urlCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()

  const [manualCode, setManualCode] = useState('')
  const [step, setStep] = useState<'code' | 'name'>(urlCode ? 'name' : 'code')
  const roomCode = urlCode?.toUpperCase() ?? manualCode.toUpperCase()

  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [avatar, setAvatar] = useState(0)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    socket.connect()

    socket.on('player:state', ({ id }: { id: string }) => {
      setPlayerId(id)
      if (roomCode) sessionStorage.setItem(playerIdKey(roomCode), id)
      sessionStorage.setItem(currentPlayerIdKey, id)
      sessionStorage.setItem(roomCodeKey, roomCode ?? '')
    })

    socket.on('room:state', (room: { phase: string; code: string }) => {
      if (playerId && room.phase === 'playing') {
        navigate(`/room/${room.code}?player=${playerId}`)
      }
    })

    socket.on('error', ({ message }: { message: string }) => {
      setError(message)
      setJoining(false)
    })

    return () => {
      socket.off('player:state')
      socket.off('room:state')
      socket.off('error')
    }
  }, [roomCode, navigate, playerId])

  const submitCode = () => {
    const code = manualCode.trim().toUpperCase()
    if (code.length < 4) return
    navigate(`/join/${code}`, { replace: true })
  }

  const join = () => {
    if (!name.trim() || !roomCode) return
    void sound.unlock()
    sound.playJoin()
    setJoining(true)
    setError('')
    socket.emit('room:join', { roomCode, playerName: name.trim(), avatar })
  }

  const changeAvatar = (nextAvatar: number) => {
    setAvatar(nextAvatar)
    if (roomCode && playerId) {
      socket.emit('player:avatar', { roomCode, playerId, avatar: nextAvatar })
    }
  }

  if (playerId) {
    return (
      <div className="game-screen flex flex-col items-center justify-center gap-6 p-6 pb-safe">
        <div className="game-content flex w-full max-w-md flex-col items-center gap-6">
          <GameLogo size="sm" />
          <div className="relative h-28 w-28">
            <div className="absolute inset-0 animate-orbit rounded-full border-4 border-dashed border-game-purple" />
            <AvatarToken avatar={avatar} className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="cartoon-card w-full p-6 text-center">
            <div className="text-3xl font-black text-game-purple">En attente du lancement...</div>
            <div className="mt-3 text-xl font-extrabold text-game-blue">
              Code : <span className="cartoon-title-sm text-game-yellow">{roomCode}</span>
            </div>
             <div className="mt-5 text-left">
              <div className="mb-2 text-xs font-black uppercase text-game-purple">Avatar</div>
              <AvatarPicker value={avatar} onChange={changeAvatar} compact />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'code') {
    return (
      <div className="game-screen flex flex-col items-center justify-center gap-6 p-6 pb-safe">
        <div className="game-content flex w-full max-w-sm flex-col items-center gap-6">
          <GameLogo size="sm" />
          <div className="cartoon-card w-full p-5 text-center">
            <div className="text-lg font-black text-game-purple">Entre le code du salon</div>
            <div className="mt-1 text-sm font-extrabold text-game-blue">Demande-le à l'hôte</div>
          </div>
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && submitCode()}
            placeholder="Ex : AJ42M"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full rounded-[24px] border-4 border-game-purple bg-white px-5 py-4
                       text-center text-3xl font-black uppercase tracking-widest text-game-purple
                       placeholder-game-purple/30 shadow-cartoon outline-none transition-colors
                       focus:bg-game-lilac"
          />
          <button
            onClick={submitCode}
            disabled={manualCode.trim().length < 4}
            className="btn-primary w-full py-4 text-2xl"
          >
            Continuer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="game-screen flex flex-col items-center justify-center gap-6 p-6 pb-safe">
      <div className="game-content flex w-full max-w-sm flex-col items-center gap-6">
        <GameLogo size="sm" />
        <div className="cartoon-card w-full p-5 text-center">
          <div className="text-sm font-black uppercase text-game-purple">Rejoindre la salle</div>
          <div className="cartoon-title-sm mt-1 font-display text-5xl text-game-yellow">{roomCode}</div>
          {!urlCode && (
            <button
              onClick={() => setStep('code')}
              className="mt-2 text-xs font-black text-game-purple/50 underline"
            >
              Changer de code
            </button>
          )}
        </div>

        <input
          ref={nameInputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          placeholder="Ton pseudo…"
          autoFocus
          autoComplete="nickname"
          maxLength={20}
          enterKeyHint="go"
          className="w-full rounded-[24px] border-4 border-game-purple bg-white px-5 py-4
                     text-center text-2xl font-black text-game-purple placeholder-game-purple/45
                     shadow-cartoon outline-none transition-colors focus:bg-game-lilac"
        />

        <div className="cartoon-panel w-full p-3">
          <div className="mb-2 text-xs font-black uppercase text-game-purple">Avatar</div>
          <AvatarPicker value={avatar} onChange={changeAvatar} compact />
        </div>

        {error && (
          <div className="status-pill w-full bg-game-red px-4 py-3 text-center text-white">
            {error}
          </div>
        )}

        <button
          onClick={join}
          disabled={joining || !name.trim()}
          className="btn-primary w-full py-4 text-2xl"
        >
          {joining ? '...' : 'Rejoindre'}
        </button>
      </div>
    </div>
  )
}
