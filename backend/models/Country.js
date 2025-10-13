import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { generateSlug } from '../utils/slugUtil.js';

const Country = sequelize.define('Country', {
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
    beforeValidate: (country) => {
      if (country.title) {
        country.slug = generateSlug(country.title);
      }
    },
  },
});

export default Country;
