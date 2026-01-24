import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import {
  getAllStages,
  getStageById,
  createStage,
  updateStage,
  deleteStage,
  getNextStage,
} from '../controllers/settings.controller';

const router = Router();

router.use(authenticate);

// Stage configuration endpoints (Admin only)
router.get('/stages', getAllStages);
router.get('/stages/:id', getStageById);
router.post('/stages', authorize('ADMIN'), createStage);
router.put('/stages/:id', authorize('ADMIN'), updateStage);
router.delete('/stages/:id', authorize('ADMIN'), deleteStage);
router.get('/stages/next/:currentSequence', getNextStage);

export default router;
