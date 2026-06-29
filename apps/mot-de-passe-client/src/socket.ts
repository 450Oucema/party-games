import { io } from 'socket.io-client'

const URL = window.location.origin

const path = import.meta.env.VITE_SOCKET_PATH ?? `${import.meta.env.BASE_URL}socket.io`

export const socket = io(URL, {
  autoConnect: false,
  path,
})
