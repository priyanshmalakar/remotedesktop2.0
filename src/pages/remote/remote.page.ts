import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    HostListener,
    Input,
    OnDestroy,
    OnInit,
    ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import {
    fadeInDownOnEnterAnimation,
    fadeOutUpOnLeaveAnimation,
} from 'angular-animations';
import { AnimationOptions } from 'ngx-lottie';
import SimplePeer from 'simple-peer';
import SimplePeerFiles from 'simple-peer-files';
import 'webrtc-adapter';
import { SocketService } from '../../app/core/services/socket.service';
import { AppService } from './../../app/core/services/app.service';
import { ElectronService } from '../../app/core/services/electron.service';
import { AddressBookService } from '../../app/core/services/address-book.service';
@Component({
    template: `
        <ion-header>
            <ion-toolbar color="primary">
                <ion-title>{{ 'Enter Password' | translate }}</ion-title>
            </ion-toolbar>
        </ion-header>
        <ion-content>
            <div class="p-5">
                <ion-input
                    [label]="'Password' | translate"
                    [(ngModel)]="pw"
                    label-placement="floating"
                    fill="solid"
                    type="password"
                    placeholder="Enter text"></ion-input>

                <ion-item
                    lines="none"
                    class="mt-3">
                    <ion-checkbox
                        slot="start"
                        [(ngModel)]="rememberPassword">
                    </ion-checkbox>
                    <ion-label>{{ 'Remember password' | translate }}</ion-label>
                </ion-item>
            </div>
        </ion-content>
        <ion-footer>
            <ion-toolbar>
                <ion-button (click)="cancel()">
                    {{ 'Cancel' | translate }}
                </ion-button>
                <ion-button
                    cdkFocusInitial
                    (click)="connect()">
                    {{ 'Connect' | translate }}
                </ion-button>
            </ion-toolbar>
        </ion-footer>
    `,
})
export class PwDialog {
    @Input() pw = '';
    @Input() rememberPassword = true;
    @HostListener('document:keydown.enter', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.connect();
    }

    constructor(private modalCtrl: ModalController) {}

    connect() {
        return this.modalCtrl.dismiss({
            password: this.pw,
            rememberPassword: this.rememberPassword,
        });
    }

    cancel() {
        return this.modalCtrl.dismiss(null);
    }
}

@Component({
    selector: 'app-remote',
    templateUrl: './remote.page.html',
    styleUrls: ['./remote.page.scss'],
    animations: [
        fadeInDownOnEnterAnimation({ duration: 150 }),
        fadeOutUpOnLeaveAnimation({ duration: 150 }),
    ],
})
export class RemotePage implements OnInit, OnDestroy {
    @ViewChild('localVideo') localVideoRef: ElementRef<HTMLVideoElement>;
    @ViewChild('remoteVideo') remoteVideoRef: ElementRef<HTMLVideoElement>;
    @ViewChild('hostCameraVideo')
    hostCameraVideoRef: ElementRef<HTMLVideoElement>; // Add this

    signalData = '';
    peer2: SimplePeer.Instance;
    spf: SimplePeerFiles;
    userId = 'browser';
    video: HTMLVideoElement;
    stream: any;
    videoSize;
    hostScreenSize;

    showOptions = false;
    connected = false;
    fileDrop = false;
    fileLoading = false;
    cursor = true;
    transfer;
    files: any = {};
    isMuted = true; // Start with mic MUTED
    videoOn = false; // Start with camera OFF

    fileProgress = 0;
    localStream: MediaStream | null = null;
    remoteStream: MediaStream | null = null;
    hostCameraMinimized = false;
    localCameraMinimized = false;
    hostCameraFullscreen = false;
    localCameraFullscreen = false;
    hostCameraPosition = { x: 20, y: 20 };
    localCameraPosition = { x: 20, y: 100 };
    isDraggingHost = false;
    isDraggingLocal = false;
    dragOffset = { x: 0, y: 0 };
    showVideoInterface = false;
    hostMouseDisabled = false;

    options: AnimationOptions | any = {
        path: '/assets/animations/lf30_editor_PsHnfk.json',
        loop: true,
    };

    // bound listener references
    private boundMouseListener: any;
    private boundMouseMoveListener: any;
    private boundDblClickListener: any;
    private boundMouseUpListener: any;
    private boundMouseDownListener: any;
    private pendingPassword: {
        password: string;
        shouldRemember: boolean;
        id: string;
    } | null = null;

