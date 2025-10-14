import express from 'express';
import * as settingController from '../controllers/setting.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Privacy Settings Routes
router.get('/privacy', verifyToken, settingController.getPrivacySettings);
router.put('/privacy', verifyToken, settingController.updatePrivacySettings);

// Notification Settings Routes
router.get('/notifications', verifyToken, settingController.getNotificationSettings);
router.put('/notifications', verifyToken, settingController.updateNotificationSettings);

// Account Management Routes
router.get('/info', verifyToken, settingController.getAccountInfo);
router.post('/download-data', verifyToken, settingController.downloadUserData);
router.delete('/delete', verifyToken, settingController.deleteAccount);
router.get('/login-history', verifyToken, settingController.getLoginHistory);

export default router;
