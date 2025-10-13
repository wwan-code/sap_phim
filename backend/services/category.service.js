import db from '../models/index.js';
import { Op } from 'sequelize';

const { Category, sequelize } = db;

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

const createCategory = async (categoryData) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const category = await Category.create(categoryData, { transaction });
    await transaction.commit();
    return category;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

const getAllCategories = async () => {
  try {
    const categories = await Category.findAll();
    return categories;
  } catch (error) {
    throw error;
  }
};

const getCategories = async (query) => {
  const { page = 1, limit = 10, sort, title } = query;
  const offset = (page - 1) * limit;

  const whereClause = {};
  if (title) {
    whereClause.title = { [Op.like]: `%${title}%` };
  }

  try {
    const order = parseSort(sort);
    const { count, rows } = await Category.findAndCountAll({
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

const getCategoryById = async (id) => {
  try {
    const category = await Category.findByPk(id);
    return category;
  } catch (error) {
    throw error;
  }
};

const updateCategory = async (id, categoryData) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const category = await Category.findByPk(id, { transaction });
    if (!category) {
      throw new Error('Category not found');
    }
    await category.update(categoryData, { transaction });
    await transaction.commit();
    return category;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

const deleteCategory = async (id) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const category = await Category.findByPk(id, { transaction });
    if (!category) {
      throw new Error('Category not found');
    }
    await category.destroy({ transaction });
    await transaction.commit();
    return { message: 'Category deleted successfully' };
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

export default {
  createCategory,
  getAllCategories,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
