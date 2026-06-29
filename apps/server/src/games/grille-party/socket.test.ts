import { AddressInfo } from 'net'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { io as createClient, Socket } from 'socket.io-client'
import { createGrillePartyServer } from './index.js'
import { clearRoomsForTest } from './rooms.js'

type TestServer = ReturnType<typeof createGrillePartyServer> & {
  url: string
}

function once<T = unknown>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, resolve)
  })
}

async function createTestServer(): Promise<TestServer> {
  const server = createGrillePartyServer()
  await new Promise<void>((resolve) => server.httpServer.listen(0, '127.0.0.1', resolve))
  const address = server.httpServer.address() as AddressInfo
  return {
    ...server,
    url: `http://127.0.0.1:${address.port}`,
  }
}

function connectClient(server: TestServer): Socket {
  return createClient(server.url, {
    path: '/socket.io',
    transports: ['websocket'],
    forceNew: true,
  })
}

async function createRoom(host: Socket) {
  const created = once<{ roomCode: string; hostToken: string }>(host, 'room:created')
  host.emit('room:create')
  return created
}

async function joinRoom(client: Socket, roomCode: string, playerName = 'Nina') {
  const playerState = once<{ id: string; words: string[] }>(client, 'player:state')
  client.emit('room:join', { roomCode, playerName, avatar: 2 })
  return playerState
}

describe('socket room flow', () => {
  let server: TestServer
  const clients: Socket[] = []

  beforeEach(async () => {
    clearRoomsForTest()
    server = await createTestServer()
  })

  afterEach(async () => {
    clients.forEach((client) => client.disconnect())
    clients.length = 0
    server.io.close()
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()))
    clearRoomsForTest()
  })

  it('creates a room and lets a player join it', async () => {
    const host = connectClient(server)
    const player = connectClient(server)
    clients.push(host, player)
    await Promise.all([once(host, 'connect'), once(player, 'connect')])

    const { roomCode, hostToken } = await createRoom(host)
    const playerState = await joinRoom(player, roomCode)
    const roomState = await once<{ players: Array<{ id: string; name: string; avatar: number }> }>(host, 'room:state')

    expect(roomCode).toMatch(/^[A-Z2-9]{5}$/)
    expect(hostToken).toHaveLength(48)
    expect(playerState.id).toMatch(/^p/)
    expect(roomState.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: playerState.id, name: 'Nina', avatar: 2 }),
      ])
    )
  })

  it('re-attaches a reconnecting player during room sync', async () => {
    const host = connectClient(server)
    const player = connectClient(server)
    clients.push(host, player)
    await Promise.all([once(host, 'connect'), once(player, 'connect')])

    const { roomCode } = await createRoom(host)
    const playerState = await joinRoom(player, roomCode)
    player.disconnect()

    const reconnectedPlayer = connectClient(server)
    clients.push(reconnectedPlayer)
    await once(reconnectedPlayer, 'connect')
    const privateState = once<{ id: string; words: string[] }>(reconnectedPlayer, 'player:state')
    const publicState = once<{ players: Array<{ id: string; connected: boolean }> }>(reconnectedPlayer, 'room:state')
    reconnectedPlayer.emit('room:sync', { roomCode, playerId: playerState.id })

    await expect(privateState).resolves.toMatchObject({ id: playerState.id })
    await expect(publicState).resolves.toMatchObject({
      players: expect.arrayContaining([
        expect.objectContaining({ id: playerState.id, connected: true }),
      ]),
    })
  })

  it('reports stale player sessions during room sync', async () => {
    const host = connectClient(server)
    const player = connectClient(server)
    clients.push(host, player)
    await Promise.all([once(host, 'connect'), once(player, 'connect')])

    const { roomCode } = await createRoom(host)
    const error = once<{ message: string }>(player, 'error')
    player.emit('room:sync', { roomCode, playerId: 'missing-player' })

    await expect(error).resolves.toEqual({ message: 'Session joueur introuvable.' })
  })

  it('allows host-token sync to start and restart a game from a new socket', async () => {
    const host = connectClient(server)
    const player = connectClient(server)
    clients.push(host, player)
    await Promise.all([once(host, 'connect'), once(player, 'connect')])

    const { roomCode, hostToken } = await createRoom(host)
    await joinRoom(player, roomCode)
    host.disconnect()

    const reconnectedHost = connectClient(server)
    clients.push(reconnectedHost)
    await once(reconnectedHost, 'connect')
    reconnectedHost.emit('room:sync', { roomCode, hostToken })
    await once(reconnectedHost, 'room:state')

    const started = once(reconnectedHost, 'game:started')
    reconnectedHost.emit('room:start', { roomCode, hostToken })
    await expect(started).resolves.toMatchObject({ grid: expect.any(Array), endsAt: expect.any(Number) })

    const restarted = once<{ phase: string }>(reconnectedHost, 'room:state')
    reconnectedHost.emit('room:restart', { roomCode, hostToken })
    await expect(restarted).resolves.toMatchObject({ phase: 'lobby' })
  })

  it('rejects non-host game start attempts', async () => {
    const host = connectClient(server)
    const player = connectClient(server)
    clients.push(host, player)
    await Promise.all([once(host, 'connect'), once(player, 'connect')])

    const { roomCode } = await createRoom(host)
    await joinRoom(player, roomCode)
    const error = once<{ message: string }>(player, 'error')
    player.emit('room:start', { roomCode })

    await expect(error).resolves.toEqual({ message: 'Seul le host peut lancer la partie.' })
  })
})
