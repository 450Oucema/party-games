const STORAGE_PREFIX = 'mot-de-passe'

export const playerIdKey = (roomCode: string) => `${STORAGE_PREFIX}:playerId:${roomCode}`
export const hostTokenKey = (roomCode: string) => `${STORAGE_PREFIX}:hostToken:${roomCode}`
export const roomCodeKey = `${STORAGE_PREFIX}:roomCode`
export const currentPlayerIdKey = `${STORAGE_PREFIX}:playerId`
