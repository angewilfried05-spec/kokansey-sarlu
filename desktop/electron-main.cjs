const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');

// URL de l'API Hetzner
const API_URL = process.env.API_URL || 'http://65.109.236.120';

let mainWindow = null;

async function createWindow() {
  console.log('Création de la fenêtre...');
  console.log('URL de l\'API:', API_URL);

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
      webSecurity: true,
    },
  });

  console.log('Fenêtre créée');

  mainWindow.once('ready-to-show', () => {
    console.log('Fenêtre prête à être affichée');
    if (mainWindow) mainWindow.show();
  });

  mainWindow.on('closed', () => {
    console.log('Fenêtre fermée');
    mainWindow = null;
  });

  // Charger l'application depuis l'API Hetzner
  console.log('Chargement de l\'URL:', API_URL);
  try {
    await mainWindow.loadURL(API_URL);
    console.log('URL chargée avec succès');
  } catch (error) {
    console.error('Erreur lors du chargement de l\'URL:', error);
    dialog.showErrorBox('Erreur de chargement', `Impossible de charger l'URL: ${error.message}`);
  }
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
