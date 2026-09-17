import {extractReference} from './referenceExtractor.js';
console.log(extractReference("Ref No. ABC123"));
console.log(extractReference("Ref# ABC123"));
console.log(extractReference("Ref ABC123"));
