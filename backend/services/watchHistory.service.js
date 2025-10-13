import db from '../models/index.js';
import { Op } from 'sequelize';

const { WatchHistory, Movie, Episode } = db;

const upsertProgress = async ({ userId, movieId, episodeId, progress, timestamp }) => {
  const [record, created] = await WatchHistory.findOrCreate({
    where: { userId, movieId, episodeId: episodeId || null },
    defaults: { userId, movieId, episodeId: episodeId || null, progress, timestamp: timestamp || new Date() },
  });

  if (!created) {
    record.progress = progress;
    record.timestamp = timestamp || new Date();
    await record.save();
  }
  return record;
};

const listHistory = async ({ userId, page = 1, limit = 12 }) => {
  const offset = (page - 1) * limit;
  const { rows, count } = await WatchHistory.findAndCountAll({
    where: { userId },
    include: [
      { model: Movie, as: 'movie', attributes: ['id', 'slug', 'titles', 'image', 'releaseDate'] },
      { model: Episode, as: 'episode', attributes: ['id', 'episodeNumber', 'duration'] },
    ],
    order: [['updatedAt', 'DESC']],
    limit,
    offset,
  });
  return { items: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) || 1 };
};

const removeOne = async ({ userId, id }) => {
  const deleted = await WatchHistory.destroy({ where: { id, userId } });
  return deleted > 0;
};

const clearAll = async ({ userId }) => {
  const deletedCount = await WatchHistory.destroy({ where: { userId } });
  return deletedCount;
};

export default {
  upsertProgress,
  listHistory,
  removeOne,
  clearAll,
};
