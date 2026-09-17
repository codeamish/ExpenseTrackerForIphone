export function extractAmount(message) {
    const patterns = [
        /(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i
    ];

    for (const pattern of patterns) {
        const match = message.match(pattern);

        if (match) {
            return Number(
                match[1].replace(/,/g, "")
            );
        }
    }

    return null;
}