// /* eslint-disable @typescript-eslint/await-thenable */
// /* eslint-disable @typescript-eslint/no-inferrable-types */
// import { Injectable } from '@angular/core';
// import { AlertController, LoadingController } from '@ionic/angular';
// import { Subscription } from 'rxjs';
// import SimplePeer from 'simple-peer';
// import SimplePeerFiles from 'simple-peer-files';
// import * as url from 'url';
// import { AppConfig } from '../../../environments/environment';
// /* eslint-disable @typescript-eslint/restrict-template-expressions */
// import { ConnectHelperService } from './connect-helper.service';
// /* eslint-disable @typescript-eslint/restrict-plus-operands */
// import { ElectronService } from './electron.service';
// import { SettingsService } from './settings.service';
// /* eslint-disable @typescript-eslint/no-misused-promises */
// import { SocketService } from './socket.service';
// import { TranslateService } from '@ngx-translate/core';
// import { keyboard } from '@nut-tree-fork/nut-js';

// @Injectable({
//     providedIn: 'root',
// })
// export class ConnectService {
//     peer1: SimplePeer.Instance;
//     spf: SimplePeerFiles;
//     socketSub: Subscription;
//     sub2: Subscription;
//     sub3: Subscription;
//     videoSource;
//     transfer;

//     initialized = false;
//     loading;
//     dialog;
//     connected: boolean = false;

//     id: string = '';
//     idArray: string[] = [];
//     remoteIdArray: any = [{}, {}, {}, {}, {}, {}, {}, {}, {}];
//     remoteId: string = '';
//     fileLoading = false;
//     cameraStream: MediaStream | null = null;
//     screenStream: MediaStream | null = null;

//     constructor(
//         private electronService: ElectronService,
//         private socketService: SocketService,
//         private connectHelperService: ConnectHelperService,
//         private loadingCtrl: LoadingController,
//         private settingsService: SettingsService,
//         private alertCtrl: AlertController
//     ) {}

//     clipboardListener() {
//         const clipboard = this.electronService.clipboard;
//         clipboard
//             .on('text-changed', () => {
//                 if (this.peer1 && this.connected) {
//                     const currentText = clipboard.readText();
//                     console.log('[CONNECT] 📋 Clipboard text changed');
//                     this.peer1.send('clipboard-' + currentText);
//                 }
//             })
//             .on('image-changed', () => {
//                 const currentImage = clipboard.readImage();
//                 console.log('[CONNECT] 📋 Clipboard image changed');
//             })
//             .startWatching();
//     }

//     setId(id) {
//         if (id.length == 9) {
//             const idArray = id.split('').map(number => {
//                 return Number(number);
//             });

//             idArray.forEach((number, index) => {
//                 this.remoteIdArray[index] = { number };
//             });
//         }
//     }

//     sendScreenSize() {
//         const scaleFactor =
//             process.platform === 'darwin'
//                 ? 1
//                 : this.electronService.remote.screen.getPrimaryDisplay()
//                       .scaleFactor;

//         const { width, height } =
//             this.electronService.remote.screen.getPrimaryDisplay().size;
        
//         const finalWidth = width * scaleFactor;
//         const finalHeight = height * scaleFactor;
        
//         console.log('[CONNECT] 📐 Sending screen size:', finalWidth, 'x', finalHeight);
//         this.socketService.sendMessage(`screenSize,${finalWidth},${finalHeight}`);
//     }

//    async videoConnector() {
//     this.loading.dismiss();
    
//     // Get SCREEN SHARE stream first (this is what the remote user will control)
//     const source = this.videoSource;
//     this.screenStream = source.stream;
    
//     console.log('[CONNECT] 🖥️ Creating peer with SCREEN SHARE stream');

//     this.peer1 = new SimplePeer({
//         initiator: true,
//         stream: this.screenStream, // Share SCREEN first - this ensures screen is track 0
//         config: {
//             iceServers: [
//                 { urls: "stun:stun.relay.metered.ca:80" },
//                 {
//                     urls: "turn:global.relay.metered.ca:80",
//                     username: "63549d560f2efcb312cd67de",
//                     credential: "qh7UD1VgYnwSWhmQ",
//                 },
//                 {
//                     urls: "turn:global.relay.metered.ca:80?transport=tcp",
//                     username: "63549d560f2efcb312cd67de",
//                     credential: "qh7UD1VgYnwSWhmQ",
//                 },
//                 {
//                     urls: "turn:global.relay.metered.ca:443",
//                     username: "63549d560f2efcb312cd67de",
//                     credential: "qh7UD1VgYnwSWhmQ",
//                 },
//                 {
//                     urls: "turns:global.relay.metered.ca:443?transport=tcp",
//                     username: "63549d560f2efcb312cd67de",
//                     credential: "qh7UD1VgYnwSWhmQ",
//                 },
//             ],
//         },
//     });
    
//     console.log('[CONNECT] ✅ SimplePeer instance created with screen stream');
    
//     this.peer1.on('signal', data => {
//         console.log('[PEER] 📡 Signal generated, sending to socket...');
//         this.socketService.sendMessage(data);
//     });

//     this.peer1.on('error', (err) => {
//         console.error('[PEER] ❌ Error:', err);
//         this.reconnect();
//     });

//     this.peer1.on('close', () => {
//         console.warn('[PEER] ⚠️ Connection closed');
//         this.reconnect();
//     });

//   this.peer1.on('connect', async () => {
//     console.log('[PEER] ✅ Connected successfully!');
//     this.connected = true;
    
