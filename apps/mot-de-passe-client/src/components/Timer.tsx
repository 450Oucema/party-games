import { useEffect, useState } from 'react'

type Props = {
  endsAt: number
  onExpire?: () => void
}

export default function Timer({ endsAt, onExpire }: Props) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const tick = () => {
      const r = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setRemaining(r)
      if (r === 0) onExpire?.()
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [endsAt, onExpire])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const isUrgent = remaining <= 30
  const isCritical = remaining <= 10
  const isShaking = remaining <= 10 && remaining > 0

  return (
    <div
      className={`status-pill inline-flex min-w-[8rem] items-center justify-center px-5 py-2 font-display tabular-nums transition-all ${
        isCritical
          ? 'bg-game-red text-white text-6xl'
          : isUrgent
          ? 'bg-game-orange text-game-purple text-5xl'
          : 'bg-game-yellow text-game-purple text-5xl'
      }`}
      style={
        isCritical
          ? { animation: 'timerPulse 0.42s ease-in-out infinite, timerShake 0.5s ease-in-out infinite' }
          : isShaking
          ? { animation: 'timerShake 0.55s ease-in-out infinite' }
          : undefined
      }
    >
      {mins}:{secs.toString().padStart(2, '0')}
    </div>
  )
}
