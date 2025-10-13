import express from 'express';
import genreController from '../controllers/genre.controller.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/')
  .post(verifyToken, authorizeRoles('admin', 'editor'), genreController.createGenre)
  .get(genreController.getGenres);

router.get('/all', genreController.getAllGenres);

router.route('/:id')
  .get(genreController.getGenreById)
  .put(verifyToken, authorizeRoles('admin', 'editor'), genreController.updateGenre)
  .delete(verifyToken, authorizeRoles('admin'), genreController.deleteGenre);

export default router;
