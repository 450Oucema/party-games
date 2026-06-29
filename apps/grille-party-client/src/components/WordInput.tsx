import { useRef, useState } from 'react'

type Feedback = {
  word: string
  status: 'accepted' | 'rejected' | 'duplicate'
  reason?: string
}

type Props = {
  onSubmit: (word: string) => void
  lastFeedback: Feedback | null
  disabled?: boolean
}

const REASON_LABELS: Record<string, string> = {
  trop_court: 'Trop court',
  hors_dictionnaire: 'Pas dans le dico',
  impossible_grille: 'Impossible dans la grille',
  deja_envoye: 'Déjà envoyé',
  trop_vite: 'Trop vite !',
  caracteres_invalides: 'Caractères invalides',
  partie_inactive: 'Partie terminée',
  temps_ecoule: 'Temps écoulé',
  limite_atteinte: 'Limite atteinte',
  joueur_invalide: 'Erreur joueur',
}

export default function WordInput({ onSubmit, lastFeedback, disabled }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    const w = value.trim()
    if (w.length >= 2) {
      onSubmit(w)
      setValue('')
      inputRef.current?.focus()
    }
  }

  const shakeClass = lastFeedback?.status === 'rejected' ? 'animate-shake' : ''

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className={`flex gap-2 ${shakeClass}`}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^a-zA-ZÀ-ÿ]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Tape un mot…"
          disabled={disabled}
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-[22px] border-4 border-game-purple bg-white px-5 py-4
                     text-center text-2xl font-black uppercase text-game-purple placeholder-game-purple/45 outline-none
                     shadow-cartoon-sm transition-colors focus:bg-game-lilac
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || value.trim().length < 2}
          className="btn-primary px-6 text-2xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✓
        </button>
      </div>

      {lastFeedback && (
        <div
          className={`status-pill animate-bounce-in px-4 py-2 text-center text-lg ${
            lastFeedback.status === 'accepted'
              ? 'bg-game-green text-game-purple'
              : lastFeedback.status === 'duplicate'
              ? 'bg-game-orange text-game-purple'
              : 'bg-game-red text-white'
          }`}
        >
          {lastFeedback.status === 'accepted' && `✓ ${lastFeedback.word}`}
          {lastFeedback.status === 'duplicate' && `= ${lastFeedback.word} (déjà envoyé)`}
          {lastFeedback.status === 'rejected' && (
            <>✗ {REASON_LABELS[lastFeedback.reason ?? ''] ?? lastFeedback.reason}</>
          )}
        </div>
      )}
    </div>
  )
}
