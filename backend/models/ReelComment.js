import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ReelComment = sequelize.define('ReelComment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  reelId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  likesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'hidden'),
    defaultValue: 'active',
    allowNull: false,
  },
}, {
  paranoid: true,
  timestamps: true,
});

export default ReelComment;

