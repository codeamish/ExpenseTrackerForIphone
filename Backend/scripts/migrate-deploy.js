import pool from '../src/db/database.js';
import { migrateBase } from '../src/db/migrateBase.js';
import { migrateFingerprints } from '../src/db/migrateFingerprints.js';
import { migrateAuth } from '../src/db/migrateAuth.js';

let client;
try {
    client = await pool.connect();
    await migrateBase(client);
    const fingerprints = await migrateFingerprints(client);
    const auth = await migrateAuth(client);
    console.log(`Database ready: ${fingerprints.backfilled} fingerprint(s) backfilled; ${auth.unownedTransactions} unowned transaction(s).`);
} catch (error) {
    console.error(`Deployment migration failed (${error.code ?? error.name}).`);
    process.exitCode = 1;
} finally {
    client?.release();
    await pool.end();
}
