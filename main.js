"use strict";
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var electron_updater_1 = require("electron-updater");
var path = require("path");
var url = require("url");
// const isDev = process.env.NODE_ENV !== 'production';
// if (isDev) {
//     require('dotenv').config();
// }
require('@electron/remote/main').initialize();
electron_1.ipcMain.handle('DESKTOP_CAPTURER_GET_SOURCES', function (event, opts) {
    return electron_1.desktopCapturer.getSources(opts);
});
electron_1.ipcMain.handle('CHECK_FOR_UPDATES', function () { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, electron_updater_1.autoUpdater.checkForUpdates()];
            case 1:
                result = _a.sent();
                return [2 /*return*/, { success: true, updateInfo: result === null || result === void 0 ? void 0 : result.updateInfo }];
            case 2:
                error_1 = _a.sent();
                return [2 /*return*/, { success: false, error: error_1.message }];
            case 3: return [2 /*return*/];
        }
    });
}); });
var type;
if (process.platform === 'win32') {
    type = 'win';
}
if (process.platform === 'darwin') {
    type = 'macos';
}
if (process.platform === 'linux') {
    type = 'linux';
}
electron_updater_1.autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'priyanshmalakar',
    repo: 'RemoteDesktop',
    private: false,
    //  token: isDev ? process.env.GH_TOKEN : '',
    releaseType: 'release',
});
electron_updater_1.autoUpdater.autoDownload = true;
electron_updater_1.autoUpdater.on('download-progress', function (progressObj) {
    var log_message = 'Download speed: ' + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message =
        log_message +
            ' (' +
            progressObj.transferred +
            '/' +
            progressObj.total +
            ')';
});
electron_updater_1.autoUpdater.on('update-downloaded', function (event) {
    var dialogOpts = {
        type: 'info',
        buttons: ['Neustart', 'Später'],
        title: 'Anwendungsaktualisierung',
        message: 'releaseNotes',
        detail: 'Eine neue Version wurde heruntergeladen. Starten Sie die Anwendung neu, um die Updates anzuwenden.',
    };
    electron_1.dialog.showMessageBox(dialogOpts).then(function (returnValue) {
        if (returnValue.response === 0)
            electron_updater_1.autoUpdater.quitAndInstall();
    });
});
var hidden, tray, serve;
var win = null;
var gotTheLock = electron_1.app.requestSingleInstanceLock();
var args = process.argv.slice(1);
serve = args.some(function (val) { return val === '--serve'; });
hidden = args.some(function (val) { return val === '--hidden'; });
// eslint-disable-next-line @typescript-eslint/require-await
function createWindow() {
    return __awaiter(this, void 0, void 0, function () {
        var iconPath, contextMenu;
        return __generator(this, function (_a) {
            electron_updater_1.autoUpdater.checkForUpdates();
            electron_1.app.setAppUserModelId('de.webzone.remotedesktop-control');
            //  app.allowRendererProcessReuse = false;
            // Create the browser window.
            win = new electron_1.BrowserWindow({
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
                },
            });
            require('@electron/remote/main').enable(win.webContents);
            iconPath = path.join(__dirname, 'data/icon-no-bg-small.png');
            tray = new electron_1.Tray(electron_1.nativeImage.createFromPath(iconPath));
            contextMenu = electron_1.Menu.buildFromTemplate([
                {
                    label: 'Open',
                    click: function () {
                        win === null || win === void 0 ? void 0 : win.show();
                    },
                },
                {
                    label: 'Dev Tools',
                    click: function () {
                        win === null || win === void 0 ? void 0 : win.webContents.openDevTools();
                    },
                },
                {
                    label: 'Close',
                    click: function () {
                        win === null || win === void 0 ? void 0 : win.close();
                        electron_1.app === null || electron_1.app === void 0 ? void 0 : electron_1.app.quit();
                    },
                },
            ]);
            tray.setToolTip('Remotecontrol Desktop');
            tray.setContextMenu(contextMenu);
            tray.on('click', function () {
                win.show();
            });
            if (serve) {
                require('electron-reload')(__dirname, {
                    electron: require("".concat(__dirname, "/node_modules/electron")),
                });
                win.loadURL('http://localhost:4200/#/home');
            }
            else {
                win.loadURL(url.format({
                    pathname: path.join(__dirname, 'dist/index.html'),
                    protocol: 'file:',
                    slashes: true,
                }));
            }
            win.webContents.once('did-finish-load', function () {
                win.webContents.openDevTools();
            });
            // Emitted when the window is closed.
            win.on('closed', function () {
                // Dereference the window object, usually you would store window
                // in an array if your app supports multi windows, this is the time
                // when you should delete the corresponding element.
                win = null;
            });
            win.webContents.on('before-input-event', function (event, input) {
                if (input.control && input.shift && input.key.toLowerCase() === 'i') {
                    win.webContents.openDevTools();
                    event.preventDefault();
                }
            });
            /*win.on('close', (e) => {
            e.preventDefault();
            win.destroy();
          });*/
            return [2 /*return*/, win];
        });
    });
}
try {
    // Quit when all windows are closed.
    electron_1.app.on('window-all-closed', function () {
        // On OS X it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            electron_1.app.quit();
        }
    });
    if (!gotTheLock) {
        electron_1.app.quit();
    }
    else {
        electron_1.app.on('second-instance', function (event, commandLine, workingDirectory) {
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
        electron_1.app.on('ready', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, createWindow()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    }
    electron_1.app.on('activate', function () {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (win === null) {
            createWindow();
        }
    });
}
catch (e) {
    console.log('e', e);
    // Catch Error
    // throw e;
}
//# sourceMappingURL=main.js.map