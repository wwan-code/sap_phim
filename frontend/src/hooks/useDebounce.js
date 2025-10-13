import { useState, useEffect } from 'react';

/**
 * @desc Hook để debounce một giá trị.
 * Giá trị chỉ thay đổi sau một khoảng thời gian nhất định không có sự thay đổi nào khác.
 * Hữu ích cho các input tìm kiếm để tránh gọi API quá thường xuyên.
 * @param {any} value - Giá trị cần debounce.
 * @param {number} delay - Thời gian debounce tính bằng mili giây.
 * @returns {any} - Giá trị đã được debounce.
 */
export const useDebounce = (value, delay) => {
  // State để lưu trữ giá trị đã được debounce
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Thiết lập một timer để cập nhật debouncedValue sau `delay`
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function: Hủy timer nếu value thay đổi hoặc component unmount
    // Điều này đảm bảo rằng timer luôn được reset nếu giá trị thay đổi nhanh chóng
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Chỉ chạy lại effect nếu value hoặc delay thay đổi

  return debouncedValue;
};