//     // Start clipboard monitoring AFTER connection
//     console.log('[PEER] 📋 Starting clipboard monitoring...');
//     this.clipboardListener();
    
//     this.connectHelperService.showInfoWindow();
//     const win = this.electronService.window;
//     win.minimize();
    
//     // ⭐ IMPORTANT: Delay camera addition to ensure proper track ordering
//     console.log('[PEER] ⏳ Waiting 1 second before adding camera...');
//     setTimeout(async () => {
//         console.log('[PEER] 🎥 Now adding camera tracks...');
//         await this.startLocalCamera();
//     }, 1000); // Increased delay to 1 second
// });

//     // Handle incoming stream from REMOTE user (their camera/mic)
//     this.peer1.on('stream', (remoteStream) => {
//         console.log('[PEER] 🎥 Remote stream received from remote user');
        
//         // Create small video element for remote user's camera (picture-in-picture)
//         let remoteVideo = document.getElementById('remoteUserVideo') as HTMLVideoElement;
//         if (!remoteVideo) {
//             remoteVideo = document.createElement('video');
//             remoteVideo.id = 'remoteUserVideo';
//             remoteVideo.autoplay = true;
//             remoteVideo.style.position = 'fixed';
//             remoteVideo.style.bottom = '10px';
//             remoteVideo.style.left = '10px';
//             remoteVideo.style.width = '200px';
//             remoteVideo.style.height = '150px';
//             remoteVideo.style.borderRadius = '12px';
//             remoteVideo.style.border = '2px solid white';
//             remoteVideo.style.zIndex = '9999';
//             remoteVideo.style.objectFit = 'cover';
//             document.body.appendChild(remoteVideo);
//         }
        
//         remoteVideo.srcObject = remoteStream;
//         remoteVideo.play().catch(e => console.error('[CONNECT] Play error:', e));
//     });

//     this.peer1.on('data', async data => {
//         if (data) {
//             try {
//                 const fileTransfer = data.toString();
//                 if (fileTransfer.substr(0, 5) === 'file-') {
//                     const fileID = fileTransfer.substr(5);
//                     this.spf
//                         .receive(this.peer1, fileID)
//                         .then((transfer: any) => {
//                             this.fileLoading = true;
//                             transfer.on('progress', p => {
//                                 console.log('progress', p);
//                             });
//                             transfer.on('done', file => {
//                                 this.fileLoading = false;
//                                 console.log('done', file);
//                                 const element = document.createElement('a');
//                                 element.href = URL.createObjectURL(file);
//                                 element.download = file.name;
//                                 element.click();
//                             });
//                         });
//                     this.peer1.send(`start-${fileID}`);
//                     return;
//                 }

//                 if (fileTransfer.substr(0, 10) === 'clipboard-') {
//                     const text = fileTransfer.substr(10);
//                     console.log('[CONNECT] 📋 Clipboard received:', text.substring(0, 50));
//                     this.electronService.clipboard.writeText(text);
//                     return;
//                 }

//                 // Parse the data
//                 let text = new TextDecoder('utf-8').decode(data);
                
//                 // Check if it's JSON (keyboard input)
//                 if (text.substring(0, 1) == '{') {
//                     const keyData = JSON.parse(text);
//                     console.log('[CONNECT] ⌨️ Keyboard event:', keyData.key);
                    
//                     // Pass the parsed object directly and await the handler
//                     await this.connectHelperService.handleKey(keyData);
//                 } else if (text.substring(0, 1) == 's') {
//                     // Scroll event
//                     const parts = text.split(',');
//                     console.log('[CONNECT] 📜 Scroll event:', parts[1]);
//                     this.connectHelperService.handleScroll(text);
//                 } else {
//                     // Mouse event
//                     const parts = text.split(',');
//                     console.log('[CONNECT] 🖱️ Mouse event:', parts[0]);
//                     this.connectHelperService.handleMouse(text);
//                 }
//             } catch (error) {
//                 console.error('[CONNECT] Error handling data:', error);
//             }
//         }
//     });
// }

       

//    async startLocalCamera() {
//     try {
//         console.log('[CONNECT] 🎥 Starting local camera & microphone...');
//         this.cameraStream = await navigator.mediaDevices.getUserMedia({
//             video: true,
//             audio: true
//         });

//         console.log('[CONNECT] ✅ Camera stream obtained:', {
//             videoTracks: this.cameraStream.getVideoTracks().length,
//             audioTracks: this.cameraStream.getAudioTracks().length
//         });

//         // Add camera tracks to existing peer connection (screen already shared)
//         if (this.peer1 && this.cameraStream) {
//             console.log('[CONNECT] 📤 Adding camera tracks to peer...');
//             this.cameraStream.getTracks().forEach((track, index) => {
//                 console.log(`[CONNECT] 📤 Adding track ${index}:`, track.kind, track.label);
//                 this.peer1.addTrack(track, this.cameraStream!);
//             });
//             console.log('[CONNECT] ✅ All camera & mic tracks added to peer');
//         } else {
//             console.error('[CONNECT] ❌ Cannot add tracks - peer or stream missing');
//         }

