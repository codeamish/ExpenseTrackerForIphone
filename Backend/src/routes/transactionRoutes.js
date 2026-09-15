import express from 'express';
import {importTransaction, getTransactions} from '../controllers/transactionController.js';
const router = express.Router();
router.post('/import', importTransaction);
router.get('/', getTransactions);

export { router as transactionRoutes };