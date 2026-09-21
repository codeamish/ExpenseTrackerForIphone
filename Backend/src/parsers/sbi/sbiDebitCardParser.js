import { bankTransaction, transactionText, unsupportedMessage, MONEY } from '../common/bankTransaction.js';

export function parseSbiDebitCardMessage(message) {
    const text = transactionText(message);
    const match = text.match(new RegExp(String.raw`^Thank you for using your SBI Debit Card [\dX*]*?(\d{4}) for a purchase worth Rs\.?\s*${MONEY}\s+on POS\s+[A-Za-z0-9]+\s+at\s+(.+?)\s+txn#\s*([A-Za-z0-9]+)(?=[.\s]|$)`, 'i'));
    if (!match) throw unsupportedMessage();
    const [, accountLast4, amount, merchant, referenceId] = match;
    return bankTransaction(message, {
        provider: 'SBI', instrumentType: 'DEBIT_CARD', transactionType: 'EXPENSE', channel: 'POS',
        accountLast4, amount, merchant, referenceId, referenceType: 'TRANSACTION',
    });
}
