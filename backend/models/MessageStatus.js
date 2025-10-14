import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MessageStatus = sequelize.define('MessageStatus', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  messageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Messages',
      key: 'id',
    },
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  status: {
    type: DataTypes.ENUM('sent', 'delivered', 'seen'),
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['messageId', 'userId'],
      name: 'idx_status_message_user',
    },
    {
      fields: ['userId', 'status'],
      name: 'idx_status_user_status',
    },
  ],
});

export default MessageStatus;
