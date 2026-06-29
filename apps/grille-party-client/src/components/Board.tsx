import type { GridCell } from '../types'

type Props = {
  grid: GridCell[][]
}

export default function Board({ grid }: Props) {
  const size = grid.length
  // Scale cell size: 6x6 needs smaller cells than 4x4
  const cellClass = size <= 4
    ? 'cell-tile w-24 h-24 text-5xl'
    : size === 5
    ? 'cell-tile w-20 h-20 text-4xl'
    : 'cell-tile w-16 h-16 text-4xl'

  return (
    <div className="flex flex-col gap-2 rounded-[30px] border-4 border-game-purple bg-white/80 p-4 shadow-cartoon">
      {grid.map((row, r) => (
        <div key={r} className="flex gap-2">
          {row.map((cell, c) => (
            <div key={c} className={cellClass}>
              {cell.letter === 'QU' ? <span className="text-[0.7em]">Qu</span> : cell.letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
