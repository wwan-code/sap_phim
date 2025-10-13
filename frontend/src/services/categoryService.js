import api from './api';

const BASE_URL = '/categories';

const createCategory = async (categoryData) => {
  const response = await api.post(BASE_URL, categoryData);
  return response;
};

const getAllCategories = async () => {
  try {
    const response = await api.get(`${BASE_URL}/all`);
    return response.data;
  } catch (err) {
    throw err;
  }
};

const getCategories = async (params) => {
  try {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  } catch (err) {
    throw err;
  }
};

const getCategoryById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

const updateCategory = async (id, categoryData) => {
  const response = await api.put(`${BASE_URL}/${id}`, categoryData);
  return response;
};

const deleteCategory = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response;
};

const categoryService = {
  createCategory,
  getAllCategories,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};

export default categoryService;
