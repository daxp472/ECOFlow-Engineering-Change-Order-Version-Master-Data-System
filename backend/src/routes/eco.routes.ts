import express from 'express';
import {
  createECO,
  getAllECOs,
  getECOById,
  updateECO,
  submitECO,
  reviewECO,
  applyECO,
} from '../controllers/eco.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('ENGINEERING', 'ADMIN'), createECO);
router.get('/', getAllECOs);
router.get('/:id', getECOById);
router.put('/:id', authorize('ENGINEERING', 'ADMIN'), updateECO);
router.post('/:id/submit', authorize('ENGINEERING', 'ADMIN'), submitECO);
router.post('/:id/review', authorize('APPROVER', 'ADMIN'), reviewECO);
router.post('/:id/apply', authorize('ADMIN'), applyECO);

export default router;
