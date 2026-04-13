// electron/main.ts
import { app, BrowserWindow, shell, Menu } from 'electron';
import { join }                       from 'path';
import { storeAPI }                   from './store/key-store';
import { registerStoreHandlers }      from './ipc-handlers/store-handler';
import { registerHardwareHandlers }   from './ipc-handlers/hardware-handler';
import { buildMenu }                  from './menu';
import { setupUpdater }               from './updater';

function createWindow(): BrowserWindow {
  const bounds = storeAPI.getWindowBounds();

  const win = new BrowserWindow({
    ...bounds,
    minWidth:  1200,
    minHeight: 700,
    frame:     true,
    show:      false,
    backgroundColor: '#0f2744',
    webPreferences: {
      preload:         join(__dirname, '../preload/index.js'),
      contextIsolation:true,
      nodeIntegration: false,
      sandbox:         false,
    },
  });

  // Persist window bounds on resize/move
  const saveBounds = () => {
    const b = win.getBounds();
    storeAPI.setWindowBounds({ width: b.width, height: b.height, x: b.x, y: b.y });
  };
  win.on('resized', saveBounds);
  win.on('moved',   saveBounds);

  // Open external links in browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.once('ready-to-show', () => win.show());

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}

app.whenReady().then(() => {
  registerStoreHandlers();

  const win = createWindow();
  Menu.setApplicationMenu(buildMenu(win));
  registerHardwareHandlers(win);
  setupUpdater(win);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
