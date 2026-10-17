# KOKANSEY SARLU — Android WebView

Application Android native qui encapsule le frontend KOKANSEY (servi par le serveur de production Hetzner) dans une `WebView`.

## Prérequis

- Android Studio Hedgehog (2023.1.1) ou supérieur (le JDK 17 embarqué suffit : `jbr`)
- Android SDK (platform android-34, build-tools 34)

## Configuration

- `local.properties` (non versionné) : `sdk.dir=C:/Users/<user>/AppData/Local/Android/Sdk` — utiliser des `/` ou `\\`, pas `\` seul.
- `gradle.properties` : `BASE_URL_DEBUG` / `BASE_URL_RELEASE` pointent sur `http://65.109.236.120` (production).
- `keystore.properties` (non versionné) + `app/kokansey-release.jks` : signature release.

## Build

```bash
JAVA_HOME="C:\Program Files\Android\Android Studio\jbr" ./gradlew assembleRelease
```

Produit `app/build/outputs/apk/release/kokansey-sarlu-release.apk` (signé, ~4.4 Mo).

Installation : transférer l'APK sur le téléphone → ouvrir le fichier → autoriser "installer des applications inconnues". Le trafic cleartext HTTP est autorisé via `network_security_config.xml` (le serveur n'a pas encore de HTTPS).

## Fonctionnement

- `MainActivity` charge `BuildConfig.BASE_URL` dans la WebView.
- Écran offline + bouton Réessayer si pas de réseau.
- Cache WebView `LOAD_CACHE_ELSE_NETWORK` hors-ligne.
- Bouton retour = historique WebView.
- Les liens vers un autre domaine sont bloqués dans la WebView.
