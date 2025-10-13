import express from 'express';
import countryController from '../controllers/country.controller.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/')
  .post(verifyToken, authorizeRoles('admin', 'editor'), countryController.createCountry)
  .get(countryController.getCountries);

router.get('/all', countryController.getAllCountries);

router.route('/:id')
  .get(countryController.getCountryById)
  .put(verifyToken, authorizeRoles('admin', 'editor'), countryController.updateCountry)
  .delete(verifyToken, authorizeRoles('admin'), countryController.deleteCountry);

export default router;
