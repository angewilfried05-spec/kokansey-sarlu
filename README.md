# KOKANSEY SARLU - Application de Gestion

Cette application est composée d'un frontend en React + Vite et d'un backend en Node.js + Express.

## Structure du projet

- `backend/` : Serveur API avec Express et Prisma (SQLite en développement, PostgreSQL en production).
- `frontend/` : Application React moderne avec Vite et Tailwind CSS v4.

## Installation

### 1. Configuration de la base de données

L'application utilise SQLite pour le développement et PostgreSQL pour la production.

**Développement (SQLite) :**
- Aucune configuration requise, SQLite est utilisé par défaut.
- Le fichier de base de données est `backend/dev.db`.

**Production (PostgreSQL) :**
Créez la base de données PostgreSQL :

```sql
CREATE USER kokansey WITH PASSWORD 'kokansey';
CREATE DATABASE kokansey OWNER kokansey;
```

Copiez `.env.example` vers `.env` et ajustez `DATABASE_URL` pour PostgreSQL :
```
DATABASE_URL="postgresql://kokansey:kokansey@localhost:5432/kokansey"
```

### 2. Backend

```bash
cd backend
npm install
npx prisma db push
```

Pour PostgreSQL en production, exécutez également :
```bash
psql -U kokansey -d kokansey -f prisma/postgresql/extras.sql
```

### 3. Frontend

```bash
cd frontend
npm install
```

## Configuration rapide

Copiez `.env.example` vers `.env` à la racine du projet et ajustez les variables (`DATABASE_URL`, `JWT_SECRET`).

Vous pouvez aussi utiliser le script d’installation automatique (PowerShell) :

```powershell
.\setup.ps1
```

## Lancement

### Lancer le backend

```bash
cd backend
node index.js
```

Le serveur backend tourne sur le port 5000.

### Lancer le frontend

```bash
cd frontend
npm run dev
```

L'application sera disponible sur `http://localhost:3001`.

### Lancer l’application de bureau (Electron)

```bash
cd desktop
npm start
```

Pour construire le package Windows :

```bash
cd desktop
npm run dist:win
```

### Application Android

Ouvrez le dossier `android-webview-app` dans Android Studio et lancez le build. Configurez `BASE_URL_DEBUG` dans `app/build.gradle.kts` (par défaut `http://10.0.2.2:5000` pour l’émulateur).

## Mode hors-ligne / PWA

- Le runtime offline gère une file d’attente d’actions, un cache API et une synchronisation automatique.
- `fetchWithAuth` et `useApi` tombent en cache local en cas d’indisponibilité réseau.
- `OfflineBanner` affiche l’état et permet la synchronisation manuelle.
- Les endpoints `/api/health` et `/api/config.js` supportent le démarrage bureau et mobile.

## Fonctionnalités

### Comptes Clients
Page **Finance → Comptes Clients** (`/dashboard/client-accounts`) :
- Suivi du solde par client (rouge = doit, vert = crédit)
- Relevé de compte avec solde courant ligne par ligne
- Création client (GÉRANT), ajout opération (GÉRANT / COMMERCIAL)
- Modification opération (GÉRANT), suppression (ADMIN)
- Export Excel des comptes clients
- Balance âgée des créances
- Relance WhatsApp automatique

### Campagnes Agricoles
- Filtrage des récoltes et ventes par campagne/saison
- Création et gestion des campagnes agricoles

### Traçabilité
- Propagation de la qualité de récolte vers les ventes
- Alertes de stock insuffisant lors des ventes
- Suivi du rendement par parcelle

### Coopératives
- Gestion des coopératives et de leurs membres
- Suivi des soldes groupés par coopérative
- Répartition des paiements

## Identifiants de connexion

Les identifiants ne sont pas stockés dans ce dépôt. Le compte administrateur initial est créé par le seed (`backend/prisma/seed.js`) ; changez son mot de passe dès la première connexion via **Utilisateurs**.
