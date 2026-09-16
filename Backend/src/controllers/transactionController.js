import pool from '../db/database.js';
import { processTransaction } from '../services/transactionService.js';
import {categorizeMerchant} from '../services/categorizationService.js';

async function importTransaction(req, res) {

    try {

        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                error: "Message is required"
            });
        }

        // Parse SMS
        const transaction = processTransaction(message);

        // Categorize
        transaction.category =
            categorizeMerchant(transaction.merchant);

        // Save
        const result = await pool.query(
            `
            INSERT INTO transactions
            (
                raw_message,
                provider,
                instrument_type,
                account_last4,
                transaction_type,
                channel,
                amount,
                currency,
                merchant,
                transaction_date,
                reference_id,
                reference_type,
                category,
                parser_confidence,
                transaction_fingerprint
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
            `,
            [
                transaction.rawMessage,
                transaction.provider,
                transaction.instrumentType,
                transaction.accountLast4,
                transaction.transactionType,
                transaction.channel,
                transaction.amount,
                transaction.currency,
                transaction.merchant,
                transaction.transactionDate,
                transaction.referenceId,
                transaction.referenceType,
                transaction.category,
                transaction.parserConfidence,
                transaction.transactionFingerprint
            ]
        );

        res.status(201).json({
            success: true,
            transaction: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Failed to import transaction"
        });
    }
}

async function getTransactions(req, res) {

    try {

        const result = await pool.query(
            `
            SELECT *
            FROM transactions
            ORDER BY created_at DESC
            `
        );

        res.json(result.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Failed to fetch transactions"
        });
    }
}
export { importTransaction, getTransactions };