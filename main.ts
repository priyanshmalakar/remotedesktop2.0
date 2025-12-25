/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/restrict-plus-operands */

import {
    app,
    dialog,
    Menu,
    nativeImage,
    Tray,
    BrowserWindow,
    ipcMain,
    desktopCapturer,
    MessageBoxOptions,
} from 'electron';

import { autoUpdater } from 'electron-updater';

import * as path from 'path';
import * as url from 'url';


// const isDev = process.env.NODE_ENV !== 'production';
// if (isDev) {
//     require('dotenv').config();
// }

require('@electron/remote/main').initialize();

autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.allowDowngrade = false;


ipcMain.handle('DESKTOP_CAPTURER_GET_SOURCES', (event, opts) =>
    desktopCapturer.getSources(opts)
);

ipcMain.handle('CHECK_FOR_UPDATES', async () => {
    try {
        console.log('Manual update check triggered');
        const result = await autoUpdater.checkForUpdates();
        console.log('Check for updates result:', result);
        return { 
            success: true, 
            updateInfo: result?.updateInfo,
            currentVersion: app.getVersion()
        };
    } catch (error) {
        console.error('Update check error:', error);
        return { 
            success: false, 
            error: error.message || String(error),
            currentVersion: app.getVersion()
        };
    }
});


ipcMain.handle('DOWNLOAD_UPDATE', async () => {
    try {
        await autoUpdater.downloadUpdate();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

let type: string;
if (process.platform === 'win32') {
    type = 'win';
}
if (process.platform === 'darwin') {
    type = 'macos';
}
if (process.platform === 'linux') {
    type = 'linux';
}


autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'priyanshmalakar',
    repo: 'remotedesktop2.0',
    private: false,
    releaseType: 'release',
});
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
process.env.ELECTRON_UPDATER_ALLOW_UNSIGNED = 'true';

autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
    win?.webContents.send('update-checking');
});

autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info);
    win?.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info);
    win?.webContents.send('update-not-available', info);
});

autoUpdater.on('error', (err) => {
    console.error('Update error:', err);
    win?.webContents.send('update-error', err);
});


autoUpdater.on('download-progress', (progressObj) => {
    let log_message = 'Download speed: ' + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
    console.log(log_message);
    win?.webContents.send('update-download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info);
    const dialogOpts: MessageBoxOptions = {
        type: 'info',
        buttons: ['Restart', 'Later'],
        title: 'Application Update',
        message: 'New version downloaded',
        detail: 'A new version has been downloaded. Restart the application to apply the updates.',
    };

    dialog.showMessageBox(dialogOpts).then(returnValue => {
        if (returnValue.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});

let hidden, tray, serve;

let win: Electron.BrowserWindow | any = null;
const gotTheLock = app.requestSingleInstanceLock();

const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');
hidden = args.some(val => val === '--hidden');

// eslint-disable-next-line @typescript-eslint/require-await
async function createWindow(): Promise<Electron.BrowserWindow> {
    autoUpdater.checkForUpdates();
    app.setAppUserModelId('de.webzone.remotedesktop-control');
    //  app.allowRendererProcessReuse = false;

    // Create the browser window.
    win = new BrowserWindow({
        width: 410,
        minWidth: 250,
        minHeight: 250,
        height: 600,
        icon: path.join(__dirname, 'data/icon.png'),
        show: !hidden,
        titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
        frame: process.platform === 'darwin' ? true : false,
        center: true,
        backgroundColor: '#252a33',
        webPreferences: {
            nodeIntegration: true,
            allowRunningInsecureContent: serve ? true : false,
            contextIsolation: false,
            enableRemoteModule: true,
            // enableRemoteModule: true,
        } as any,
    });

    require('@electron/remote/main').enable(win.webContents);
    win.maximize();
    /*const isMac = process.platform === 'darwin';
  const template = [
    { id: '1', label: 'one' },
    { id: '2', label: 'two' },
    { id: '3', label: 'three' },
    { id: '4', label: 'four' },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
*/
    const iconPath = path.join(__dirname, 'data/icon-no-bg-small.png');

    tray = new Tray(nativeImage.createFromPath(iconPath));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open',
            click: () => {
                win?.show();
            },
        },
        {
            label: 'Dev Tools',
            click: () => {
                win?.webContents.openDevTools();
            },
        },
        {
            label: 'Close',
            click: () => {
                win?.close();
                app?.quit();
            },
        },
    ]);
    tray.setToolTip('Remotecontrol Desktop');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        win.show();
    });

    if (serve) {
        // win.webContents.openDevTools();
        require('electron-reload')(__dirname, {
            electron: require(`${__dirname}/node_modules/electron`),
        });
        win.loadURL('http://localhost:4200/#/home');
    } else {
        win.loadURL(
            url.format({
                pathname: path.join(__dirname, 'dist/index.html'),
                protocol: 'file:',
                slashes: true,
            })
        );
    }

    // win.webContents.openDevTools();

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store window
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null;
    });

    win.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
            // win.webContents.openDevTools();
            event.preventDefault();
        }
    });

    /*win.on('close', (e) => {
    e.preventDefault();
    win.destroy();
  });*/

    return win;
}

try {
    // Quit when all windows are closed.
    app.on('window-all-closed', () => {
        // On OS X it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    if (!gotTheLock) {
        app.quit();
    } else {
        app.on('second-instance', (event, commandLine, workingDirectory) => {
            // Someone tried to run a second instance, we should focus our window.
            if (win) {
                win.show();
                win.focus();
                // win.restore();
                // if (win.isMinimized()) win.restore();
            }
        });

        // Create myWindow, load the rest of the app, etc...
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        app.on('ready', async () => {
            await createWindow();
        });
    }

    app.on('activate', () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (win === null) {
            createWindow();
        }
    });
} catch (e) {
    console.log('e', e);
    // Catch Error
    // throw e;
}
