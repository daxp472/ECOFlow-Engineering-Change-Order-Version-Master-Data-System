import express from 'express';
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  archiveProduct,
  createProductVersion,
} from '../controllers/product.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('ADMIN', 'ENGINEERING'), createProduct);
router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.put('/:id', authorize('ADMIN', 'ENGINEERING'), updateProduct);
router.patch('/:id/archive', authorize('ADMIN'), archiveProduct);
router.post('/:id/versions', authorize('ADMIN', 'ENGINEERING'), createProductVersion);

export default router;
