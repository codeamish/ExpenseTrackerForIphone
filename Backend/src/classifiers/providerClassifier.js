export function detectProvider(message) {
    const text = message.toLowerCase();

    if (
        text.includes("amex card") ||
        text.includes("american express")
    ) {
        return "AMEX";
    }

    if (text.includes("sbi credit card")) {
        return "SBI_CREDIT_CARD";
    }

    if (text.includes("hdfc bank cardmember")) {
        return "HDFC_CREDIT_CARD";
    }

    if (text.includes("hdfc bank a/c")) {
        return "HDFC_DEBIT_CARD";
    }

    if (
        /\bsbi debit card\b/.test(text)
    ) {
        return "SBI_DEBIT_CARD";
    }

    return "UNKNOWN";
}
