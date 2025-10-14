import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    unique: true,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('private', 'group'),
    allowNull: false,
    defaultValue: 'private',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true, // NULL cho private chat
  },
  avatarUrl: {
    type: DataTypes.STRING,
    allowNull: true, // NULL cho private chat
  },
  lastMessageId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Messages',
      key: 'id'
    }
  },
  isLocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true, // NULL nếu không khóa
  },
}, {
  timestamps: true,
  indexes: [
    {
      name: 'idx_conversation_type',
      fields: ['type'],
    },
    {
      name: 'idx_conversation_lastMessageId',
      fields: ['lastMessageId'],
    },
  ],
});

export default Conversation;
