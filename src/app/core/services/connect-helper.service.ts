import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { AppConfig } from '../../../environments/environment';
import { keyboard, Key, mouse, Button } from '@nut-tree-fork/nut-js';

declare var window: any;

@Injectable({
  providedIn: 'root',
})
export class ConnectHelperService {
  infoWindow: any;

  constructor(private electronService: ElectronService) {}

  // ⭐ ALL SPECIAL KEYS MAPPED FOR REMOTE CONTROL
  private specialKeysMap: Record<string, Key> = {
    Escape: Key.Escape,
    Tab: Key.Tab,
    CapsLock: Key.CapsLock,

    ShiftLeft: Key.LeftShift,
    ShiftRight: Key.RightShift,

    ControlLeft: Key.LeftControl,
    ControlRight: Key.RightControl,

    AltLeft: Key.LeftAlt,
    AltRight: Key.RightAlt,

    MetaLeft: Key.LeftSuper,
    MetaRight: Key.RightSuper,

    Enter: Key.Enter,
    Backspace: Key.Backspace,
    Space: Key.Space,

    ArrowUp: Key.Up,
    ArrowDown: Key.Down,
    ArrowLeft: Key.Left,
    ArrowRight: Key.Right,

    Delete: Key.Delete,
    Insert: Key.Insert,
    Home: Key.Home,
    End: Key.End,
    PageUp: Key.PageUp,
    PageDown: Key.PageDown,

    F1: Key.F1, F2: Key.F2, F3: Key.F3, F4: Key.F4,
    F5: Key.F5, F6: Key.F6, F7: Key.F7, F8: Key.F8,
    F9: Key.F9, F10: Key.F10, F11: Key.F11, F12: Key.F12,
  };

  // Generate a 3-digit random number
  threeDigit(): number {
    return Math.floor(Math.random() * 900) + 100; // 100-999
  }

  // Scroll handler
  handleScroll(text: string) {
    try {
      const [, ud] = text.split(',');
      if (ud === 'up') mouse.scrollUp(50);
      else mouse.scrollDown(50);
    } catch (error) {
      console.error('Scroll error:', error);
    }
  }

  // Mouse handler
  handleMouse(text: string) {
    try {
      const [t, x, y, bStr] = text.split(',');
      const b = +bStr || 0;

      switch (t) {
        case 'md':
          mouse.pressButton(b as Button);
          break;
        case 'mu':
          mouse.releaseButton(b as Button);
          break;
        case 'mm':
          mouse.setPosition({ x: +x, y: +y });
          break;
        case 'dc':
          mouse.click(Button.LEFT);
          mouse.click(Button.LEFT);
          break;
      }
    } catch (error) {
      console.error('Mouse error:', error);
    }
  }

  // ⭐ FIXED KEYBOARD HANDLER (FULLY WORKING)
  async handleKey(data: {
    key?: string;
    shift?: boolean;
    control?: boolean;
    alt?: boolean;
    meta?: boolean;
    code?: string;
  }) {
    try {
      if (!this.electronService.isElectron) return;

      const modifiers: Key[] = [];
      if (data.shift) modifiers.push(Key.LeftShift);
      if (data.control) modifiers.push(Key.LeftControl);
      if (data.alt) modifiers.push(Key.LeftAlt);
      if (data.meta) modifiers.push(Key.LeftSuper);

      const reversedModifiers = [...modifiers].reverse();

      const keyCode = data.code || data.key || '';
      const nutKey =
        this.specialKeysMap[keyCode] ??
        this.specialKeysMap[data.key ?? ''] ??
        null;

      // 🔹 Printable characters (a-z, 0-9, symbols)
      if (data.key && data.key.length === 1) {
        for (const m of modifiers) await keyboard.pressKey(m);
        await keyboard.type(data.key);
        for (const m of reversedModifiers) await keyboard.releaseKey(m);
        return;
      }

      // 🔹 Special keys mapped above
      if (nutKey) {
        for (const m of modifiers) await keyboard.pressKey(m);
        await keyboard.pressKey(nutKey);
        await keyboard.releaseKey(nutKey);
        for (const m of reversedModifiers) await keyboard.releaseKey(m);
        return;
      }

      console.warn('Unknown key:', data);

    } catch (error) {
      console.error('handleKey error:', error);
    }
  }

