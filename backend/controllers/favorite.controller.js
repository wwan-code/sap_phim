import favoriteService from '../services/favorite.service.js';

// Helper function to standardize API responses
const sendResponse = (res, statusCode, success, data, message, meta) => {
  res.status(statusCode).json({
    success,
    data,
    message,
    ...(meta && { meta }),
  });
};

export const addFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { movieId } = req.params;
    const { favorite, created } = await favoriteService.addFavorite(userId, Number(movieId));
    if (created) {
      sendResponse(res, 201, true, favorite, 'Đã thêm vào danh sách yêu thích.');
    } else {
      sendResponse(res, 200, true, favorite, 'Mục yêu thích đã tồn tại.');
    }
  } catch (error) {
    next(error);
  }
};

export const removeFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { movieId } = req.params;
    const removed = await favoriteService.removeFavorite(userId, Number(movieId));
    if (!removed) {
      return sendResponse(res, 404, false, null, 'Không tìm thấy mục yêu thích.');
    }
    sendResponse(res, 200, true, null, 'Đã xóa khỏi danh sách yêu thích.');
  } catch (error) {
    next(error);
  }
};

export const listFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 12);
    const genre = req.query.genre;
    const sort = req.query.sort; // 'dateAdded' or 'rating'

    const { items, total, totalPages } = await favoriteService.listFavorites(userId, { page, limit, genre, sort });
    sendResponse(res, 200, true, items, 'Lấy danh sách yêu thích thành công.', { page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
};

export const checkFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { movieId } = req.params;
    const isFavorite = await favoriteService.checkFavorite(userId, Number(movieId));
    sendResponse(res, 200, true, { isFavorite }, 'Kiểm tra trạng thái yêu thích thành công.');
  } catch (error) {
    next(error);
  }
};