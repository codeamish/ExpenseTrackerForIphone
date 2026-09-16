export function parseAmexMessage(message) {

    const transaction = {
        provider: "AMEX",
        instrumentType: "CREDIT_CARD",
        accountLast4: null,
        transactionType: "EXPENSE",
        channel: "CARD",
        amount: null,
        currency: "INR",
        merchant: null,
        transactionDate: null,
        referenceId: null,
        referenceType: null,
        rawMessage: message,
        parserConfidence: 0
    };

    const amountMatch = message.match(
        /spent\s+INR\s+([\d,]+(?:\.\d{1,2})?)/i
    );

    if (amountMatch) {
        transaction.amount = Number(
            amountMatch[1].replace(/,/g, "")
        );
    }

    const cardMatch = message.match(
        /on your AMEX card\s+[^0-9]*(\d+)\s+at\s+/i
    );

    if (cardMatch) {
        transaction.accountLast4 = cardMatch[1].slice(-4);
    }

    const merchantMatch = message.match(
        /\bat\s+(.+?)\s+on\s+\d{1,2}\s+[A-Za-z]+\s+\d{4}/i
    );

    if (merchantMatch) {
        transaction.merchant = merchantMatch[1].trim();
    }

    const dateMatch = message.match(
        /on\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s+(AM|PM)\s+IST/i
    );

    if (dateMatch) {
        const [
            ,
            day,
            month,
            year,
            hour,
            minute,
            meridiem
        ] = dateMatch;

        const date = new Date(
            `${day} ${month} ${year} ${hour}:${minute} ${meridiem} GMT+0530`
        );

        if (!Number.isNaN(date.getTime())) {
            transaction.transactionDate = date;
        }
    }
    transaction.parserConfidence = calculateConfidence(
        transaction
    );
    console.log("Parsed transaction:", transaction);

    return transaction;
}

function calculateConfidence(transaction) {

    let score = 0;

    if (transaction.amount !== null) score += 0.3;
    if (transaction.accountLast4 !== null) score += 0.2;
    if (transaction.merchant !== null) score += 0.2;
    if (transaction.transactionDate !== null) score += 0.3;

    return score;
}