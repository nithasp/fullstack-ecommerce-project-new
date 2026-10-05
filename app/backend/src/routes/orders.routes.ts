import { Router } from 'express';
import * as orders from '../controllers/orders.controller';
import { verifyAuthToken } from '../middleware/auth';

const router = Router();

router.use(verifyAuthToken);

router.get('/', orders.index);
router.get('/:id', orders.show);
router.get('/:id/products', orders.lines);

export default router;
