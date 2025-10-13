import db from '../models/index.js';
import { Op } from 'sequelize';

const { Series, sequelize } = db;

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

const createSeries = async (seriesData) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const series = await Series.create(seriesData, { transaction });
    await transaction.commit();
    return series;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

const getAllSeries = async () => {
  try {
    const series = await Series.findAll();
    return series;
  } catch (error) {
    throw error;
  }
};

const getSeries = async (query) => {
  const { page = 1, limit = 10, sort, title } = query;
  const offset = (page - 1) * limit;

  const whereClause = {};
  if (title) {
    whereClause.title = { [Op.like]: `%${title}%` };
  }

  try {
    const order = parseSort(sort);
    const { count, rows } = await Series.findAndCountAll({
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

const getSeriesById = async (id) => {
  try {
    const series = await Series.findByPk(id);
    return series;
  } catch (error) {
    throw error;
  }
};

const updateSeries = async (id, seriesData) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const series = await Series.findByPk(id, { transaction });
    if (!series) {
      throw new Error('Series not found');
    }
    await series.update(seriesData, { transaction });
    await transaction.commit();
    return series;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

const deleteSeries = async (id) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const series = await Series.findByPk(id, { transaction });
    if (!series) {
      throw new Error('Series not found');
    }
    await series.destroy({ transaction });
    await transaction.commit();
    return { message: 'Series deleted successfully' };
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

export {
  createSeries,
  getAllSeries,
  getSeries,
  getSeriesById,
  updateSeries,
  deleteSeries,
};
