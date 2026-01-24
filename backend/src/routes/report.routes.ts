import express from 'express';
import { getAuditLogs, getECOStats } from '../controllers/report.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = express.Router();

router.use(authenticate);

router.get('/audit-logs', authorize('ADMIN'), getAuditLogs);
router.get('/eco-stats', getECOStats);

export default router;
