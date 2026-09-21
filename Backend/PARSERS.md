# Supported SMS templates

Run `npm test` from `Backend`. The production import endpoint uses `processTransaction` and the parser registry; the older `transactionParser.js` demo is not used by that endpoint.

| Template | Provider | Instrument | Transaction type | Channel |
| --- | --- | --- | --- | --- |
| SBI Credit Card: amount spent, ending with, merchant, date, reference | SBI | CREDIT_CARD | EXPENSE | UPI when stated, otherwise CARD |
| HDFC Bank Cardmember: online payment credited to card | HDFC | CREDIT_CARD | CARD_PAYMENT | ONLINE |
| HDFC: Sent amount / From bank account / To recipient / On date / Ref, with UPI wording | HDFC | BANK_ACCOUNT | EXPENSE | UPI |
| SBI Debit Card: purchase worth amount on POS at merchant, txn# | SBI | DEBIT_CARD | EXPENSE | POS |

The three user-supplied messages are regression fixtures. The HDFC card message is a repayment, not income or additional spending. The HDFC account message does not identify a debit card. Consumers must include only `EXPENSE` in spending totals and handle `CARD_PAYMENT` separately.

Support is template-based, not universal bank SMS coverage. HDFC credit-card purchases, actual HDFC debit-card purchases, SBI account transfers, ATM withdrawals, refunds, and other unrepresented formats remain unsupported. Add representative samples and assertions before enabling them. Unsupported or malformed messages return HTTP 422 without a database insert; missing/non-string input returns HTTP 400.

## SBI source

The SBI debit purchase template was located in the Ministry of Home Affairs *Citizen Manual: Report Other Cyber Crime*, screenshot on PDF page 83 (printed page 83), hosted by CSIR-NAL:

https://www.nal.res.in/sites/default/files/inline-files/2MHA-CitizenManualReportOtherCyberCrime-v10%20%282%29.pdf

This is an older publicly documented example, not a guarantee of SBI's current templates. Tests substitute fictional card, merchant, POS, and reference values. This message has no transaction date; the parser returns null and lowers confidence.

## Storage conventions

- Original SMS formatting is retained in `rawMessage`; only matching uses normalized whitespace.
- Provider values are bank names (`SBI`, `HDFC`); registry keys distinguish parser families.
- Amounts are positive INR values, constrained to the schema's NUMERIC(12,2) range.
- Day-first numeric dates and abbreviated English month dates are supported. Two-digit years mean 2000–2099. Date-only messages use midnight Asia/Kolkata (UTC+05:30); this is a storage convention, not an observed transaction time. Show these dates in that timezone.
- For HDFC repayments, the posting date after `On` is used, not the subsequent value date.
- References are opaque strings; alphanumeric case and leading zeroes are preserved. Reference types describe the template (`UPI`, `PAYMENT`, `TRANSACTION`), not independently verified bank identifiers.
- Confidence is a completeness heuristic, not a calibrated probability.
- Debit parser filenames/functions use `DebitCard` and registry keys use `SBI_DEBIT_CARD` / `HDFC_DEBIT_CARD`. The HDFC account-transfer sample still produces `BANK_ACCOUNT`.

## Duplicate prevention

Run `npm run migrate:fingerprints` from `Backend` before starting the updated API. It backfills existing rows with deterministic fingerprints, makes the column NOT NULL, and adds a unique index. Dates use ISO UTC and amounts use two decimal places, avoiding timezone or database-number formatting changes. Run this migration with imports paused so an older API instance cannot keep writing the old hash format.

The migration is transactional and locks the transaction table while it runs. If duplicate rows exist, it reports their ID pairs and rolls back without deleting anything. After reviewing those IDs, `node scripts/migrate-fingerprints.js --archive-duplicates` keeps the lowest ID in each group and preserves every other complete row in `transaction_duplicate_archive` before removing it from the active list. Add `--archive-ids=6,7` to restrict execution to an exact reviewed set; changed IDs abort the migration. Archival, backfill, and index creation commit together or all roll back. The migration can be rerun.

Imports use `ON CONFLICT (transaction_fingerprint) DO NOTHING`, then read the existing row on conflict. New imports return HTTP 201 with `duplicate: false`; repeats return HTTP 200 with `duplicate: true` and the existing transaction. Original messages, timestamps, and manually edited categories are not overwritten. The unique index also protects simultaneous requests.

Fingerprints retain the existing identity fields: bank, instrument, last four digits, transaction type, channel, amount, currency, merchant, date, reference. Identical values mean one transaction. Alerts without a reference or precise time can be ambiguous; two real purchases with identical extracted fields cannot be distinguished by this rule. This does not deduplicate different bank notifications for opposite sides of a transfer.

`npm test` runs unit/API-response tests without database writes. For the PostgreSQL concurrency and migration test, set `RUN_DB_TESTS=1` and run `node --test src/db/fingerprint.integration.test.js`. It creates and cleans up an isolated test schema; it does not change application transactions.
