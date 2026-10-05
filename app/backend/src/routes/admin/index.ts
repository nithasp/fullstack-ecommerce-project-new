import { Router } from 'express';
import * as logs from '../../controllers/admin/logs.controller';
import { requireAdmin, verifyAuthToken } from '../../middleware/auth';
import addressRoutes from './addresses.routes';
import { cartItemRoutes, cartRoutes } from './carts.routes';
import orderRoutes from './orders.routes';
import productRoutes from './products.routes';
import userRoutes from './users.routes';

const router = Router();

router.use(verifyAuthToken, requireAdmin);

router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/carts', cartRoutes);
router.use('/cart-items', cartItemRoutes);
router.use('/addresses', addressRoutes);

router.get('/audit-logs', logs.auditLogs);
router.get('/page-views', logs.pageViews);

export default router;
