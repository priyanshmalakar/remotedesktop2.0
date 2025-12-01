import { Injectable } from '@angular/core';
import { get, set } from './storage.service';
import { encrypt, decrypt } from './storage.service';

@Injectable({
    providedIn: 'root',
})
export class SettingsService {
    settings = {
        hiddenAccess: false,
        randomId: true,
        passwordHash: '',
    };

    language: { text: string; code: string } = {
        text: 'English',
        code: 'en',
    };

    constructor() {}

    // -----------------------------------------
    // LOAD SETTINGS
    // -----------------------------------------
    async load() {
        console.log('[SETTINGS] Loading settings...');
        const settings: any = await get('settings');

        if (settings) {
            Object.assign(this.settings, settings);
            console.log('[SETTINGS] Loaded:', this.settings);
        } else {
            console.log('[SETTINGS] No saved settings, using defaults');
        }
    }

    // -----------------------------------------
    // SAVE GENERAL SETTINGS
    // -----------------------------------------
    async saveSettings(settings) {
        console.log('[SETTINGS] Saving settings:', settings);
        Object.assign(this.settings, settings);
        await set('settings', this.settings);
        console.log('[SETTINGS] Settings saved successfully');
    }
}



// import { Injectable } from '@angular/core';
// import { get, set } from './storage.service';

// @Injectable({
//     providedIn: 'root',
// })
// export class SettingsService {
//     settings = {
//         hiddenAccess: false,
//         randomId: false,
//         passwordHash: '',
//         rememberedPassword: '', // ✅ added for remember password
//     };

//     language: { text: string; code: string } = {
//         text: 'English',
//         code: 'en',
//     };

//     constructor() {}

//     async load() {
//         console.log('[SETTINGS] Loading settings...');
//         const settings: any = await get('settings');
//         if (settings) {
//             Object.assign(this.settings, settings);
//             console.log('[SETTINGS] Loaded:', this.settings);
//         } else {
//             console.log('[SETTINGS] No saved settings, using defaults');
//         }
//     }

//     async saveSettings(settings) {
//         console.log('[SETTINGS] Saving settings:', settings);
//         Object.assign(this.settings, settings);
//         await set('settings', this.settings);
//         console.log('[SETTINGS] Settings saved successfully');
//     }

//     // ✅ Save remembered password (hashed)
//     async rememberPassword(pw: string) {
//         try {
//             const hash = await window['bcryptjs'].hash(pw, 5);
//             this.settings.rememberedPassword = hash;
//             await set('settings', this.settings);
//             console.log('[SETTINGS] Password remembered');
//         } catch (err) {
//             console.error('Error remembering password', err);
//         }
//     }

//     // ✅ Get remembered password hash
//     async getRememberedPassword() {
//         return this.settings.rememberedPassword || null;
//     }
// }
