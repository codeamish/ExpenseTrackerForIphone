import { bankTransaction, transactionText, unsupportedMessage, MONEY, DATE, parseBankDate } from '../common/bankTransaction.js';

export function parseHdfcDebitCardMessage(message) {
    const text = transactionText(message);
    const match = text.match(new RegExp(String.raw`^Sent Rs\.?\s*${MONEY}\s+From HDFC Bank A/C\s*[*X]+(\d{4})\s+To (.+?) On ${DATE}\s+Ref\s+([A-Za-z0-9]+)(?=\s|$)`, 'i'));
    if (!match) throw unsupportedMessage();
    const [, amount, accountLast4, merchant, date, referenceId] = match;
    // The supplied alert identifies an account transfer, not a debit card.
    if (!/\bUPI\b/i.test(text)) throw unsupportedMessage();
    return bankTransaction(message, {
        provider: 'HDFC', instrumentType: 'BANK_ACCOUNT', transactionType: 'EXPENSE', channel: 'UPI',
        amount, accountLast4, merchant, transactionDate: parseBankDate(date), referenceId, referenceType: 'UPI',
    });
}
