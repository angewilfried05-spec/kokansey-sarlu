# KOKANSEY SARLU — Notes pour les agents

## Architecture

- `backend/` : API Express + Prisma (SQLite dev / PostgreSQL prod)
- `frontend/` : React 18 + Vite + Tailwind v4
- `desktop/` : Electron embarquant backend + build frontend
- `android-webview-app/` : WebView Android

## Commandes de développement

```bash
# Backend
cd backend
npm install
npx prisma db push        # génère le client + crée la base
npm run dev               # nodemon
npm test                  # tests validateurs + unitaires (node --test)

# Frontend
cd frontend
npm install
npm run dev               # http://localhost:3001
npm run build             # production
npm test                  # vitest

# Desktop
cd desktop
npm install
npm start                 # lance Electron en dev
npm run dist:win          # package Windows
```

## Configuration

- Copier `.env.example` → `.env` à la racine et/ou dans `backend/`
- Variables importantes :
  - `DATABASE_URL` : `file:./dev.db` (SQLite) ou URL PostgreSQL
  - `JWT_SECRET` : clé longue et aléatoire
  - `JWT_EXPIRES_IN` : durée du token, ex. `24h`
  - `WHATSAPP_ADMIN_NUMBER` : numéro WhatsApp admin

## Sécurité — règles établies

- Le `JWT_SECRET` ne doit JAMAIS être embarqué dans les packages `.exe`/`.asar`.
  - Electron génère un `.env` à la première exécution dans `userData/desktop-data/`
  - Ce fichier est créé avec les permissions `0o600`.
- Les identifiants admin NE DOIVENT PAS être dans le README.
  - Le mot de passe admin initial est configurable via `ADMIN_PASSWORD` ou généré aléatoirement par le seed.
- Le `.env` (et `dev.db`) sont ignorés par Git.
- Les routes privées sont protégées côté frontend par `<ProtectedRoute>`.

## Tests

- Backend : `node --test` dans `backend/test/*.test.js` (zod, routes, helpers)
- Frontend : `vitest` avec `happy-dom`
- Build et tests doivent réussir avant un packaging desktop.

## Points de vigilance

- Prisma est configuré en SQLite (`prisma/schema.prisma`).
  - L'option `mode: 'insensitive'` n'est PAS supportée par SQLite : elle est gérée conditionnellement dans `search.routes.js`.
- Les modules de routes du backend sont dans `backend/routes/`. `index.js` les enregistre via `register*Routes(app, deps)`.
- L'ordre d'enregistrement des routes Express est important : les routes statiques doivent précéder les routes paramétriques (`:id`).
