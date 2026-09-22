import express from 'express';
import { createAuthController } from '../controllers/authController.js';
import { requireUser } from '../middleware/authenticate.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = express.Router();
const controller = createAuthController();
const authLimit = rateLimit({ limit: 10 });

router.post('/signup', authLimit, controller.signup);
router.post('/login', authLimit, controller.login);
router.get('/me', requireUser(), controller.me);
router.post('/logout', requireUser(), controller.logout);
router.post('/import-token', requireUser(), controller.rotateImportToken);

export { router as authRoutes };
