import {parseTransaction} from "./services/transactionParser.js";

const message =
    "TEST_EXPENSE Paid Rs.450 to Swiggy using UPI.";

const result = parseTransaction(message);

console.log(result);