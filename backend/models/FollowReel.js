import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Bảng FollowReel: theo dõi tác giả (follower -> following)
const FollowReel = sequelize.define('FollowReel', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  followerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  followingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  paranoid: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['followerId', 'followingId'] },
  ],
});

export default FollowReel;

