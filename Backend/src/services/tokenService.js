import { createHash, randomBytes } from 'node:crypto';

export function createToken() {
    return randomBytes(32).toString('base64url');
}

export function hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
}

export function bearerToken(header) {
    if (typeof header !== 'string') return null;
    const match = header.match(/^Bearer ([A-Za-z0-9_-]{43})$/);
    return match?.[1] ?? null;
}
