import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Friendship = sequelize.define('Friendship', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users', // Tên bảng Users
      key: 'id',
    },
  },
  receiverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users', // Tên bảng Users
      key: 'id',
    },
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['senderId', 'receiverId'],
    },
  ],
});

export default Friendship;
