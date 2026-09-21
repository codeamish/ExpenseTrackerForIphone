import { normalizeMessage } from './normalizeMessage.js';

export function unsupportedMessage() {
    const error = new Error('Unsupported or invalid transaction message');
    error.code = 'UNSUPPORTED_MESSAGE';
    return error;
}

export function transactionText(message) {
    if (typeof message !== 'string' || !message.trim()) throw unsupportedMessage();
    const text = normalizeMessage(message);
    if (/\b(?:OTP|one.time password|declined|failed|unsuccessful|reversed|reversal|refund|attempted)\b/i.test(text)) throw unsupportedMessage();
    return text;
}

export const MONEY = String.raw`((?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3}|\d+)(?:\.\d{1,2})?)`;
export const DATE = String.raw`(\d{1,2}[-/](?:\d{1,2}|[A-Za-z]{3})[-/]\d{2}(?:\d{2})?)`;

// Indian day-first dates. Date-only alerts are represented as midnight IST.
export function parseBankDate(value) {
    if (!value) return null;
    const [dayText, monthText, yearText] = value.split(/[-/]/);
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const day = Number(dayText);
    const month = /^\d+$/.test(monthText) ? Number(monthText) : months.indexOf(monthText.toLowerCase()) + 1;
    const year = Number(yearText) + (yearText.length === 2 ? 2000 : 0);
    const utc = new Date(Date.UTC(year, month - 1, day));
    if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) throw unsupportedMessage();
    return new Date(utc.getTime() - 330 * 60_000);
}

export function bankTransaction(rawMessage, fields) {
    const amount = Number(fields.amount.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99) throw unsupportedMessage();
    const transaction = {
        rawMessage, currency: 'INR', merchant: null, transactionDate: null,
        referenceId: null, referenceType: null, ...fields, amount,
    };
    transaction.parserConfidence = Number((0.5 + (transaction.accountLast4 ? 0.15 : 0) +
        (transaction.merchant || transaction.transactionType === 'CARD_PAYMENT' ? 0.15 : 0) +
        (transaction.transactionDate ? 0.15 : 0) + (transaction.referenceId ? 0.05 : 0)).toFixed(4));
    return transaction;
}
