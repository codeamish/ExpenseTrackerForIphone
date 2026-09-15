function parseTransaction(message) {
     const transaction = {
        rawMessage: message,
        amount: null,
        merchant: null,
        category: null,
        transactionType: null,
        referenceId: null
    };
 // -----------------------
    // Extract amount
    // -----------------------

    const amountMatch = message.match(
        /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/
    );

    if (amountMatch) {
        transaction.amount = parseFloat(
            amountMatch[1].replace(/,/g, "")
        );
    }

    // -----------------------
    // Detect transaction type
    // -----------------------

    const lowerMessage = message.toLowerCase();

    if (
        lowerMessage.includes("debited") ||
        lowerMessage.includes("debit") ||
        lowerMessage.includes("spent")
    ) {
        transaction.transactionType = "EXPENSE";
    }

    if (
        lowerMessage.includes("credited") ||
        lowerMessage.includes("credit")
    ) {
        transaction.transactionType = "INCOME";
    }

    // -----------------------
    // Very basic merchant detection
    // -----------------------

    const merchantMatch = message.match(
        /(?:to|at)\s+([A-Za-z0-9 &.-]+)/i
    );

    if (merchantMatch) {
        transaction.merchant = merchantMatch[1].trim();
    }

    return transaction;
}

export { parseTransaction };