export async function saveTransaction(db, transaction) {
    const result = await db.query(`
        INSERT INTO transactions (
            raw_message, provider, instrument_type, account_last4, transaction_type,
            channel, amount, currency, merchant, transaction_date, reference_id,
            reference_type, category, parser_confidence, transaction_fingerprint
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (transaction_fingerprint) DO NOTHING
        RETURNING *
    `, [
        transaction.rawMessage, transaction.provider, transaction.instrumentType,
        transaction.accountLast4, transaction.transactionType, transaction.channel,
        transaction.amount, transaction.currency, transaction.merchant,
        transaction.transactionDate, transaction.referenceId, transaction.referenceType,
        transaction.category, transaction.parserConfidence, transaction.transactionFingerprint,
    ]);
    if (result.rows.length) return { duplicate: false, transaction: result.rows[0] };
    // A fresh READ COMMITTED snapshot sees the concurrent winner after it commits.
    const existing = await db.query(
        'SELECT * FROM transactions WHERE transaction_fingerprint = $1',
        [transaction.transactionFingerprint],
    );
    if (!existing.rows.length) throw new Error('Conflicting transaction no longer exists; retry import');
    return { duplicate: true, transaction: existing.rows[0] };
}
