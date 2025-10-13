import db from '../models/index.js';
import { Op } from 'sequelize';

const { Genre, sequelize } = db;

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

const createGenre = async (genreData) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const genre = await Genre.create(genreData, { transaction });
    await transaction.commit();
    return genre;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

const getAllGenres = async () => {
  try {
    const genres = await Genre.findAll();
    return genres;
  } catch (error) {
    throw error;
  }
};

const getGenres = async (query) => {
  const { page = 1, limit = 10, sort, title } = query;
  const offset = (page - 1) * limit;

  const whereClause = {};
  if (title) {
    whereClause.title = { [Op.like]: `%${title}%` };
  }

  try {
    const order = parseSort(sort);
    const { count, rows } = await Genre.findAndCountAll({
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

const getGenreById = async (id) => {
  try {
    const genre = await Genre.findByPk(id);
    return genre;
  } catch (error) {
    throw error;
  }
};

const updateGenre = async (id, genreData) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const genre = await Genre.findByPk(id, { transaction });
    if (!genre) {
      throw new Error('Genre not found');
    }
    await genre.update(genreData, { transaction });
    await transaction.commit();
    return genre;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

const deleteGenre = async (id) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const genre = await Genre.findByPk(id, { transaction });
    if (!genre) {
      throw new Error('Genre not found');
    }
    await genre.destroy({ transaction });
    await transaction.commit();
    return { message: 'Genre deleted successfully' };
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

export default {
  createGenre,
  getAllGenres,
  getGenres,
  getGenreById,
  updateGenre,
  deleteGenre,
};
