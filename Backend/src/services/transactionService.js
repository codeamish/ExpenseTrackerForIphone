import { normalizeMessage } from "../parsers/common/normalizeMessage.js";
import { detectProvider } from "../classifiers/providerClassifier.js";
import { getParser } from "../parsers/parserRegistry.js";
import { generateTransactionFingerprint } from "../utils/transactionFingerprint.js";

export function processTransaction(message) {
    // Step 1: Normalize the SMS
    const normalizedMessage = normalizeMessage(message);

    // Step 2: Figure out which provider sent the SMS
    const provider = detectProvider(normalizedMessage);

    // Step 3: Get the appropriate parser
    const parser = getParser(provider);

    if (!parser) {
        throw new Error(
            `No parser found for provider: ${provider}`
        );
    }

    // Step 4: Parse the SMS using the provider-specific parser
    const transaction = parser(normalizedMessage);

    transaction.transactionFingerprint =
        generateTransactionFingerprint(transaction);

    return transaction;
}