import express from 'express';
import * as userController from '../controllers/user.controller.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { uploadImageUser } from '../middlewares/uploadImageUser.middleware.js';

const router = express.Router();

// Routes cho profile của người dùng hiện tại (cần authentication)
router.get('/me', verifyToken, userController.getProfile);
router.put('/me', verifyToken, userController.updateProfile);
router.post('/me/avatar', verifyToken, uploadImageUser.single('avatar'), userController.uploadAvatar);
router.post('/me/cover', verifyToken, uploadImageUser.single('cover'), userController.uploadCover);

// Public search endpoint
router.get('/search', userController.searchUsers);
router.get('/search/friends', verifyToken, userController.searchFriends);

// Routes cho profile của người dùng khác (public)
router.get('/:uuid', userController.getUserByUuid);
router.get('/:uuid/favorites', userController.getUserFavoritesByUuid);
router.get('/:uuid/watch-history', userController.getUserWatchHistoryByUuid);
router.get('/:uuid/friends', userController.getUserFriendsByUuid);


export default router;
