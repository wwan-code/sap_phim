import api from './api';

// ==================== REEL FEED & DETAILS ====================

/**
 * Fetch the reel feed for the current user.
 * @param {number} page - The page number for pagination.
 * @param {number} limit - The number of reels per page.
 * @returns {Promise<Array>} A list of reels.
 */
export const getReelFeed = async (page = 1, limit = 10) => {
  const response = await api.get('/reels', { params: { page, limit } });
  return response.data;
};

/**
 * Fetch a single reel by its ID or UUID.
 * @param {string} identifier - The ID or UUID of the reel.
 * @returns {Promise<object>} The reel object.
 */
export const getReelById = async (identifier) => {
  const response = await api.get(`/reels/${identifier}`);
  return response.data;
};

/**
 * Fetch trending reels.
 * @param {number} limit - The number of trending reels to fetch.
 * @returns {Promise<Array>} A list of trending reels.
 */
export const getTrendingReels = async (limit = 10) => {
  const response = await api.get('/reels/trending', { params: { limit } });
  return response.data;
};

/**
 * Fetch reels similar to a given reel.
 * @param {number} reelId - The ID of the reel to find similarities for.
 * @param {number} limit - The number of similar reels to fetch.
 * @returns {Promise<Array>} A list of similar reels.
 */
export const getSimilarReels = async (reelId, limit = 10) => {
  const response = await api.get(`/reels/${reelId}/similar`, { params: { limit } });
  return response.data;
};

/**
 * Fetch reels for a specific user.
 * @param {number} userId - The ID of the user.
 * @param {number} page - The page number for pagination.
 * @param {number} limit - The number of reels per page.
 * @returns {Promise<Array>} A list of the user's reels.
 */
export const getUserReels = async (userId, page = 1, limit = 10) => {
  const response = await api.get(`/reels/user/${userId}`, { params: { page, limit } });
  return response.data;
};


// ==================== REEL ACTIONS ====================

/**
 * Create a new reel.
 * @param {FormData} formData - The form data containing the video and reel info.
 * @returns {Promise<object>} The newly created reel object.
 */
export const createReel = async (formData) => {
  const response = await api.post('/reels', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Update an existing reel.
 * @param {number} reelId - The ID of the reel to update.
 * @param {object} data - The data to update (e.g., { caption, music, tags, visibility }).
 * @returns {Promise<object>} The updated reel object.
 */
export const updateReel = async (reelId, data) => {
  const response = await api.put(`/reels/${reelId}`, data);
  return response.data;
};

/**
 * Delete a reel owned by the user.
 * @param {number} reelId - The ID of the reel to delete.
 * @returns {Promise<void>}
 */
export const deleteReel = async (reelId) => {
  await api.delete(`/reels/${reelId}`);
};

/**
 * Toggle like on a reel.
 * @param {number} reelId - The ID of the reel to like/unlike.
 * @returns {Promise<object>} The result of the toggle action.
 */
export const toggleLikeReel = async (reelId) => {
  const response = await api.post(`/reels/${reelId}/like`);
  return response.data;
};

/**
 * Add a comment to a reel.
 * @param {number} reelId - The ID of the reel.
 * @param {string} content - The content of the comment.
 * @param {number|null} parentId - The ID of the parent comment if it's a reply.
 * @returns {Promise<object>} The newly created comment object.
 */
export const addReelComment = async (reelId, content, parentId = null) => {
  const response = await api.post(`/reels/${reelId}/comments`, { content, parentId });
  return response.data;
};

/**
 * Fetch comments for a reel.
 * @param {number} reelId - The ID of the reel.
 * @param {number} page - The page number for pagination.
 * @param {number} limit - The number of comments per page.
 * @returns {Promise<Array>} A list of comments.
 */
export const getReelComments = async (reelId, page = 1, limit = 10) => {
  const response = await api.get(`/reels/${reelId}/comments`, { params: { page, limit } });
  return response.data;
};

// ==================== AI FEATURES ====================

/**
 * Get AI-suggested caption and hashtags.
 * @param {string} videoDescription - A description of the video content.
 * @returns {Promise<object>} An object with suggested caption and hashtags.
 */
export const suggestAICaptionAndHashtags = async (videoDescription) => {
  const response = await api.post('/reels/ai/suggest-caption', { videoDescription });
  return response.data;
};

/**
 * Get AI analysis of a reel's content.
 * @param {string} videoUrl - The URL of the video to analyze.
 * @returns {Promise<object>} An object with the content analysis.
 */
export const analyzeReelContent = async (videoUrl) => {
  const response = await api.post('/reels/ai/analyze-content', { videoUrl });
  return response.data;
};

// ==================== ADMIN FEATURES ====================

/**
 * Fetch all reels for the admin dashboard with filters.
 * @param {number} page - The page number.
 * @param {number} limit - The number of reels per page.
 * @param {object} filters - Filtering options (status, userId, caption).
 * @returns {Promise<object>} An object containing reels and total count.
 */
export const getAdminReels = async (page = 1, limit = 10, filters = {}) => {
  const response = await api.get('/reels/admin', { params: { page, limit, ...filters } });
  return response.data;
};

/**
 * Update the status of a reel (admin only).
 * @param {number} reelId - The ID of the reel.
 * @param {string} status - The new status for the reel.
 * @returns {Promise<object>} The updated reel object.
 */
export const updateReelStatusAdmin = async (reelId, status) => {
  const response = await api.put(`/reels/admin/${reelId}/status`, { status });
  return response.data;
};

/**
 * Delete a reel (admin only).
 * @param {number} reelId - The ID of the reel to delete.
 * @returns {Promise<void>}
 */
export const deleteReelAdmin = async (reelId) => {
  await api.delete(`/reels/admin/${reelId}`);
};
