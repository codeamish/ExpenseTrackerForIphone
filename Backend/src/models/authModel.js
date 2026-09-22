import { randomUUID } from 'node:crypto';
import { createToken, hashToken } from '../services/tokenService.js';

export async function createUser(db, email, passwordHash) {
    const result = await db.query(
        'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, created_at',
        [randomUUID(), email, passwordHash],
    );
    return result.rows[0];
}

export async function findUserByEmail(db, email) {
    return (await db.query('SELECT id, email, password_hash, created_at FROM users WHERE email = $1', [email])).rows[0] ?? null;
}

export async function createSession(db, userId, { days = 30 } = {}) {
    const token = createToken();
    await db.query('DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP');
    const result = await db.query(`INSERT INTO user_sessions (token_hash, user_id, expires_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 * INTERVAL '1 day')) RETURNING expires_at`,
        [hashToken(token), userId, days]);
    return { token, expiresAt: result.rows[0].expires_at };
}

export async function findSessionUser(db, token) {
    const result = await db.query(`SELECT u.id, u.email, u.created_at
        FROM user_sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP`, [hashToken(token)]);
    return result.rows[0] ?? null;
}

export async function deleteSession(db, token) {
    await db.query('DELETE FROM user_sessions WHERE token_hash = $1', [hashToken(token)]);
}

export async function rotateImportToken(db, userId) {
    const token = createToken();
    await db.query(`INSERT INTO user_import_tokens (user_id, token_hash)
        VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE
        SET token_hash = EXCLUDED.token_hash, created_at = CURRENT_TIMESTAMP`, [userId, hashToken(token)]);
    return token;
}

export async function findImportTokenUser(db, token) {
    const result = await db.query(`SELECT u.id, u.email, u.created_at
        FROM user_import_tokens t JOIN users u ON u.id = t.user_id WHERE t.token_hash = $1`, [hashToken(token)]);
    return result.rows[0] ?? null;
}
