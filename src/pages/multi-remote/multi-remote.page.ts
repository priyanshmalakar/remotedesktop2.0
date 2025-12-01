// multi-remote.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import SimplePeer from 'simple-peer';
import { SocketService } from '../../app/core/services/socket.service';
import { ElectronService } from '../../app/core/services/electron.service';

interface MonitorConnection {
    id: string;
    peer: SimplePeer.Instance;
    stream?: MediaStream;
    videoElement?: HTMLVideoElement;
    screenSize?: { width: number; height: number };
    status: 'connecting' | 'connected' | 'error';
    name?: string;
}

@Component({
    selector: 'app-multi-remote',
    templateUrl: './multi-remote.page.html',
    styleUrls: ['./multi-remote.page.scss']
})
export class MultiRemotePage implements OnInit, OnDestroy {
    monitors: Map<string, MonitorConnection> = new Map();
    selectedMonitorId: string | null = null;
    viewMode: 'grid' | 'fullscreen' = 'grid';
    newMonitorId: string = '';

    constructor(
        private route: ActivatedRoute,
        private socketService: SocketService,
        public electronService: ElectronService
    ) {}

    async ngOnInit() {
        // Get IDs from URL: ?ids=123456789,987654321,456789123
        const idsParam = this.route.snapshot.queryParams.ids;
        if (idsParam) {
            const ids = idsParam.split(',');
            this.connectToMultipleHosts(ids);
        }
    }

    connectToMultipleHosts(hostIds: string[]) {
        hostIds.forEach(id => {
            this.connectToHost(id.trim());
        });
    }

    async addMonitor() {
        const id = this.newMonitorId.trim();
        if (!id || id.length !== 9) {
            alert('Please enter a valid 9-digit Monitor ID.');
            return;
        }

        if (this.monitors.has(id)) {
            alert('This monitor is already connected.');
            return;
        }

        console.log(`[MULTI] Adding new monitor with ID: ${id}`);
        this.connectToHost(id);
        this.newMonitorId = '';
    }

    connectToHost(hostId: string) {
        console.log(`[MULTI] Connecting to host: ${hostId}`);

        const monitor: MonitorConnection = {
            id: hostId,
            peer: null,
            status: 'connecting'
        };

        this.monitors.set(hostId, monitor);

        // Initialize socket for this host
        this.socketService.init();
        this.socketService.joinRoom(hostId);

        // Send hi after a delay
        setTimeout(() => {
            this.socketService.sendMessage('hi');
        }, 500);

        // Listen for messages from this specific host
        this.socketService.onNewMessage().subscribe((data: any) => {
            this.handleHostMessage(hostId, data);
        });

        // Create peer connection
        this.initPeerForHost(hostId);
    }

    initPeerForHost(hostId: string) {
        const peer = new SimplePeer({
            initiator: false,
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
            }
        });

        peer.on('signal', data => {
            this.socketService.sendMessage(data);
        });

        peer.on('stream', stream => {
            console.log(`[MULTI] Stream received from ${hostId}`);
            const monitor = this.monitors.get(hostId);
            if (monitor) {
                monitor.stream = stream;
                monitor.status = 'connected';
                this.createVideoElement(hostId, stream);
            }
        });

        peer.on('error', err => {
            console.error(`[MULTI] Peer error for ${hostId}:`, err);
            const monitor = this.monitors.get(hostId);
            if (monitor) {
                monitor.status = 'error';
            }
        });

