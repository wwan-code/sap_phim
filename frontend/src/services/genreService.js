import api from './api';

const BASE_URL = '/genres';

const createGenre = async (genreData) => {
  const response = await api.post(BASE_URL, genreData);
  return response.data; // Standardized response
};

const getAllGenres = async () => {
  const response = await api.get(`${BASE_URL}/all`);
  return response.data; // Assuming backend /genres/all already returns { success, data, message }
};

const getGenres = async (params) => {
  const response = await api.get(BASE_URL, { params });
  return response.data; // Standardized response
};

const getGenreById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data; // Standardized response
};

const updateGenre = async (id, genreData) => {
  const response = await api.put(`${BASE_URL}/${id}`, genreData);
  return response.data; // Standardized response
};

const deleteGenre = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data; // Standardized response
};

const genreService = {
  createGenre,
  getAllGenres,
  getGenres,
  getGenreById,
  updateGenre,
  deleteGenre,
};

export default genreService;
