# KOKANSEY SARLU — Android WebView

Ce dossier porte l’application Android native qui encapsule le frontend KOKANSEY dans une `WebView`, adaptée du mode de fonctionnement de `gestion_incidents_projet`.

## Prérequis

- Android Studio Hedgehog (2023.1.1) ou supérieur
- JDK 17
- Un backend KOKANSEY accessible depuis l’émulateur/appareil
  - Émulateur Android : `http://10.0.2.2:5000` (par défaut)
  - Appareil physique : l’URL de votre machine serveur

## Configuration

1. Ouvrez le dossier `android-webview-app` dans Android Studio.
2. Laissez Android Studio synchroniser le projet et télécharger le Gradle wrapper s’il manque.
3. Modifiez `BASE_URL_DEBUG` et `BASE_URL_RELEASE` dans `app/build.gradle.kts` si nécessaire :

```kotlin
val baseUrlDebug = (project.findProperty("BASE_URL_DEBUG") as String?)?.trim().orEmpty().ifEmpty { "http://10.0.2.2:5000" }
val baseUrlRelease = (project.findProperty("BASE_URL_RELEASE") as String?)?.trim().orEmpty().ifEmpty { baseUrlDebug }
```

Vous pouvez aussi les surcharger via `gradle.properties` :

```properties
BASE_URL_DEBUG=http://10.0.2.2:5000
BASE_URL_RELEASE=https://api.example.com
```

## Build

- **Debug** : `Build > Build Bundle(s) / APK(s) > Build APK(s)`
- **Release signée** : créez un fichier `keystore.properties` à la racine de `android-webview-app` :

```properties
storeFile=keystore.jks
storePassword=...
keyAlias=...
keyPassword=...
```

## Fonctionnement

- La `MainActivity` charge l’URL configurée dans `BuildConfig.BASE_URL`.
- Elle détecte la disponibilité du réseau et affiche un écran offline avec bouton réessayer.
- Le cache WebView est utilisé en mode `LOAD_CACHE_ELSE_NETWORK` hors-ligne.
- Le bouton retour navigate dans l’historique de la `WebView`.
