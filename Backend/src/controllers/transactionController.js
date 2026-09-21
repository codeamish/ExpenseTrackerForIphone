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
            const saved = await saveTransaction(db, transaction);
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

async function getTransactions(req, res) {
    try {
        const result = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
}

export { importTransaction, getTransactions };
