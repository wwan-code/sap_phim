import db from '../models/index.js';
import { Op } from 'sequelize';

const { Section, sequelize } = db;

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

const createSection = async (sectionData) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const section = await Section.create(sectionData, { transaction });
    await transaction.commit();
    return section;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

const getSectionByMovieId = async (movieId, query) => {
  const { page = 1, limit = 10, sort, title } = query;
  const offset = (page - 1) * limit;
  const whereClause = { movieId };
  if (title) {
    whereClause.title = { [Op.like]: `%${title}%` };
  }
  try {
    const order = parseSort(sort);
    const { count, rows } = await Section.findAndCountAll({
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

const getAllSections = async () => {
  try {
    const sections = await Section.findAll();
    return { success: true, data: sections, message: 'Lấy tất cả sections thành công.' };
  } catch (error) {
    throw error;
  }
};

const getSections = async (query) => {
  const { page = 1, limit = 10, sort, title } = query;
  const offset = (page - 1) * limit;

  const whereClause = {};
  if (title) {
    whereClause.title = { [Op.like]: `%${title}%` };
  }

  try {
    const order = parseSort(sort);
    const { count, rows } = await Section.findAndCountAll({
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

const getSectionById = async (id) => {
  try {
    const section = await Section.findByPk(id);
    return section;
  } catch (error) {
    throw error;
  }
};

const updateSection = async (id, sectionData) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const section = await Section.findByPk(id, { transaction });
    if (!section) {
      throw new Error('Section not found');
    }
    await section.update(sectionData, { transaction });
    await transaction.commit();
    return section;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

const deleteSection = async (id) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const section = await Section.findByPk(id, { transaction });
    if (!section) {
      throw new Error('Section not found');
    }
    await section.destroy({ transaction });
    await transaction.commit();
    return { message: 'Section deleted successfully' };
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

export {
  createSection,
  getAllSections,
  getSectionByMovieId,
  getSections,
  getSectionById,
  updateSection,
  deleteSection,
};
