import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { generateSlug } from '../utils/slugUtil.js';

const Series = sequelize.define('Series', {
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
    beforeValidate: (series) => {
      if (series.title) {
        series.slug = generateSlug(series.title);
      }
    },
  },
});

export default Series;