//         // Create local video preview (self-view) - bottom-right
//         let localVideo = document.getElementById('localUserVideo') as HTMLVideoElement;
//         if (!localVideo) {
//             console.log('[CONNECT] 📺 Creating local video preview element...');
//             localVideo = document.createElement('video');
//             localVideo.id = 'localUserVideo';
//             localVideo.autoplay = true;
//             localVideo.muted = true; // mute self to avoid echo
//             localVideo.style.position = 'fixed';
//             localVideo.style.bottom = '10px';
//             localVideo.style.right = '10px';
//             localVideo.style.width = '150px';
//             localVideo.style.height = '110px';
//             localVideo.style.borderRadius = '12px';
//             localVideo.style.border = '2px solid white';
//             localVideo.style.zIndex = '9999';
//             localVideo.style.objectFit = 'cover';
//             document.body.appendChild(localVideo);
//         }
        
//         localVideo.srcObject = this.cameraStream;
//         localVideo.play()
//             .then(() => console.log('[CONNECT] ✅ Local video preview playing'))
//             .catch(e => console.error('[CONNECT] ❌ Local play error:', e));

//         return this.cameraStream;
//     } catch (err) {
//         console.error('[CONNECT] ❌ Could not start local camera:', err);
//         return null;
//     }
// }

//     async askForConnectPermission() {
//         return new Promise(async resolve => {
//             const alert = await this.alertCtrl.create({
//                 header: 'New connection',
//                 message: 'Do you want to accept the connection?',
//                 buttons: [
//                     {
//                         text: 'Cancel',
//                         role: 'cancel',
//                         handler: () => {
//                             resolve(false);
//                         },
//                     },
//                     {
//                         text: 'Accept',
//                         handler: () => {
//                             resolve(true);
//                         },
//                     },
//                 ],
//             });

//             await alert.present();
//         });
//     }

//     async generateId() {
//         if (this.settingsService.settings?.randomId) {
//             this.id = `${this.connectHelperService.threeDigit()}${this.connectHelperService.threeDigit()}${this.connectHelperService.threeDigit()}`;
//         } else {
//             const nodeMachineId = this.electronService.nodeMachineId;
//             const id = await nodeMachineId.machineId();
//             const uniqId = parseInt(id, 36).toString().substring(3, 12);
//             this.id = uniqId;
//         }
//         this.idArray = ('' + this.id).split('');
//     }

//     async init() {
//         if (this.initialized) {
//             return;
//         }
        
//         this.initialized = true;
//         await this.generateId();
//         console.log('[CONNECT] 🎯 Generated ID:', this.id);
//         console.log('[CONNECT] Initializing socket service...');

//         // Test keyboard (no dynamic import needed)
//         if (this.electronService.isElectron) {
//             console.log('[CONNECT] Testing keyboard...');
//             try {
//                 await keyboard.type('');
//                 console.log('[CONNECT] ✅ Keyboard working!');
//             } catch (err) {
//                 console.error('[CONNECT] ❌ Keyboard test failed:', err);
//             }
//         }

//         this.loading = await this.loadingCtrl.create({
//             duration: 15000,
//         });

//         // Listen for display changes
//         this.electronService.remote.screen.addListener(
//             'display-metrics-changed',
//             () => {
//                 this.sendScreenSize();
//             }
//         );

//         this.spf = new SimplePeerFiles();

//         this.socketService.init();
//         this.socketService.joinRoom(this.id);

//         this.sub3 = this.socketService.onDisconnected().subscribe(async () => {
//             console.log('[DISCONNECT] Remote peer disconnected');
//             const alert = await this.alertCtrl.create({
//                 header: 'Info',
//                 message: 'Connection was terminated',
//                 buttons: ['OK'],
//             });
//             await alert.present();

//             this.reconnect();
//         });

//         this.socketSub = this.socketService
//             .onNewMessage()
//             .subscribe(async (data: any) => {
//                 console.log('[CONNECT] 📨 Socket message received:', typeof data === 'string' ? data : 'signal');
                
//                 if (typeof data == 'string' && data == 'hi') {
//                     if (this.dialog) return; 
//                     this.dialog = true;
//                     console.log('[CONNECT] 👋 Received connection request');
//                     this.sendScreenSize();

//                     if (this.settingsService.settings?.hiddenAccess) {
//                         this.socketService.sendMessage('pwRequest');
//                         return;
//                     } else {
//                         const win = this.electronService.window;
//                         win.show();
//                         win.focus();
//                         win.restore();

//                         const result = await this.askForConnectPermission();
//                         this.dialog = false;

//                         if (!result) {
//                             this.socketService.sendMessage('decline');
//                             this.loading.dismiss();
//                             return;
//                         }
//                         await this.videoConnector();
//                     }
//                 } else if (
//                     typeof data == 'string' &&
//                     data.substring(0, 8) == 'pwAnswer'
//                 ) {
//                     const pw = data.replace(data.substring(0, 9), '');
//                     const pwCorrect =
//                         await this.electronService.bcryptjs.compare(
//                             pw,
//                             this.settingsService.settings.passwordHash
//                         );

//                     if (pwCorrect) {
//                         await this.videoConnector();
//                     } else {
//                         this.socketService.sendMessage('pwWrong');
//                         this.loading.dismiss();
                        
//                         const alert = await this.alertCtrl.create({
//                             header: 'Password not correct',
//                             buttons: ['OK']
//                         });
//                         await alert.present();
//                     }
//                 } else if (
//                     typeof data == 'string' &&
//                     data.startsWith('decline')
//                 ) {
//                     this.loading.dismiss();
//                 } else {
//                     if (this.peer1) {
//                         console.log('[CONNECT] 🔄 Signaling peer');
//                         this.peer1.signal(data);
//                     } else {
//                         console.warn('[CONNECT] ⚠️ Received signal but peer not initialized yet');
//                     }
//                 }
//             });
//     }

