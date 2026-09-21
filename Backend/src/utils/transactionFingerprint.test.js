import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTransactionFingerprint as fingerprint } from './transactionFingerprint.js';

const transaction = { provider: 'SBI', instrumentType: 'CREDIT_CARD', accountLast4: '1609',
    transactionType: 'EXPENSE', channel: 'UPI', amount: 60, currency: 'INR', merchant: 'SHOP',
    transactionDate: new Date('2026-09-09T00:00:00+05:30'), referenceId: '123456' };

test('fingerprint canonicalizes database amounts and dates across timezones', () => {
    const originalTimezone = process.env.TZ;
    try {
        process.env.TZ = 'UTC';
        const first = fingerprint(transaction);
        process.env.TZ = 'Asia/Kolkata';
        assert.equal(fingerprint(transaction), first);
        assert.equal(fingerprint({ ...transaction, amount: '60.00', transactionDate: '2026-09-08T18:30:00Z' }), first);
        assert.equal(fingerprint({ ...transaction, rawMessage: 'different whitespace', category: 'Edited' }), first);
    } finally {
        if (originalTimezone === undefined) delete process.env.TZ;
        else process.env.TZ = originalTimezone;
    }
});

test('different references, accounts and dates remain separate', () => {
    for (const change of [{ referenceId: '123457' }, { accountLast4: '1111' }, { transactionDate: '2026-09-10T00:00:00Z' }]) {
        assert.notEqual(fingerprint({ ...transaction, ...change }), fingerprint(transaction));
    }
});

test('pipe characters cannot shift fingerprint field boundaries', () => {
    assert.notEqual(fingerprint({ ...transaction, currency: 'INR|SHOP', merchant: 'A' }),
        fingerprint({ ...transaction, currency: 'INR', merchant: 'SHOP|A' }));
});
