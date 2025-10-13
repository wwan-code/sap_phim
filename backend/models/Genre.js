import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { generateSlug } from '../utils/slugUtil.js';

const Genre = sequelize.define('Genre', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  timestamps: true,
  hooks: {
    beforeValidate: (genre) => {
      if (genre.title) {
        genre.slug = generateSlug(genre.title);
      }
    },
  },
});

export default Genre;
