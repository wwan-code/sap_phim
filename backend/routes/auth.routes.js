import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js'; // Import verifyToken for logout

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/social-login', authController.socialLogin);
router.post('/logout', verifyToken, authController.logout); // Logout requires authentication

export default router;
