import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pool from './database.js';
import { migrateAuth } from './migrateAuth.js';
import { createAuthController } from '../controllers/authController.js';
import { findImportTokenUser, findSessionUser } from '../models/authModel.js';
import { saveTransaction } from '../models/transactionModel.js';
import { processTransaction } from '../services/transactionService.js';
import { createGetTransactions } from '../controllers/transactionController.js';

function response() {
    return { headers: {}, set(name, value) { typeof name === 'string' ? this.headers[name] = value : Object.assign(this.headers, name); return this; },
        status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, end() { return this; } };
}
const next = error => { if (error) throw error; };

test('auth migration, signup, login tokens and user-isolated transactions', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
    const schema = 'auth_test_' + randomUUID().replaceAll('-', '');
    const client = await pool.connect();
    try {
        await client.query(`CREATE SCHEMA ${schema}`);
        await client.query(`SET search_path TO ${schema}`);
        await client.query(`CREATE TABLE transactions (
            id BIGSERIAL PRIMARY KEY, raw_message TEXT NOT NULL, provider VARCHAR(50) NOT NULL,
            instrument_type VARCHAR(30) NOT NULL, account_last4 VARCHAR(4), transaction_type VARCHAR(40) NOT NULL,
            channel VARCHAR(40), amount NUMERIC(12,2) NOT NULL, currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            merchant VARCHAR(255), transaction_date TIMESTAMPTZ, reference_id VARCHAR(255), reference_type VARCHAR(50),
            category VARCHAR(100), parser_confidence NUMERIC(5,4), created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            transaction_fingerprint VARCHAR(128) NOT NULL)`);
        await client.query(`CREATE UNIQUE INDEX transactions_fingerprint_unique ON transactions (transaction_fingerprint)`);
        await client.query(`INSERT INTO transactions (raw_message,provider,instrument_type,transaction_type,amount,transaction_fingerprint)
            VALUES ('legacy','AMEX','CREDIT_CARD','EXPENSE',50,repeat('a',64))`);
        assert.deepEqual(await migrateAuth(client), { unownedTransactions: 1 });
        assert.deepEqual(await migrateAuth(client), { unownedTransactions: 1 });
        const auth = createAuthController(client);
        const first = response();
        await auth.signup({ body: { email: ' One@Example.com ', password: 'correct horse battery staple' } }, first, next);
        assert.equal(first.code, 201);
        assert.equal(first.body.user.email, 'one@example.com');
        assert.equal((await findSessionUser(client, first.body.token)).id, first.body.user.id);
        assert.equal((await findImportTokenUser(client, first.body.importToken)).id, first.body.user.id);
        const second = response();
        await auth.signup({ body: { email: 'two@example.com', password: 'another secure password' } }, second, next);
        const duplicate = response();
        await auth.signup({ body: { email: 'ONE@example.com', password: 'another secure password' } }, duplicate, next);
        assert.equal(duplicate.code, 409);
        const login = response();
        await auth.login({ body: { email: 'one@example.com', password: 'correct horse battery staple' } }, login, next);
        assert.equal(login.body.user.id, first.body.user.id);
        const denied = response();
        await auth.login({ body: { email: 'one@example.com', password: 'incorrect password' } }, denied, next);
        assert.equal(denied.code, 401);
        const transaction = processTransaction('Rs.60.00 spent on your SBI Credit Card ending with 1609 at SHOP on 09-09-26 via UPI (Ref No. 123456).');
        assert.equal((await saveTransaction(client, first.body.user.id, transaction)).duplicate, false);
        assert.equal((await saveTransaction(client, second.body.user.id, transaction)).duplicate, false);
        const one = response();
        await createGetTransactions(client)({ user: { id: first.body.user.id } }, one, next);
        assert.equal(one.body.length, 1);
        assert.equal(one.body[0].user_id, first.body.user.id);
        assert.equal(one.body.some(row => row.raw_message === 'legacy'), false);
        const two = response();
        await createGetTransactions(client)({ user: { id: second.body.user.id } }, two, next);
        assert.equal(two.body.length, 1);
        assert.equal(two.body[0].user_id, second.body.user.id);
    } finally {
        await client.query(`DROP SCHEMA ${schema} CASCADE`);
        await client.query('RESET search_path');
        client.release();
        await pool.end();
    }
});
