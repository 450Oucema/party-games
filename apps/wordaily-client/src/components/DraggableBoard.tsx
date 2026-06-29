import { useRef, useState, useEffect, useCallback } from 'react'
import type { GridCell } from '../types'
import { sound } from '../audio/sound'

type CellPos = { r: number; c: number }

type Props = {
  grid: GridCell[][]
  onSubmit: (word: string) => void
  lastFeedback: { word: string; status: 'accepted' | 'rejected' | 'duplicate'; reason?: string } | null
  disabled?: boolean
}

function isAdjacent(a: CellPos, b: CellPos) {
  return Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1 && !(a.r === b.r && a.c === b.c)
}

function getWord(path: CellPos[], grid: GridCell[][]): string {
  return path.map(({ r, c }) => grid[r][c].letter).join('')
}

const TOUCH_HIT_ZONE_RATIO = 0.58

export default function DraggableBoard({ grid, onSubmit, lastFeedback, disabled }: Props) {
  const [path, setPath] = useState<CellPos[]>([])
  const pathRef = useRef<CellPos[]>([])
  const draggingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const size = grid.length

  const isInsideTouchHitZone = (cell: HTMLElement, x: number, y: number): boolean => {
    const rect = cell.getBoundingClientRect()
    const insetX = rect.width * (1 - TOUCH_HIT_ZONE_RATIO) / 2
    const insetY = rect.height * (1 - TOUCH_HIT_ZONE_RATIO) / 2
    return (
      x >= rect.left + insetX &&
      x <= rect.right - insetX &&
      y >= rect.top + insetY &&
      y <= rect.bottom - insetY
    )
  }

  const getCellFromPoint = (x: number, y: number, strictTouchHitZone = false): CellPos | null => {
    const el = document.elementFromPoint(x, y)
    const cell = el?.closest('[data-row]') as HTMLElement | null
    if (!cell) return null
    if (strictTouchHitZone && !isInsideTouchHitZone(cell, x, y)) return null
    const r = parseInt(cell.dataset.row ?? '')
    const c = parseInt(cell.dataset.col ?? '')
    if (isNaN(r) || isNaN(c)) return null
    return { r, c }
  }

  const startDrag = useCallback((r: number, c: number) => {
    if (disabled) return
    void sound.unlock()
    const p = [{ r, c }]
    pathRef.current = p
    draggingRef.current = true
    setPath([...p])
    sound.playLetter(grid[r][c].letter, 0)
  }, [disabled, grid])

  const tryAddCell = useCallback((r: number, c: number) => {
    if (!draggingRef.current) return
    const p = pathRef.current
    const existingIdx = p.findIndex(cell => cell.r === r && cell.c === c)
    if (existingIdx !== -1) {
      // Backtrack: glisser en arrière sur une case déjà sélectionnée tronque le chemin
      if (existingIdx === p.length - 1) return
      const backtracked = p.slice(0, existingIdx + 1)
      pathRef.current = backtracked
      setPath([...backtracked])
      sound.playBacktrack()
      return
    }
    const last = p[p.length - 1]
    if (!last || !isAdjacent(last, { r, c })) return
    const next = [...p, { r, c }]
    pathRef.current = next
    setPath([...next])
    sound.playLetter(grid[r][c].letter, next.length - 1)
  }, [grid])

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return
    draggingRef.current = false
    const word = getWord(pathRef.current, grid)
    pathRef.current = []
    setPath([])
    if (word.replace('QU', 'QU').length >= 3) {
      onSubmit(word)
    }
  }, [grid, onSubmit])

  // Attach non-passive touchmove so we can preventDefault (stops page scroll while dragging)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      const cell = getCellFromPoint(touch.clientX, touch.clientY, true)
      if (cell) tryAddCell(cell.r, cell.c)
    }

    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [tryAddCell])

  // Taille dynamique : la grille prend presque toute la largeur d'écran (max 512px sur desktop)
  const gapPx = size <= 4 ? 10 : 8
  const sidePad = 8 // px de padding total autour de la zone gestuelle
  const totalGap = (size - 1) * gapPx
  const chromePx = 64 // page padding + border + inner grid padding
  const baseWidth = `min(100vw, 512px)`
  const cellPx = `calc((${baseWidth} - ${chromePx + totalGap}px) / ${size})`
  const fontPx = `calc((${baseWidth} - ${chromePx + totalGap}px) / ${size} * ${size <= 4 ? 0.42 : 0.38})`

  const lastCell = path[path.length - 1]
  const word = getWord(path, grid)

  const feedbackClass =
    lastFeedback?.status === 'accepted' ? 'word-accepted' :
    lastFeedback?.status === 'duplicate' ? 'word-duplicate' :
    lastFeedback?.status === 'rejected' ? 'word-rejected animate-shake' : ''

  const feedbackText =
    lastFeedback?.status === 'accepted' ? `✓ ${lastFeedback.word}` :
    lastFeedback?.status === 'duplicate' ? `= ${lastFeedback.word}` :
    lastFeedback?.status === 'rejected' ? `✗ ${lastFeedback.word}` : ''

  return (
    <div className="flex w-full select-none touch-none flex-col items-center gap-3" style={{ paddingLeft: sidePad / 2, paddingRight: sidePad / 2 }}>
      {/* Word being formed */}
      <div className="flex h-14 items-center justify-center">
        {path.length > 0 ? (
          <div className="status-pill bg-game-yellow px-5 py-2 font-display text-3xl font-extrabold text-game-purple">
            {word}
          </div>
        ) : lastFeedback ? (
          <div className={`animate-bounce-in text-xl ${feedbackClass}`}>
            {feedbackText}
          </div>
        ) : (
          <div className="rounded-full bg-white px-4 py-2 text-sm font-black text-game-purple shadow-cartoon-sm">Glisse sur les lettres</div>
        )}
      </div>

      {/* Grid */}
      <div
        ref={containerRef}
        className="flex max-w-full flex-col rounded-[24px] border-4 border-game-purple bg-white/80 p-2 shadow-cartoon"
        style={{ gap: gapPx }}
        onMouseLeave={endDrag}
        onMouseUp={endDrag}
        onTouchEnd={endDrag}
        onTouchCancel={endDrag}
      >
        {grid.map((row, r) => (
          <div key={r} className="flex w-full" style={{ gap: gapPx }}>
            {row.map((cell, c) => {
              const inPath = path.some(p => p.r === r && p.c === c)
              const isLast = lastCell?.r === r && lastCell?.c === c
              const pathIndex = path.findIndex(p => p.r === r && p.c === c)
              const canConnect = !inPath && lastCell && isAdjacent(lastCell, { r, c })

              return (
                <div
                  key={c}
                  data-row={r}
                  data-col={c}
                  onMouseDown={() => startDrag(r, c)}
                  onMouseEnter={() => tryAddCell(r, c)}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    startDrag(r, c)
                  }}
                  className={`
                    flex items-center justify-center shrink-0
                    rounded-xl font-display font-extrabold border-4 transition-all duration-75
                    cursor-pointer
                    ${isLast
                      ? 'bg-game-yellow text-game-purple border-game-purple scale-110 z-10'
                      : inPath
                      ? 'bg-game-yellow text-game-purple border-game-purple scale-105'
                      : canConnect && path.length > 0
                      ? 'bg-game-cyan text-game-purple border-game-purple'
                      : 'cell-tile'
                    }
                  `}
                  style={{
                    width: cellPx,
                    height: cellPx,
                    fontSize: fontPx,
                    boxShadow: '0 5px 0 #17012E, inset 0 -7px 0 rgba(23,1,46,.18), inset 0 3px 0 rgba(255,255,255,.45)',
                    position: 'relative',
                  }}
                >
                  {cell.letter === 'QU'
                    ? <span style={{ fontSize: '0.7em' }}>Qu</span>
                    : cell.letter}

                  {/* Path index bubble */}
                  {inPath && pathIndex >= 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-game-bg
                                 text-[10px] font-black flex items-center justify-center leading-none"
                    >
                      {pathIndex + 1}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Submit hint */}
      {path.length >= 3 && (
        <div className="status-pill bg-game-mint px-4 py-1 text-sm text-game-purple animate-bounce-soft">
          Lâche pour valider
        </div>
      )}
      {path.length > 0 && path.length < 3 && (
        <div className="text-xs font-black text-game-purple">
          {3 - path.length} lettre{3 - path.length > 1 ? 's' : ''} de plus minimum
        </div>
      )}
    </div>
  )
}
