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
    // ✅ FIX 1: Properly clean up existing socket before creating new one
    if (this.socket) {
      if (this.socket.connected) {
        console.log('[SOCKET] Already connected');
        return;
      }
      
      console.log('[SOCKET] Socket exists but disconnected, cleaning up old socket');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    
    console.log('[SOCKET] Connecting to:', AppConfig.api);
    
  this.socket = io(AppConfig.api, {
    reconnection: false,  
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
        this.socket.emit('join', this.currentRoom);
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
    console.log('[SOCKET] 🧹 Destroying socket connection');
    
    return new Promise<void>((resolve) => {
        try {
            if (this.socket) {
                // 1. Leave room first
                if (this.currentRoom && this.socket.connected) {
                    console.log('[SOCKET] Leaving room:', this.currentRoom);
                    this.socket.emit('leave', this.currentRoom);
                }
                
                // 2. Remove all listeners
                this.socket.removeAllListeners();
                console.log('[SOCKET] All listeners removed');
                
                // 3. Disconnect
                this.socket.disconnect();
                console.log('[SOCKET] Socket disconnected');
                
                // 4. Nullify reference
                this.socket = null;
            }
            
            // 5. Clear state
            this.currentRoom = null;
            this.messageQueue = [];
            
            console.log('[SOCKET] ✅ Destroy complete');
            resolve();
        } catch (err) {
            console.error('[SOCKET] ❌ Error destroying:', err);
            resolve(); // Resolve anyway to not block
        }
    });
}


  joinRoom(id: string) {
    console.log('[SOCKET] 📥 Joining room:', id);
    this.currentRoom = id;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join', id);
    }
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
        // ✅ FIX 4: Remove old listener before adding new one
        if (this.socket) {
            this.socket.off('message');
        }
        
        this.socket.on('message', (data) => {
            console.log('[SOCKET] 📨 Received:', typeof data === 'string' ? data.substring(0, 50) : 'signal');
            observer.next(data);
        });
        
        // ✅ FIX 5: Return cleanup function
        return () => {
            if (this.socket) {
                this.socket.off('message');
            }
        };
    });
  }

  onDisconnected() {
    return new Observable(observer => {
      // ✅ FIX 6: Remove old listener before adding new one
      if (this.socket) {
          this.socket.off('peer-disconnected');
      }
      
      this.socket.on('peer-disconnected', (id) => {
        console.log('[SOCKET] 👋 Peer disconnected:', id);
        observer.next(id);
      });
      
      // ✅ FIX 7: Return cleanup function
      return () => {
          if (this.socket) {
              this.socket.off('peer-disconnected');
          }
      };
    });
  }
}