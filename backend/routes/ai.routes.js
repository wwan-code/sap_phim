import express from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/query', verifyToken, aiController.chatWithAI);
router.post('/recommend', verifyToken, aiController.recommendMovies);
router.post('/translate', verifyToken, aiController.translateText);

router.post('/admin/suggest', verifyToken, authorizeRoles('admin'), aiController.suggestMovieData);
router.post('/admin/marketing', verifyToken, authorizeRoles('admin'), aiController.generateMarketingContent);
router.post('/admin/translate', verifyToken, authorizeRoles('admin'), aiController.translateDescription);
router.post('/admin/seo', verifyToken, authorizeRoles('admin'), aiController.generateSEOContent);
router.post('/admin/classify-comment', verifyToken, authorizeRoles('admin'), aiController.classifyComment);
router.get('/admin/analytics', verifyToken, authorizeRoles('admin'), aiController.getAIAnalytics);

export default router;
