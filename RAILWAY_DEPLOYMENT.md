# Guide de déploiement Railway - KOKANSEY SARLU

## Architecture de déploiement

- **Backend + Frontend** : Node.js + Express + Prisma (PostgreSQL) → héberg Railway
- **Base de données** : PostgreSQL → hébergée Railway
- **Mode** : Monolithique (backend sert le frontend)

## Étape 1 : Créer un compte Railway

1. Allez sur [railway.app](https://railway.app)
2. Cliquez sur "Start a project"
3. Connectez-vous avec GitHub (recommandé)
4. Ajoutez une méthode de paiement (carte requise, minimum $5/mois)

## Étape 2 : Importer le projet

1. Cliquez sur "New Project"
2. Choisissez "Deploy from GitHub repo"
3. Sélectionnez le repository `angewilfried05-spec/kokansey-sarlu`
4. Railway détectera automatiquement le fichier `nixpacks.toml`

## Étape 3 : Configuration automatique

Railway détectera automatiquement la configuration depuis `nixpacks.toml` :

- **Build** : Backend + Frontend
- **Start** : Backend avec frontend servi
- **Variables** : NODE_ENV=production, SERVE_FRONTEND=true

## Étape 4 : Ajouter la base de données

1. Dans le projet Railway, cliquez sur "New Service"
2. Choisisse "Database"
3. Sélectionnez "PostgreSQL"
4. Railway créera automatiquement la DB

## Étape 5 : Configurer les variables d'environnement

1. Cliquez sur le service backend
2. Onglet "Variables"
3. Ajoutez/Modifiez :

```env
DATABASE_URL=(Railway l'ajoutera automatiquement depuis la DB)
JWT_SECRET=(généré automatiquement par Railway)
JWT_EXPIRES_IN=24h
PORT=5000
FRONTEND_URL=(l'URL Railway de votre projet)
NODE_ENV=production
SERVE_FRONTEND=true
```

## Étape 6 : Migration de la base de données

Après le premier déploiement :

1. Cliquez sur le service backend
2. Onglet "Logs"
3. Cliquez sur "Console" (shell)
4. Exécutez :
```bash
cd backend
npx prisma db push
```

Ou ajoutez un script de migration dans `backend/package.json` :

```json
"scripts": {
  "postinstall": "npx prisma generate && npx prisma db push"
}
```

## Étape 7 : Vérifier le déploiement

1. Cliquez sur le service backend
2. Cliquez sur le lien généré (ex: `https://kokansey-sarlu.up.railway.app`)
3. Testez :
   - `/api/health` → doit retourner `{"status":"ok"}`
   - Page d'accueil → frontend doit s'afficher

## Étape 8 : Configuration CORS

Une fois déployé, récupérez l'URL Railway et mettez à jour `FRONTEND_URL` :

```
FRONTEND_URL=https://kokansey-sarlu.up.railway.app
```

## Coûts

| Service | Coût |
|---------|------|
| Backend (Node.js) | ~$5/mois |
| PostgreSQL | Inclus dans le plan |
| **Total estimé** | **~$5/mois** |

## Avantages Railway

- **Interface visuelle** : Dashboard moderne et intuitif
- **Tout au même endroit** : Backend + Frontend + DB
- **Logs en temps réel** : Monitoring facile
- **Redéploiement automatique** : Push GitHub → déploiement
- **Variables d'environnement** : Interface graphique
- **Base de données** : PostgreSQL inclus

## Dépannage

### Erreur de connexion DB

Vérifiez que `DATABASE_URL` est correctement lié à la DB Railway dans les variables.

### Frontend ne s'affiche pas

Vérifiez que `SERVE_FRONTEND=true` et que le build frontend a réussi.

### Erreur CORS

Vérifiez que `FRONTEND_URL` contient l'URL Railway correcte.

### Migration échoue

Utilisez le shell Railway pour exécuter manuellement `npx prisma db push`.

## Mise à jour

Pour mettre à jour l'application :

```bash
git add .
git commit -m "Description de la mise à jour"
git push
```

Railway déploiera automatiquement.

## WhatsApp sur Railway

WhatsApp-web.js peut fonctionner sur Railway avec quelques ajustements :

1. Ajoutez une variable `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
2. Railway utilise un environnement Linux compatible
3. Peut nécessiter des ajustements de permissions

Si des problèmes surviennent, envisagez un service dédié pour WhatsApp.
