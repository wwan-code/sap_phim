import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Favorite = sequelize.define('Favorite', {
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
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['userId', 'movieId']
    }
  ],
  timestamps: true,
});

export default Favorite;


