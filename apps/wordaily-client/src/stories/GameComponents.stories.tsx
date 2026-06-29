import type { Meta, StoryObj } from '@storybook/react'
import Board from '../components/Board'
import GameLogo from '../components/GameLogo'
import PlayerList from '../components/PlayerList'
import QRJoin from '../components/QRJoin'
import ResultsTable from '../components/ResultsTable'
import Timer from '../components/Timer'
import WordInput from '../components/WordInput'
import { mockGrid, mockPlayers, mockResults } from './mockData'

const meta = {
  title: 'Design System/Game Components',
  parameters: {
    docs: {
      description: {
        component: 'Reusable Grille Party game UI components with production styling.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

export const Logo: Story = {
  render: () => (
    <div className="game-screen flex items-center justify-center p-8">
      <div className="game-content flex flex-col items-center gap-10">
        <GameLogo size="lg" subtitle="Le jeu de mots pour toute la famille" />
        <GameLogo size="md" />
        <GameLogo size="sm" />
      </div>
    </div>
  ),
}

export const LetterBoard: Story = {
  render: () => (
    <div className="game-screen flex items-center justify-center p-8">
      <div className="game-content">
        <Board grid={mockGrid} />
      </div>
    </div>
  ),
}

export const Players: Story = {
  render: () => (
    <div className="game-screen p-8">
      <div className="game-content max-w-sm">
        <div className="cartoon-panel flex flex-col gap-4 p-4">
          <div className="status-pill self-start bg-game-purple px-4 py-1 text-white">Joueurs</div>
          <PlayerList players={mockPlayers} showWordCount />
        </div>
      </div>
    </div>
  ),
}

export const TimerStates: Story = {
  render: () => {
    const now = Date.now()
    return (
      <div className="game-screen p-8">
        <div className="game-content flex flex-wrap gap-6">
          <div className="cartoon-card p-5 text-center">
            <div className="mb-3 font-black text-game-purple">Normal</div>
            <Timer endsAt={now + 120_000} />
          </div>
          <div className="cartoon-card p-5 text-center">
            <div className="mb-3 font-black text-game-purple">Urgent</div>
            <Timer endsAt={now + 25_000} />
          </div>
          <div className="cartoon-card p-5 text-center">
            <div className="mb-3 font-black text-game-purple">Critique</div>
            <Timer endsAt={now + 8_000} />
          </div>
        </div>
      </div>
    )
  },
}

export const JoinCard: Story = {
  render: () => (
    <div className="game-screen flex items-center justify-center p-8">
      <div className="game-content">
        <QRJoin roomCode="F6HDU" />
      </div>
    </div>
  ),
}

export const WordEntryFeedback: Story = {
  render: () => (
    <div className="game-screen p-8">
      <div className="game-content grid max-w-5xl gap-6 lg:grid-cols-3">
        <WordInput onSubmit={() => undefined} lastFeedback={{ word: 'LARGE', status: 'accepted' }} />
        <WordInput onSubmit={() => undefined} lastFeedback={{ word: 'RANGE', status: 'duplicate' }} />
        <WordInput onSubmit={() => undefined} lastFeedback={{ word: 'ZZZ', status: 'rejected', reason: 'hors_dictionnaire' }} />
      </div>
    </div>
  ),
}

export const ResultsSummary: Story = {
  render: () => (
    <div className="game-screen p-8">
      <div className="game-content max-w-3xl">
        <ResultsTable results={mockResults} myPlayerId="p1" />
      </div>
    </div>
  ),
}
