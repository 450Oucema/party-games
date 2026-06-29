import { describe, expect, it } from 'vitest'
import {
  addPlayer,
  cleanupExpiredRooms,
  createRoom,
  getRoom,
  removePlayerBySocket,
  toPublicRoom,
} from './rooms.js'

describe('rooms lifecycle', () => {
  it('looks up rooms case-insensitively', () => {
    const room = createRoom()

    expect(getRoom(room.code.toLowerCase())).toBe(room)
  })

  it('marks disconnected players without removing them from the room', () => {
    const room = createRoom()
    const player = addPlayer(room, 'socket-a', 'Nina', 2)

    const result = removePlayerBySocket('socket-a')
    const publicRoom = toPublicRoom(room)

    expect(result?.player).toBe(player)
    expect(room.players.get(player.id)?.connected).toBe(false)
    expect(publicRoom.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: player.id, connected: false }),
      ])
    )
  })

  it('removes expired rooms and keeps recent rooms', () => {
    const oldRoom = createRoom()
    const recentRoom = createRoom()
    const now = Date.now()
    oldRoom.createdAt = now - 3 * 60 * 60 * 1000
    recentRoom.createdAt = now

    const removed = cleanupExpiredRooms(now)

    expect(removed).toBeGreaterThanOrEqual(1)
    expect(getRoom(oldRoom.code)).toBeUndefined()
    expect(getRoom(recentRoom.code)).toBe(recentRoom)
  })
})
