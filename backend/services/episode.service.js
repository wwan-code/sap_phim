import db from '../models/index.js';
import { Op } from 'sequelize';

const { Episode, sequelize } = db;

/**
 * Phân tích chuỗi query 'sort' thành định dạng 'order' của Sequelize.
 * @param {string} sortString - Chuỗi sắp xếp, ví dụ: "episodeNumber:asc,createdAt:desc".
 * @returns {Array} - Mảng 'order' cho Sequelize, ví dụ: [['episodeNumber', 'ASC'], ['createdAt', 'DESC']].
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

const getEpisodesByMovieId = async (movieId, query) => {
  const { page = 1, limit = 10, sort, episodeNumber } = query;
  const offset = (page - 1) * limit;
  const whereClause = { movieId };
  if (episodeNumber) {
    whereClause.episodeNumber = parseInt(episodeNumber); // Tìm kiếm chính xác theo số tập
  }
  try {
    const order = parseSort(sort);
    const { count, rows } = await Episode.findAndCountAll({
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

const createEpisode = async (movieId, episodeData) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const episode = await Episode.create({ ...episodeData, movieId }, { transaction });
    await transaction.commit();
    return episode;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

const getAllEpisodes = async () => {
  try {
    const episodes = await Episode.findAll();
    return { success: true, data: episodes, message: 'Lấy tất cả tập phim thành công.' };
  } catch (error) {
    throw error;
  }
};

const getEpisodes = async (query) => {
  const { page = 1, limit = 10, sort, episodeNumber } = query;
  const offset = (page - 1) * limit;

  const whereClause = {};
  if (episodeNumber) {
    whereClause.episodeNumber = parseInt(episodeNumber); // Tìm kiếm chính xác theo số tập
  }

  try {
    const order = parseSort(sort);
    const { count, rows } = await Episode.findAndCountAll({
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

const getEpisodeById = async (id) => {
  try {
    const episode = await Episode.findByPk(id);
    return episode;
  } catch (error) {
    throw error;
  }
};

const updateEpisode = async (id, episodeData) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const episode = await Episode.findByPk(id, { transaction });
    if (!episode) {
      throw new Error('Episode not found');
    }
    await episode.update(episodeData, { transaction });
    await transaction.commit();
    return episode;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

const deleteEpisode = async (id) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const episode = await Episode.findByPk(id, { transaction });
    if (!episode) {
      throw new Error('Episode not found');
    }
    await episode.destroy({ transaction });
    await transaction.commit();
    return { message: 'Episode deleted successfully' };
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

export {
  getEpisodesByMovieId,
  createEpisode,
  getAllEpisodes,
  getEpisodes,
  getEpisodeById,
  updateEpisode,
  deleteEpisode,
};
