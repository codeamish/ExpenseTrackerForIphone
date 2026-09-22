import pool from '../db/database.js';
import { createSession, createUser, deleteSession, findUserByEmail, rotateImportToken } from '../models/authModel.js';
import { hashPassword, verifyPassword } from '../services/passwordService.js';
import { bearerToken } from '../services/tokenService.js';

const normalizeEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const validEmail = value => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validPassword = value => typeof value === 'string' && value.length >= 12 && value.length <= 128;
const publicUser = user => ({ id: user.id, email: user.email, createdAt: user.created_at });

export function createAuthController(db = pool) {
    return {
        signup: async (req, res, next) => {
            const email = normalizeEmail(req.body?.email);
            const password = req.body?.password;
            if (!validEmail(email) || !validPassword(password)) {
                return res.status(400).json({ error: 'Use a valid email and a password between 12 and 128 characters.' });
            }
            let client;
            try {
                client = typeof db.connect === 'function' && typeof db.release !== 'function' ? await db.connect() : db;
                await client.query('BEGIN');
                const passwordHash = await hashPassword(password);
                const user = await createUser(client, email, passwordHash);
                const session = await createSession(client, user.id);
                const importToken = await rotateImportToken(client, user.id);
                await client.query('COMMIT');
                res.set('Cache-Control', 'no-store');
                return res.status(201).json({ user: publicUser(user), ...session, importToken });
            } catch (error) {
                if (client) await client.query('ROLLBACK').catch(() => {});
                if (error.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
                return next(error);
            } finally {
                if (client !== db) client?.release();
            }
        },
        login: async (req, res, next) => {
            const email = normalizeEmail(req.body?.email);
            const password = req.body?.password;
            if (!validEmail(email) || typeof password !== 'string') return res.status(401).json({ error: 'Invalid email or password.' });
            try {
                const user = await findUserByEmail(db, email);
                // Always perform a password derivation to reduce account-enumeration timing differences.
                const fallback = 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
                const valid = await verifyPassword(password, user?.password_hash ?? fallback);
                if (!user || !valid) return res.status(401).json({ error: 'Invalid email or password.' });
                const session = await createSession(db, user.id);
                res.set('Cache-Control', 'no-store');
                return res.json({ user: publicUser(user), ...session });
            } catch (error) {
                return next(error);
            }
        },
        logout: async (req, res, next) => {
            try {
                await deleteSession(db, bearerToken(req.get('authorization')));
                return res.status(204).end();
            } catch (error) {
                return next(error);
            }
        },
        me: (req, res) => {
            res.set('Cache-Control', 'no-store');
            return res.json({ user: publicUser(req.user) });
        },
        rotateImportToken: async (req, res, next) => {
            try {
                const importToken = await rotateImportToken(db, req.user.id);
                res.set('Cache-Control', 'no-store');
                return res.json({ importToken });
            } catch (error) {
                return next(error);
            }
        },
    };
}
