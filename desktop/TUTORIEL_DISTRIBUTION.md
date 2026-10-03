# Tutoriel de Distribution - Application Desktop KOKANSEY SARLU

## Vue d'ensemble

L'application desktop KOKANSEY SARLU est une version Electron qui se connecte directement au serveur Hetzner (http://65.109.236.120). Elle ne nécessite pas d'installation locale de base de données ou de backend.

## Architecture

- **Application Desktop** : Interface Electron (Windows)
- **Serveur Backend** : Hetzner VPS (65.109.236.120)
- **Base de données** : PostgreSQL sur Hetzner
- **Communication** : HTTP via l'IP du serveur

## Prérequis pour les utilisateurs finaux

- Windows 10 ou 11 (64 bits)
- Connexion internet active (pour accéder au serveur Hetzner)
- Droits d'installation (pour la version setup)

## Fichiers de distribution

Les installateurs sont générés dans le dossier `desktop/dist-electron/` :

1. **KOKANSEY SARLU Setup x.x.x.exe** - Installateur NSIS
   - Installation classique avec désinstallation
   - Crée des raccourcis dans le menu Démarrer
   - Ajoute une entrée dans "Programmes et fonctionnalités"

2. **KOKANSEY SARLU x.x.x.exe** - Version portable
   - Exécutable portable sans installation
   - Peut être exécuté depuis une clé USB
   - Ne nécessite pas de droits administrateur

## Instructions d'installation

### Version Setup (Recommandée)

1. Téléchargez `KOKANSEY SARLU Setup x.x.x.exe`
2. Double-cliquez sur le fichier
3. Suivez l'assistant d'installation :
   - Choisissez le dossier d'installation (par défaut : `C:\Program Files\KOKANSEY SARLU`)
   - Cochez "Créer un raccourci sur le bureau" si souhaité
4. Cliquez sur "Installer"
5. Attendez la fin de l'installation
6. Lancez l'application depuis le menu Démarrer ou le raccourci bureau

### Version Portable

1. Téléchargez `KOKANSEY SARLU x.x.x.exe`
2. Placez le fichier dans le dossier de votre choix
3. Double-cliquez pour lancer l'application
4. Aucune installation requise

## Première utilisation

### Connexion

Au premier lancement, l'application se connecte automatiquement au serveur Hetzner.

**Identifiants par défaut :**
- **Nom d'utilisateur** : `KOKANSEY GROUP`
- **Mot de passe** : `admin123`

⚠️ **Important** : Changez le mot de passe administrateur après la première connexion.

### Configuration de l'URL du serveur

Si l'IP du serveur change, vous pouvez modifier l'URL via une variable d'environnement :

1. Créez un fichier `.env` dans le dossier d'installation
2. Ajoutez la ligne : `API_URL=http://NOUVELLE_IP`
3. Redémarrez l'application

Ou définissez la variable d'environnement Windows :
```cmd
set API_URL=http://NOUVELLE_IP
```

## Dépannage

### L'application ne se lance pas

1. **Vérifiez votre connexion internet** - L'application nécessite une connexion au serveur Hetzner
2. **Vérifiez que le serveur est accessible** - Ouvrez http://65.109.236.120 dans votre navigateur
3. **Vérifiez les pare-feu/antivirus** - Certains peuvent bloquer l'application
4. **Exécutez en tant qu'administrateur** - Clique droit > Exécuter en tant qu'administrateur

### Erreur de connexion au serveur

1. Vérifiez que le serveur Hetzner est en ligne
2. Vérifiez votre connexion internet
3. Contactez l'administrateur système si le problème persiste

### L'application se ferme immédiatement

1. Vérifiez les logs dans le dossier `%APPDATA%\kokansey-desktop\logs`
2. Consultez la section "Logs et diagnostics" ci-dessous

## Logs et diagnostics

Les logs de l'application sont stockés dans :
```
%APPDATA%\kokansey-desktop\logs\
```

Pour accéder aux logs :
1. Appuyez sur `Win + R`
2. Tapez `%APPDATA%`
3. Naviguez vers `kokansey-desktop\logs`

## Mise à jour de l'application

### Version Setup

1. Téléchargez la nouvelle version de l'installateur
2. Exécutez-le - il remplacera automatiquement l'ancienne version
3. Vos données sont stockées sur le serveur, aucune perte de données locale

### Version Portable

1. Téléchargez la nouvelle version
2. Remplacez l'ancien fichier exécutable
3. Lancez la nouvelle version

## Sécurité

### Recommandations

- **Changez le mot de passe par défaut** après la première connexion
- **Ne partagez pas vos identifiants**
- **Utilisez une connexion sécurisée** si possible (HTTPS sera configuré ultérieurement)
- **Gardez l'application à jour** avec les dernières versions

### Données

- Toutes les données sont stockées sur le serveur Hetzner
- Aucune donnée sensible n'est stockée localement
- Les sessions sont gérées par des tokens JWT

## Support

En cas de problème :
1. Consultez la section "Dépannage"
2. Vérifiez les logs de l'application
3. Contactez l'administrateur système

## Notes techniques

### Configuration du serveur

- **IP** : 65.109.236.120
- **Port** : 80 (HTTP)
- **Backend** : Node.js + Express
- **Base de données** : PostgreSQL
- **WhatsApp** : Désactivé (pourra être réactivé ultérieurement)

### Configuration Electron

- **Framework** : Electron 33.2.1
- **Build tool** : electron-builder 25.1.8
- **Target** : Windows x64
- **Mode** : Remote (charge l'application depuis le serveur)

## Développement

Pour les développeurs souhaitant modifier l'application :

1. Clonez le dépôt : `https://github.com/angewilfried05-spec/kokansey-sarlu.git`
2. Naviguez vers `desktop/`
3. Installez les dépendances : `npm install`
4. Lancez en mode dev : `npm start`
5. Générez les installateurs : `npm run dist:win`

## Licence

Application propriétaire de KOKANSEY SARLU.

---
**Version** : 1.0.0  
**Date** : Septembre 2026  
**Contact** : KOKANSEY SARLU
