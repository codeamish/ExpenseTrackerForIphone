import crypto from "node:crypto";

export function generateTransactionFingerprint(transaction) {
    // ISO dates are independent of server timezone; JSON preserves field boundaries.
    const fingerprintData = JSON.stringify([
        transaction.provider,
        transaction.instrumentType,
        transaction.accountLast4,
        transaction.transactionType,
        transaction.channel,
        Number(transaction.amount).toFixed(2),
        transaction.currency,
        transaction.merchant,
        transaction.transactionDate ? new Date(transaction.transactionDate).toISOString() : null,
        transaction.referenceId
    ]
        .map(value => value ?? "")
    );

    return crypto
        .createHash("sha256")
        .update(fingerprintData)
        .digest("hex");
}
