import type { Meta, StoryObj } from '@storybook/react'
import DraggableBoard from '../components/DraggableBoard'
import ResultsCinematic from '../components/ResultsCinematic'
import { mockGrid, mockResults } from './mockData'

const meta = {
  title: 'Design System/Mobile and Results',
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        component: 'Mobile-first interaction surfaces and end-game presentation.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

export const MobileDraggableBoard: Story = {
  render: () => (
    <div className="game-screen flex flex-col p-3">
      <div className="game-content flex items-center justify-between gap-2 py-3">
        <div className="status-pill bg-game-yellow px-3 py-2 text-lg text-game-purple">F6HDU</div>
        <div className="rounded-full bg-white px-3 py-2 text-sm font-black text-game-purple shadow-cartoon-sm">Ouc</div>
      </div>
      <div className="game-content flex flex-1 flex-col overflow-hidden">
        <DraggableBoard
          grid={mockGrid}
          onSubmit={() => undefined}
          lastFeedback={null}
        />
        <div className="mx-3 mb-3 mt-2 flex-1 rounded-[24px] border-4 border-game-purple bg-white/90 px-4 pb-4 pt-3 shadow-cartoon">
          <div className="mb-2 text-xs font-black uppercase text-game-purple">Mes mots (3)</div>
          <div className="flex flex-wrap gap-1.5">
            <span className="word-accepted text-sm">LARGE</span>
            <span className="word-accepted text-sm">RANGE</span>
            <span className="word-accepted text-sm">TARD</span>
          </div>
        </div>
      </div>
    </div>
  ),
}

export const MobileFeedbackStates: Story = {
  render: () => (
    <div className="game-screen grid gap-6 p-3">
      <DraggableBoard
        grid={mockGrid}
        onSubmit={() => undefined}
        lastFeedback={{ word: 'LARGE', status: 'accepted' }}
      />
      <DraggableBoard
        grid={mockGrid}
        onSubmit={() => undefined}
        lastFeedback={{ word: 'ZZZ', status: 'rejected', reason: 'hors_dictionnaire' }}
      />
    </div>
  ),
}

export const ResultsCinematicFlow: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'responsive',
    },
  },
  render: () => (
    <ResultsCinematic
      results={mockResults}
      grid={mockGrid}
      onDone={() => undefined}
    />
  ),
}
