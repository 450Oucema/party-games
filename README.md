# Party Games

Projet unifie pour servir les jeux sous un seul serveur Node :

- `/g/grille-party/`
- `/g/wordaily/`
- `/g/mot-de-passe/`

Le serveur Express sert les trois builds Vite et expose trois Socket.IO separes :

- `/g/grille-party/socket.io`
- `/g/wordaily/socket.io`
- `/g/mot-de-passe/socket.io`

## Commandes

```sh
npm install
npm test
npm run build
PORT=3035 npm run start
```

En developpement :

```sh
PORT=3035 VITE_BACKEND_PORT=3035 npm run dev
```

Cela lance le serveur Node en watch sur `3035` et les trois clients Vite :

- Grille Party : `http://localhost:5173/g/grille-party/`
- Wordaily : `http://localhost:5174/g/wordaily/`
- Mot de passe : `http://localhost:5175/g/mot-de-passe/`

Pour lancer un seul client avec le serveur :

```sh
PORT=3035 npm run dev:server
VITE_BACKEND_PORT=3035 npm run dev:wordaily
```

## Deploiement PM2

```sh
npm install
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

Le process ecoute par defaut sur `127.0.0.1:3035`.

## Nginx

Exemple pour `oucema.fr/g/{nom-du-jeu}` :

```nginx
location ^~ /g/ {
  proxy_pass http://127.0.0.1:3035;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
```

Endpoint de verification :

```sh
curl http://127.0.0.1:3035/health
```

## Notes de migration

Les anciens projets restent inchanges. Cette plateforme copie leurs clients et leurs serveurs dans `apps/`.

Les cles navigateur sont prefixees par jeu (`grille-party:*`, `wordaily:*`, `mot-de-passe:*`) pour eviter les collisions sous le meme domaine.
