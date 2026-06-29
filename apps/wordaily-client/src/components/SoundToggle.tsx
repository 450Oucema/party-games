import { useEffect, useState } from 'react'
import { sound } from '../audio/sound'

type Props = {
  className?: string
}

export default function SoundToggle({ className = '' }: Props) {
  const [audioState, setAudioState] = useState(sound.getState())

  useEffect(() => sound.subscribe(setAudioState), [])

  return (
    <button
      type="button"
      onClick={() => sound.toggleMuted()}
      className={`status-pill bg-white px-3 py-2 text-sm font-black text-game-purple ${className}`}
      aria-label={audioState.muted ? 'Activer le son' : 'Couper le son'}
      title={audioState.muted ? 'Activer le son' : 'Couper le son'}
    >
      {audioState.muted ? 'Son off' : 'Son on'}
    </button>
  )
}
