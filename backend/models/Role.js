import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.ENUM('user', 'editor', 'moderator', 'admin'),
    unique: true,
    allowNull: false,
  },
}, {
  timestamps: false,
});

export default Role;
