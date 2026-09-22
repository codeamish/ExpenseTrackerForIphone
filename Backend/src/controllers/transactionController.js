import pool from '../db/database.js';
import { processTransaction } from '../services/transactionService.js';
import { categorizeMerchant } from '../services/categorizationService.js';
import { saveTransaction } from '../models/transactionModel.js';

export function createImportTransaction(db) {
    return async function importTransaction(req, res) {
        try {
            const { message } = req.body ?? {};
            if (typeof message !== 'string' || !message.trim()) {
                return res.status(400).json({ error: 'Message is required' });
            }
            const transaction = processTransaction(message);
            transaction.category = categorizeMerchant(transaction.merchant);
            const saved = await saveTransaction(db, req.user.id, transaction);
            return res.status(saved.duplicate ? 200 : 201).json({ success: true, ...saved });
        } catch (error) {
            if (error.code === 'UNSUPPORTED_MESSAGE') {
                return res.status(422).json({ error: error.message });
            }
            console.error(error);
            return res.status(500).json({ error: 'Failed to import transaction' });
        }
    };
}

const importTransaction = createImportTransaction(pool);

export function createGetTransactions(db) {
    return async function getTransactions(req, res, next) {
    try {
        const result = await db.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.set('Cache-Control', 'no-store');
        return res.json(result.rows);
    } catch (error) {
        return next(error);
    }
    };
}

const getTransactions = createGetTransactions(pool);

export { importTransaction, getTransactions };
