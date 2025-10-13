import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AiLog = sequelize.define('AiLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users', // Tên bảng thực tế trong DB
      key: 'id',
    },
  },
  prompt: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  response: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'general',
    comment: 'Type of AI interaction: suggestMovie, chat, translate, generateMarketing, etc.'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata about the AI interaction'
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'ai_logs',
  timestamps: false, // Không sử dụng createdAt, updatedAt mặc định của Sequelize
});

export default AiLog;