        const monitor = this.monitors.get(hostId);
        if (monitor) {
            monitor.peer = peer;
        }
    }

    handleHostMessage(hostId: string, data: any) {
        if (typeof data === 'string' && data.startsWith('screenSize')) {
            const [, width, height] = data.split(',');
            const monitor = this.monitors.get(hostId);
            if (monitor) {
                monitor.screenSize = { width: +width, height: +height };
                console.log(`[MULTI] Screen size for ${hostId}: ${width}x${height}`);
            }
        } else {
            // It's a signal
            const monitor = this.monitors.get(hostId);
            if (monitor?.peer) {
                monitor.peer.signal(data);
            }
        }
    }

    createVideoElement(hostId: string, stream: MediaStream) {
        setTimeout(() => {
            const video = document.getElementById(`video-${hostId}`) as HTMLVideoElement;
            if (video) {
                video.srcObject = stream;
                video.play().catch(err => {
                    console.error(`[MULTI] Error playing video for ${hostId}:`, err);
                });
                
                const monitor = this.monitors.get(hostId);
                if (monitor) {
                    monitor.videoElement = video;
                }
            }
        }, 100);
    }

    selectMonitor(hostId: string) {
        console.log(`[MULTI] Selecting monitor: ${hostId}`);
        this.selectedMonitorId = hostId;
        this.viewMode = 'fullscreen';
        
        // Set up the fullscreen video element
        setTimeout(() => {
            const monitor = this.monitors.get(hostId);
            if (monitor?.stream) {
                const fullscreenVideo = document.getElementById(`video-fullscreen-${hostId}`) as HTMLVideoElement;
                if (fullscreenVideo) {
                    console.log(`[MULTI] Setting up fullscreen video for ${hostId}`);
                    fullscreenVideo.srcObject = monitor.stream;
                    fullscreenVideo.play().catch(err => {
                        console.error(`[MULTI] Error playing fullscreen video:`, err);
                    });
                    monitor.videoElement = fullscreenVideo;
                    
                    // Focus the fullscreen container for keyboard events
                    const fullscreenContainer = document.querySelector('.fullscreen-view') as HTMLElement;
                    if (fullscreenContainer) {
                        fullscreenContainer.focus();
                    }
                } else {
                    console.error(`[MULTI] Fullscreen video element not found for ${hostId}`);
                }
            } else {
                console.error(`[MULTI] No stream available for ${hostId}`);
            }
        }, 150);
    }

    backToGrid() {
        this.selectedMonitorId = null;
        this.viewMode = 'grid';
        
        // Restore video streams to grid cards
        setTimeout(() => {
            this.monitors.forEach((monitor, hostId) => {
                if (monitor.stream) {
                    this.createVideoElement(hostId, monitor.stream);
                }
            });
        }, 100);
    }

    getMonitorArray() {
        return Array.from(this.monitors.values());
    }

    cancelConnection(hostId: string, event?: Event) {
        if (event) {
            event.stopPropagation();
        }
        console.log(`[MULTI] Cancelling connection for ${hostId}`);
        this.disconnectMonitor(hostId, event);
    }

    disconnectMonitor(hostId: string, event?: Event) {
        if (event) {
            event.stopPropagation();
        }
        
        console.log(`[MULTI] Disconnecting monitor: ${hostId}`);
        const monitor = this.monitors.get(hostId);
        
        if (monitor) {
            if (monitor.peer) {
                monitor.peer.destroy();
            }
            if (monitor.stream) {
                monitor.stream.getTracks().forEach(track => track.stop());
            }
            this.monitors.delete(hostId);
        }

        // If we're disconnecting the currently selected monitor, go back to grid
        if (this.selectedMonitorId === hostId) {
            this.backToGrid();
        }
    }

    sendMouseEvent(event: MouseEvent) {
        if (!this.selectedMonitorId) return;
        
        const monitor = this.monitors.get(this.selectedMonitorId);
        if (monitor?.peer && monitor.screenSize && monitor.videoElement) {
            const videoRect = monitor.videoElement.getBoundingClientRect();
            const x = this.scale(event.offsetX, 0, videoRect.width, 0, monitor.screenSize.width);
            const y = this.scale(event.offsetY, 0, videoRect.height, 0, monitor.screenSize.height);
            
            let eventType = '';
            if (event.type === 'mousemove') {
                eventType = 'mm';
            } else if (event.type === 'mousedown') {
                eventType = 'md';
            } else if (event.type === 'mouseup') {
                eventType = 'mu';
            } else if (event.type === 'dblclick') {
                eventType = 'dc';
            }
            
            if (eventType) {
                monitor.peer.send(`${eventType},${x},${y}`);
            }
        }
    }

    // sendKeyboardEvent(event: KeyboardEvent) {
    //     if (!this.selectedMonitorId) return;
        
    //     const monitor = this.monitors.get(this.selectedMonitorId);
    //     if (monitor?.peer) {
    //         const data = {
    //             key: event.key,
    //             code: event.code,
    //             shift: event.shiftKey,
    //             control: event.ctrlKey,
    //             alt: event.altKey,
    //             meta: event.metaKey
    //         };
    //         monitor.peer.send(JSON.stringify(data));
    //     }
    // }

// ======================= UPDATE ESCAPE  =================== 

sendKeyboardEvent(event: KeyboardEvent) {
    if (!this.selectedMonitorId) return;

    const monitor = this.monitors.get(this.selectedMonitorId);
    if (!monitor?.peer) return;

    // 🟢 Prevent default browser behavior (so "Escape" text won’t appear)
    event.preventDefault();

    // 🟢 Custom handling for Escape key
    if (event.key === 'Escape') {
        // Send a simple signal instead of typing "Escape"
        monitor.peer.send(JSON.stringify({ action: 'ESC_PRESSED' }));
        return;
    }

    // 🔵 For all other keys, keep existing functionality
    const data = {
        key: event.key,
        code: event.code,
        shift: event.shiftKey,
        control: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey
    };
    monitor.peer.send(JSON.stringify(data));
}


    sendScrollEvent(event: WheelEvent) {
        if (!this.selectedMonitorId) return;
        
        event.preventDefault();
        const monitor = this.monitors.get(this.selectedMonitorId);
        if (monitor?.peer) {
            monitor.peer.send(`scroll,${event.deltaX},${event.deltaY}`);
        }
    }

    scale(x: number, fromLow: number, fromHigh: number, toLow: number, toHigh: number): number {
        if (!fromHigh || fromHigh === fromLow) return Math.trunc(toLow);
        return Math.trunc(((x - fromLow) * (toHigh - toLow)) / (fromHigh - fromLow) + toLow);
    }

    ngOnDestroy() {
        this.monitors.forEach(monitor => {
            if (monitor.peer) {
                monitor.peer.destroy();
            }
            if (monitor.stream) {
                monitor.stream.getTracks().forEach(track => track.stop());
            }
        });
        this.monitors.clear();
    }
}