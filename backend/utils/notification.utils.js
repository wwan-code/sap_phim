/**
 * @file Chứa các hàm tiện ích để tạo nội dung thông báo chuẩn hóa.
 * Giúp đảm bảo tính nhất quán và dễ dàng quản lý nội dung thông báo.
 */
export const generateNotificationContent = (type, data = {}) => {
  const {
    senderName = 'Ai đấy',
    movieTitle = 'một bộ phim',
    commentPreview = '',
    status,
    title,
    body,
    messagePreview,
  } = data;

  switch (type) {
    case 'friend_request':
      return {
        title: 'Lời mời kết bạn mới',
        body: `${senderName} vừa gửi lời mời kết bạn cho bạn.`,
      };

    case 'friend_request_status':
      if (status === 'accepted') {
        return {
          title: 'Đã chấp nhận lời mời kết bạn',
          body: `${senderName} đã chấp nhận lời mời kết bạn của bạn.`,
        };
      }
      return {
        title: 'Lời mời kết bạn bị từ chối',
        body: `${senderName} đã từ chối lời mời kết bạn của bạn.`,
      };

    case 'new_comment':
      return {
        title: 'Bình luận mới',
        body: `${senderName} vừa trả lời bình luận: "${commentPreview}"`,
      };

    case 'like_comment':
      return {
        title: 'Bình luận được yêu thích',
        body: `${senderName} vừa thích bình luận của bạn: "${commentPreview}"`,
      };

    case 'user_mention':
      return {
        title: 'Bạn vừa được nhắc đến',
        body: `${senderName} đã nhắc đến bạn trong một bình luận: "${commentPreview}"`,
      };

    case 'movie_update':
      return {
        title: 'Phim vừa được cập nhật',
        body: `Tập mới của "${movieTitle}" đã được thêm.`,
      };

    case 'system_message':
      return {
        title: title || 'Thông báo hệ thống',
        body: body || 'Bạn có thông báo mới từ hệ thống.',
      };

    case 'comment_report':
      return {
        title: 'Bình luận bị báo cáo',
        body: `${senderName} vừa báo cáo một bình luận: "${commentPreview}"`,
      };

    case 'new_message':
      return {
        title: 'Tin nhắn mới',
        body: `${senderName} vừa gửi tin nhắn: "${messagePreview || 'Tin nhắn mới'}"`,
      };

    default:
      return {
        title: 'Thông báo mới',
        body: 'Bạn có thông báo mới.',
      };
  }
};
