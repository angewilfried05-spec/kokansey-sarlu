const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const http = require('http');

const BACKEND_PORT = Number(process.env.PORT || 5000);
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

let mainWindow = null;
let backendProcess = null;

function isDev() {
  return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

function resolveBackendEntry() {
  if (isDev()) {
    return path.join(__dirname, '..', 'backend', 'index.js');
  }
  return path.join(process.resourcesPath, 'backend', 'index.js');
}

function resolveBackendDir() {
  return path.dirname(resolveBackendEntry());
}

// En mode packagé, la configuration (secret JWT, base de données) est générée
// au premier lancement dans le dossier utilisateur — jamais embarquée dans le package.
function ensureRuntimeEnv() {
  const base = path.join(app.getPath('userData'), 'desktop-data');
  fs.mkdirSync(base, { recursive: true });
  const envFile = path.join(base, '.env');
  if (!fs.existsSync(envFile)) {
    const dbFile = path.join(base, 'kokansey.db');
    if (!fs.existsSync(dbFile)) {
      const seedDb = path.join(resolveBackendDir(), 'prisma', 'standalone.db');
      if (fs.existsSync(seedDb)) fs.copyFileSync(seedDb, dbFile);
    }
    const secret = require('crypto').randomBytes(48).toString('base64url');
    const content = [
      `DATABASE_URL="file:${dbFile.replace(/\\/g, '/')}"`,
      `JWT_SECRET="${secret}"`,
      `JWT_EXPIRES_IN="24h"`,
      `ENABLE_WHATSAPP="false"`,
    ].join('\n') + '\n';
    fs.writeFileSync(envFile, content, { mode: 0o600 });
  }
  return envFile;
}

function tryLoadDotenv() {
  const backendDir = resolveBackendDir();
  const candidates = isDev()
    ? [
        path.join(backendDir, '.env'),
        path.join(backendDir, '..', '.env'),
        path.join(__dirname, '.env'),
      ]
    : [ensureRuntimeEnv()];

  const envFile = candidates.find((p) => fs.existsSync(p));
  if (!envFile) return false;

  try {
    const dotenvPath = path.join(backendDir, 'node_modules', 'dotenv');
    require(dotenvPath).config({ path: envFile });
    return true;
  } catch {
    return false;
  }
}

function validateEnv() {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Variables manquantes dans .env : ${missing.join(', ')}`);
  }
}

function prepareWhatsAppWritableDirs() {
  const base = path.join(app.getPath('userData'), 'desktop-data');
  const authDir = path.join(base, '.wwebjs_auth');
  const cacheDir = path.join(base, '.wwebjs_cache');
  fs.mkdirSync(authDir, { recursive: true });
  fs.mkdirSync(cacheDir, { recursive: true });
  process.env.WHATSAPP_AUTH_DIR = authDir;
  process.env.WHATSAPP_CACHE_DIR = cacheDir;
}

function waitForBackendReady(timeoutMs = 45000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const req = http.get(`${BACKEND_URL}/api/health`, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else if (Date.now() - startedAt > timeoutMs) {
          reject(new Error('Backend non prêt (timeout).'));
        } else {
          setTimeout(probe, 600);
        }
      });

      req.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error('Impossible de joindre le backend local.'));
        } else {
          setTimeout(probe, 600);
        }
      });
    };

    probe();
  });
}

function startBackend() {
  if (backendProcess) return;

  const backendEntry = resolveBackendEntry();
  if (!fs.existsSync(backendEntry)) {
    dialog.showErrorBox('Backend introuvable', `Le fichier backend est introuvable : ${backendEntry}`);
    app.quit();
    return;
  }

  const backendCwd = path.dirname(backendEntry);
  backendProcess = fork(backendEntry, [], {
    stdio: 'inherit',
    cwd: backendCwd,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(BACKEND_PORT),
      HOST: '127.0.0.1',
      SERVE_FRONTEND: 'true',
    },
  });

  backendProcess.on('error', (err) => {
    dialog.showErrorBox('Erreur backend', `Le serveur local n'a pas pu démarrer : ${err.message}`);
  });

  backendProcess.on('exit', (code) => {
    backendProcess = null;
    if (!app.isQuitting && code !== 0) {
      dialog.showErrorBox('Backend arrêté', `Le serveur local s'est arrêté (code ${code}). L'application va se fermer.`);
      app.quit();
    }
  });
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

async function createWindow() {
  tryLoadDotenv();
  validateEnv();
  prepareWhatsAppWritableDirs();
  startBackend();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) mainWindow.show();
  });

  // Afficher un écran de démarrage pendant que le backend monte
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <html><body style="margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:system-ui;background:#f0fdf4">
      <div style="width:64px;height:64px;border-radius:16px;background:#15803d;display:flex;align-items:center;justify-content:center;margin-bottom:20px">
        <span style="color:#fbbf24;font-size:36px;font-weight:900">K</span>
      </div>
      <h1 style="color:#15803d;font-size:22px;margin:0 0 8px">KOKANSEY SARLU</h1>
      <p style="color:#6b7280;font-size:14px">Démarrage en cours…</p>
    </body></html>
  `)}`);

  await waitForBackendReady();
  await mainWindow.loadURL(BACKEND_URL);
}

function configurePermissions() {
  const { session } = require('electron');
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === 'geolocation';
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'geolocation');
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopBackend();
});

app.whenReady().then(async () => {
  try {
    configurePermissions();
    await createWindow();
  } catch (error) {
    dialog.showErrorBox('Démarrage impossible', error?.message || 'Échec de lancement de l’application.');
    app.quit();
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      try {
        await createWindow();
      } catch (error) {
        dialog.showErrorBox('Démarrage impossible', error?.message || 'Échec de lancement de l’application.');
        app.quit();
      }
    }
  });
});
