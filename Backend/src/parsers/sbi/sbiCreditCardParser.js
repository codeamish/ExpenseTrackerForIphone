import { bankTransaction, transactionText, unsupportedMessage, MONEY, DATE, parseBankDate } from '../common/bankTransaction.js';

export function parseSbiCreditCardMessage(message) {
    const text = transactionText(message);
    const match = text.match(new RegExp(String.raw`^Rs\.?\s*${MONEY}\s+spent on your SBI Credit Card ending with (\d{4}) at (.+?) on ${DATE}(?: via (UPI))?\s*\(Ref No\.\s*([A-Za-z0-9]+)\)`, 'i'));
    if (!match) throw unsupportedMessage();
    const [, amount, accountLast4, merchant, date, upi, referenceId] = match;
    return bankTransaction(message, {
        provider: 'SBI', instrumentType: 'CREDIT_CARD', transactionType: 'EXPENSE',
        amount, accountLast4, merchant, transactionDate: parseBankDate(date),
        channel: upi ? 'UPI' : 'CARD', referenceId, referenceType: upi ? 'UPI' : 'TRANSACTION',
    });
}
