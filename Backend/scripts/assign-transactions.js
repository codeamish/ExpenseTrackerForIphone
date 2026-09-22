import pool from '../src/db/database.js';

const email = process.argv.find(value => value.startsWith('--email='))?.slice(8).trim().toLowerCase();
if (!email) {
    console.error('Usage: node scripts/assign-transactions.js --email=you@example.com');
    process.exit(1);
}
let client;
try {
    client = await pool.connect();
    await client.query('BEGIN');
    const users = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!users.rows.length) throw new Error('No user exists with that email. Sign up first.');
    const result = await client.query('UPDATE transactions SET user_id = $1 WHERE user_id IS NULL RETURNING id', [users.rows[0].id]);
    await client.query('COMMIT');
    console.log(`Assigned ${result.rowCount} existing transaction(s) to ${email}.`);
} catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error(error.message);
    process.exitCode = 1;
} finally {
    client?.release();
    await pool.end();
}
