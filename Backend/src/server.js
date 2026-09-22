import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { authRoutes } from './routes/authRoutes.js';
import { transactionRoutes } from './routes/transactionRoutes.js';
import pool from './db/database.js';

function allowedOrigins() {
    const configured = process.env.CORS_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean);
    return configured?.length ? configured : ['http://localhost:8081', 'http://localhost:8082', 'http://localhost:19006'];
}

export function createApp() {
    const app = express();
    if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
    app.disable('x-powered-by');
    app.use((req, res, next) => {
        res.set({
            'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
            'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
        });
        next();
    });
    const origins = allowedOrigins();
    app.use(cors({
        origin: (origin, callback) => callback(null, !origin || origins.includes(origin)),
        methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Authorization', 'Content-Type'], maxAge: 86400,
    }));
    app.use(express.json({ limit: '32kb', type: 'application/json' }));
    app.get('/', (req, res) => res.json({ message: 'Expense Tracker API is running' }));
    app.get('/health', async (req, res) => {
        try {
            await pool.query('SELECT 1');
            res.json({ status: 'ok' });
        } catch {
            res.status(503).json({ status: 'unavailable' });
        }
    });
    app.use('/api/auth', authRoutes);
    app.use('/api/transactions', transactionRoutes);
    app.use((req, res) => res.status(404).json({ error: 'Not found' }));
    app.use((error, req, res, next) => {
        console.error(error);
        if (res.headersSent) return next(error);
        return res.status(error.type === 'entity.too.large' ? 413 : 500).json({ error: 'Internal server error' });
    });
    return app;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const port = Number(process.env.PORT) || 5000;
    createApp().listen(port, () => console.log(`Server is running on port ${port}`));
}
