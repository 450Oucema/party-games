import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { registerGrillePartySockets } from './games/grille-party/index.js'
import { registerWordailySockets } from './games/wordaily/index.js'
import { registerMotDePasseSockets } from './games/mot-de-passe/index.js'

const PORT = parseInt(process.env.PORT ?? '3035', 10)
const HOST = process.env.HOST ?? '127.0.0.1'

type GameMount = {
  name: string
  basePath: string
  socketPath: string
  distCandidates: string[]
  registerSockets: (io: Server) => void
}

const games: GameMount[] = [
  {
    name: 'Grille Party',
    basePath: '/g/grille-party',
    socketPath: '/g/grille-party/socket.io',
    distCandidates: [
      resolve(__dirname, '../../grille-party-client/dist'),
      resolve(__dirname, '../../../grille-party-client/dist'),
    ],
    registerSockets: registerGrillePartySockets,
  },
  {
    name: 'Wordaily',
    basePath: '/g/wordaily',
    socketPath: '/g/wordaily/socket.io',
    distCandidates: [
      resolve(__dirname, '../../wordaily-client/dist'),
      resolve(__dirname, '../../../wordaily-client/dist'),
    ],
    registerSockets: registerWordailySockets,
  },
  {
    name: 'Mot de passe',
    basePath: '/g/mot-de-passe',
    socketPath: '/g/mot-de-passe/socket.io',
    distCandidates: [
      resolve(__dirname, '../../mot-de-passe-client/dist'),
      resolve(__dirname, '../../../mot-de-passe-client/dist'),
    ],
    registerSockets: registerMotDePasseSockets,
  },
]

function findClientDist(game: GameMount): string | null {
  return game.distCandidates.find(existsSync) ?? null
}

function exactPath(path: string): RegExp {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped}$`)
}

function mountClient(app: express.Express, game: GameMount): void {
  const dist = findClientDist(game)
  if (!dist) {
    console.warn(`[platform] ${game.name}: no client dist found; build clients before production start`)
    return
  }

  app.get(exactPath(game.basePath), (_req, res) => res.redirect(301, `${game.basePath}/`))
  app.use(game.basePath, express.static(dist))
  app.get(`${game.basePath}/*`, (_req, res) => res.sendFile(resolve(dist, 'index.html')))
  console.log(`[platform] ${game.name}: static ${game.basePath}/ -> ${dist}`)
}

export function createPartyGamesServer() {
  const app = express()
  app.use(express.json())

  const httpServer = createServer(app)

  for (const game of games) {
    const io = new Server(httpServer, {
      path: game.socketPath,
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : '*',
        methods: ['GET', 'POST'],
      },
    })
    game.registerSockets(io)
    mountClient(app, game)
    console.log(`[platform] ${game.name}: socket ${game.socketPath}`)
  }

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      games: games.map(game => ({
        name: game.name,
        basePath: game.basePath,
        socketPath: game.socketPath,
        clientBuilt: !!findClientDist(game),
      })),
    })
  })

  app.get(exactPath('/g'), (_req, res) => res.redirect(301, '/g/'))
  app.get('/g/', (_req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Party Games</title></head>
<body>
<h1>Party Games</h1>
<ul>
${games.map(game => `<li><a href="${game.basePath}/">${game.name}</a></li>`).join('\n')}
</ul>
</body>
</html>`)
  })

  return { app, httpServer }
}

if (process.env.NODE_ENV !== 'test') {
  const { httpServer } = createPartyGamesServer()
  httpServer.listen(PORT, HOST, () => {
    console.log(`[platform] Party Games running on http://${HOST}:${PORT}`)
  })
}
