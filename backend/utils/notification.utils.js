/**
 * @file Chứa các hàm tiện ích để tạo nội dung thông báo chuẩn hóa.
 * Giúp đảm bảo tính nhất quán và dễ dàng quản lý nội dung thông báo.
 */

/**
 * Tạo nội dung thông báo dựa trên loại và dữ liệu.
 * @param {string} type - Loại thông báo (ví dụ: 'friend_request', 'new_comment').
 * @param {object} data - Dữ liệu cần thiết để tạo nội dung.
 * @param {string} [data.senderName] - Tên người gửi hành động.
 * @param {string} [data.receiverName] - Tên người nhận hành động.
 * @param {string} [data.movieTitle] - Tên phim.
 * @param {string} [data.commentPreview] - Xem trước nội dung bình luận.
 * @returns {{title: string, body: string}} - Đối tượng chứa title và body của thông báo.
 */
export const generateNotificationContent = (type, data = {}) => {
  const { senderName = 'Ai đó', movieTitle = 'một bộ phim', commentPreview = '' } = data;

  switch (type) {
    case 'friend_request':
      return {
        title: 'Lời mời kết bạn mới',
        body: `${senderName} đã gửi cho bạn một lời mời kết bạn.`,
      };
    case 'friend_request_status':
      // Giả sử data.status là 'accepted' hoặc 'rejected'
      if (data.status === 'accepted') {
        return {
          title: 'Lời mời đã được chấp nhận',
          body: `${senderName} đã chấp nhận lời mời kết bạn của bạn.`,
        };
      }
      // Mặc định là từ chối hoặc các trạng thái khác
      return {
        title: 'Lời mời kết bạn bị từ chối',
        body: `${senderName} đã từ chối lời mời kết bạn của bạn.`,
      };
    case 'new_comment':
      return {
        title: 'Bình luận mới',
        body: `${senderName} đã trả lời bình luận của bạn: "${commentPreview}"`,
      };
    case 'like_comment':
        return {
          title: 'Bình luận được yêu thích',
          body: `${senderName} đã thích bình luận của bạn: "${commentPreview}"`,
        };
    case 'user_mention':
      return {
        title: 'Bạn vừa được nhắc đến',
        body: `${senderName} đã nhắc đến bạn trong một bình luận: "${commentPreview}"`,
      };
    case 'movie_update':
      return {
        title: 'Cập nhật phim mới',
        body: `Tập mới của phim "${movieTitle}" vừa được cập nhật.`,
      };
    case 'system_message':
      return {
        title: data.title || 'Thông báo từ hệ thống',
        body: data.body || 'Bạn có một thông báo mới từ hệ thống của chúng tôi.',
      };
    case 'comment_report':
      return {
        title: 'Báo cáo bình luận mới',
        body: `${senderName} đã báo cáo một bình luận có nội dung: "${commentPreview}"`,
      };
    default:
      return {
        title: 'Thông báo mới',
        body: 'Bạn có một thông báo mới.',
      };
  }
};
