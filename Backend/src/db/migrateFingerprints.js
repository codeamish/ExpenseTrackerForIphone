import { generateTransactionFingerprint } from '../utils/transactionFingerprint.js';

export async function migrateFingerprints(client, { archiveDuplicates = false, approvedDuplicateIds } = {}) {
    await client.query('BEGIN');
    try {
        await client.query("SET LOCAL lock_timeout = '5s'");
        await client.query('LOCK TABLE transactions IN ACCESS EXCLUSIVE MODE');
        await client.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_fingerprint VARCHAR(128)');
        const { rows } = await client.query('SELECT * FROM transactions ORDER BY id');
        const fingerprints = new Map();
        const updates = [];
        const duplicates = [];
        for (const row of rows) {
            const fingerprint = generateTransactionFingerprint({
                provider: row.provider, instrumentType: row.instrument_type,
                accountLast4: row.account_last4, transactionType: row.transaction_type,
                channel: row.channel, amount: row.amount, currency: row.currency,
                merchant: row.merchant, transactionDate: row.transaction_date,
                referenceId: row.reference_id,
            });
            if (fingerprints.has(fingerprint)) duplicates.push([fingerprints.get(fingerprint), row.id]);
            else fingerprints.set(fingerprint, row.id);
            updates.push([fingerprint, row.id]);
        }
        if (duplicates.length && !archiveDuplicates) {
            const error = new Error('Existing duplicate transactions need review; migration rolled back.');
            error.code = 'EXISTING_DUPLICATES';
            error.duplicateIds = duplicates;
            throw error;
        }
        const archivedIds = new Set(duplicates.map(([, id]) => id));
        if (approvedDuplicateIds && (archivedIds.size !== approvedDuplicateIds.length ||
            approvedDuplicateIds.some(id => !archivedIds.has(id)))) {
            throw new Error('Duplicate IDs changed since review; no changes committed.');
        }
        if (archivedIds.size) {
            // Explicit opt-in only. Preserve the complete original row before
            // removing it from the active list, in the same atomic transaction.
            await client.query(`CREATE TABLE IF NOT EXISTS transaction_duplicate_archive (
                original_id BIGINT PRIMARY KEY,
                kept_transaction_id BIGINT NOT NULL,
                original_row JSONB NOT NULL,
                archived_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )`);
            for (const [keptId, duplicateId] of duplicates) {
                await client.query(`INSERT INTO transaction_duplicate_archive
                    (original_id, kept_transaction_id, original_row)
                    SELECT id, $1, to_jsonb(t) FROM transactions t WHERE id = $2`, [keptId, duplicateId]);
                await client.query('DELETE FROM transactions WHERE id = $1', [duplicateId]);
            }
        }
        for (const values of updates) {
            if (archivedIds.has(values[1])) continue;
            await client.query('UPDATE transactions SET transaction_fingerprint = $1 WHERE id = $2', values);
        }
        await client.query('ALTER TABLE transactions ALTER COLUMN transaction_fingerprint SET NOT NULL');
        const ownership = await client.query(`SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'transactions' AND column_name = 'user_id'`);
        if (ownership.rows.length) {
            await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_fingerprint_unique
                ON transactions (user_id, transaction_fingerprint) WHERE user_id IS NOT NULL`);
        } else {
            await client.query('CREATE UNIQUE INDEX IF NOT EXISTS transactions_fingerprint_unique ON transactions (transaction_fingerprint)');
        }
        await client.query('COMMIT');
        return { backfilled: updates.length - archivedIds.size, archived: archivedIds.size };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
}
