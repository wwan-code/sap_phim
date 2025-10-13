import db from '../models/index.js';
import { Op } from 'sequelize';

const { Country, sequelize } = db;

/**
 * Phân tích chuỗi query 'sort' thành định dạng 'order' của Sequelize.
 * @param {string} sortString - Chuỗi sắp xếp, ví dụ: "title:asc,createdAt:desc".
 * @returns {Array} - Mảng 'order' cho Sequelize, ví dụ: [['title', 'ASC'], ['createdAt', 'DESC']].
 */
const parseSort = (sortString) => {
  if (!sortString || typeof sortString !== 'string') {
    return [['createdAt', 'ASC']]; // Sắp xếp mặc định
  }
  return sortString.split(',').map(part => {
    const [field, order] = part.split(':');
    return [field.trim(), order.trim().toUpperCase()];
  });
};

const createCountry = async (countryData) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const country = await Country.create(countryData, { transaction });
    await transaction.commit();
    return country;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

const getAllCountries = async () => {
  try {
    const countries = await Country.findAll();
    return countries;
  } catch (error) {
    throw error;
  }
};

const getCountries = async (query) => {
  const { page = 1, limit = 10, sort, title } = query;
  const offset = (page - 1) * limit;

  const whereClause = {};
  if (title) {
    whereClause.title = { [Op.like]: `%${title}%` };
  }

  try {
    const order = parseSort(sort);
    const { count, rows } = await Country.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset,
      order,
    });
    return { 
      data: rows,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
     };
  } catch (error) {
    throw error;
  }
};

const getCountryById = async (id) => {
  try {
    const country = await Country.findByPk(id);
    return country;
  } catch (error) {
    throw error;
  }
};

const updateCountry = async (id, countryData) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const country = await Country.findByPk(id, { transaction });
    if (!country) {
      throw new Error('Country not found');
    }
    await country.update(countryData, { transaction });
    await transaction.commit();
    return country;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

const deleteCountry = async (id) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const country = await Country.findByPk(id, { transaction });
    if (!country) {
      throw new Error('Country not found');
    }
    await country.destroy({ transaction });
    await transaction.commit();
    return { message: 'Country deleted successfully' };
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

export default {
  createCountry,
  getAllCountries,
  getCountries,
  getCountryById,
  updateCountry,
  deleteCountry,
};
