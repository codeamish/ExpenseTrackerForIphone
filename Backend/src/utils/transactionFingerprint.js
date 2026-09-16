import crypto from "node:crypto";

export function generateTransactionFingerprint(transaction) {
    const fingerprintData = [
        transaction.provider,
        transaction.instrumentType,
        transaction.accountLast4,
        transaction.transactionType,
        transaction.channel,
        transaction.amount,
        transaction.currency,
        transaction.merchant,
        transaction.transactionDate,
        transaction.referenceId
    ]
        .map(value => value ?? "")
        .join("|");

    return crypto
        .createHash("sha256")
        .update(fingerprintData)
        .digest("hex");
}