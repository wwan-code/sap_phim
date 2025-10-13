import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { saveProgress, getHistory, deleteOne, deleteAll } from '../controllers/watchHistory.controller.js';

const router = express.Router();

router.post('/', verifyToken, saveProgress);
router.get('/', verifyToken, getHistory);
router.delete('/:id', verifyToken, deleteOne);
router.delete('/', verifyToken, deleteAll);

export default router;


