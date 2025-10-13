import express from 'express';
import categoryController from '../controllers/category.controller.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/')
  .post(verifyToken, authorizeRoles('admin', 'editor'), categoryController.createCategory)
  .get(categoryController.getCategories);

router.get('/all', categoryController.getAllCategories);

router.route('/:id')
  .get(categoryController.getCategoryById)
  .put(verifyToken, authorizeRoles('admin', 'editor'), categoryController.updateCategory)
  .delete(verifyToken, authorizeRoles('admin'), categoryController.deleteCategory);

export default router;
