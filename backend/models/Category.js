import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { generateSlug } from '../utils/slugUtil.js';

const Category = sequelize.define('Category', {
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
    beforeValidate: (category) => {
      if (category.title) {
        category.slug = generateSlug(category.title);
      }
    },
  },
});

export default Category;
