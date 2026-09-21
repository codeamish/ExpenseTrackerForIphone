import pool from '../src/db/database.js';
import { migrateFingerprints } from '../src/db/migrateFingerprints.js';

let client;
try {
    client = await pool.connect();
    const approvedIds = process.argv.find(arg => arg.startsWith('--archive-ids='))?.split('=')[1].split(',');
    const result = await migrateFingerprints(client, {
        archiveDuplicates: process.argv.includes('--archive-duplicates'), approvedDuplicateIds: approvedIds,
    });
    console.log(`Fingerprint uniqueness enabled; ${result.backfilled} existing rows backfilled; ${result.archived} duplicates archived.`);
} catch (error) {
    console.error(error.code === 'EXISTING_DUPLICATES'
        ? `${error.message} Duplicate ID pairs: ${JSON.stringify(error.duplicateIds)}`
        : `Fingerprint migration failed (${error.code ?? error.name}). No migration changes committed.`);
    process.exitCode = 1;
} finally {
    client?.release();
    await pool.end();
}
