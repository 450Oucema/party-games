type Props = {
  size?: 'sm' | 'room' | 'md' | 'lg'
  subtitle?: string
}

const sizeClass = {
  sm: 'w-44 sm:w-56',
  room: 'w-56 sm:w-72 lg:w-80',
  md: 'w-72 sm:w-[28rem]',
  lg: 'w-80 sm:w-[34rem] lg:w-[42rem]',
}

export default function GameLogo({ size = 'md', subtitle }: Props) {
  return (
    <div className="relative inline-flex flex-col items-center gap-2">
      <div className={`${sizeClass[size]} flex flex-col items-center`}>
        <div className="cartoon-title text-center" style={{ fontSize: 'clamp(2.6rem,9vw,5rem)', lineHeight: 0.85 }}>
          <span className="block text-white">MOT DE</span>
          <span className="block text-game-yellow">PASSE</span>
        </div>
        {subtitle && (
          <div className="mt-2 rounded-full border-[3px] border-game-purple bg-white px-5 py-1 text-center text-base font-black text-game-purple shadow-cartoon-sm sm:text-xl">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}
