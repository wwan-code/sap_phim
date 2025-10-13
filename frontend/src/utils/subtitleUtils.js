/**
 * Utility functions for subtitle formatting and handling
 */

/**
 * Format subtitle code to display name
 * @param {string} subtitle - Subtitle code (e.g., 'VietSub', 'EngSub', 'Thuyết minh')
 * @returns {string} Formatted display name
 */
export const formatSubtitleDisplay = (subtitle) => {
  switch (subtitle) {
    case 'VietSub':
      return 'Phụ đề Việt';
    case 'EngSub':
      return 'Phụ đề Anh';
    case 'Thuyết minh':
      return 'Thuyết minh';
    default:
      return subtitle;
  }
};

/**
 * Format subtitle display name to code
 * @param {string} displayName - Display name (e.g., 'Phụ đề Việt', 'Phụ đề Anh')
 * @returns {string} Subtitle code
 */
export const formatSubtitleCode = (displayName) => {
  switch (displayName) {
    case 'Phụ đề Việt':
      return 'VietSub';
    case 'Phụ đề Anh':
      return 'EngSub';
    case 'Thuyết minh':
      return 'Thuyết minh';
    default:
      return displayName;
  }
};

/**
 * Get all available subtitle options
 * @returns {Array} Array of subtitle options with code and display name
 */
export const getSubtitleOptions = () => [
  { code: 'VietSub', display: 'Phụ đề Việt' },
  { code: 'EngSub', display: 'Phụ đề Anh' },
  { code: 'Thuyết minh', display: 'Thuyết minh' }
];

/**
 * Format array of subtitles for display
 * @param {Array} subtitles - Array of subtitle codes
 * @returns {string} Formatted string for display
 */
export const formatSubtitlesForDisplay = (subtitles) => {
  if (!Array.isArray(subtitles) || subtitles.length === 0) {
    return 'N/A';
  }
  
  return subtitles.map(formatSubtitleDisplay).join(', ');
};

/**
 * Parse subtitle string input to array
 * @param {string} subtitleString - Comma-separated subtitle string
 * @returns {Array} Array of subtitle codes
 */
export const parseSubtitlesFromString = (subtitleString) => {
  if (!subtitleString || typeof subtitleString !== 'string') {
    return [];
  }
  
  return subtitleString
    .split(',')
    .map(s => s.trim())
    .filter(s => s !== '')
    .map(formatSubtitleCode);
};

/**
 * Validate subtitle code
 * @param {string} subtitle - Subtitle code to validate
 * @returns {boolean} Whether the subtitle code is valid
 */
export const isValidSubtitleCode = (subtitle) => {
  const validCodes = ['VietSub', 'EngSub', 'Thuyết minh'];
  return validCodes.includes(subtitle);
};
