import { parseAmexMessage } from "./amex/amexParser.js";
import { parseSbiCreditCardMessage } from './sbi/sbiCreditCardParser.js';
import { parseSbiDebitCardMessage } from './sbi/sbiDebitCardParser.js';
import { parseHdfcCreditCardMessage } from './hdfc/hdfcCreditCardParser.js';
import { parseHdfcDebitCardMessage } from './hdfc/hdfcDebitCardParser.js';

const parserRegistry = {
    AMEX: parseAmexMessage,
    SBI_CREDIT_CARD: parseSbiCreditCardMessage,
    SBI_DEBIT_CARD: parseSbiDebitCardMessage,
    HDFC_CREDIT_CARD: parseHdfcCreditCardMessage,
    HDFC_DEBIT_CARD: parseHdfcDebitCardMessage,
};

export function getParser(provider) {
    return parserRegistry[provider] ?? null;
}