    @HostListener('document:dragover', ['$event'])
    onDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        this.fileDrop = true;
    }

    @HostListener('document:dragleave', ['$event'])
    onDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        this.fileDrop = false;
    }

    @HostListener('drop', ['$event'])
    ondrop(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        this.fileDrop = false;
        const f = (evt as DragEvent).dataTransfer?.files;
        if (f && f.length > 0) {
            for (let i = 0; i < f.length; i++) {
                const file = f[i];
                const fileID = file.name + file.size;
                this.files[fileID] = file;
                this.peer2.send('file-' + fileID);
            }
        }
    }

    @HostListener('contextmenu', ['$event'])
    oncontextmenu(event) {
        event.preventDefault();
        event.stopPropagation();
    }
    toggleHostCamera() {
        this.hostCameraMinimized = !this.hostCameraMinimized;
    }
    toggleLocalCamera() {
        this.localCameraMinimized = !this.localCameraMinimized;
    }

    toggleHostFullscreen() {
        this.hostCameraFullscreen = !this.hostCameraFullscreen;
        if (this.hostCameraFullscreen) {
            this.hostCameraMinimized = false;
        }
    }

    toggleLocalFullscreen() {
        this.localCameraFullscreen = !this.localCameraFullscreen;
        if (this.localCameraFullscreen) {
            this.localCameraMinimized = false;
        }
    }
    closeHostCamera() {
        // Just hide it, don't destroy the stream
        const hostPip =
            this.elementRef.nativeElement.querySelector('.host-pip');
        if (hostPip) {
            hostPip.style.display = 'none';
        }
    }
    closeLocalCamera() {
        this.stopVideoCall();
    }

    startDragHost(event: MouseEvent) {
        if (this.hostCameraFullscreen) return; // Can't drag in fullscreen
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingHost = true;
        const pipElement =
            this.elementRef.nativeElement.querySelector('.host-pip');
        const rect = pipElement.getBoundingClientRect();
        this.dragOffset = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    startDragLocal(event: MouseEvent) {
        if (this.localCameraFullscreen) return; // Can't drag in fullscreen
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingLocal = true;
        const pipElement =
            this.elementRef.nativeElement.querySelector('.local-pip');
        const rect = pipElement.getBoundingClientRect();
        this.dragOffset = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    @HostListener('document:mousemove', ['$event'])
    onDrag(event: MouseEvent) {
        if (this.isDraggingHost && !this.hostCameraFullscreen) {
            event.preventDefault();
            const newX = event.clientX - this.dragOffset.x;
            const newY = event.clientY - this.dragOffset.y;

            // Boundary checking
            const maxX = window.innerWidth - 240;
            const maxY = window.innerHeight - 220;

            this.hostCameraPosition = {
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY)),
            };
        }
        if (this.isDraggingLocal && !this.localCameraFullscreen) {
            event.preventDefault();
            const newX = event.clientX - this.dragOffset.x;
            const newY = event.clientY - this.dragOffset.y;

            // Boundary checking
            const maxX = window.innerWidth - 200;
            const maxY = window.innerHeight - 190;

            this.localCameraPosition = {
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY)),
            };
        }
    }

    @HostListener('document:mouseup')
    stopDrag() {
        this.isDraggingHost = false;
        this.isDraggingLocal = false;
    }

    @HostListener('document:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        if (this.connected) {
            event.preventDefault();
            event.stopPropagation();
            this.keydownListener(event);
        }
    }

    @HostListener('mousewheel', ['$event'])
    onScroll(event: WheelEvent) {
        if (this.connected) {
            event.preventDefault();
            event.stopPropagation();
            this.scrollListener(event);
        }
    }

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.calcVideoSize();
    }

    @HostListener('document:paste', ['$event'])
    onPaste(event: ClipboardEvent) {
        if (!this.connected) return;

        const text = event.clipboardData?.getData('text');
        if (this.peer2 && text) {
            event.preventDefault();
            this.peer2.send('clipboard-' + text);
        }
    }

    toggleAudio() {
        if (!this.localStream) return;
        this.isMuted = !this.isMuted;
        const newState = !this.isMuted; // if not muted, enable
        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = newState;
            console.log('[REMOTE] 🎤 Mic:', newState ? 'ON' : 'OFF');
        });
    }

    toggleVideo() {
        if (!this.localStream) return;
        this.videoOn = !this.videoOn;
        this.localStream.getVideoTracks().forEach(track => {
            track.enabled = this.videoOn;
            console.log('[REMOTE] 📹 Camera:', this.videoOn ? 'ON' : 'OFF');
        });
    }

   endCall() {
    this.showVideoInterface = false;
    
    // Stop local video/audio tracks
    if (this.localStream) {
        this.localStream.getVideoTracks().forEach(track => {
            track.enabled = false;
        });
        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = false;
        });
    }
    
    // Reset states
    this.isMuted = true;
    this.videoOn = false;
    
    this.cdr.detectChanges();
}

 startVideoInterface() {
    this.showVideoInterface = true;
    
    // Enable video and audio when starting
    if (this.localStream) {
        this.localStream.getVideoTracks().forEach(track => {
            track.enabled = true;
        });
        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = true;
        });
        this.videoOn = true;
        this.isMuted = false;
    }
    
    this.cdr.detectChanges();
}
toggleHostMouseDisable() {
    this.hostMouseDisabled = !this.hostMouseDisabled;
    
    // Send command to host
    if (this.peer2 && this.connected) {
        this.peer2.send(`disable-host-mouse:${this.hostMouseDisabled}`);
        console.log('[REMOTE] 🖱️ Sent host mouse disable:', this.hostMouseDisabled);
    }
    
    this.cdr.detectChanges();
}
    constructor(
        private socketService: SocketService,
        private elementRef: ElementRef,
        private appService: AppService,
        private route: ActivatedRoute,
        public electronService: ElectronService,
        private modalCtrl: ModalController,
        private cdr: ChangeDetectorRef,
        private alertCtrl: AlertController,
        private addressBookService: AddressBookService,
        private router: Router
    ) {}

    fileChangeEvent(event) {
        const e = event.files;
        const file = e[0];
        const fileID = file.name + file.size;
        this.files[fileID] = file;
        this.peer2.send('file-' + fileID);
    }

    async pwPrompt(id: string) {
        const savedPassword = await this.addressBookService.getPassword(id);

        return new Promise<any>(async resolve => {
            const modal = await this.modalCtrl.create({
                component: PwDialog,
                componentProps: {
                    pw: savedPassword || '',
                    rememberPassword: true,
                },
            });
            modal.present();

            const { data } = await modal.onWillDismiss();
            resolve(data);
        });
    }

    async ngOnInit() {
        let id = this.route.snapshot.queryParams.id;
        if (!id) {
            const alert = await this.alertCtrl.create({
                backdropDismiss: false,
                header: 'Partner ID',
                message: 'Enter your partner ID',
                inputs: [
                    {
                        name: 'id',
                        type: 'number',
                        placeholder: '863059898',
                    },
                ],
                buttons: [
                    {
                        text: 'Connect',
                        handler: event => {
                            console.log('[REMOTE] ID entered:', event.id);
                            id = event.id;
                            this.init(id);
                        },
                    },
                ],
            });

            await alert.present();
        } else {
            this.init(id);
        }
    }

    async startVideoCall() {
        try {
            console.log(
                '[REMOTE] 🎥 Starting local video (initially disabled)...'
            );
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            // Disable tracks by default
            this.localStream
                .getVideoTracks()
                .forEach(track => (track.enabled = false));
            this.localStream
                .getAudioTracks()
                .forEach(track => (track.enabled = false));
            console.log('[REMOTE] 🔒 Camera and mic disabled by default');

            const localVideo = this.localVideoRef?.nativeElement;
            if (localVideo) {
                localVideo.srcObject = this.localStream;
                localVideo.muted = true; // Mute own audio to avoid echo
                localVideo
                    .play()
                    .catch(e =>
                        console.error('[REMOTE] Local video play error:', e)
                    );
            }

            console.log(
                '[REMOTE] ✅ Local stream ready, will add to peer when connected'
            );
            return this.localStream;
        } catch (err) {
            console.error('[REMOTE] ❌ Failed to start video:', err);
            return null;
        }
    }

    stopVideoCall() {
        console.log('[REMOTE] 🛑 Stopping local video...');
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
    }

    async init(id) {
        console.log('[REMOTE] 🎯 Initializing with ID:', id);
        this.appService.sideMenu = false;

        if (this.electronService.isElectron) {
            this.spf = new SimplePeerFiles();
        }

        // Start local camera FIRST
        await this.startVideoCall();

        this.socketService.init();

        // Wait for socket connection
        this.socketService.socket.on('connect', () => {
            console.log('[REMOTE] ✅ Socket connected, joining room:', id);
            this.socketService.joinRoom(id);

            setTimeout(() => {
                console.log('[REMOTE] 👋 Sending "hi" to host');
                this.socketService.sendMessage('hi');
            }, 500);
        });

        this.socketService.onNewMessage().subscribe(async (data: any) => {
            console.log(
                '[REMOTE] 📨 Message received:',
                typeof data === 'string' ? data.substring(0, 30) : 'signal'
            );
            // if (
            //     typeof data == 'string' &&
            //     data?.startsWith('host-reconnecting')
            // ) {
            //     console.log('[REMOTE] 🔄 Host is reconnecting, cleaning up...');

            //     // Clean up old peer
            //     if (this.peer2) {
            //         this.peer2.removeAllListeners(); // ← Important!
            //         this.peer2.destroy();
            //         this.peer2 = null;
            //     }

            //     // Stop and restart local video
            //     this.stopVideoCall();
            //     await this.startVideoCall();

            //     // Reset connection state
            //     this.connected = false;

            //     // Wait for new connection from host
            //     console.log('[REMOTE] ⏳ Ready for new connection');
            //     return;
            // }

            if (typeof data == 'string' && data?.startsWith('screenSize')) {
                const size = data.split(',');
                this.hostScreenSize = {
                    height: +size[2],
                    width: +size[1],
                };
                console.log(
                    '[REMOTE] 📐 Host screen size:',
                    this.hostScreenSize
                );
            } else if (
                typeof data == 'string' &&
                data?.startsWith('pwRequest')
            ) {
                console.log('[REMOTE] 🔒 Password requested');
                this.askForPw();
            } else if (typeof data == 'string' && data?.startsWith('decline')) {
                console.log('[REMOTE] ❌ Connection declined');
                this.close();
                this.cdr.detectChanges();
            } else if (typeof data == 'string' && data?.startsWith('pwWrong')) {
                console.log('[REMOTE] ⚠️ Password incorrect');
                this.pendingPassword = null;
                const alert = await this.alertCtrl.create({
                    header: 'Password not correct',
                    buttons: ['OK'],
                });
                await alert.present();
                this.askForPw();
                this.cdr.detectChanges();
            } else {
                console.log('[REMOTE] 🔄 Received WebRTC signal');
                if (this.peer2) {
                    this.peer2.signal(data);
                }
            }
        });

        this.initPeer(id);
    }

    async askForPw() {
        const result = await this.pwPrompt(this.route.snapshot.queryParams.id);

        if (result?.password) {
            // Store for later if connection succeeds
            this.pendingPassword = {
                password: result.password,
                shouldRemember: result.rememberPassword,
                id: this.route.snapshot.queryParams.id,
            };

            this.socketService.sendMessage(`pwAnswer:${result.password}`);
        } else {
            this.socketService.sendMessage('decline');
            this.close();
        }
        this.cdr.detectChanges();
    }

    initPeer(id) {
        let updateTimeout: any = null;
        console.log('[REMOTE] 🌐 Creating peer connection...');

        // Track storage - will receive tracks one by one
        let receivedTracks = {
            screenVideo: null,
            screenAudio: null,
            cameraVideo: null,
            micAudio: null,
        };
        let trackCount = 0;

        // Create peer WITHOUT initial stream
        this.peer2 = new SimplePeer({
            initiator: false,
            config: {
                iceServers: [
                    { urls: 'stun:stun.relay.metered.ca:80' },
                    {
                        urls: 'turn:global.relay.metered.ca:80',
                        username: '63549d560f2efcb312cd67de',
                        credential: 'qh7UD1VgYnwSWhmQ',
                    },
                    {
                        urls: 'turn:global.relay.metered.ca:80?transport=tcp',
                        username: '63549d560f2efcb312cd67de',
                        credential: 'qh7UD1VgYnwSWhmQ',
                    },
                    {
                        urls: 'turn:global.relay.metered.ca:443',
                        username: '63549d560f2efcb312cd67de',
                        credential: 'qh7UD1VgYnwSWhmQ',
                    },
                    {
                        urls: 'turns:global.relay.metered.ca:443?transport=tcp',
                        username: '63549d560f2efcb312cd67de',
                        credential: 'qh7UD1VgYnwSWhmQ',
                    },
                ],
            },
        });

        console.log(
            '[REMOTE] ✅ Peer created, now adding LOCAL tracks FIRST...'
        );

        // ⭐ CRITICAL: Add local camera/mic tracks IMMEDIATELY (before any signals)
        if (this.localStream) {
            console.log('[REMOTE] 📤 Adding local stream tracks to peer...');
            this.localStream.getTracks().forEach((track, index) => {
                console.log(
                    `[REMOTE] 📤 Adding local track ${index}:`,
                    track.kind,
                    track.label
                );
                this.peer2.addTrack(track, this.localStream);
            });
            console.log('[REMOTE] ✅ All local tracks added successfully');
        } else {
            console.warn('[REMOTE] ⚠️ No local stream available yet');
        }

        // Signal handler
        this.peer2.on('signal', data => {
            console.log('[REMOTE] 📡 Sending signal to host');
            this.socketService.sendMessage(data);
        });

        // ⭐ NEW: Listen to individual TRACK events (not stream events)
        this.peer2.on('track', (track, stream) => {
            trackCount++;
            console.log(`[REMOTE] 🎯 Track #${trackCount} received:`, {
                kind: track.kind,
                label: track.label,
                id: track.id,
                enabled: track.enabled,
                muted: track.muted,
            });

            // Identify and store tracks
            if (track.kind === 'video') {
                if (!receivedTracks.screenVideo) {
                    receivedTracks.screenVideo = track;
                    console.log('[REMOTE] ✅ Identified as SCREEN video');
                } else if (!receivedTracks.cameraVideo) {
                    receivedTracks.cameraVideo = track;
                    console.log('[REMOTE] ✅ Identified as CAMERA video');
                } else {
                    console.warn(
                        '[REMOTE] ⚠️ Extra video track received, ignoring'
                    );
                }
            } else if (track.kind === 'audio') {
                if (!receivedTracks.screenAudio) {
                    receivedTracks.screenAudio = track;
                    console.log(
                        '[REMOTE] ✅ Identified as SCREEN/SYSTEM audio'
                    );
                } else if (!receivedTracks.micAudio) {
                    receivedTracks.micAudio = track;
                    console.log('[REMOTE] ✅ Identified as MIC audio');
                } else {
                    console.warn(
                        '[REMOTE] ⚠️ Extra audio track received, ignoring'
                    );
                }
            }

            // Update video displays whenever we receive a track
            this.updateVideoDisplays(receivedTracks);
        });

        // Connection established
        this.peer2.on('connect', () => {
            console.log('[REMOTE] ✅ Peer connection established!');
            this.connected = true;

            if (this.pendingPassword?.shouldRemember) {
                this.addressBookService.savePassword(
                    this.pendingPassword.id,
                    this.pendingPassword.password
                );
                console.log(
                    '[REMOTE] 💾 Password saved for future connections'
                );
            }
            this.pendingPassword = null;
            this.cdr.detectChanges();
        });

        // Handle old 'stream' event (backup, might still fire)
        this.peer2.on('stream', stream => {
            console.log('[REMOTE] 📺 Stream event fired (legacy):');
            console.log(
                '[REMOTE] Stream tracks:',
                stream.getTracks().map(t => ({
                    kind: t.kind,
                    label: t.label,
                }))
            );
            // We handle tracks via 'track' event, so this is just for logging
        });

        this.peer2.on('close', () => {
            console.log('[REMOTE] ❌ Connection closed');
            this.close();
        });

        this.peer2.on('error', err => {
            console.error('[REMOTE] ❌ Peer error:', err);
            this.close();
        });

        // File transfer handling (keep existing code)
        this.peer2.on('data', async data => {
            if (!data) return;
            const fileTransfer = data.toString();

            if (fileTransfer.substr(0, 5) === 'file-') {
                const fileID = fileTransfer.substr(5);
                this.spf.receive(this.peer2, fileID).then((transfer: any) => {
                    transfer.on('progress', p => {
                        console.log('[REMOTE] 📦 File progress:', p);
                    });
                    transfer.on('done', done => {
                        console.log('[REMOTE] ✅ File received:', done);
                    });
                });
                this.peer2.send(`start-${fileID}`);
                return;
            } else if (fileTransfer.substr(0, 6) === 'start-') {
                this.fileLoading = true;
                this.cdr.detectChanges();
                const fileID = fileTransfer.substr(6);
                this.transfer = await this.spf.send(
                    this.peer2,
                    fileID,
                    this.files[fileID]
                );
                this.transfer.on('progress', p => {
                    this.fileProgress = p;
                });
                this.transfer.on('done', done => {
                    this.fileLoading = false;
                    this.cdr.detectChanges();
                });
                this.transfer.on('cancel', done => {
                    this.fileLoading = false;
                    this.cdr.detectChanges();
                });
                this.transfer.on('cancelled', done => {
                    this.fileLoading = false;
                    this.cdr.detectChanges();
                });
                try {
                    this.transfer.start();
                } catch (error) {
                    console.error('[REMOTE] ❌ File transfer error:', error);
                }
                return;
            }
        });

        // Start clipboard monitoring if Electron (AFTER peer is created)
        if (this.electronService.isElectron) {
            console.log('[REMOTE] 📋 Setting up clipboard monitoring...');
            setTimeout(() => {
                this.startClipboardMonitoring();
            }, 1000);
        }
    }

    startClipboardMonitoring() {
        if (!this.electronService.isElectron) {
            console.log(
                '[REMOTE] ⚠️ Not in Electron, skipping clipboard monitoring'
            );
            return;
        }

        try {
            console.log('[REMOTE] 📋 Starting clipboard monitoring...');
            const clipboard = this.electronService.clipboard;

            clipboard
                .on('text-changed', () => {
                    if (this.peer2 && this.connected) {
                        const currentText = clipboard.readText();
                        console.log(
                            '[REMOTE] 📋 Clipboard text changed, sending to host'
                        );
                        this.peer2.send('clipboard-' + currentText);
                    }
                })
                .on('image-changed', () => {
                    console.log(
                        '[REMOTE] 📋 Clipboard image changed (not implemented)'
                    );
                })
                .startWatching();

            console.log('[REMOTE] ✅ Clipboard monitoring active');
        } catch (err) {
            console.error('[REMOTE] ❌ Clipboard monitoring failed:', err);
        }
    }

    updateVideoDisplays(receivedTracks: any) {
        console.log('[REMOTE] 🔄 Updating video displays...', {
            hasScreen: !!receivedTracks.screenVideo,
            hasCamera: !!receivedTracks.cameraVideo,
            hasScreenAudio: !!receivedTracks.screenAudio,
            hasMicAudio: !!receivedTracks.micAudio,
        });

        // ========== MAIN VIDEO: Host's SCREEN + AUDIO ==========
        if (receivedTracks.screenVideo) {
            // Create fresh stream for screen
            const screenStream = new MediaStream();

            // Add screen video
            screenStream.addTrack(receivedTracks.screenVideo);
            console.log('[REMOTE] ✅ Added screen video to main display');

            // Add all audio tracks to main display
            if (receivedTracks.screenAudio) {
                screenStream.addTrack(receivedTracks.screenAudio);
                console.log('[REMOTE] ✅ Added screen audio to main display');
            }
            if (receivedTracks.micAudio) {
                screenStream.addTrack(receivedTracks.micAudio);
                console.log('[REMOTE] ✅ Added mic audio to main display');
            }

            // Update main video element
            const remoteVideo =
                this.remoteVideoRef?.nativeElement ||
                this.elementRef.nativeElement.querySelector('#remoteVideo');
            if (remoteVideo && remoteVideo.srcObject !== screenStream) {
                remoteVideo.srcObject = screenStream;
                remoteVideo
                    .play()
                    .then(() => console.log('[REMOTE] ✅ Main video playing'))
                    .catch(e =>
                        console.error('[REMOTE] ❌ Main video play error:', e)
                    );
            }

            // Update background video
            const videoBg: HTMLVideoElement =
                this.elementRef.nativeElement.querySelector('#videobg');
            if (videoBg && videoBg.srcObject !== screenStream) {
                videoBg.srcObject = screenStream;
                videoBg
                    .play()
                    .catch(e =>
                        console.log(
                            '[REMOTE] Background video error (ok to ignore):',
                            e
                        )
                    );
            }

            // Update control video (for mouse/keyboard events)
            const video: HTMLVideoElement =
                this.elementRef.nativeElement.querySelector('#video');
            if (video) {
                const currentSrc = video.srcObject as MediaStream;
                if (currentSrc !== screenStream) {
                    console.log('[REMOTE] 🎮 Setting up control video...');
                    this.video = video;
                    this.stream = screenStream;
                    video.srcObject = screenStream;

                    video
                        .play()
                        .then(() =>
                            console.log('[REMOTE] ✅ Control video playing')
                        )
                        .catch(e =>
                            console.error(
                                '[REMOTE] ❌ Control video play error:',
                                e
                            )
                        );

                    // Bind event listeners only once
                    if (!this.boundMouseDownListener) {
                        console.log(
                            '[REMOTE] 🖱️ Binding mouse/keyboard listeners...'
                        );
                        this.boundMouseListener = this.mouseListener.bind(this);
                        this.boundMouseMoveListener =
                            this.mouseMoveListener.bind(this);
                        this.boundDblClickListener =
                            this.mouseListener.bind(this);
                        this.boundMouseUpListener =
                            this.mouseListener.bind(this);
                        this.boundMouseDownListener =
                            this.mouseListener.bind(this);

                        video.addEventListener(
                            'mousedown',
                            this.boundMouseDownListener
                        );
                        video.addEventListener(
                            'mouseup',
                            this.boundMouseUpListener
                        );
                        video.addEventListener(
                            'dblclick',
                            this.boundDblClickListener
                        );
                        video.addEventListener(
                            'mousemove',
                            this.boundMouseMoveListener
                        );
                        console.log('[REMOTE] ✅ Event listeners bound');
                    }

                    // Calculate video size when loaded
                    video.addEventListener(
                        'loadeddata',
                        () => {
                            console.log(
                                '[REMOTE] 📏 Video loaded, calculating size...'
                            );
                            this.calcVideoSize();
                        },
                        { once: true }
                    );

                    video.addEventListener('resize', () => {
                        console.log(
                            '[REMOTE] 📐 Video resized:',
                            video.videoWidth,
                            'x',
                            video.videoHeight
                        );
                        this.calcVideoSize();
                    });
                }
            }

            this.connected = true;
            this.cdr.detectChanges();
        }

        // ========== PIP VIDEO: Host's CAMERA ==========
        if (receivedTracks.cameraVideo) {
            // Create fresh stream for camera
            const cameraStream = new MediaStream();
            cameraStream.addTrack(receivedTracks.cameraVideo);

            const hostCameraVideo = this.hostCameraVideoRef?.nativeElement;
            if (hostCameraVideo && hostCameraVideo.srcObject !== cameraStream) {
                hostCameraVideo.srcObject = cameraStream;
                hostCameraVideo
                    .play()
                    .then(() =>
                        console.log('[REMOTE] ✅ Host camera PiP playing')
                    )
                    .catch(e =>
                        console.error('[REMOTE] ❌ Host camera play error:', e)
                    );
                console.log('[REMOTE] ✅ Host camera video displayed');
            }
        } else {
            console.log('[REMOTE] ⏳ Waiting for host camera track...');
        }
    }
  async close() {
    console.log('[REMOTE] 🔄 Connection ended, complete cleanup...');

    // 1. Stop connection
    this.connected = false;
    this.removeEventListeners();
    this.stopVideoCall();

    // 2. Clean up peer PROPERLY
    try {
        if (this.peer2) {
            this.peer2.removeAllListeners(); // ⭐ Remove all listeners first
            this.peer2.destroy();
            this.peer2 = null; // ⭐ Nullify reference
        }
    } catch (err) {
        console.error('[REMOTE] Peer cleanup error:', err);
    }

    // 3. Clean up socket PROPERLY
    try {
        if (this.socketService) {
            this.socketService.destroy();
        }
    } catch (err) {
        console.error('[REMOTE] Socket cleanup error:', err);
    }

    // 4. Show alert
    const alert = await this.alertCtrl.create({
        header: 'Connection Ended',
        message: 'Connection to the host has ended.',
        buttons: [
            {
                text: 'OK',
                handler: () => {
                    this.navigateToHome();
                },
            },
        ],
    });

    await alert.present();
}

    // ⭐ NEW METHOD - Add this right after close()
    private navigateToHome() {
        console.log('[REMOTE] 📍 Navigating to /home...');

        try {
            // If in Electron, close the remote window
            if (this.electronService.isElectron) {
                this.electronService.window.close();
            } else {
                // If in browser, navigate to home
                this.router.navigate(['/home']);
            }
        } catch (err) {
            console.error('[REMOTE] Navigation error:', err);
            // Fallback: try navigation
            this.router.navigate(['/home']);
        }
    }

    calcVideoSize() {
        if (!this.video) {
            console.warn('[REMOTE] ⚠️ Video element not ready yet');
            return;
        }

        this.videoSize = this.video.getBoundingClientRect();
        console.log('[REMOTE] 📏 Video size:', this.videoSize);
        console.log('[REMOTE] 📐 Host screen size:', this.hostScreenSize);
    }

    ngOnDestroy() {
        this.appService.sideMenu = true;
        this.removeEventListeners();
        this.stopVideoCall();

        try {
            this.socketService?.destroy();
        } catch (err) {}
        try {
            this.peer2?.destroy();
        } catch (err) {}
    }

    getFileProgress(fileProgress) {
        return fileProgress ? fileProgress.toFixed() : '';
    }

    removeEventListeners() {
        if (this.video) {
            if (this.boundMouseDownListener)
                this.video.removeEventListener(
                    'mousedown',
                    this.boundMouseDownListener
                );
            if (this.boundMouseUpListener)
                this.video.removeEventListener(
                    'mouseup',
                    this.boundMouseUpListener
                );
            if (this.boundDblClickListener)
                this.video.removeEventListener(
                    'dblclick',
                    this.boundDblClickListener
                );
            if (this.boundMouseMoveListener)
                this.video.removeEventListener(
                    'mousemove',
                    this.boundMouseMoveListener
                );
        }
    }

    mouseListener(event: MouseEvent) {
        if (!this.connected) return;

        if (!this.hostScreenSize || !this.videoSize) {
            console.warn('[REMOTE] ⚠️ Screen dimensions not ready');
            return;
        }

        let type: string;
        if (event.type == 'mouseup') {
            type = 'mu';
        } else if (event.type == 'mousedown') {
            type = 'md';
        } else if (event.type == 'dblclick') {
            type = 'dc';
        }

        const x = this.scale(
            event.offsetX,
            0,
            this.videoSize.width,
            0,
            this.hostScreenSize.width
        );

        const y = this.scale(
            event.offsetY,
            0,
            this.videoSize.height,
            0,
            this.hostScreenSize.height
        );

        console.log('[REMOTE] 🖱️ Mouse event:', type, 'at', x, y);

        const stringData = `${type},${x},${y},${event.button}`;
        this.peer2?.send(stringData);
    }

    mouseMoveListener(event) {
        if (!this.connected || !this.videoSize || !this.hostScreenSize) return;

        const x = this.scale(
            event?.offsetX,
            0,
            this.videoSize?.width || 1,
            0,
            this.hostScreenSize?.width || 1
        );
        const y = this.scale(
            event?.offsetY,
            0,
            this.videoSize?.height || 1,
            0,
            this.hostScreenSize?.height || 1
        );

        const stringData = `mm,${x},${y}`;
        this.peer2?.send(stringData);
    }

    keydownListener(event: KeyboardEvent) {
        if (!this.connected) return;

        const data = {
            t: 'k',
            code: event.code,
            keyCode: event.keyCode,
            key: event.key,
            shift: event.shiftKey,
            control: event.ctrlKey,
            alt: event.altKey,
            meta: event.metaKey,
        };

        try {
            this.peer2?.send(JSON.stringify(data));
            console.log('[REMOTE] ⌨️ Key sent:', data.key);
        } catch (err) {
            console.error('send key error', err);
        }
    }

    scrollListener(event: WheelEvent) {
        if (!this.connected) return;

        let stringData;
        if (event.deltaY < 0) {
            stringData = `s,up`;
        } else if (event.deltaY > 0) {
            stringData = `s,down`;
        }

        if (stringData) {
            this.peer2?.send(stringData);
            console.log('[REMOTE] 📜 Scroll sent:', stringData);
        }
    }

    scale(x, fromLow, fromHigh, toLow, toHigh) {
        if (!fromHigh || fromHigh === fromLow) return Math.trunc(toLow);
        return Math.trunc(
            ((x - fromLow) * (toHigh - toLow)) / (fromHigh - fromLow) + toLow
        );
    }
}
