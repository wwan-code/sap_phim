import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ReelLike = sequelize.define('ReelLike', {
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
}, {
  paranoid: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['reelId', 'userId'],
    }
  ],
});

export default ReelLike;

