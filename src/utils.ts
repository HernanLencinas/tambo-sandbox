import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as os from 'os';
import * as fs from 'fs';
import * as url from 'url';

// file deepcode ignore HardcodedSecret: <please specify a reason of ignoring this>, file deepcode ignore HardcodedNonCryptoSecret: <please specify a reason of ignoring this>
const secretKey = 'MY1SUPER2KEY3ENCRYPTED4PUBLIC376';
let statusBarItem: vscode.StatusBarItem | undefined;

export function encrypt(text: string | undefined) {

    if (text === undefined) {
        throw new Error('Text to encrypt is undefined');
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(secretKey), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();
    const result = iv.toString('hex') + encrypted + tag.toString('hex');

    return result;

}

export function decrypt(text: string | undefined): string {

    if (text === undefined) {
        throw new Error('Text to decrypt is undefined');
    }

    const iv = Buffer.from(text.slice(0, 24), 'hex');
    const encryptedText = text.slice(24, -32);
    const tag = Buffer.from(text.slice(-32), 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(secretKey), iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;

}

export function showStatusMessage(message: string) {

    if (!statusBarItem) {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    }

    statusBarItem.text = `🚀 TAMBO-SANDBOX: ${message}`;
    statusBarItem.show();

}

export function generateRandom(length: number): string {

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(0, charactersLength);
        result += characters.charAt(randomIndex);
    }

    return result;

}
