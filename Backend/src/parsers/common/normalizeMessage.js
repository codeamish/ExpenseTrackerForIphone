export function normalizeMessage(message) {
      return message
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\s+/g, " ")
        .trim();
}