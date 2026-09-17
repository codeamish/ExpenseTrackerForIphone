export function extractReference(message) {
    const patterns = [
        /Ref(?:erence)?\s*(?:No\.?|#)?\s*([A-Za-z0-9]+)/i,
        /Refno\s*([A-Za-z0-9]+)/i
    ];

    for (const pattern of patterns) {
        const match = message.match(pattern);

        if (match) {
            return match[1];
        }
    }

    return null;
}