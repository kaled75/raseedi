import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, closeDatabase } from './db';
import { registerIpcHandlers } from './ipc/handlers';

// Calculate permanent userData directory
const userProfile = process.env.USERPROFILE || (process.env.HOMEDRIVE && process.env.HOMEPATH ? `${process.env.HOMEDRIVE}${process.env.HOMEPATH}` : '');
const permanentAppData = userProfile 
  ? path.join(userProfile, 'AppData', 'Roaming', 'رَصيدي - Raseedi')
  : (process.env.APPDATA ? path.join(process.env.APPDATA, 'رَصيدي - Raseedi') : path.join(process.cwd(), 'data'));

let userDataDir = permanentAppData;

// Check if running in Portable mode with a local data directory next to the executable
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  const localDataDir = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data');
  if (fs.existsSync(localDataDir)) {
    userDataDir = localDataDir;
  } else {
    // Use permanent AppData so installed and portable share persistent database on this computer
    userDataDir = permanentAppData;
  }
}

if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}

// Crucial: Set userData early before Chromium and app initialization
try {
  app.setPath('userData', userDataDir);
} catch (e) {
  console.error('Failed to set userData path:', e);
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../build/icon.ico');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: 'رَصيدي | Raseedi — Personal Debt Manager',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    },
    autoHideMenuBar: true,
    show: false
  });

  // Remove default menu for SaaS desktop feel
  Menu.setApplicationMenu(null);

  // Initialize database in persistent userDataDir
  const dbPath = path.join(userDataDir, 'raseedi.sqlite3');
  initDatabase(dbPath);

  // Register IPC handlers
  registerIpcHandlers(mainWindow);

  // Load URL
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else if (!app.isPackaged && fs.existsSync(path.join(__dirname, '../dist/index.html')) && process.env.NODE_ENV === 'production') {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Restrict navigation and open safe external URLs in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
        shell.openExternal(url);
      }
    } catch {
      if (url.startsWith('mailto:')) {
        shell.openExternal(url);
      }
    }
    return { action: 'deny' };
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      closeDatabase();
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}
