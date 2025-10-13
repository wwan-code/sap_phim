import countryService from '../services/country.service.js';

const createCountry = async (req, res, next) => {
  try {
    const country = await countryService.createCountry(req.body);
    res.status(201).json(country);
  } catch (error) {
    next(error);
  }
};

const getAllCountries = async (req, res, next) => {
  try {
    const countries = await countryService.getAllCountries();
    res.status(200).json({
      success: true,
      data: countries,
      message: 'Lấy tất cả quốc gia thành công.',
    });
  } catch (error) {
    next(error);
  }
};

const getCountries = async (req, res, next) => {
  try {
    const countries = await countryService.getCountries(req.query);
    res.status(200).json({
      success: true,
      data: countries.data,
      meta: countries.meta,
      message: 'Lấy quốc gia thành công.',
    });
  } catch (error) {
    next(error);
  }
};

const getCountryById = async (req, res, next) => {
  try {
    const country = await countryService.getCountryById(req.params.id);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.status(200).json(country);
  } catch (error) {
    next(error);
  }
};

const updateCountry = async (req, res, next) => {
  try {
    const country = await countryService.updateCountry(req.params.id, req.body);
    res.status(200).json(country);
  } catch (error) {
    next(error);
  }
};

const deleteCountry = async (req, res, next) => {
  try {
    const result = await countryService.deleteCountry(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export default {
  createCountry,
  getCountries,
  getAllCountries,
  getCountryById,
  updateCountry,
  deleteCountry,
};
