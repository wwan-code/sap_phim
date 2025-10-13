/**
 * Tính toán và định dạng khoảng thời gian tương đối so với hiện tại.
 * Sử dụng Intl.RelativeTimeFormat để hỗ trợ đa ngôn ngữ.
 * @param {Date | string | number} date - Thời gian cần so sánh.
 * @param {string} [locale='vi-VN'] - Ngôn ngữ và vùng miền.
 * @returns {string} - Chuỗi mô tả khoảng thời gian tương đối (ví dụ: "5 phút trước").
 */
export const formatDistanceToNow = (date, locale = 'vi-VN') => {
    if (!date) return '';

    try {
        const timeMs = typeof date === 'object' ? date.getTime() : new Date(date).getTime();
        const deltaSeconds = Math.round((timeMs - Date.now()) / 1000);

        const cutoffs = [60, 3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365, Infinity];
        const units = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'];

        const unitIndex = cutoffs.findIndex(cutoff => Math.abs(deltaSeconds) < cutoff);
        const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1;
        
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
        return rtf.format(Math.floor(deltaSeconds / divisor), units[unitIndex]);

    } catch (e) {
        console.error("Lỗi tính khoảng thời gian:", e);
        return '';
    }
};

/**
 * Định dạng phần thời gian (giờ:phút) từ một đối tượng Date hoặc chuỗi ngày tháng.
 * @param {Date | string} dateTime - Thời gian cần định dạng.
 * @param {string} [locale='vi-VN'] - Ngôn ngữ và vùng miền.
 * @returns {string} - Chuỗi thời gian đã định dạng (ví dụ: "14:30").
 */
export const formatTime = (dateTime, locale = 'vi-VN') => {
    if (!dateTime) return '';
    try {
        const date = new Date(dateTime);
        return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        console.error("Lỗi định dạng thời gian:", e);
        return '';
    }
};

/**
 * Định dạng chuỗi ngày tháng sử dụng Intl.DateTimeFormat của JavaScript.
 * @param {string | Date} dateString - Chuỗi ngày tháng hoặc đối tượng Date cần định dạng.
 * @param {string} [locale='vi-VN'] - Ngôn ngữ và vùng miền để định dạng (ví dụ: 'en-US').
 * @param {object} [options] - Tùy chọn định dạng cho Intl.DateTimeFormat.
 * @returns {string} - Chuỗi ngày tháng đã được định dạng.
 */
export const formatDate = (dateString, locale = 'vi-VN', options) => {
    if (!dateString) return '';

    const defaultOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    };

    try {
        const date = new Date(dateString);
        // Kết hợp tùy chọn mặc định và tùy chọn người dùng truyền vào
        const formatOptions = { ...defaultOptions, ...options };
        return new Intl.DateTimeFormat(locale, formatOptions).format(date);
    } catch (e) {
        console.error("Lỗi định dạng ngày tháng:", e);
        return dateString; // Trả về chuỗi gốc nếu có lỗi
    }
};

// Ví dụ cách sử dụng khác:
// formatDate(new Date(), 'en-US', { month: 'long', day: 'numeric', year: 'numeric' });
// Kết quả: "July 17, 2025"
