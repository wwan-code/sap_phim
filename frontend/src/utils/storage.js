// storage.js - localStorage helpers

const storage = {
  /**
   * Lấy dữ liệu từ localStorage.
   * @param {string} key - Khóa của dữ liệu cần lấy.
   * @returns {any | null} Dữ liệu đã parse hoặc null nếu không tìm thấy/lỗi.
   */
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      // Kiểm tra nếu item là null, undefined string, hoặc rỗng thì trả về null
      if (!item || item === "undefined" || item === "null") {
        return null;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error(`Error getting item from localStorage for key "${key}":`, error);
      // Nếu có lỗi parse, xóa item đó để tránh lỗi lặp lại
      localStorage.removeItem(key);
      return null;
    }
  },

  /**
   * Lưu dữ liệu vào localStorage.
   * @param {string} key - Khóa để lưu dữ liệu.
   * @param {any} value - Dữ liệu cần lưu.
   */
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item to localStorage for key "${key}":`, error);
    }
  },

  /**
   * Xóa dữ liệu khỏi localStorage.
   * @param {string} key - Khóa của dữ liệu cần xóa.
   */
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item from localStorage for key "${key}":`, error);
    }
  },

  /**
   * Xóa tất cả dữ liệu khỏi localStorage.
   */
  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },
};

export default storage;