  // =================== INFO WINDOW CODE ======================
  closeInfoWindow() {
    try {
      this.infoWindow?.close();
    } catch {}
  }

  showInfoWindow() {
    if (!this.electronService.isElectron) {
      window.open('http://localhost:4200/#/info-window', '_blank');
      return;
    }

    const appPath = this.electronService.remote.app.getAppPath();

    try {
      const BrowserWindow = this.electronService.remote.BrowserWindow;
      this.infoWindow = new BrowserWindow({
        height: 50,
        width: 50,
        x: 0,
        y: 100,
        resizable: false,
        show: false,
        frame: false,
        transparent: true,
        backgroundColor: '#252a33',
        webPreferences: {
          webSecurity: false,
          nodeIntegration: true,
          allowRunningInsecureContent: true,
          contextIsolation: false,
          enableRemoteModule: true,
        } as any,
      });

      this.electronService.remote
        .require('@electron/remote/main')
        .enable(this.infoWindow.webContents);

      this.infoWindow.setAlwaysOnTop(true, 'status');

      if (AppConfig.production) {
        const url = this.electronService.path.join(appPath, 'dist/index.html');
        this.infoWindow.loadURL(`file://${url}#/info-window`);
      } else {
        this.infoWindow.loadURL('http://localhost:4200/#/info-window');
      }

      this.infoWindow.show();
    } catch (error) {
      console.error('Error opening info window', error);
    }
  }
}



// =============== correct Escape Error =============== 

// import { Injectable } from '@angular/core';
// import { ElectronService } from './electron.service';
// import { AppConfig } from '../../../environments/environment';

// // Import nut-js directly
// import { keyboard, Key, mouse, Button } from '@nut-tree-fork/nut-js';

// declare var window: any;

// @Injectable({
//   providedIn: 'root',
// })
// export class ConnectHelperService {
//   infoWindow: any;

//   constructor(private electronService: ElectronService) {}

//   // Scroll handler
//   handleScroll(text: string) {
//     try {
//       const [, ud] = text.split(',');
//       if (ud === 'up') mouse.scrollUp(50);
//       else mouse.scrollDown(50);
//     } catch (error) {
//       console.error('Scroll error:', error);
//     }
//   }

//   // Mouse handler
//   handleMouse(text: string) {
//     try {
//       const [t, x, y, bStr] = text.split(',');
//       const b = +bStr || 0;

//       switch (t) {
//         case 'md':
//           mouse.pressButton(b as Button);
//           break;
//         case 'mu':
//           mouse.releaseButton(b as Button);
//           break;
//         case 'mm':
//           mouse.setPosition({ x: +x, y: +y });
//           break;
//         case 'dc':
//           mouse.click(Button.LEFT);
//           mouse.click(Button.LEFT);
//           break;
//       }
//     } catch (error) {
//       console.error('Mouse error:', error);
//     }
//   }

//   threeDigit() {
//     return Math.floor(Math.random() * (999 - 100 + 1) + 100);
//   }

//   // Keyboard handler
//   /**
//    * data: { key: string; shift?: boolean; control?: boolean; alt?: boolean; meta?: boolean; code?: string }
//    */
//   async handleKey(data: { key?: string; shift?: boolean; control?: boolean; alt?: boolean; meta?: boolean; code?: string }) {
//     try {
//       if (!this.electronService.isElectron) {
//         console.log('Not running in electron - keyboard input ignored.', data);
//         return;
//       }

//       // Determine platform safely (electron process or navigator)
//       const rawPlatform = (window as any)?.process?.platform ?? (navigator?.platform ?? '').toString();
//       const platformStr = String(rawPlatform).toLowerCase();
//       const isMac = platformStr.includes('darwin') || platformStr.includes('mac');

