import type { Preview } from '@storybook/react'
import '../src/index.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'Grille Party',
      values: [
        { name: 'Grille Party', value: '#39C1FF' },
        { name: 'Cream', value: '#FFF9F2' },
        { name: 'Purple', value: '#28104B' },
      ],
    },
    layout: 'fullscreen',
  },
}

export default preview
