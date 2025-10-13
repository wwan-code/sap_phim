import api from './api';

const BASE_URL = '/countries';

const createCountry = async (countryData) => {
  const response = await api.post(BASE_URL, countryData);
  return response;
};

const getAllCountries = async () => {
  try {
    const response = await api.get(`${BASE_URL}/all`);
    return response.data;
  } catch (err) {
    throw err;
  }
};

const getCountries = async (params) => {
  try {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  } catch (err) {
    throw err;
  }
};

const getCountryById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

const updateCountry = async (id, countryData) => {
  const response = await api.put(`${BASE_URL}/${id}`, countryData);
  return response;
};

const deleteCountry = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response;
};

const countryService = {
  createCountry,
  getAllCountries,
  getCountries,
  getCountryById,
  updateCountry,
  deleteCountry,
};

export default countryService;
