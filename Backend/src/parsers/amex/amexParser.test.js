import { parseAmexMessage } from "./amexParser.js";

const message =
    "Alert: You've spent INR 400.00 on your AMEX card <> at <> on 5 September 2026 at 02:15 PM IST. Call 18004190691 if this was not made by you.";

const result = parseAmexMessage(message);

console.log(result);