export async function migrateBase(client) {
    await client.query(`CREATE TABLE IF NOT EXISTS transactions (
        id BIGSERIAL PRIMARY KEY,
        raw_message TEXT NOT NULL,
        provider VARCHAR(50) NOT NULL,
        instrument_type VARCHAR(30) NOT NULL,
        account_last4 VARCHAR(4),
        transaction_type VARCHAR(40) NOT NULL,
        channel VARCHAR(40),
        amount NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'INR',
        merchant VARCHAR(255),
        transaction_date TIMESTAMPTZ,
        reference_id VARCHAR(255),
        reference_type VARCHAR(50),
        category VARCHAR(100),
        parser_confidence NUMERIC(5, 4),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        transaction_fingerprint VARCHAR(128)
    )`);
}
