import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Episode = sequelize.define('Episode', {
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
  episodeNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  linkEpisode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  movieId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  duration: {
    type: DataTypes.STRING, // Ví dụ: "hh:mm:ss" hoặc "mm:ss"
    allowNull: true,
  },
}, {
  timestamps: true,
});

export default Episode;