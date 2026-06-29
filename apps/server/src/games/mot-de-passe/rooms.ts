import type { Room, Player, PublicRoom, PublicPlayer, PublicRound, RoundState, RoundSummary, Theme, Difficulty, GameMode } from './types.js'
import { randomBytes } from 'crypto'

const rooms = new Map<string, Room>()
const PLAYER_COLORS = ['#FF4DB8', '#39E5B7']

function randomCode(len = 5): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < len; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function createRoom(): Room {
  let code = randomCode()
  while (rooms.has(code)) code = randomCode()

  const room: Room = {
    code,
    phase: 'lobby',
    createdAt: Date.now(),
    hostToken: randomBytes(24).toString('hex'),
    players: new Map(),
    mode: 'irl',
    theme: 'mix',
    difficulty: 'normal',
    maxClues: 5,
    roundsPerPlayer: 5,
    roundSec: 60,
    currentRoundIndex: 0,
    history: [],
  }
  rooms.set(code, room)
  return room
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase())
}

export function addPlayer(room: Room, socketId: string, name: string, avatarChoice?: number): Player {
  if (room.players.size >= 2) throw new Error('Salle pleine (2 joueurs).')
  const id = `p${Date.now()}${Math.random().toString(36).slice(2, 5)}`
  const avatar = Number.isInteger(avatarChoice) && avatarChoice! >= 0 && avatarChoice! < 8
    ? avatarChoice!
    : room.players.size % 8
  const color = PLAYER_COLORS[room.players.size % PLAYER_COLORS.length]
  const player: Player = {
    id,
    socketId,
    name: name.trim().slice(0, 20),
    connected: true,
    avatar,
    color,
    score: 0,
  }
  room.players.set(id, player)
  return player
}

export function removePlayerBySocket(socketId: string): { room: Room; player: Player } | null {
  for (const room of rooms.values()) {
    for (const player of room.players.values()) {
      if (player.socketId === socketId) {
        player.connected = false
        return { room, player }
      }
    }
  }
  return null
}

export function getRoomBySocket(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.hostSocketId === socketId) return room
    for (const player of room.players.values()) {
      if (player.socketId === socketId) return room
    }
  }
  return undefined
}

export function updateRoomSettings(
  room: Room,
  settings: {
    theme?: Theme
    difficulty?: Difficulty
    mode?: GameMode
    maxClues?: number
    roundsPerPlayer?: number
    roundSec?: number
  },
): void {
  if (settings.theme) room.theme = settings.theme
  if (settings.difficulty) room.difficulty = settings.difficulty
  if (settings.mode) room.mode = settings.mode
  if (Number.isInteger(settings.maxClues) && settings.maxClues! >= 1 && settings.maxClues! <= 8) {
    room.maxClues = settings.maxClues!
  }
  if (Number.isInteger(settings.roundsPerPlayer) && settings.roundsPerPlayer! >= 1 && settings.roundsPerPlayer! <= 10) {
    room.roundsPerPlayer = settings.roundsPerPlayer!
  }
  if (Number.isInteger(settings.roundSec) && settings.roundSec! >= 20 && settings.roundSec! <= 180) {
    room.roundSec = settings.roundSec!
  }
}

export function toPublicRound(round: RoundState): PublicRound {
  return {
    roundIndex: round.roundIndex,
    giverId: round.giverId,
    guesserId: round.guesserId,
    theme: round.theme,
    clues: round.clues.map((c) => ({ text: c.text, forbidden: c.forbidden, reason: c.reason })),
    status: round.status,
    endsAt: round.endsAt,
    clueCount: round.clueCount,
    finalScore: round.finalScore,
  }
}

export function toPublicRoom(room: Room): PublicRoom {
  const players: PublicPlayer[] = []
  for (const p of room.players.values()) {
    players.push({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      connected: p.connected,
      score: p.score,
    })
  }
  return {
    code: room.code,
    phase: room.phase,
    mode: room.mode,
    theme: room.theme,
    difficulty: room.difficulty,
    maxClues: room.maxClues,
    roundsPerPlayer: room.roundsPerPlayer,
    roundSec: room.roundSec,
    players,
    currentRound: room.currentRound ? toPublicRound(room.currentRound) : undefined,
    history: room.history,
    totalRounds: room.roundsPerPlayer * 2,
  }
}

export function summarizeRound(round: RoundState): RoundSummary {
  return {
    roundIndex: round.roundIndex,
    giverId: round.giverId,
    guesserId: round.guesserId,
    secret: round.secret,
    theme: round.theme,
    clues: round.clues,
    status: round.status,
    clueCount: round.clueCount,
    finalScore: round.finalScore,
  }
}

export function cleanupExpiredRooms(now = Date.now(), maxAgeMs = 2 * 60 * 60 * 1000): number {
  const cutoff = now - maxAgeMs
  let removed = 0
  for (const [code, room] of rooms.entries()) {
    if (room.createdAt < cutoff) {
      rooms.delete(code)
      removed += 1
    }
  }
  return removed
}

export function clearRoomsForTest(): void {
  if (process.env.NODE_ENV === 'test') rooms.clear()
}

// Cleanup rooms older than 2h
setInterval(() => {
  cleanupExpiredRooms()
}, 10 * 60 * 1000)
