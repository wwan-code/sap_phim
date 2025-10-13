import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const WatchHistory = sequelize.define('WatchHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  movieId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  episodeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  progress: {
    type: DataTypes.INTEGER, // seconds watched
    allowNull: false,
    defaultValue: 0,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: true,
});

export default WatchHistory;


