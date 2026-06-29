import { useEffect, useMemo, useState } from 'react'
import type { Guess, LetterStatus } from '../types'

const WORD_LENGTH = 5
const MAX_ATTEMPTS = 6
const KEYS = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN']

type Feedback = {
  word: string
  status: 'accepted' | 'rejected' | 'duplicate'
  reason?: string
}

type Props = {
  guesses: Guess[]
  onSubmit: (word: string) => void
  disabled?: boolean
  lastFeedback: Feedback | null
}

const REASON_LABELS: Record<string, string> = {
  longueur_invalide: 'Il faut 5 lettres',
  hors_dictionnaire: 'Pas dans le dico',
  deja_envoye: 'Deja essaye',
  deja_termine: 'Manche terminee',
  trop_vite: 'Trop vite',
  caracteres_invalides: 'Caracteres invalides',
  partie_inactive: 'Partie inactive',
  temps_ecoule: 'Temps ecoule',
  limite_atteinte: 'Plus aucun essai',
  joueur_invalide: 'Erreur joueur',
}

function normalizeInput(value: string): string {
  return value
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/Œ/g, 'OE')
    .replace(/Æ/g, 'AE')
    .replace(/[^A-Z]/g, '')
    .slice(0, WORD_LENGTH)
}

function nextOpenIndex(cells: string[], fromIndex: number): number {
  for (let i = fromIndex; i < WORD_LENGTH; i += 1) {
    if (!cells[i]) return i
  }
  for (let i = 0; i < fromIndex; i += 1) {
    if (!cells[i]) return i
  }
  return Math.min(fromIndex + 1, WORD_LENGTH - 1)
}

function statusClass(status?: LetterStatus): string {
  if (status === 'correct') return 'bg-game-green text-game-purple'
  if (status === 'present') return 'bg-game-yellow text-game-purple'
  if (status === 'absent') return 'bg-game-purple text-white'
  return 'bg-white text-game-purple'
}

function keyStatuses(guesses: Guess[]): Map<string, LetterStatus> {
  const rank: Record<LetterStatus, number> = { absent: 1, present: 2, correct: 3 }
  const statuses = new Map<string, LetterStatus>()
  for (const guess of guesses) {
    for (const letter of guess.letters) {
      const current = statuses.get(letter.value)
      if (!current || rank[letter.status] > rank[current]) statuses.set(letter.value, letter.status)
    }
  }
  return statuses
}

export default function WordGrid({ guesses, onSubmit, disabled, lastFeedback }: Props) {
  const [draft, setDraft] = useState<string[]>(() => Array.from({ length: WORD_LENGTH }, () => ''))
  const [activeIndex, setActiveIndex] = useState(0)
  const statuses = useMemo(() => keyStatuses(guesses), [guesses])
  const currentRow = Math.min(guesses.length, MAX_ATTEMPTS - 1)
  const draftWord = draft.join('')
  const canSubmit = !disabled && draft.every(Boolean)
  const isRejected = lastFeedback?.status === 'rejected'

  const submit = () => {
    if (!canSubmit) return
    onSubmit(draftWord)
  }

  useEffect(() => {
    setDraft(Array.from({ length: WORD_LENGTH }, () => ''))
    setActiveIndex(0)
  }, [guesses.length])

  const press = (key: string) => {
    if (disabled) return
    if (key === 'ENTER') {
      submit()
      return
    }
    if (key === 'BACKSPACE') {
      setDraft(cells => {
        const next = [...cells]
        if (next[activeIndex]) {
          next[activeIndex] = ''
          return next
        }
        const previousIndex = Math.max(0, activeIndex - 1)
        next[previousIndex] = ''
        setActiveIndex(previousIndex)
        return next
      })
      return
    }
    const letter = normalizeInput(key)[0]
    if (!letter) return
    setDraft(cells => {
      const next = [...cells]
      next[activeIndex] = letter
      setActiveIndex(nextOpenIndex(next, activeIndex + 1))
      return next
    })
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        press('ENTER')
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        press('BACKSPACE')
      } else if (/^[a-zA-ZÀ-ÿ]$/.test(event.key)) {
        event.preventDefault()
        press(event.key)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className={`grid grid-rows-6 gap-2 ${isRejected ? 'animate-shake' : ''}`}>
        {Array.from({ length: MAX_ATTEMPTS }).map((_, rowIndex) => {
          const guess = guesses[rowIndex]
          const letters = guess
            ? guess.letters
            : rowIndex === currentRow
              ? Array.from({ length: WORD_LENGTH }, (_, index) => ({ value: draft[index] ?? '', status: undefined }))
              : Array.from({ length: WORD_LENGTH }, () => ({ value: '', status: undefined }))

          return (
            <div key={rowIndex} className="grid grid-cols-5 gap-2">
              {letters.map((letter, index) => {
                const isActive = rowIndex === currentRow && index === activeIndex && !guess && !disabled
                return (
                  <button
                    type="button"
                    key={`${rowIndex}-${index}`}
                    onClick={() => {
                      if (!guess && rowIndex === currentRow && !disabled) setActiveIndex(index)
                    }}
                    disabled={!!guess || rowIndex !== currentRow || disabled}
                    className={`grid h-14 w-14 place-items-center rounded-2xl border-4 font-display text-3xl font-extrabold shadow-cartoon-sm transition-transform sm:h-16 sm:w-16 ${statusClass(letter.status)} ${
                      isActive ? 'border-game-yellow ring-4 ring-game-purple/25 -translate-y-1' : 'border-game-purple'
                    } disabled:cursor-default`}
                  >
                    {letter.value}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {lastFeedback && (
        <div className={`status-pill px-4 py-2 text-center text-sm text-game-purple ${lastFeedback.status === 'rejected' ? 'bg-game-red text-white' : 'bg-game-mint'}`}>
          {lastFeedback.status === 'rejected' ? REASON_LABELS[lastFeedback.reason ?? ''] ?? lastFeedback.reason : 'Tentative envoyee'}
        </div>
      )}

      <div className="flex w-full max-w-md flex-col gap-2 px-2 pb-safe">
        {KEYS.map((row) => (
          <div key={row} className="flex justify-center gap-1.5">
            {row.split('').map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => press(key)}
                disabled={disabled}
                className={`h-11 min-w-8 rounded-xl border-[3px] border-game-purple px-2 text-sm font-black shadow-cartoon-sm ${statusClass(statuses.get(key))}`}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
        <div className="grid grid-cols-[1fr_1.35fr_1fr] gap-2">
          <button type="button" onClick={() => press('BACKSPACE')} disabled={disabled} className="btn-secondary px-2 py-2 text-sm">
            Effacer
          </button>
          <button type="button" onClick={() => press('ENTER')} disabled={!canSubmit} className="btn-primary px-2 py-2 text-base">
            Valider
          </button>
          <div className="status-pill grid place-items-center bg-white px-2 text-sm text-game-purple">
            {draft.filter(Boolean).length}/{WORD_LENGTH}
          </div>
        </div>
      </div>
    </div>
  )
}
