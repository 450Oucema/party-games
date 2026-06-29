import { describe, it, expect, beforeEach } from 'vitest'
import { createRoom, addPlayer, updateRoomSettings, toPublicRoom, clearRoomsForTest } from './rooms.js'

beforeEach(() => {
  process.env.NODE_ENV = 'test'
  clearRoomsForTest()
})

describe('rooms', () => {
  it('creates a room with default settings', () => {
    const room = createRoom()
    expect(room.code).toHaveLength(5)
    expect(room.phase).toBe('lobby')
    expect(room.mode).toBe('irl')
    expect(room.theme).toBe('mix')
    expect(room.difficulty).toBe('normal')
    expect(room.maxClues).toBe(5)
    expect(room.roundsPerPlayer).toBe(5)
  })

  it('adds players up to 2', () => {
    const room = createRoom()
    const p1 = addPlayer(room, 's1', 'Alice')
    const p2 = addPlayer(room, 's2', 'Bob')
    expect(room.players.size).toBe(2)
    expect(p1.color).not.toBe(p2.color)
    expect(() => addPlayer(room, 's3', 'Charlie')).toThrow()
  })

  it('updates settings', () => {
    const room = createRoom()
    updateRoomSettings(room, {
      theme: 'animaux',
      difficulty: 'expert',
      mode: 'online',
      maxClues: 3,
      roundsPerPlayer: 3,
      roundSec: 45,
    })
    expect(room.theme).toBe('animaux')
    expect(room.difficulty).toBe('expert')
    expect(room.mode).toBe('online')
    expect(room.maxClues).toBe(3)
    expect(room.roundsPerPlayer).toBe(3)
    expect(room.roundSec).toBe(45)
  })

  it('clamps maxClues', () => {
    const room = createRoom()
    updateRoomSettings(room, { maxClues: 50 })
    expect(room.maxClues).toBe(5)
  })

  it('serializes to public room without leaking secrets', () => {
    const room = createRoom()
    addPlayer(room, 's1', 'Alice')
    const pub = toPublicRoom(room)
    expect(pub.code).toBe(room.code)
    expect(pub.players).toHaveLength(1)
    expect(pub.players[0].name).toBe('Alice')
    expect(pub.totalRounds).toBe(10)
    expect(pub.currentRound).toBeUndefined()
  })
})
