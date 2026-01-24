import express from 'express';
import {
  createBOM,
  getAllBOMs,
  getBOMById,
  updateBOM,
  addComponent,
  addOperation,
} from '../controllers/bom.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('ADMIN', 'ENGINEERING'), createBOM);
router.get('/', getAllBOMs);
router.get('/:id', getBOMById);
router.put('/:id', authorize('ADMIN', 'ENGINEERING'), updateBOM);
router.post('/:id/components', authorize('ADMIN', 'ENGINEERING'), addComponent);
router.post('/:id/operations', authorize('ADMIN', 'ENGINEERING'), addOperation);

export default router;
