import { AVATAR_OPTIONS, getAvatarSrc } from '../avatars'
import { sound } from '../audio/sound'

type Props = {
  value: number
  onChange: (avatar: number) => void
  compact?: boolean
}

export default function AvatarPicker({ value, onChange, compact = false }: Props) {
  return (
    <div className={`grid ${compact ? 'grid-cols-4 gap-2' : 'grid-cols-4 gap-3'}`}>
      {AVATAR_OPTIONS.map((option, index) => {
        const selected = value === index
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              void sound.unlock()
              sound.playAvatarChoice(index)
              onChange(index)
            }}
            aria-label={`Choisir avatar ${option.label}`}
            className={`grid aspect-square place-items-center overflow-hidden rounded-2xl border-[3px] border-game-purple bg-white shadow-cartoon-sm transition-transform ${
              selected ? 'scale-105 bg-game-yellow' : ''
            }`}
          >
            <img
              src={getAvatarSrc(index)}
              alt=""
              className="h-full w-full object-cover object-top"
              draggable={false}
            />
          </button>
        )
      })}
    </div>
  )
}
