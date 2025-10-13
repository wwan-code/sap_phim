import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { addFavorite, removeFavorite, listFavorites, checkFavorite } from '../controllers/favorite.controller.js';

const router = Router();

router.post('/favorites/:movieId', verifyToken, addFavorite);
router.delete('/favorites/:movieId', verifyToken, removeFavorite);
router.get('/favorites', verifyToken, listFavorites);
router.get('/favorites/:movieId/check', verifyToken, checkFavorite);

export default router;


