import api from './api';

const BASE_URL = '/ai';

async function classifyComment(commentText) {
  try {
    const response = await api.post(`${BASE_URL}/admin/classify-comment`, { commentText });
    return response.data;
  } catch (err) {
    throw err;
  }
}

async function chatWithAI(prompt) {
  try {
    const response = await api.post(`${BASE_URL}/query`, { prompt });
    return response.data;
  } catch (err) {
    throw err;
  }
}

async function suggestMovieData(movieInfo) {
  try {
    const response = await api.post(`${BASE_URL}/admin/suggest`, movieInfo);
    return response.data;
  } catch (err) {
    throw err;
  }
}

async function generateMarketingContent(movieInfo) {
  try {
    const response = await api.post(`${BASE_URL}/admin/marketing`, movieInfo);
    return response.data;
  } catch (err) {
    throw err;
  }
}

async function translateDescription(movieInfo) {
  try {
    const response = await api.post(`${BASE_URL}/admin/translate`, movieInfo);
    return response.data;
  } catch (err) {
    throw err;
  }
}

async function generateSEOContent(movieInfo) {
  try {
    const response = await api.post(`${BASE_URL}/admin/seo`, movieInfo);
    return response.data;
  } catch (err) {
    throw err;
  }
}

const aiService = {
  classifyComment,
  chatWithAI,
  suggestMovieData,
  generateMarketingContent,
  translateDescription,
  generateSEOContent,
};

export default aiService;