//       const modifiers: Key[] = [];
//       if (data.shift) modifiers.push(Key.LeftShift);
//       if (data.control) modifiers.push(isMac ? Key.LeftControl : Key.LeftControl);
//       if (data.alt) modifiers.push(Key.LeftAlt);
//       if (data.meta) modifiers.push(Key.LeftSuper);

//       // Helper to get a reversed copy without mutating original
//       const reversedModifiers = [...modifiers].reverse();

//       // If single printable character -> type it (with modifiers pressed)
//       if (data.key && data.key.length === 1) {
//         if (modifiers.length > 0) {
//           for (const m of modifiers) await keyboard.pressKey(m);
//           await keyboard.type(data.key);
//           for (const m of reversedModifiers) await keyboard.releaseKey(m);
//         } else {
//           await keyboard.type(data.key);
//         }
//         return;
//       }

//       // For special keys, try to map using code or key if possible
//       const keyName = data.code || data.key || '';
//       let keyToPress: Key | null = null;

//       // Try multiple strategies to look up enum value
//       try {
//         keyToPress = (Key as any)[keyName] ?? null;
//         if (!keyToPress && data.key) {
//           keyToPress = (Key as any)[data.key] ?? null;
//         }
//       } catch (e) {
//         keyToPress = null;
//       }

//       // ✅ Special case for Escape key
//       if (data.key === 'Escape' || data.code === 'Escape') {
//         await keyboard.pressKey(Key.Escape);
//         await keyboard.releaseKey(Key.Escape);
//         return;
//       }

//       if (keyToPress) {
//         if (modifiers.length > 0) {
//           for (const m of modifiers) await keyboard.pressKey(m);
//           await keyboard.pressKey(keyToPress);
//           await keyboard.releaseKey(keyToPress);
//           for (const m of reversedModifiers) await keyboard.releaseKey(m);
//         } else {
//           await keyboard.pressKey(keyToPress);
//           await keyboard.releaseKey(keyToPress);
//         }
//       } else {
//         // if we couldn't map to a Key, fall back to typing the key string (if present)
//         if (data.key) {
//           if (modifiers.length > 0) {
//             for (const m of modifiers) await keyboard.pressKey(m);
//             await keyboard.type(data.key);
//             for (const m of reversedModifiers) await keyboard.releaseKey(m);
//           } else {
//             await keyboard.type(data.key);
//           }
//         } else {
//           console.warn('Unknown key to press and no fallback text:', data);
//         }
//       }
//     } catch (error) {
//       console.error('handleKey error:', error);
//     }
//   }

//   // Info window
//   closeInfoWindow() {
//     try {
//       this.infoWindow?.close();
//     } catch {}
//   }

//   showInfoWindow() {
//     if (!this.electronService.isElectron) {
//       window.open('http://localhost:4200/#/info-window', '_blank');
//       return;
//     }

//     const appPath = this.electronService.remote.app.getAppPath();

//     try {
//       const BrowserWindow = this.electronService.remote.BrowserWindow;
//       this.infoWindow = new BrowserWindow({
//         height: 50,
//         width: 50,
//         x: 0,
//         y: 100,
//         resizable: false,
//         show: false,
//         frame: false,
//         transparent: true,
//         backgroundColor: '#252a33',
//         webPreferences: {
//           webSecurity: false,
//           nodeIntegration: true,
//           allowRunningInsecureContent: true,
//           contextIsolation: false,
//           enableRemoteModule: true,
//         } as any,
//       });

//       this.electronService.remote
//         .require('@electron/remote/main')
//         .enable(this.infoWindow.webContents);

//       this.infoWindow.setAlwaysOnTop(true, 'status');

//       if (AppConfig.production) {
//         const url = this.electronService.path.join(appPath, 'dist/index.html');
//         this.infoWindow.loadURL(`file://${url}#/info-window`);
//       } else {
//         this.infoWindow.loadURL('http://localhost:4200/#/info-window');
//       }

//       this.infoWindow.show();
//     } catch (error) {
//       console.error('Error opening info window', error);
//     }
//   }
// }
