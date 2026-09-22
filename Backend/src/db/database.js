import {Pool} from "pg";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
const pool = new Pool({
    connectionTimeoutMillis: 5000,
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

export default pool;
