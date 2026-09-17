import {extractAmount} from './amountExtractor.js';
console.log(extractAmount("Rs.60.40 spent..."));
console.log(extractAmount("You've spent INR 400.00..."));
