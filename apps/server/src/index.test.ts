import { describe, expect, it } from 'vitest'
import { createPartyGamesServer } from './index.js'

describe('party games platform', () => {
  it('creates the unified server app', () => {
    const server = createPartyGamesServer()
    expect(server.app).toBeTruthy()
    expect(server.httpServer).toBeTruthy()
    server.httpServer.close()
  })
})
