import pool from '../src/db/database.js';
import { migrateAuth } from '../src/db/migrateAuth.js';

let client;
try {
    client = await pool.connect();
    const result = await migrateAuth(client);
    console.log(`Authentication schema ready. ${result.unownedTransactions} existing transaction(s) remain hidden until assigned.`);
} catch (error) {
    console.error(`Authentication migration failed (${error.code ?? error.name}). No migration changes committed.`);
    process.exitCode = 1;
} finally {
    client?.release();
    await pool.end();
}
