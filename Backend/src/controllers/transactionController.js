import pool from '../db/database.js';
import {parseTransaction} from "../services/transactionParser.js";
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
        const transaction = parseTransaction(message);

        // Categorize
        transaction.category =
            categorizeMerchant(transaction.merchant);

        // Save
        const result = await pool.query(
            `
            INSERT INTO transactions
            (
                raw_message,
                amount,
                merchant,
                category,
                transaction_type
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            `,
            [
                transaction.rawMessage,
                transaction.amount,
                transaction.merchant,
                transaction.category,
                transaction.transactionType
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