//     replaceVideo(stream) {
//         this.peer1.removeStream(this.screenStream);
//         this.screenStream = stream;
//         this.peer1.addStream(stream);
//     }

//     async reconnect() {
//         const win = this.electronService.window;
//         win.restore();
//         this.connected = false;
        
//         // Stop camera stream
//         if (this.cameraStream) {
//             this.cameraStream.getTracks().forEach(track => track.stop());
//             this.cameraStream = null;
//         }
        
//         // Stop screen stream
//         if (this.screenStream) {
//             this.screenStream.getTracks().forEach(track => track.stop());
//             this.screenStream = null;
//         }
        
//         // Remove video elements
//         const localVideo = document.getElementById('localUserVideo');
//         const remoteVideo = document.getElementById('remoteUserVideo');
//         if (localVideo) localVideo.remove();
//         if (remoteVideo) remoteVideo.remove();
        
//         await this.destroy();
//         setTimeout(() => {
//             this.init();
//         }, 500);
//         this.connectHelperService.closeInfoWindow();
//     }

//     async destroy() {
//         this.initialized = false;
//         await this.peer1?.destroy();
//         await this.socketService?.destroy();
//         await this.socketSub?.unsubscribe();
//         await this.sub3?.unsubscribe();
//         await this.electronService.remote.screen.removeAllListeners();
//     }

//     connect(id) {
//         if (this.electronService.isElectronApp) {
//             const appPath = this.electronService.remote.app.getAppPath();
//             try {
//                 const BrowserWindow = this.electronService.remote.BrowserWindow;
//                 const win = new BrowserWindow({
//                     height: 600,
//                     width: 800,
//                     minWidth: 250,
//                     minHeight: 250,
//                     titleBarStyle:
//                         process.platform === 'darwin' ? 'hidden' : 'default',
//                     frame: process.platform === 'darwin' ? true : false,
//                     center: true,
//                     show: false,
//                     backgroundColor: '#252a33',
//                     webPreferences: {
//                         webSecurity: false,
//                         nodeIntegration: true,
//                         allowRunningInsecureContent: true,
//                         contextIsolation: false,
//                         enableRemoteModule: true,
//                     } as any,
//                 });

//                 console.log('main', this.electronService.main);
//                 this.electronService.remote
//                     .require('@electron/remote/main')
//                     .enable(win.webContents);

//                 if (AppConfig.production) {
//                     win.loadURL(
//                         url.format({
//                             pathname: this.electronService.path.join(
//                                 appPath,
//                                 'dist/index.html'
//                             ),
//                             hash: '/remote?id=' + id,
//                             protocol: 'file:',
//                             slashes: true,
//                         })
//                     );
//                 } else {
//                     win.loadURL('http://localhost:4200/#/remote?id=' + id);
//                     win.webContents.openDevTools();
//                 }

//                 win.maximize();
//                 win.show();
//                 win.on('closed', () => {});
//             } catch (error) {
//                 console.log('error', error);
//             }
//         } else {
//             window.open('http://192.168.1.30:4200/#/remote?id=' + id, '_blank');
//         }
//     }
// }



import { Injectable } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import SimplePeer from 'simple-peer';
import SimplePeerFiles from 'simple-peer-files';
import * as url from 'url';
import { AppConfig } from '../../../environments/environment';
import { ConnectHelperService } from './connect-helper.service';
import { ElectronService } from './electron.service';
import { SettingsService } from './settings.service';
import { SocketService } from './socket.service';
import { keyboard } from '@nut-tree-fork/nut-js';

@Injectable({
    providedIn: 'root',
})
export class ConnectService {
    peer1: SimplePeer.Instance;
    spf: SimplePeerFiles;
    socketSub: Subscription;
    sub3: Subscription;
    videoSource;
    transfer;

    initialized = false;
    loading;
    dialog;
    connected: boolean = false;

    id: string = '';
    idArray: string[] = [];
    remoteIdArray: any = [{}, {}, {}, {}, {}, {}, {}, {}, {}];
    remoteId: string = '';
    fileLoading = false;
    cameraStream: MediaStream | null = null;
    screenStream: MediaStream | null = null;

    constructor(
        private electronService: ElectronService,
        private socketService: SocketService,
        private connectHelperService: ConnectHelperService,
        private loadingCtrl: LoadingController,
        private settingsService: SettingsService,
        private alertCtrl: AlertController
    ) {}

    clipboardListener() {
        const clipboard = this.electronService.clipboard;
        clipboard
            .on('text-changed', () => {
                if (this.peer1 && this.connected && this.peer1.connected) {
                    const currentText = clipboard.readText();
                    try { this.peer1.send('clipboard-' + currentText); } catch {}
                }
            })
            .on('image-changed', () => {
                const currentImage = clipboard.readImage();
            })
            .startWatching();
    }

    setId(id) {
        if (id.length == 9) {
            const idArray = id.split('').map(number => Number(number));
            idArray.forEach((number, index) => {
                this.remoteIdArray[index] = { number };
            });
        }
    }

    sendScreenSize() {
        const scaleFactor =
            process.platform === 'darwin'
                ? 1
                : this.electronService.remote.screen.getPrimaryDisplay()
                      .scaleFactor;

        const { width, height } =
            this.electronService.remote.screen.getPrimaryDisplay().size;

        const finalWidth = width * scaleFactor;
        const finalHeight = height * scaleFactor;

        this.socketService.sendMessage(`screenSize,${finalWidth},${finalHeight}`);
    }

