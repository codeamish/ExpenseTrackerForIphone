export async function migrateAuth(client) {
    await client.query('BEGIN');
    try {
        await client.query("SET LOCAL lock_timeout = '5s'");
        await client.query(`CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE, password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, CHECK (email = lower(email)))`);
        await client.query(`CREATE TABLE IF NOT EXISTS user_sessions (
            token_hash CHAR(64) PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
        await client.query('CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions (user_id)');
        await client.query('CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions (expires_at)');
        await client.query(`CREATE TABLE IF NOT EXISTS user_import_tokens (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            token_hash CHAR(64) NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
        await client.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE');
        await client.query('DROP INDEX IF EXISTS transactions_fingerprint_unique');
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_fingerprint_unique
            ON transactions (user_id, transaction_fingerprint) WHERE user_id IS NOT NULL`);
        const result = await client.query('SELECT count(*) AS count FROM transactions WHERE user_id IS NULL');
        await client.query('COMMIT');
        return { unownedTransactions: Number(result.rows[0].count) };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
}
