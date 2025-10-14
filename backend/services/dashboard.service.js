import db from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { format } from 'date-fns';

const { User, Movie, Episode, Comment, Favorite, WatchHistory } = db;

// Define weights for trending score calculation
const TRENDING_WEIGHTS = {
  views: 0.5,
  likes: 0.3,
  comments: 0.2,
};

/**
 * Helper function to get the start date for a given period.
 * @param {string} period - 'day', 'week', 'month'
 * @returns {Date} The calculated start date.
 */
const getPeriodStartDate = (period) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0); // Start of the day

  switch (period) {
    case 'day':
      date.setDate(date.getDate() - 1); // Last 24 hours
      break;
    case 'week':
      date.setDate(date.getDate() - 7); // Last 7 days
      break;
    case 'month':
      date.setMonth(date.getMonth() - 1); // Last 30 days
      break;
    default:
      date.setDate(date.getDate() - 7); // Default to week
  }
  return date;
};

/**
 * @desc Lấy danh sách phim trending dựa trên lượt xem, tương tác (like, comment) trong một khoảng thời gian.
 * @param {string} period - Khoảng thời gian ('day', 'week', 'month')
 * @param {number} limit - Số lượng phim muốn lấy
 * @returns {Promise<Array<object>>} Danh sách phim trending với điểm số.
 */
const getTrendingMoviesByPeriod = async (period, limit = 10) => {
  const startDate = getPeriodStartDate(period);

  // Fetch movies that were created or updated within the period
  const movies = await Movie.findAll({
    where: {
      [Op.or]: [
        { createdAt: { [Op.gte]: startDate } },
        { updatedAt: { [Op.gte]: startDate } },
      ],
    },
    attributes: ['id', 'titles', 'slug', 'image', 'views', 'createdAt', 'updatedAt'],
    // Removed direct includes for Comment and Favorite to avoid SequelizeEagerLoadingError
    // Counts will be fetched separately below.
    group: ['Movie.id'], // Group by movie ID
    order: [['views', 'DESC']], // Initial sort by views
    subQuery: false,
  });

  // Calculate interaction counts for each movie
  const moviesWithInteractions = await Promise.all(movies.map(async (movie) => {
    const commentCount = await Comment.count({
      where: {
        contentId: movie.id,
        contentType: 'movie',
        createdAt: { [Op.gte]: startDate },
      },
    });

    const likeCount = await Favorite.count({
      where: {
        movieId: movie.id,
        createdAt: { [Op.gte]: startDate },
      },
    });

    return {
      ...movie.toJSON(),
      commentCount,
      likeCount,
    };
  }));

  // Normalize metrics and calculate trending score
  let maxViews = 0;
  let maxLikes = 0;
  let maxComments = 0;

  if (moviesWithInteractions.length > 0) {
    maxViews = Math.max(...moviesWithInteractions.map(m => m.views));
    maxLikes = Math.max(...moviesWithInteractions.map(m => m.likeCount));
    maxComments = Math.max(...moviesWithInteractions.map(m => m.commentCount));
  }

  const trendingMovies = moviesWithInteractions.map(movie => {
    const normalizedViews = maxViews > 0 ? movie.views / maxViews : 0;
    const normalizedLikes = maxLikes > 0 ? movie.likeCount / maxLikes : 0;
    const normalizedComments = maxComments > 0 ? movie.commentCount / maxComments : 0;

    const trendingScore = (
      normalizedViews * TRENDING_WEIGHTS.views +
      normalizedLikes * TRENDING_WEIGHTS.likes +
      normalizedComments * TRENDING_WEIGHTS.comments
    );

    return {
      ...movie,
      trendingScore: parseFloat(trendingScore.toFixed(4)), // Keep score readable
    };
  });

  // Sort by trending score and take the top N
  return trendingMovies
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, limit);
};

/**
 * @desc Lấy dữ liệu phân tích cho Dashboard Admin
 * @returns {Promise<object>} Dữ liệu tổng quan, biểu đồ và danh sách gần đây
 */
