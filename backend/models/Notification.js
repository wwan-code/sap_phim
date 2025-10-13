import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // Người nhận thông báo
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  // Người tạo hành động (có thể null, ví dụ: thông báo hệ thống)
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  // Loại thông báo để phân loại và hiển thị icon/hành động phù hợp
  type: {
    type: DataTypes.ENUM(
      'new_comment',
      'comment_report',
      'system_message',
      'friend_request',
      'friend_request_status',
      'user_mention',
      'like_comment',
      'new_follower',
      'movie_update'
      // Thêm các loại khác nếu cần
    ),
    allowNull: false,
  },
  // Tiêu đề của thông báo, có thể dùng để tóm tắt nhanh
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Nội dung chi tiết của thông báo
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  // Đường dẫn để điều hướng khi người dùng nhấp vào
  link: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Trạng thái đã đọc hay chưa
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  // Trạng thái ghim thông báo lên đầu
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  // Dữ liệu cấu trúc bổ sung (ví dụ: commentId, friendRequestId)
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    get() {
      const value = this.getDataValue('metadata');
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (error) {
          return {};
        }
      }
      return value || {};
    },
    set(value) {
      this.setDataValue('metadata', value || {});
    }
  },
}, {
  paranoid: true, // Kích hoạt soft delete
  timestamps: true,
  indexes: [
    {
      name: 'idx_notification_user_read_created',
      fields: ['userId', 'isRead', 'createdAt'],
    },
    {
      name: 'idx_notification_user_type',
      fields: ['userId', 'type'],
    },
  ],
});

export default Notification;
