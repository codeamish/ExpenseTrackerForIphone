import { bankTransaction, transactionText, unsupportedMessage, MONEY, DATE, parseBankDate } from '../common/bankTransaction.js';

export function parseHdfcCreditCardMessage(message) {
    const text = transactionText(message);
    const match = text.match(new RegExp(String.raw`^HDFC Bank Cardmember,\s*Online Payment of Rs\.?\s*${MONEY}\s+vide Ref#\s*([A-Za-z0-9]+) was credited to your card ending (\d{4}) On ${DATE}(?=\s|_|$)`, 'i'));
    if (!match) throw unsupportedMessage();
    const [, amount, referenceId, accountLast4, date] = match;
    return bankTransaction(message, {
        provider: 'HDFC', instrumentType: 'CREDIT_CARD', transactionType: 'CARD_PAYMENT',
        channel: 'ONLINE', amount, referenceId, referenceType: 'PAYMENT', accountLast4,
        transactionDate: parseBankDate(date),
    });
}
