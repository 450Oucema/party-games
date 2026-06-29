import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendPort = process.env.VITE_BACKEND_PORT ?? process.env.PORT ?? '3035'
const socketPath = process.env.VITE_SOCKET_PATH ?? '/g/wordaily/socket.io'
const devPort = Number(process.env.VITE_DEV_PORT ?? '5174')

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/g/wordaily/',
  server: {
    port: devPort,
    host: true,
    proxy: {
      // En dev, le serveur écoute sur /socket.io ; en prod le path complet est passé via VITE_SOCKET_PATH
      '/socket.io': {
        target: `http://localhost:${backendPort}`,
        ws: true,
        changeOrigin: true,
        rewrite: () => socketPath,
      },
      [socketPath]: {
        target: `http://localhost:${backendPort}`,
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(socketPath, '/socket.io'),
      },
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
})
