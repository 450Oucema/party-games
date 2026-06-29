import { io } from 'socket.io-client'

const URL = window.location.origin

// En dev le serveur écoute sur /socket.io ; en prod VITE_SOCKET_PATH est défini
const path = import.meta.env.DEV
  ? '/socket.io'
  : (import.meta.env.VITE_SOCKET_PATH ?? `${import.meta.env.BASE_URL}socket.io`)

export const socket = io(URL, {
  autoConnect: false,
  path,
})
