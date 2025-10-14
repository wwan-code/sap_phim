import express from 'express';
import { getAnalytics, getTrendingMovies } from '../controllers/dashboard.controller.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/analytics').get(verifyToken, authorizeRoles('admin'), getAnalytics);
router.route('/trending-movies/:period').get(verifyToken, authorizeRoles('admin'), getTrendingMovies);

export default router;
