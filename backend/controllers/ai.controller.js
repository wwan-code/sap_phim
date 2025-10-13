import asyncHandler from 'express-async-handler';
import * as aiService from '../services/ai.service.js';

// Helper function to standardize API responses
const sendResponse = (res, statusCode, success, data, message, meta) => {
  res.status(statusCode).json({
    success,
    data,
    message,
    ...(meta && { meta }),
  });
};

/**
 * @desc    Xử lý truy vấn chatbot
 * @route   POST /api/ai/query
 * @access  Private
 */
const chatWithAI = asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  const userId = req.user.id; // Lấy userId từ JWT token

  if (!prompt) {
    return sendResponse(res, 400, false, null, 'Vui lòng cung cấp nội dung truy vấn.');
  }

  const response = await aiService.chatWithAI(userId, prompt);
  sendResponse(res, 200, true, { response }, 'Truy vấn AI thành công.');
});

/**
 * @desc    Gợi ý phim cho người dùng
 * @route   POST /api/ai/recommend
 * @access  Private
 */
const recommendMovies = asyncHandler(async (req, res) => {
  const userId = req.user.id; // Lấy userId từ JWT token
  const { limit, preferredGenres } = req.body; // Có thể có các tùy chọn khác

  const recommendations = await aiService.recommendMovies(userId, { limit, preferredGenres });
  sendResponse(res, 200, true, recommendations, 'Gợi ý phim thành công.');
});

/**
 * @desc    Dịch nội dung
 * @route   POST /api/ai/translate
 * @access  Private
 */
const translateText = asyncHandler(async (req, res) => {
  const { text, targetLanguage } = req.body;
  const userId = req.user.id; // Lấy userId từ JWT token

  if (!text || !targetLanguage) {
    return sendResponse(res, 400, false, null, 'Vui lòng cung cấp nội dung và ngôn ngữ đích để dịch.');
  }

  const translatedText = await aiService.translateText(userId, text, targetLanguage);
  sendResponse(res, 200, true, { translatedText }, 'Dịch văn bản thành công.');
});

/**
 * @desc    Gợi ý dữ liệu phim mới cho admin (Enhanced)
 * @route   POST /api/ai/admin/suggest
 * @access  Private/Admin
 */
const suggestMovieData = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { titles, season, country, description, genres, type } = req.body;

  // Enhanced validation
  if (!titles || !Array.isArray(titles) || titles.length === 0) {
    return sendResponse(res, 400, false, null, 'Vui lòng cung cấp ít nhất một tiêu đề phim.');
  }

  const defaultTitle = titles.find(t => t.type === 'default');
  if (!defaultTitle || !defaultTitle.title?.trim()) {
    return sendResponse(res, 400, false, null, 'Tiêu đề mặc định là bắt buộc.');
  }

  const movieInfo = {
    titles,
    season: season || '',
    country: country || '',
    description: description || '',
    genres: genres || [],
    type: type || 'movie'
  };

  const suggestedData = await aiService.suggestMovieData(userId, movieInfo);
  sendResponse(res, 200, true, suggestedData, 'Gợi ý dữ liệu phim thành công.');
});

/**
 * @desc    Tạo nội dung marketing cho phim
 * @route   POST /api/ai/admin/marketing
 * @access  Private/Admin
 */
const generateMarketingContent = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { title, description, genres, year } = req.body;

  if (!title) {
    return sendResponse(res, 400, false, null, 'Vui lòng cung cấp tiêu đề phim.');
  }

  const movieInfo = { title, description, genres, year };
  const marketingData = await aiService.generateMarketingContent(userId, movieInfo);
  sendResponse(res, 200, true, marketingData, 'Tạo nội dung marketing thành công.');
});

/**
 * @desc    Dịch mô tả phim
 * @route   POST /api/ai/admin/translate
 * @access  Private/Admin
 */
const translateDescription = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { title, description, targetLanguage } = req.body;

  if (!title || !description || !targetLanguage) {
    return sendResponse(res, 400, false, null, 'Vui lòng cung cấp đầy đủ thông tin: tiêu đề, mô tả và ngôn ngữ đích.');
  }

  const translationInfo = { title, description, targetLanguage };
  const translationData = await aiService.translateDescription(userId, translationInfo);
  sendResponse(res, 200, true, translationData, 'Dịch mô tả thành công.');
});

/**
 * @desc    Tạo nội dung SEO tối ưu
 * @route   POST /api/ai/admin/seo
 * @access  Private/Admin
 */
const generateSEOContent = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { title, description, genres, tags } = req.body;

  if (!title) {
    return sendResponse(res, 400, false, null, 'Vui lòng cung cấp tiêu đề phim.');
  }

  const seoInfo = { title, description, genres, tags };
  const seoData = await aiService.generateSEOContent(userId, seoInfo);
  sendResponse(res, 200, true, seoData, 'Tạo nội dung SEO thành công.');
});

/**
 * @desc    Phân loại bình luận bằng AI
 * @route   POST /api/ai/admin/classify-comment
 * @access  Private/Admin
 */
const classifyComment = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { commentText } = req.body;

  if (!commentText) {
    return sendResponse(res, 400, false, null, 'Vui lòng cung cấp nội dung bình luận để phân loại.');
  }

  const classificationResult = await aiService.classifyComment(userId, commentText);
  sendResponse(res, 200, true, classificationResult, 'Phân loại bình luận thành công.');
});

/**
 * @desc    Lấy dữ liệu analytics AI
 * @route   GET /api/ai/admin/analytics
 * @access  Private/Admin
 */
const getAIAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate, type } = req.query;

  const filters = { startDate, endDate, type };
  const analyticsData = await aiService.getAIAnalytics(userId, filters);
  sendResponse(res, 200, true, analyticsData, 'Lấy dữ liệu analytics thành công.');
});

export {
  chatWithAI,
  recommendMovies,
  translateText,
  suggestMovieData,
  generateMarketingContent,
  translateDescription,
  generateSEOContent,
  classifyComment, // Export new admin function
  getAIAnalytics,
};
