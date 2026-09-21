import test from 'node:test';
import assert from 'node:assert/strict';
import { createImportTransaction } from './transactionController.js';

const message = 'Rs.60.00 spent on your SBI Credit Card ending with 1609 at SHOP on 09-09-26 via UPI (Ref No. 123456).';
function response() {
    return { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

test('new import returns 201 and duplicate false', async () => {
    const db = { async query(sql, values) {
        assert.match(sql, /ON CONFLICT \(transaction_fingerprint\) DO NOTHING/);
        assert.match(values[14], /^[a-f0-9]{64}$/);
        return { rows: [{ id: '7', raw_message: message }] };
    } };
    const res = response();
    await createImportTransaction(db)({ body: { message } }, res);
    assert.equal(res.code, 201);
    assert.equal(res.body.duplicate, false);
    assert.equal(res.body.transaction.id, '7');
});

test('duplicate returns 200 with existing transaction without overwriting it', async () => {
    let calls = 0;
    const original = { id: '7', category: 'User edited', raw_message: 'Original SMS' };
    const db = { async query(sql) {
        calls++;
        if (calls === 1) return { rows: [] };
        assert.match(sql, /^SELECT/);
        return { rows: [original] };
    } };
    const res = response();
    await createImportTransaction(db)({ body: { message } }, res);
    assert.equal(res.code, 200);
    assert.deepEqual(res.body, { success: true, duplicate: true, transaction: original });
    assert.equal(calls, 2);
});

test('invalid requests never reach the database', async () => {
    const db = { query() { assert.fail('Unexpected database call'); } };
    for (const [body, code] of [[{}, 400], [{ message: 123 }, 400], [{ message: 'OTP for SBI Credit Card' }, 422]]) {
        const res = response();
        await createImportTransaction(db)({ body }, res);
        assert.equal(res.code, code);
    }
});
