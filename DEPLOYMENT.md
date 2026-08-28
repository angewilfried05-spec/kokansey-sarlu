# Guide de déploiement Cloud - KOKANSEY SARLU

## Architecture de déploiement

- **Backend** : Node.js + Express + Prisma (PostgreSQL) → hébergé sur Render
- **Frontend** : React + Vite → hébergé sur Vercel
- **Base de données** : PostgreSQL → hébergée sur Render

**Architecture séparée** : Backend et frontend sont déployés séparément. Le frontend appelle le backend via l'URL Render configurée dans `VITE_API_URL`.

## Étape 1 : Préparation du repository

### 1.1 Pousser le code sur GitHub

```bash
git init
git add .
git commit -m "Préparation déploiement cloud"
git branch -M main
git remote add origin https://github.com/votre-username/kokansey-sarlu.git
git push -u origin main
```

### 1.2 Variables d'environnement

Créez un fichier `.env` dans le dossier `backend/` :

```env
DATABASE_URL=postgresql://user:password@localhost:5432/kokansey?schema=public
JWT_SECRET=votre_clé_secrète_longue_et_aléatoire
JWT_EXPIRES_IN=24h
PORT=5000
FRONTEND_URL=https://kokansey-frontend.vercel.app
NODE_ENV=production
SERVE_FRONTEND=false
```

## Étape 2 : Déploiement du Backend sur Render

### 2.1 Créer un compte Render

Allez sur [render.com](https://render.com) et créez un compte gratuit.

### 2.2 Connecter le repository

1. Cliquez sur "New +"
2. Choisissez "Web Service"
3. Connectez votre compte GitHub
4. Sélectionnez le repository `kokansey-sarlu`

### 2.3 Configuration du service

Render détectera automatiquement le fichier `render.yaml` avec la configuration suivante :

- **Nom** : kokansey-backend
- **Environnement** : Node.js
- **Build Command** : `cd backend && npm install && npx prisma generate`
- **Start Command** : `cd backend && npm start`

### 2.4 Configuration de la base de données

Render créera automatiquement une base PostgreSQL avec les paramètres :
- **Nom** : kokansey-db
- **Plan** : Free (90 jours d'inactivité max)

### 2.5 Variables d'environnement sur Render

Render configurera automatiquement :
- `DATABASE_URL` : connexion à la DB PostgreSQL
- `JWT_SECRET` : généré automatiquement
- `FRONTEND_URL` : URL du frontend Vercel
- `PORT` : 10000 (port Render)
- `NODE_ENV` : production
- `SERVE_FRONTEND` : false

### 2.6 Migration de la base de données

Après le premier déploiement, exécutez la migration :

```bash
# Dans le shell Render (ongel "Shell" du service)
cd backend
npx prisma db push
```

Ou ajoutez un script de migration dans `package.json` :

```json
"scripts": {
  "postinstall": "npx prisma generate && npx prisma db push"
}
```

## Étape 3 : Déploiement du Frontend sur Vercel

### 3.1 Créer un compte Vercel

Allez sur [vercel.com](https://vercel.com) et créez un compte gratuit.

### 3.2 Importer le projet

1. Cliquez sur "Add New Project"
2. Importez le repository GitHub `kokansey-sarlu`
3. Vercel détectera automatiquement le framework (Vite)

### 3.3 Configuration du projet

Vercel détectera le fichier `vercel.json` avec :

- **Build Command** : `cd frontend && npm run build`
- **Output Directory** : `frontend/dist`
- **Framework** : Vite

### 3.4 Variables d'environnement sur Vercel

Ajoutez la variable :

- `VITE_API_URL` : URL de votre backend Render (ex: `https://kokansey-backend.onrender.com`)

Cette variable est utilisée dans `frontend/src/lib/api.ts` pour construire les URLs d'API.

## Étape 4 : Mise à jour CORS

Une fois le backend déployé, récupérez l'URL Render et mettez à jour `FRONTEND_URL` dans les variables d'environnement Render :

```
FRONTEND_URL=https://kokansey-frontend.vercel.app,https://kokansey-backend.onrender.com
```

## Étape 5 : Intégration WhatsApp (Optionnel)

### Limitations sur Render

WhatsApp-web.js nécessite Chrome headless, ce qui est difficile sur Render. Options :

1. **Service dédié** : Héberger le service WhatsApp sur un VPS séparé (DigitalOcean, AWS Lightsail)
2. **API externe** : Utiliser une API WhatsApp tierce (Twilio, MessageBird)
3. **Désactiver** : Commenter les routes WhatsApp si non utilisées

### Option 1 : Service dédié

Créez un service séparé avec Docker :

```dockerfile
FROM node:18
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
CMD ["node", "index.js"]
```

## Étape 6 : Test de déploiement

### 6.1 Vérifier le backend

```bash
curl https://kokansey-backend.onrender.com/api/health
```

Doit retourner : `{"status":"ok","timestamp":"..."}`

### 6.2 Vérifier le frontend

Ouvrez `https://kokansey-frontend.vercel.app` dans le navigateur.

### 6.3 Test d'authentification

1. Créez un utilisateur via l'interface ou directement en base
2. Testez la connexion
3. Vérifiez que les données sont persistées

## Étape 7 : Monitoring et maintenance

### Render

- **Logs** : Onglet "Logs" du service
- **Métriques** : Onglet "Metrics"
- **Redéploiement** : Push sur GitHub → déploiement automatique

### Vercel

- **Logs** : Onglet "Logs" du projet
- **Analytics** : Onglet "Analytics"
- **Redéploiement** : Push sur GitHub → déploiement automatique

### Base de données

- **Backup** : Render fait des backups automatiques
- **Accès direct** : Utilisez psql avec la connexion Render

## Coûts estimés

| Service | Plan | Coût |
|---------|------|------|
| Render (Backend) | Free | 0€ |
| Render (PostgreSQL) | Free | 0€ |
| Vercel (Frontend) | Hobby | 0€ |
| **Total** | | **0€** |

**Limites Free** :
- Render : 750h/mois, 90j inactivité max
- Vercel : 100GB bandwidth/mois

## Dépannage

### Erreur CORS

Vérifiez que `FRONTEND_URL` contient bien l'URL Vercel.

### Erreur de connexion DB

Vérifiez que `DATABASE_URL` est correctement configuré sur Render.

### WhatsApp ne fonctionne pas

Sur Render, WhatsApp-web.js ne fonctionne pas. Utilisez un VPS dédié ou une API tierce.

### Frontend blank page

Vérifiez les logs Vercel et que le build a réussi.

## Sécurité

- **HTTPS** : Activé automatiquement sur Render et Vercel
- **JWT_SECRET** : Généré automatiquement par Render
- **CORS** : Configuré pour les domaines autorisés
- **Rate limiting** : Implémenté dans le backend
- **Security headers** : Configurés dans `backend/index.js`

## Mise à jour

Pour mettre à jour l'application :

```bash
git add .
git commit -m "Description de la mise à jour"
git push
```

Render et Vercel déploieront automatiquement.
