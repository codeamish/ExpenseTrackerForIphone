import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password) {
    const salt = randomBytes(16);
    const derived = await scrypt(password, salt, KEY_LENGTH, OPTIONS);
    return `scrypt$${OPTIONS.N}$${OPTIONS.r}$${OPTIONS.p}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export async function verifyPassword(password, encoded) {
    try {
        const [algorithm, n, r, p, salt, expected] = encoded.split('$');
        if (algorithm !== 'scrypt' || !salt || !expected) return false;
        const expectedBuffer = Buffer.from(expected, 'base64');
        const actual = await scrypt(password, Buffer.from(salt, 'base64'), expectedBuffer.length,
            { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
        return expectedBuffer.length === actual.length && timingSafeEqual(expectedBuffer, actual);
    } catch {
        return false;
    }
}