const getDashboardAnalytics = async () => {
  // Lấy ngày 7 ngày trước
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Bao gồm cả ngày hiện tại và 6 ngày trước đó
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Tạo mảng 7 ngày gần nhất để đảm bảo đủ dữ liệu cho biểu đồ
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(sevenDaysAgo.getDate() + i);
    return format(d, 'yyyy-MM-dd');
  });

  // --- Thống kê tổng quan (Overall Stats) ---
  const [
    totalUsers,
    totalMovies,
    totalEpisodes,
    totalComments,
    totalMovieViews,
    totalEpisodeViews,
  ] = await Promise.all([
    User.count(),
    Movie.count(),
    Episode.count(),
    Comment.count(),
    Movie.sum('views'),
    Episode.sum('views'),
  ]);

  const totalViews = (totalMovieViews || 0) + (totalEpisodeViews || 0);

  // --- Dữ liệu cho biểu đồ (Chart Data) ---

  // User Registrations
  const userRegistrationsRaw = await User.findAll({
    attributes: [
      [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
    ],
    where: {
      createdAt: {
        [Op.gte]: sevenDaysAgo,
      },
    },
    group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
    order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']],
    raw: true,
  });
  const userRegistrationsMap = new Map(userRegistrationsRaw.map(item => [format(new Date(item.date), 'yyyy-MM-dd'), item.count]));
  const userRegistrations = last7Days.map(date => ({
    date,
    count: userRegistrationsMap.get(date) || 0,
  }));

  // Movie Uploads
  const movieUploadsRaw = await Movie.findAll({
    attributes: [
      [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
    ],
    where: {
      createdAt: {
        [Op.gte]: sevenDaysAgo,
      },
    },
    group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
    order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']],
    raw: true,
  });
  const movieUploadsMap = new Map(movieUploadsRaw.map(item => [format(new Date(item.date), 'yyyy-MM-dd'), item.count]));
  const movieUploads = last7Days.map(date => ({
    date,
    count: movieUploadsMap.get(date) || 0,
  }));

  // Comment Activity
  const commentActivityRaw = await Comment.findAll({
    attributes: [
      [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
    ],
    where: {
      createdAt: {
        [Op.gte]: sevenDaysAgo,
      },
    },
    group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
    order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']],
    raw: true,
  });
  const commentActivityMap = new Map(commentActivityRaw.map(item => [format(new Date(item.date), 'yyyy-MM-dd'), item.count]));
  const commentActivity = last7Days.map(date => ({
    date,
    count: commentActivityMap.get(date) || 0,
  }));

  // --- Danh sách gần đây (Recent Lists) ---
  const [recentUsers, recentMovies, mostViewedMovies, mostCommentedMoviesRaw] = await Promise.all([
    User.findAll({
      attributes: ['id', 'username', 'avatarUrl', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5,
    }),
    Movie.findAll({
      attributes: ['id', 'titles', 'slug', 'image', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5,
    }),
    Movie.findAll({
      attributes: ['id', 'titles', 'slug', 'image', 'views'],
      order: [['views', 'DESC']],
      limit: 5,
    }),
    Comment.findAll({
      attributes: [
        'contentId',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'commentCount'],
      ],
      where: {
        contentType: 'movie',
      },
      group: ['contentId'],
      order: [[Sequelize.literal('commentCount'), 'DESC']],
      limit: 5,
      raw: true,
    }),
  ]);

  // Lấy thông tin phim cho mostCommentedMovies
  const mostCommentedMovieIds = mostCommentedMoviesRaw.map(c => c.contentId);
  const mostCommentedMovies = await Movie.findAll({
    attributes: ['id', 'titles', 'slug', 'image'],
    where: {
      id: {
        [Op.in]: mostCommentedMovieIds,
      },
    },
    // Sắp xếp lại theo thứ tự từ mostCommentedMoviesRaw
    order: [
      Sequelize.literal(`FIELD(Movie.id, ${mostCommentedMovieIds.join(',')})`)
    ],
  });

  return {
    overallStats: {
      totalUsers,
      totalMovies,
      totalEpisodes,
      totalComments,
      totalViews,
    },
    chartData: {
      userRegistrations,
      movieUploads,
      commentActivity,
    },
    recentLists: {
      recentUsers,
      recentMovies,
      mostViewedMovies,
      mostCommentedMovies,
    },
  };
};

export { getDashboardAnalytics, getTrendingMoviesByPeriod };
