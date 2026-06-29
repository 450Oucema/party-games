import type { Meta, StoryObj } from '@storybook/react'
import GameLogo from '../components/GameLogo'

const meta = {
  title: 'Design System/Foundations',
  parameters: {
    docs: {
      description: {
        component: 'Core visual tokens for the Grille Party cartoon TV-game design system.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

const colors = [
  ['Sky', '#6EC6FF'],
  ['Cyan', '#21E0D6'],
  ['Mint', '#39E5B7'],
  ['Violet', '#7B49FF'],
  ['Purple', '#28104B'],
  ['Ink', '#17012E'],
  ['Yellow', '#FFD94A'],
  ['Magenta', '#FF4DB8'],
  ['Lilac', '#E9D6FF'],
  ['Cream', '#FFF9F2'],
  ['Success', '#48E084'],
  ['Danger', '#FF4B64'],
  ['Shared', '#FF9B52'],
]

export const Palette: Story = {
  render: () => (
    <div className="game-screen p-8">
      <div className="game-content grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {colors.map(([name, color]) => (
          <div key={name} className="cartoon-card p-4">
            <div className="h-20 rounded-2xl border-4 border-game-purple shadow-cartoon-sm" style={{ background: color }} />
            <div className="mt-3 text-lg font-black text-game-purple">{name}</div>
            <div className="font-mono text-sm font-bold text-game-blue">{color}</div>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const Typography: Story = {
  render: () => (
    <div className="game-screen p-8">
      <div className="game-content flex flex-col gap-6">
        <GameLogo size="md" subtitle="Logo display style" />
        <div className="cartoon-panel max-w-3xl p-6">
          <div className="cartoon-title-sm text-5xl text-game-yellow">Titre cartoon</div>
          <div className="mt-4 text-3xl font-black text-game-purple">Sous-titre Nunito Black</div>
          <p className="mt-2 text-xl font-extrabold text-game-blue">
            Texte court, rond, lisible a distance, sans tracking artificiel.
          </p>
        </div>
      </div>
    </div>
  ),
}

export const ButtonsCardsAndTiles: Story = {
  render: () => (
    <div className="game-screen p-8">
      <div className="game-content flex flex-col gap-6">
        <div className="cartoon-panel flex flex-wrap items-center gap-4 p-6">
          <button className="btn-primary">Action principale</button>
          <button className="btn-secondary">Action secondaire</button>
          <button className="segmented-option segmented-option-selected">Selection</button>
          <button className="segmented-option">Option</button>
        </div>
        <div className="cartoon-card flex flex-wrap gap-3 p-5">
          {['G', 'R', 'I', 'L', 'L', 'E'].map((letter, i) => (
            <div key={`${letter}-${i}`} className="cell-tile h-16 w-16 text-4xl">
              {letter}
            </div>
          ))}
          <div className="cell-tile h-16 w-16 bg-game-yellow text-4xl text-game-purple">A</div>
          <div className="cell-tile h-16 w-16 bg-game-green text-4xl text-game-purple">A</div>
          <div className="cell-tile h-16 w-16 bg-game-red text-4xl">A</div>
        </div>
      </div>
    </div>
  ),
}
