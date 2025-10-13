import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Reel extends Model {}

Reel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    caption: {
      type: DataTypes.STRING(2200),
      allowNull: true
    },
    hashtags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    aiTags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    musicTrack: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    videoUrl: {
      type: DataTypes.STRING(1024),
      allowNull: false
    },
    thumbnailUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true
    },
    duration: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'ready', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    processingErrors: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    visibility: {
      type: DataTypes.ENUM('public', 'friends', 'private'),
      allowNull: false,
      defaultValue: 'public'
    },
    allowComments: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    processingProgress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    viewsCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    likesCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    commentsCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    completionRate: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE
  },
  {
    sequelize,
    modelName: 'Reel',
    tableName: 'reels',
    paranoid: true
  }
);

export default Reel;
