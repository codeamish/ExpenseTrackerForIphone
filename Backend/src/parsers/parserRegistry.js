import { parseAmexMessage } from "./amex/amexParser.js";

const parserRegistry = {
    AMEX: parseAmexMessage
};

export function getParser(provider) {
    return parserRegistry[provider] ?? null;
}