import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pool from './database.js';
import { migrateFingerprints } from './migrateFingerprints.js';
import { saveTransaction } from '../models/transactionModel.js';
import { processTransaction } from '../services/transactionService.js';

test('PostgreSQL migration, concurrent imports, retries and rollback', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
    const schema = 'fingerprint_test_' + randomUUID().replaceAll('-', '');
    const clients = [];
    let created = false;
    try {
        clients.push(await pool.connect());
        const first = clients[0];
        await first.query(`CREATE SCHEMA ${schema}`);
        created = true;
        await first.query(`SET search_path TO ${schema}`);
        await first.query(`CREATE TABLE transactions (
            id BIGSERIAL PRIMARY KEY, raw_message TEXT NOT NULL, provider VARCHAR(50) NOT NULL,
            instrument_type VARCHAR(30) NOT NULL, account_last4 VARCHAR(4), transaction_type VARCHAR(40) NOT NULL,
            channel VARCHAR(40), amount NUMERIC(12,2) NOT NULL, currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            merchant VARCHAR(255), transaction_date TIMESTAMPTZ, reference_id VARCHAR(255), reference_type VARCHAR(50),
            category VARCHAR(100), parser_confidence NUMERIC(5,4), created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            transaction_fingerprint VARCHAR(128))`);
        // Existing rows with null fingerprints are backfilled; duplicates abort without deletion.
        await first.query(`INSERT INTO transactions (raw_message,provider,instrument_type,transaction_type,amount)
            VALUES ('legacy','AMEX','CREDIT_CARD','EXPENSE',50), ('legacy','AMEX','CREDIT_CARD','EXPENSE',50)`);
        await assert.rejects(migrateFingerprints(first), { code: 'EXISTING_DUPLICATES' });
        assert.equal((await first.query('SELECT count(*) FROM transactions WHERE transaction_fingerprint IS NULL')).rows[0].count, '2');
        await assert.rejects(migrateFingerprints(first, { archiveDuplicates: true, approvedDuplicateIds: ['999'] }), /Duplicate IDs changed/);
        assert.deepEqual(await migrateFingerprints(first, { archiveDuplicates: true, approvedDuplicateIds: ['2'] }), { backfilled: 1, archived: 1 });
        const archived = (await first.query('SELECT * FROM transaction_duplicate_archive')).rows[0];
        assert.equal(archived.original_id, '2');
        assert.equal(archived.kept_transaction_id, '1');
        assert.equal(archived.original_row.raw_message, 'legacy');
        assert.equal(archived.original_row.transaction_fingerprint, null);
        const hash = (await first.query('SELECT transaction_fingerprint FROM transactions')).rows[0].transaction_fingerprint;
        assert.match(hash, /^[a-f0-9]{64}$/);
        await migrateFingerprints(first); // Safe to run again.
        const message = 'Rs.60.00 spent on your SBI Credit Card ending with 1609 at SHOP on 09-09-26 via UPI (Ref No. 123456).';
        const transaction = processTransaction(message);
        clients.push(await pool.connect());
        await clients[1].query(`SET search_path TO ${schema}`);
        await first.query('ALTER TABLE transactions ADD COLUMN user_id TEXT');
        await first.query('DROP INDEX transactions_fingerprint_unique');
        await first.query('CREATE UNIQUE INDEX transactions_user_fingerprint_unique ON transactions (user_id, transaction_fingerprint) WHERE user_id IS NOT NULL');
        const results = await Promise.all(clients.map(client => saveTransaction(client, 'user-1', transaction)));
        assert.equal(results.filter(result => !result.duplicate).length, 1);
        assert.equal(results[0].transaction.id, results[1].transaction.id);
        const retry = await saveTransaction(first, 'user-1', { ...transaction, category: 'Should not overwrite' });
        assert.equal(retry.duplicate, true);
        assert.equal(retry.transaction.category, null);
        const different = processTransaction(message.replace('123456', '654321'));
        assert.equal((await saveTransaction(first, 'user-1', different)).duplicate, false);
        assert.equal((await saveTransaction(first, 'user-2', transaction)).duplicate, false);
        assert.equal((await first.query('SELECT count(*) FROM transactions')).rows[0].count, '4');
        await assert.rejects(first.query(`INSERT INTO transactions (raw_message,provider,instrument_type,transaction_type,amount)
            VALUES ('invalid','SBI','CREDIT_CARD','EXPENSE',60)`), { code: '23502' });
    } finally {
        if (created) await clients[0].query(`DROP SCHEMA ${schema} CASCADE`);
        for (const client of clients) { await client.query('RESET search_path'); client.release(); }
        await pool.end();
    }
});