    async videoConnector() {
        // close any loader
        try { this.loading?.dismiss(); } catch {}

        // SCREEN SHARE stream
        const source = this.videoSource;
        this.screenStream = source.stream;

        this.peer1 = new SimplePeer({
            initiator: true,
            stream: this.screenStream,
            config: {
                iceServers: [
                    { urls: "stun:stun.relay.metered.ca:80" },
                    {
                        urls: "turn:global.relay.metered.ca:80",
                        username: "63549d560f2efcb312cd67de",
                        credential: "qh7UD1VgYnwSWhmQ",
                    },
                    {
                        urls: "turn:global.relay.metered.ca:80?transport=tcp",
                        username: "63549d560f2efcb312cd67de",
                        credential: "qh7UD1VgYnwSWhmQ",
                    },
                    {
                        urls: "turn:global.relay.metered.ca:443",
                        username: "63549d560f2efcb312cd67de",
                        credential: "qh7UD1VgYnwSWhmQ",
                    },
                    {
                        urls: "turns:global.relay.metered.ca:443?transport=tcp",
                        username: "63549d560f2efcb312cd67de",
                        credential: "qh7UD1VgYnwSWhmQ",
                    },
                ],
            },
        });

        this.peer1.on('signal', data => {
            this.socketService.sendMessage(data);
        });

        this.peer1.on('error', (err) => {
            console.error('[CONNECT] peer error', err);
            this.reconnect();
        });

        this.peer1.on('close', () => {
            this.reconnect();
        });

        this.peer1.on('connect', async () => {
            this.connected = true;
            this.clipboardListener();
            this.connectHelperService.showInfoWindow();
            const win = this.electronService.window;
            try { win.minimize(); } catch {}

            // Show chat windows for both roles on this side (host+user panes)
            this.createDualChatUI();

            setTimeout(async () => {
                await this.startLocalCamera();
            }, 1000);
        });

        this.peer1.on('stream', (remoteStream) => {
            let remoteVideo = document.getElementById('remoteUserVideo') as HTMLVideoElement;
            if (!remoteVideo) {
                remoteVideo = document.createElement('video');
                remoteVideo.id = 'remoteUserVideo';
                remoteVideo.autoplay = true;
                remoteVideo.style.position = 'fixed';
                remoteVideo.style.bottom = '10px';
                remoteVideo.style.left = '10px';
                remoteVideo.style.width = '200px';
                remoteVideo.style.height = '150px';
                remoteVideo.style.borderRadius = '12px';
                remoteVideo.style.border = '2px solid white';
                remoteVideo.style.zIndex = '9999';
                remoteVideo.style.objectFit = 'cover';
                document.body.appendChild(remoteVideo);
            }
            remoteVideo.srcObject = remoteStream;
            remoteVideo.play().catch(e => console.error('[CONNECT] Play error:', e));
        });

        this.peer1.on('data', async data => {
            if (data) {
                try {
                    const fileTransfer = data.toString();

                    if (fileTransfer.substr(0, 5) === 'file-') {
                        const fileID = fileTransfer.substr(5);
                        this.spf
                            .receive(this.peer1, fileID)
                            .then((transfer: any) => {
                                this.fileLoading = true;
                                transfer.on('progress', p => {});
                                transfer.on('done', file => {
                                    this.fileLoading = false;
                                    const element = document.createElement('a');
                                    element.href = URL.createObjectURL(file);
                                    element.download = file.name;
                                    element.click();
                                });
                            });
                        this.peer1.send(`start-${fileID}`);
                        return;
                    }

                    if (fileTransfer.substr(0, 10) === 'clipboard-') {
                        const text = fileTransfer.substr(10);
                        this.electronService.clipboard.writeText(text);
                        return;
                    }

                    // Chat message handling (new: support chat-host- and chat-user- prefixes)
                    const text = new TextDecoder('utf-8').decode(data);
                    if (text.startsWith("chat-host-")) {
                        const message = text.replace("chat-host-", "");
                        // show in host pane as remote-host message
                        this.addChatMessage("Remote (Host)", message, "host");
                        return;
                    } else if (text.startsWith("chat-user-")) {
                        const message = text.replace("chat-user-", "");
                        // show in user pane as remote-user message
                        this.addChatMessage("Remote (User)", message, "user");
                        return;
                    }

                    // Keyboard / Scroll / Mouse handling
                    if (text.substring(0, 1) == '{') {
                        const keyData = JSON.parse(text);
                        await this.connectHelperService.handleKey(keyData);
                    } else if (text.substring(0, 1) == 's') {
                        this.connectHelperService.handleScroll(text);
                    } else {
                        this.connectHelperService.handleMouse(text);
                    }

                } catch (error) {
                    console.error('[CONNECT] data handler error', error);
                }
            }
        });
    }

