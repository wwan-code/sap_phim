import watchHistoryService from '../services/watchHistory.service.js';

// Helper function to standardize API responses
const sendResponse = (res, statusCode, success, data, message, meta) => {
  res.status(statusCode).json({
    success,
    data,
    message,
    ...(meta && { meta }),
  });
};

export const saveProgress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { movieId, episodeId, progress, timestamp } = req.body;

    if (!movieId || progress === undefined) {
      return sendResponse(res, 400, false, null, 'movieId và progress là bắt buộc.');
    }

    const data = await watchHistoryService.upsertProgress({ userId, movieId, episodeId, progress, timestamp });
    sendResponse(res, 200, true, data, 'Tiến độ xem đã được lưu.');
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const { items, total, totalPages } = await watchHistoryService.listHistory({ userId, page, limit });
    sendResponse(res, 200, true, items, 'Lấy lịch sử xem thành công.', { page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
};

export const deleteOne = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const ok = await watchHistoryService.removeOne({ userId, id });
    if (!ok) {
      return sendResponse(res, 404, false, null, 'Không tìm thấy mục lịch sử.');
    }
    sendResponse(res, 200, true, null, 'Đã xóa một mục khỏi lịch sử xem.');
  } catch (error) {
    next(error);
  }
};

export const deleteAll = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const deletedCount = await watchHistoryService.clearAll({ userId });
    sendResponse(res, 200, true, { deletedCount }, 'Đã xóa toàn bộ lịch sử xem.');
  } catch (error) {
    next(error);
  }
};
