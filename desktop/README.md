# KOKANSEY SARLU — Application de bureau

Ce dossier porte le packaging Electron du projet KOKANSEY SARLU, adapté du mode de fonctionnement de `gestion_incidents_projet`.

## Prérequis

- Node.js 18+
- Une base PostgreSQL accessible et un fichier `.env` renseigné à la racine du projet (voir `.env.example`).
- Le build frontend doit exister : `../frontend/dist`.

## Installation

```powershell
cd desktop
npm install
```

## Développement

Lance l’application depuis le code source local (backend et frontend doivent être en place) :

```powershell
npm start
```

## Construction du package Windows

```powershell
npm run dist:win
```

Le résultat se trouve dans `dist-electron/win-unpacked/`.

## Fichiers importants

- `electron-main.cjs` : processus principal Electron qui lance le backend local, attend le endpoint `/api/health` puis ouvre la fenêtre.
- `package.json` : configuration des scripts et d’`electron-builder`.

## Notes

- Le backend est packagé avec ses dépendances (`backend/node_modules`) dans `resources/backend`.
- Le build frontend est copié dans `resources/frontend/dist`.
- Le fichier `.env` doit être présent à la racine du projet pour être inclus dans le package.
