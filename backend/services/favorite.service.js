import db from '../models/index.js';
import { Op } from 'sequelize';

const { Favorite, Movie, Genre } = db;

const addFavorite = async (userId, movieId) => {
  const [fav, created] = await Favorite.findOrCreate({
    where: { userId, movieId },
    defaults: { userId, movieId },
  });
  return { favorite: fav, created };
};

const removeFavorite = async (userId, movieId) => {
  const deleted = await Favorite.destroy({ where: { userId, movieId } });
  return deleted > 0;
};

const listFavorites = async (userId, { page = 1, limit = 12, genre, sort = 'dateAdded' } = {}) => {
  const offset = (page - 1) * limit;
  const movieInclude = {
    model: Movie,
    as: 'movie',
    attributes: ['id', 'uuid', 'slug', 'titles', 'image', 'year', 'quality'], // Include rating and year for sorting/display
    include: [],
  };

  const whereConditions = { userId };
  const orderConditions = [];

  if (genre) {
    movieInclude.include.push({
      model: Genre,
      as: 'genres',
      where: { title: genre },
      through: { attributes: [] },
      required: true, // Use required: true for INNER JOIN to filter favorites by genre
    });
  }

  if (sort === 'dateAdded') {
    orderConditions.push(['createdAt', 'DESC']);
  }

  const { rows, count } = await Favorite.findAndCountAll({
    where: whereConditions,
    include: [movieInclude],
    limit,
    offset,
    order: orderConditions,
    distinct: true, // Ensure distinct favorites when joining with genres
  });

  const items = rows.map(r => r.movie).filter(Boolean);
  return {
    items,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit) || 1,
  };
};

const checkFavorite = async (userId, movieId) => {
  const favorite = await Favorite.findOne({
    where: { userId, movieId },
  });
  return !!favorite; // Return true if favorite exists, false otherwise
};

export default { addFavorite, removeFavorite, listFavorites, checkFavorite };
