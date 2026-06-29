import logoUrl from '../../../docs/grille_party_logo_vector_transparent.svg'

type Props = {
  size?: 'sm' | 'room' | 'md' | 'lg'
  subtitle?: string
}

const sizeClass = {
  sm: 'w-40 sm:w-52',
  room: 'w-56 sm:w-72 lg:w-80',
  md: 'w-72 sm:w-[28rem]',
  lg: 'w-80 sm:w-[34rem] lg:w-[42rem]',
}

export default function GameLogo({ size = 'md', subtitle }: Props) {
  return (
    <div className="relative inline-flex flex-col items-center gap-2">
      <img
        src={logoUrl}
        alt="Grille Party"
        className={`${sizeClass[size]} block h-auto max-w-full select-none`}
        draggable={false}
      />
      {subtitle && (
        <div className="rounded-full border-[3px] border-game-purple bg-white px-5 py-1 text-center text-base font-black text-game-purple shadow-cartoon-sm sm:text-xl">
          {subtitle}
        </div>
      )}
    </div>
  )
}
