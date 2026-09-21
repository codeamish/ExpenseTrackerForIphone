import test from 'node:test';
import assert from 'node:assert/strict';
import { processTransaction } from '../services/transactionService.js';
import { detectProvider } from '../classifiers/providerClassifier.js';
import { parseBankDate } from './common/bankTransaction.js';

const sbiCredit = 'Rs.60.00 spent on your SBI Credit Card ending with 1609 at PRINCEKUMAR on 09-09-26 via UPI (Ref No. 661865485831). Trxn. not done by you? Report at https://sbicard.com/Dispute';
const hdfcCredit = 'HDFC Bank Cardmember, Online Payment of Rs.495 vide Ref# 240172009NkmsVf was credited to your card ending 4310 On 28/AUG/2026_value Date 28/AUG/2026';
const hdfcDebit = 'Sent Rs.358.00\nFrom HDFC Bank A/C *1211\nTo Septathlon Services Priva\nOn 27/06/26\nRef 654480917379\nNot You?\nCall 18002586161/SMS BLOCK UPI to 7308080808';
// Synthetic values following the SBI purchase template in the MHA manual.
const sbiDebit = 'Thank you for using your SBI Debit Card 459XXX1234 for a purchase worth Rs1000 on POS 00001234 at EXAMPLE STORE IN txn# 123456789012.';

for (const [label, message, expected] of [
    ['SBI credit purchase', sbiCredit, { provider: 'SBI', instrumentType: 'CREDIT_CARD', transactionType: 'EXPENSE', channel: 'UPI', amount: 60, accountLast4: '1609', merchant: 'PRINCEKUMAR', referenceId: '661865485831', referenceType: 'UPI', transactionDate: '2026-09-08T18:30:00.000Z' }],
    ['HDFC card repayment', hdfcCredit, { provider: 'HDFC', instrumentType: 'CREDIT_CARD', transactionType: 'CARD_PAYMENT', channel: 'ONLINE', amount: 495, accountLast4: '4310', merchant: null, referenceId: '240172009NkmsVf', referenceType: 'PAYMENT', transactionDate: '2026-08-27T18:30:00.000Z' }],
    ['HDFC account UPI', hdfcDebit, { provider: 'HDFC', instrumentType: 'BANK_ACCOUNT', transactionType: 'EXPENSE', channel: 'UPI', amount: 358, accountLast4: '1211', merchant: 'Septathlon Services Priva', referenceId: '654480917379', referenceType: 'UPI', transactionDate: '2026-06-26T18:30:00.000Z' }],
    ['SBI debit purchase', sbiDebit, { provider: 'SBI', instrumentType: 'DEBIT_CARD', transactionType: 'EXPENSE', channel: 'POS', amount: 1000, accountLast4: '1234', merchant: 'EXAMPLE STORE IN', referenceId: '123456789012', referenceType: 'TRANSACTION', transactionDate: null }],
]) {
    test(label, () => {
        const result = processTransaction(message);
        for (const [key, value] of Object.entries(expected)) assert.equal(key === 'transactionDate' ? result[key]?.toISOString() ?? null : result[key], value, key);
        assert.equal(result.rawMessage, message);
        assert.equal(result.currency, 'INR');
        assert.match(result.transactionFingerprint, /^[a-f0-9]{64}$/);
        assert.ok(result.parserConfidence > 0 && result.parserConfidence <= 1);
    });
}

test('whitespace normalization preserves the original SMS and fingerprint', () => {
    const original = processTransaction(hdfcDebit);
    const spaced = processTransaction(hdfcDebit.replaceAll('\n', '\r\n  '));
    assert.equal(original.transactionFingerprint, spaced.transactionFingerprint);
    assert.notEqual(original.rawMessage, spaced.rawMessage);
});

test('amounts with Indian grouping and four-digit years', () => {
    const result = processTransaction(sbiCredit.replace('60.00', '1,23,456.78').replace('09-09-26', '09-09-2026'));
    assert.equal(result.amount, 123456.78);
    assert.equal(result.transactionDate.toISOString(), '2026-09-08T18:30:00.000Z');
});

test('posting date is used instead of the value date', () => {
    assert.equal(processTransaction(hdfcCredit.replace('_value Date 28/AUG/2026', '_value Date 27/AUG/2026')).transactionDate.toISOString(), '2026-08-27T18:30:00.000Z');
});

test('unsupported, failed, OTP and malformed messages never become transactions', () => {
    for (const message of [null, 123, {}, '', '  ', 'ICICI A/c XX1211 debited Rs.358',
        'OTP 123456 for SBI Credit Card transaction of Rs.60',
        'Your SBI Credit Card payment of Rs.60 is due tomorrow',
        sbiCredit.replace('spent', 'failed'), sbiCredit + ' Transaction reversed.',
        sbiCredit.replace('60.00', '0.00'), sbiCredit.replace('60.00', '60.001'),
        sbiCredit.replace('60.00', '12,34.00'), sbiCredit.replace('09-09-26', '31-02-26'),
        hdfcCredit.replace('credited', 'declined'), hdfcDebit.replace('Sent', 'Failed to send'),
        sbiDebit.replace('purchase worth', 'attempted purchase worth')]) {
        assert.throws(() => processTransaction(message), { code: 'UNSUPPORTED_MESSAGE' });
    }
    assert.equal(detectProvider('ICICI A/c XX1211 debited Rs.358'), 'UNKNOWN');
});

test('dates are validated, including leap years', () => {
    assert.equal(parseBankDate('29/02/24').toISOString(), '2024-02-28T18:30:00.000Z');
    for (const date of ['29/02/26', '00/01/26', '01/13/26', '01/XYZ/2026']) assert.throws(() => parseBankDate(date));
});

test('AMEX ingestion still works', () => {
    const result = processTransaction("Alert: You've spent INR 400.00 on your AMEX card **1234 at EXAMPLE STORE on 5 September 2026 at 02:15 PM IST.");
    assert.equal(result.provider, 'AMEX');
    assert.equal(result.amount, 400);
    assert.equal(result.accountLast4, '1234');
});