    async startLocalCamera() {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            if (this.peer1 && this.cameraStream) {
                this.cameraStream.getTracks().forEach(track => {
                    try { this.peer1.addTrack(track, this.cameraStream!); } catch {}
                });
            }

            let localVideo = document.getElementById('localUserVideo') as HTMLVideoElement;
            if (!localVideo) {
                localVideo = document.createElement('video');
                localVideo.id = 'localUserVideo';
                localVideo.autoplay = true;
                localVideo.muted = true;
                localVideo.style.position = 'fixed';
                localVideo.style.bottom = '10px';
                localVideo.style.right = '10px';
                localVideo.style.width = '150px';
                localVideo.style.height = '110px';
                localVideo.style.borderRadius = '12px';
                localVideo.style.border = '2px solid white';
                localVideo.style.zIndex = '9999';
                localVideo.style.objectFit = 'cover';
                document.body.appendChild(localVideo);
            }
            localVideo.srcObject = this.cameraStream;
            localVideo.play();
            return this.cameraStream;
        } catch (err) {
            console.warn('[CONNECT] camera not available', err);
            return null;
        }
    }

    async askForConnectPermission() {
        return new Promise(async resolve => {
            const alert = await this.alertCtrl.create({
                header: 'New connection',
                message: 'Do you want to accept the connection?',
                buttons: [
                    { text: 'Cancel', role: 'cancel', handler: () => resolve(false) },
                    { text: 'Accept', handler: () => resolve(true) }
                ],
            });
            await alert.present();
        });
    }

    async generateId() {
        if (this.settingsService.settings?.randomId) {
            this.id = `${this.connectHelperService.threeDigit()}${this.connectHelperService.threeDigit()}${this.connectHelperService.threeDigit()}`;
        } else {
            const nodeMachineId = this.electronService.nodeMachineId;
            const id = await nodeMachineId.machineId();
            const uniqId = parseInt(id, 36).toString().substring(3, 12);
            this.id = uniqId;
        }
        this.idArray = ('' + this.id).split('');
    }

    async init() {
        if (this.initialized) return;
        this.initialized = true;
        await this.generateId();

        if (this.electronService.isElectron) {
            try { await keyboard.type(''); } catch {}
        }

        this.loading = await this.loadingCtrl.create({ duration: 15000 });

        this.spf = new SimplePeerFiles();
        this.socketService.init();
        this.socketService.joinRoom(this.id);

        this.sub3 = this.socketService.onDisconnected().subscribe(async () => {
            const alert = await this.alertCtrl.create({ header: 'Info', message: 'Connection terminated', buttons: ['OK'] });
            await alert.present();
            this.reconnect();
        });

        this.socketSub = this.socketService.onNewMessage().subscribe(async (data: any) => {
            if (typeof data === 'string') {
                if (data === 'hi') {
                    if (this.dialog) return;
                    this.dialog = true;
                    this.sendScreenSize();

                    if (this.settingsService.settings?.hiddenAccess) {
                        this.socketService.sendMessage('pwRequest');
                        return;
                    } else {
                        const win = this.electronService.window;
                        try { win.show(); win.focus(); win.restore(); } catch {}
                        const result = await this.askForConnectPermission();
                        this.dialog = false;
                        if (!result) {
                            this.socketService.sendMessage('decline');
                            try { this.loading.dismiss(); } catch {}
                            return;
                        }
                        await this.videoConnector();
                    }
                } else if (data.startsWith('pwAnswer')) {
                    const pw = data.replace(data.substring(0, 9), '');
                    const pwCorrect = await this.electronService.bcryptjs.compare(
                        pw,
                        this.settingsService.settings.passwordHash
                    );
                    if (pwCorrect) await this.videoConnector();
                    else {
                        this.socketService.sendMessage('pwWrong');
                        try { this.loading.dismiss(); } catch {}
                        const alert = await this.alertCtrl.create({ header: 'Password not correct', buttons: ['OK'] });
                        await alert.present();
                    }
                } else if (data.startsWith('decline')) {
                    try { this.loading.dismiss(); } catch {}
                } else if (this.peer1) {
                    this.peer1.signal(data);
                }
            } else if (this.peer1) {
                this.peer1.signal(data);
            }
        });
    }

    replaceVideo(stream) {
        try {
            this.peer1.removeStream(this.screenStream);
        } catch {}
        this.screenStream = stream;
        try {
            this.peer1.addStream(stream);
        } catch {}
    }

 async reconnect() {
    const win = this.electronService.window;
    try { win.restore(); } catch {}
    
    // ✅ FIX: Save the current ID before destroying
    const savedId = this.id;
    
    this.connected = false;
    this.dialog = false;  

    if (this.cameraStream) this.cameraStream.getTracks().forEach(track => track.stop());
    if (this.screenStream) this.screenStream.getTracks().forEach(track => track.stop());

    const localVideo = document.getElementById('localUserVideo');
    const remoteVideo = document.getElementById('remoteUserVideo');
    if (localVideo) localVideo.remove();
    if (remoteVideo) remoteVideo.remove();

    // Remove chat
    this.removeChatWindow();

    await this.destroy();
  
    this.id = savedId;
    this.idArray = ('' + this.id).split('');
    
    setTimeout(() => this.init(), 500);
    this.connectHelperService.closeInfoWindow();
}
    async destroy() {
        this.initialized = false;
        try { await this.peer1?.destroy(); } catch {}
        try { await this.socketService?.destroy(); } catch {}
        try { this.socketSub?.unsubscribe(); } catch {}
        try { this.sub3?.unsubscribe(); } catch {}
        try { this.electronService.remote.screen.removeAllListeners(); } catch {}
    }

    connect(id) {
        if (this.electronService.isElectronApp) {
            const appPath = this.electronService.remote.app.getAppPath();
            try {
                const BrowserWindow = this.electronService.remote.BrowserWindow;
                const win = new BrowserWindow({
                    height: 600, width: 800, minWidth: 250, minHeight: 250,
                    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
                    frame: process.platform === 'darwin' ? true : false,
                    center: true, show: false, backgroundColor: '#252a33',
                    webPreferences: { webSecurity: false, nodeIntegration: true, allowRunningInsecureContent: true, contextIsolation: false, enableRemoteModule: true } as any
                });
                this.electronService.remote.require('@electron/remote/main').enable(win.webContents);

                if (AppConfig.production) {
                    win.loadURL(url.format({
                        pathname: this.electronService.path.join(appPath, 'dist/index.html'),
                        hash: '/remote?id=' + id,
                        protocol: 'file:', slashes: true
                    }));
                } else {
                    win.loadURL('http://localhost:4200/#/remote?id=' + id);
                    win.webContents.openDevTools();
                }

                win.maximize();
                win.show();
                win.on('closed', () => { });
            } catch (error) { console.log('error', error); }
        } else {
            window.open('http://192.168.1.30:4200/#/remote?id=' + id, '_blank');
        }
    }

    // ========================= CHAT FUNCTIONS =============================
    
    // Creates both Host and User chat panes on screen (left = Host, right = User)
    createDualChatUI() {
        // create host pane (left)
        if (!document.getElementById('hostChatBox')) {
            const hostBox = document.createElement('div');
            hostBox.id = 'hostChatBox';
            hostBox.style.position = 'fixed';
            hostBox.style.left = '20px';
            hostBox.style.bottom = '20px';
            hostBox.style.width = '320px';
            hostBox.style.height = '360px';
            hostBox.style.background = '#111827'; // dark
            hostBox.style.border = '2px solid #374151';
            hostBox.style.borderRadius = '10px';
            hostBox.style.zIndex = '99999';
            hostBox.style.display = 'flex';
            hostBox.style.flexDirection = 'column';
            hostBox.style.color = 'white';
            hostBox.style.fontFamily = 'sans-serif';
            hostBox.style.boxShadow = '0 6px 18px rgba(0,0,0,0.4)';

            hostBox.innerHTML = `
                <div id="hostChatHeader" style="padding:8px; background:#0f172a; border-bottom:2px solid #111827; display:flex; align-items:center; justify-content:space-between;">
                    <div style="font-weight:bold;">Host Chat</div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button id="hostChatMinBtn" title="Minimize" style="border:none; background:transparent; color:white; cursor:pointer; font-weight:bold;">_</button>
                        <button id="hostChatCloseBtn" title="Close" style="border:none; background:transparent; color:white; cursor:pointer; font-weight:bold;">✕</button>
                    </div>
                </div>
                <div id="hostChatMessages" style="flex:1; padding:8px; overflow-y:auto; font-size:14px; background:transparent;"></div>
                <div id="hostChatInputWrapper" style="padding:6px; display:flex; gap:4px; border-top:1px solid #111827;">
                    <input id="hostChatInput" placeholder="Message as Host..." 
                        style="flex:1; padding:8px; border-radius:6px; border:1px solid #374151; outline:none; background:#0b1220; color:white;"/>
                    <button id="hostChatSend" 
                        style="padding:8px 10px; background:#06b6d4; color:black; border:none; border-radius:6px; cursor:pointer;">
                        Send
                    </button>
                </div>
            `;

            document.body.appendChild(hostBox);

            const hostSend = document.getElementById('hostChatSend');
            const hostInput = document.getElementById('hostChatInput') as HTMLInputElement;
            const hostMin = document.getElementById('hostChatMinBtn');
            const hostClose = document.getElementById('hostChatCloseBtn');
            const hostMessages = document.getElementById('hostChatMessages')!;
            const hostInputWrapper = document.getElementById('hostChatInputWrapper')!;

            const doHostSend = () => {
                if (!hostInput.value.trim()) return;
                const text = hostInput.value.trim();
                try {
                    if (this.peer1 && this.peer1.connected) {
                        this.peer1.send('chat-host-' + text);
                    } else {
                        console.warn('[CHAT] peer not connected (host)');
                    }
                } catch (e) {
                    console.error('[CHAT] send error (host)', e);
                }
                this.addChatMessage('You (Host)', text, 'host');
                hostInput.value = '';
                hostInput.focus();
            };

            hostSend?.addEventListener('click', () => doHostSend());
            hostInput.addEventListener('keydown', (ev: KeyboardEvent) => {
                if (ev.key === 'Enter' && !ev.shiftKey) {
                    ev.preventDefault();
                    doHostSend();
                }
            });

            hostMin?.addEventListener('click', () => {
                (hostMessages as HTMLElement).style.display = 'none';
                (hostInputWrapper as HTMLElement).style.display = 'none';
                (document.getElementById('hostChatBox') as HTMLElement).style.height = '44px';
            });
            hostClose?.addEventListener('click', () => {
                const el = document.getElementById('hostChatBox'); if (el) el.remove();
            });

            // draggable (simple)
            this.makeDraggable('hostChatBox', 'hostChatHeader');
        }

        // create user pane (right)
        if (!document.getElementById('userChatBox')) {
            const userBox = document.createElement('div');
            userBox.id = 'userChatBox';
            userBox.style.position = 'fixed';
            userBox.style.right = '20px';
            userBox.style.bottom = '20px';
            userBox.style.width = '320px';
            userBox.style.height = '360px';
            userBox.style.background = '#0b1220'; // dark slightly different
            userBox.style.border = '2px solid #374151';
            userBox.style.borderRadius = '10px';
            userBox.style.zIndex = '99999';
            userBox.style.display = 'flex';
            userBox.style.flexDirection = 'column';
            userBox.style.color = 'white';
            userBox.style.fontFamily = 'sans-serif';
            userBox.style.boxShadow = '0 6px 18px rgba(0,0,0,0.4)';

            userBox.innerHTML = `
                <div id="userChatHeader" style="padding:8px; background:#021124; border-bottom:2px solid #011323; display:flex; align-items:center; justify-content:space-between;">
                    <div style="font-weight:bold;">User Chat</div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button id="userChatMinBtn" title="Minimize" style="border:none; background:transparent; color:white; cursor:pointer; font-weight:bold;">_</button>
                        <button id="userChatCloseBtn" title="Close" style="border:none; background:transparent; color:white; cursor:pointer; font-weight:bold;">✕</button>
                    </div>
                </div>
                <div id="userChatMessages" style="flex:1; padding:8px; overflow-y:auto; font-size:14px; background:transparent;"></div>
                <div id="userChatInputWrapper" style="padding:6px; display:flex; gap:4px; border-top:1px solid #011323;">
                    <input id="userChatInput" placeholder="Message as User..." 
                        style="flex:1; padding:8px; border-radius:6px; border:1px solid #374151; outline:none; background:#071427; color:white;"/>
                    <button id="userChatSend" 
                        style="padding:8px 10px; background:#34d399; color:black; border:none; border-radius:6px; cursor:pointer;">
                        Send
                    </button>
                </div>
            `;

            document.body.appendChild(userBox);

            const userSend = document.getElementById('userChatSend');
            const userInput = document.getElementById('userChatInput') as HTMLInputElement;
            const userMin = document.getElementById('userChatMinBtn');
            const userClose = document.getElementById('userChatCloseBtn');
            const userMessages = document.getElementById('userChatMessages')!;
            const userInputWrapper = document.getElementById('userChatInputWrapper')!;

            const doUserSend = () => {
                if (!userInput.value.trim()) return;
                const text = userInput.value.trim();
                try {
                    if (this.peer1 && this.peer1.connected) {
                        this.peer1.send('chat-user-' + text);
                    } else {
                        console.warn('[CHAT] peer not connected (user)');
                    }
                } catch (e) {
                    console.error('[CHAT] send error (user)', e);
                }
                this.addChatMessage('You (User)', text, 'user');
                userInput.value = '';
                userInput.focus();
            };

            userSend?.addEventListener('click', () => doUserSend());
            userInput.addEventListener('keydown', (ev: KeyboardEvent) => {
                if (ev.key === 'Enter' && !ev.shiftKey) {
                    ev.preventDefault();
                    doUserSend();
                }
            });

            userMin?.addEventListener('click', () => {
                (userMessages as HTMLElement).style.display = 'none';
                (userInputWrapper as HTMLElement).style.display = 'none';
                (document.getElementById('userChatBox') as HTMLElement).style.height = '44px';
            });
            userClose?.addEventListener('click', () => {
                const el = document.getElementById('userChatBox'); if (el) el.remove();
            });

            // draggable (simple)
            this.makeDraggable('userChatBox', 'userChatHeader');
        }
    }

    // Simple helper to make chat boxes draggable by header
    private makeDraggable(boxId: string, headerId: string) {
        const box = document.getElementById(boxId);
        const header = document.getElementById(headerId);
        if (!box || !header) return;

        let dragging = false;
        let offsetX = 0;
        let offsetY = 0;

        header.addEventListener('mousedown', (e: MouseEvent) => {
            dragging = true;
            const rect = box.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            (header as HTMLElement).style.cursor = 'grabbing';
        });

        document.addEventListener('mouseup', () => {
            dragging = false;
            try { (header as HTMLElement).style.cursor = 'default'; } catch {}
        });

        document.addEventListener('mousemove', (e: MouseEvent) => {
            if (!dragging) return;
            let left = e.clientX - offsetX;
            let top = e.clientY - offsetY;

            // clamp to viewport
            const w = window.innerWidth, h = window.innerHeight;
            left = Math.max(6, Math.min(left, w - box.offsetWidth - 6));
            top = Math.max(6, Math.min(top, h - box.offsetHeight - 6));

            (box as HTMLElement).style.right = 'auto';
            (box as HTMLElement).style.left = left + 'px';
            (box as HTMLElement).style.top = top + 'px';
            (box as HTMLElement).style.bottom = 'auto';
        });
    }

    // Add message to correct pane
    addChatMessage(sender: string, msg: string, role: 'host' | 'user') {
        const containerId = role === 'host' ? 'hostChatMessages' : 'userChatMessages';
        const container = document.getElementById(containerId);
        if (!container) return;
        const div = document.createElement('div');
        div.style.margin = '6px 0';
        div.style.wordBreak = 'break-word';

        // style based on sender (You vs Remote)
        if (sender.startsWith('You')) {
            div.innerHTML = `<div style="text-align:right;"><span style="display:inline-block; padding:6px 10px; background:#06b6d4; color:black; border-radius:10px; max-width:80%;">${this.escapeHtml(msg)}</span></div>`;
        } else {
            div.innerHTML = `<div style="text-align:left;"><span style="display:inline-block; padding:6px 10px; background:#222; color:white; border-radius:10px; max-width:80%;">${this.escapeHtml(msg)}</span><div style="font-size:11px;color:#9ca3af;margin-top:4px;">${this.escapeHtml(sender)}</div></div>`;
        }

        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    escapeHtml(unsafe: string) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    removeChatWindow() {
        const hostBox = document.getElementById('hostChatBox');
        const userBox = document.getElementById('userChatBox');
        if (hostBox) hostBox.remove();
        if (userBox) userBox.remove();
    }
}
