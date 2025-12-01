import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { AppConfig } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  public socket: Socket;
  private currentRoom: string;
  private messageQueue: any[] = [];

  constructor() {}

 init() {
    if (this.socket && this.socket.connected) {
      console.log('[SOCKET] Already connected');
      return;
    }
    
    console.log('[SOCKET] Connecting to:', AppConfig.api);
    
    this.socket = io(AppConfig.api, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('[SOCKET] ✅ Connected! Socket ID:', this.socket.id);
      
      // Process queued messages
      if (this.messageQueue.length > 0) {
        console.log('[SOCKET] 📦 Processing', this.messageQueue.length, 'queued messages');
        this.messageQueue.forEach(msg => {
          this.socket.emit('message', msg);
        });
        this.messageQueue = [];
      }
      
      if (this.currentRoom) {
        console.log('[SOCKET] Re-joining room:', this.currentRoom);
        this.joinRoom(this.currentRoom);
      }
    });

    this.socket.on('connect_error', (err) => {
      console.error('[SOCKET] ❌ Connection error:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[SOCKET] ⚠️ Disconnected. Reason:', reason);
    });

    this.socket.on('error', (err) => {
      console.error('[SOCKET] ❌ Socket error:', err);
    });
  }

  destroy() {
    console.log('[SOCKET] Destroying socket connection');
    try {
      this.socket?.disconnect();
      this.currentRoom = null;
    } catch (err) {
      console.error('[SOCKET] Error destroying:', err);
    }
  }

  joinRoom(id: string) {
    console.log('[SOCKET] 📥 Joining room:', id);
    this.currentRoom = id;
    this.socket.emit('join', id);
  }

  sendMessage(msg: any) {
    if (!this.socket) {
        console.error('[SOCKET] ❌ Socket not initialized');
        return;
    }
    
    if (!this.socket.connected) {
        console.warn('[SOCKET] ⚠️ Not connected yet, queueing message');
        this.messageQueue.push(msg);
        return;
    }
    
    console.log('[SOCKET] 📤 Sending message:', typeof msg === 'string' ? msg.substring(0, 50) : 'signal data');
    this.socket.emit('message', msg);
}
onNewMessage() {
    return new Observable(observer => {
        this.socket.on('message', (data) => {
            console.log('[SOCKET] 📨 Received:', typeof data === 'string' ? data.substring(0, 50) : 'signal');
            observer.next(data);
        });
    });
}
  onDisconnected() {
    return new Observable(observer => {
      this.socket.on('peer-disconnected', (id) => {
        console.log('[SOCKET] 👋 Peer disconnected:', id);
        observer.next(id);
      });
    });
  }
}

