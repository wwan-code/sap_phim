import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class User extends Model {}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false
    },
    fullName: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(120),
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    passwordHash: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    avatarUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true
    },
    bio: {
      type: DataTypes.STRING(280),
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user'
    },
    followersCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    followingCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    paranoid: true
  }
);

export default User;
