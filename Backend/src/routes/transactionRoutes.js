import express from 'express';
import {importTransaction, getTransactions} from '../controllers/transactionController.js';
import { requireUser } from '../middleware/authenticate.js';
const router = express.Router();
router.post('/import', requireUser({ allowImportToken: true }), importTransaction);
router.get('/', requireUser(), getTransactions);

export { router as transactionRoutes };
