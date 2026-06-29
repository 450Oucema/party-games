import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendPort = process.env.VITE_BACKEND_PORT ?? process.env.PORT ?? '3035'
const socketPath = process.env.VITE_SOCKET_PATH ?? '/g/mot-de-passe/socket.io'
const devPort = Number(process.env.VITE_DEV_PORT ?? '5175')

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/g/mot-de-passe/',
  server: {
    port: devPort,
    host: true,
    proxy: {
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
      },
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
})
