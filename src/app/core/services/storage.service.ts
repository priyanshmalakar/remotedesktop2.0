// import { Preferences } from '@capacitor/preferences';
// import { AppConfig } from '../../../environments/environment';

// export async function set(key: string, value: any): Promise<void> {
//     await Preferences.set({
//         key: `${AppConfig.appName}-${key}`,
//         value: JSON.stringify(value),
//     });
// }

// export async function get(key: string): Promise<any> {
//     let item = await Preferences.get({ key: `${AppConfig.appName}-${key}` });
//     try {
//         item = JSON.parse(item.value);
//         return item;
//     } catch (error) {
//         return item;
//     }
// }

// export async function remove(key: string): Promise<void> {
//     await Preferences.remove({
//         key: `${AppConfig.appName}-${key}`,
//     });
// }





import { Preferences } from '@capacitor/preferences';
import { AppConfig } from '../../../environments/environment';
import * as crypto from 'crypto';

// -----------------------------------------
// 🔐 Encryption Config
// IMPORTANT: Key must be 32 chars
// -----------------------------------------
const SECRET_KEY = crypto
    .createHash('sha256')
    .update('your-very-strong-secret-key')
    .digest(); // 32-byte key automatically created

// -----------------------------------------
// 🔒 ENCRYPT FUNCTION
// -----------------------------------------
export function encrypt(text: string): string {
    const iv = crypto.randomBytes(16); // initialization vector
    const cipher = crypto.createCipheriv('aes-256-cbc', SECRET_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // return iv + encrypted text
    return iv.toString('hex') + ':' + encrypted;
}

// -----------------------------------------
// 🔓 DECRYPT FUNCTION
// -----------------------------------------
export function decrypt(text: string): string {
    if (!text) return '';

    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = parts.join(':');

    const decipher = crypto.createDecipheriv('aes-256-cbc', SECRET_KEY, iv);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

// -----------------------------------------
// 🗄 ORIGINAL STORAGE FUNCTIONS
// -----------------------------------------
export async function set(key: string, value: any): Promise<void> {
    await Preferences.set({
        key: `${AppConfig.appName}-${key}`,
        value: JSON.stringify(value),
    });
}

export async function get(key: string): Promise<any> {
    let item = await Preferences.get({ key: `${AppConfig.appName}-${key}` });
    try {
        item = JSON.parse(item.value);
        return item;
    } catch (error) {
        return item;
    }
}

export async function remove(key: string): Promise<void> {
    await Preferences.remove({
        key: `${AppConfig.appName}-${key}`,
    });
}
