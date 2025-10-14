import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';

const LoginHistory = sequelize.define('LoginHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: true, // Optional, ví dụ: 'google', 'facebook' nếu đăng nhập qua OAuth
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  deviceType: {
    type: DataTypes.STRING,
    allowNull: true, // Để phân biệt thiết bị
  },
  loginAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
  logoutAt: {
    type: DataTypes.DATE,
    allowNull: true, // Cho các phiên đăng nhập
  },
}, {
  timestamps: true, // Sử dụng timestamps để có createdAt và updatedAt
  updatedAt: 'logoutAt', // Cập nhật logoutAt khi phiên đăng nhập kết thúc
  createdAt: 'loginAt', // Đổi tên createdAt thành loginAt
  paranoid: false, // Không cần soft delete
});

export default LoginHistory;
