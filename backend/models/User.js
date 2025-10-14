import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
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
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  avatarUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  coverUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sex: {
    type: DataTypes.ENUM('nam', 'nữ', 'khác'),
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: true
  },
  socialLinks: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      github: '',
      twitter: '',
      instagram: '',
      facebook: ''
    },
    get() {
      const value = this.getDataValue('socialLinks');
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (error) {
          return this.rawAttributes.socialLinks.defaultValue;
        }
      }
      return value;
    },
    set(value) {
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch (error) {
          value = this.rawAttributes.socialLinks.defaultValue;
        }
      }
      this.setDataValue('socialLinks', value);
    }
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  status: {
    type: DataTypes.ENUM('active', 'banned'),
    defaultValue: 'active',
    allowNull: false,
  },
  online: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  lastOnline: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Privacy Settings
  profileVisibility: {
    type: DataTypes.ENUM('public', 'friends', 'private'),
    defaultValue: 'public',
    allowNull: false,
  },
  canReceiveFriendRequests: {
    type: DataTypes.ENUM('everyone', 'friends_of_friends', 'nobody'),
    defaultValue: 'everyone',
    allowNull: false,
  },
  showOnlineStatus: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  showFriendList: {
    type: DataTypes.ENUM('public', 'friends', 'private'),
    defaultValue: 'public',
    allowNull: false,
  },
  showFavorites: {
    type: DataTypes.ENUM('public', 'friends', 'private'),
    defaultValue: 'public',
    allowNull: false,
  },
  showWatchHistory: {
    type: DataTypes.ENUM('public', 'friends', 'private'),
    defaultValue: 'public',
    allowNull: false,
  },
  allowSearchEngineIndexing: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  // Notification Settings (stored as JSONB for flexibility)
  notificationSettings: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      friendRequest: { inApp: true, email: false, sms: false },
      friendRequestStatus: { inApp: true, email: false, sms: false },
      newMessage: { inApp: true, email: false, sms: false },
      movieActivity: { inApp: true, email: false, sms: false },
    },
    get() {
      const value = this.getDataValue('notificationSettings');
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (error) {
          return this.rawAttributes.notificationSettings.defaultValue;
        }
      }
      return value || this.rawAttributes.notificationSettings.defaultValue;
    },
    set(value) {
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch (error) {
          value = this.rawAttributes.notificationSettings.defaultValue;
        }
      }
      this.setDataValue('notificationSettings', value);
    }
  },
}, {
  paranoid: true,
  timestamps: true,
});

export default User;
