import { detectProvider } from "../classifiers/providerClassifier.js";
import { getParser } from "../parsers/parserRegistry.js";
import { generateTransactionFingerprint } from "../utils/transactionFingerprint.js";
import { unsupportedMessage, transactionText } from '../parsers/common/bankTransaction.js';

export function processTransaction(message) {
    // Step 1: Normalize the SMS
    const normalizedMessage = transactionText(message);

    // Step 2: Figure out which provider sent the SMS
    const provider = detectProvider(normalizedMessage);

    // Step 3: Get the appropriate parser
    const parser = getParser(provider);

    if (!parser) {
        throw unsupportedMessage();
    }

    // Step 4: Parse the SMS using the provider-specific parser
    const transaction = parser(normalizedMessage);
    if (!Number.isFinite(transaction.amount) || transaction.amount <= 0) throw unsupportedMessage();
    transaction.rawMessage = message;

    transaction.transactionFingerprint =
        generateTransactionFingerprint(transaction);

    return transaction;
}
