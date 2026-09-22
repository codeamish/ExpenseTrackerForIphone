import pool from '../db/database.js';
import { findImportTokenUser, findSessionUser } from '../models/authModel.js';
import { bearerToken } from '../services/tokenService.js';

export function requireUser({ allowImportToken = false, db = pool } = {}) {
    return async function authenticate(req, res, next) {
        const token = bearerToken(req.get('authorization'));
        if (!token) return res.status(401).json({ error: 'Authentication required' });
        try {
            const user = await findSessionUser(db, token) || (allowImportToken ? await findImportTokenUser(db, token) : null);
            if (!user) return res.status(401).json({ error: 'Invalid or expired credentials' });
            req.user = user;
            return next();
        } catch (error) {
            return next(error);
        }
    };
}
