import db from '../models/index.js';
import { Op } from 'sequelize';
import { generateSlug } from '../utils/slugUtil.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Movie, Genre, Country, Category, Series, Episode, Section, Favorite, WatchHistory, sequelize } = db;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @desc Lấy tất cả phim không phân trang (dành cho dropdown, select2, v.v.)
 * @returns {Promise<Array<Movie>>} Danh sách tất cả phim
 */
const getAllMoviesNoPagination = async () => {
  return await Movie.findAll({
    include: [
      { model: Genre, as: 'genres', through: { attributes: [] } },
      { model: Country, as: 'country' },
      { model: Category, as: 'category' },
      { model: Episode, as: 'episodes', order: [['episodeNumber', 'ASC']] },
    ],
    order: [['createdAt', 'DESC']],
  });
}

/**
 * @desc Lấy danh sách phim với bộ lọc, phân trang và sắp xếp
 * @param {object} query - Đối tượng query từ request
 * @returns {Promise<object>} Danh sách phim và thông tin phân trang
 */
const getMovies = async (query) => {
  const {
    page = 1,
    limit = 10,
    q,
    genre,
    country,
    category,
    sort,
  } = query;

  const offset = (page - 1) * limit;
  const where = {};
  const include = [
    { model: Genre, as: 'genres', through: { attributes: [] } },
    { model: Country, as: 'country' },
    { model: Category, as: 'category' },
    { model: Series, as: 'series' },
    { model: Episode, as: 'episodes', order: [['episodeNumber', 'ASC']] },
  ];
  let order = [['createdAt', 'DESC']];

  // Xử lý tìm kiếm theo tiêu đề
  if (q) {
    where.titles = { [Op.like]: `%${q}%` };
  }

  // Xử lý lọc theo thể loại (có thể là ID hoặc slug)
  if (genre) {
    const genreList = genre.split(',');
    include.push({
      model: Genre,
      as: 'genres',
      where: {
        [Op.or]: [
          { id: { [Op.in]: genreList } },
          { slug: { [Op.in]: genreList } },
        ],
      },
      through: { attributes: [] },
    });
  }

  // Xử lý lọc theo quốc gia, danh mục, năm
  if (country) where.countryId = country;
  if (category) where.categoryId = category;

  // Xử lý sắp xếp
  if (sort) {
    order = sort.split(',').map(s => {
      const [field, direction] = s.split(':');
      return [field, direction.toUpperCase()];
    });
  }

  const { count, rows } = await Movie.findAndCountAll({
    where,
    include,
    limit: parseInt(limit),
    offset,
    order,
    distinct: true,
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
};

/**
 * @desc Lấy chi tiết một phim theo ID hoặc Slug
 * @param {number|string} identifier - ID hoặc Slug của phim
 * @returns {Promise<Movie>} Chi tiết phim
 */
const getMovieById = async (identifier) => {
  const isNumeric = !isNaN(identifier) && !isNaN(parseFloat(identifier));
  const where = isNumeric ? { id: identifier } : { slug: identifier };

  const movie = await Movie.findOne({
    where,
    include: [
      { model: Genre, as: 'genres', through: { attributes: [] } },
      { model: Country, as: 'country' },
      { model: Category, as: 'category' },
      { model: Episode, as: 'episodes', order: [['episodeNumber', 'ASC']] },
    ],
  });

  if (!movie) {
    throw new Error('Phim không tồn tại.');
  }
  
  // Tăng lượt xem
  await movie.increment('views', { by: 1, silent: 'updatedAt' });

  return movie;
};

/**
 * @desc Lấy chi tiết một phim theo slug cho người dùng
 * @param {string} slug - Slug của phim
 * @param {number} [userId] - ID của người dùng (tùy chọn)
 * @returns {Promise<object>} Chi tiết phim và trạng thái yêu thích
 */
const getMovieDetailBySlug = async (slug, userId = null) => {
  const movie = await Movie.findOne({
    where: { slug },
    include: [
      { model: Genre, as: 'genres', attributes: ['id', 'title', 'slug'], through: { attributes: [] } },
      { model: Country, as: 'country', attributes: ['id', 'title', 'slug'] },
      { model: Category, as: 'category', attributes: ['id', 'title', 'slug'] },
      { model: Series, as: 'series', attributes: ['id', 'title', 'slug'] },
      { model: Episode, as: 'episodes', attributes: ['id', 'uuid', 'episodeNumber', 'duration'], order: [['episodeNumber', 'ASC']] },
    ],
  });

  if (!movie) {
    throw new Error('Phim không tồn tại.');
  }

  // Tăng lượt xem phim
  await movie.increment('views', { by: 1, silent: 'updatedAt' });

  let isFavorite = false;
  if (userId) {
    const favorite = await Favorite.findOne({
      where: { userId, movieId: movie.id },
    });
    isFavorite = !!favorite;
  }

  return { movie, isFavorite };
};

/**
 * @desc Lấy dữ liệu cần thiết cho trang xem phim
 * @param {string} slug - Slug của phim
 * @param {number} [episodeNumber] - Số tập (tùy chọn, mặc định là 1 cho phim bộ)
 * @param {number} [userId] - ID của người dùng (tùy chọn)
 * @returns {Promise<object>} Dữ liệu xem phim
 */
const getMovieWatchDataBySlug = async (slug, episodeNumber = null, userId = null) => {
  const movie = await Movie.findOne({
    where: { slug },
    include: [
      { model: Genre, as: 'genres', attributes: ['id', 'title', 'slug'], through: { attributes: [] } },
      { model: Country, as: 'country', attributes: ['id', 'title', 'slug'] },
      { model: Category, as: 'category', attributes: ['id', 'title', 'slug'] },
      { model: Series, as: 'series', attributes: ['id', 'title', 'slug'] },
    ],
  });

  if (!movie) {
    throw new Error('Phim không tồn tại.');
  }

  const allEpisodes = await Episode.findAll({
    where: { movieId: movie.id },
    order: [['episodeNumber', 'ASC']],
    attributes: ['id', 'uuid', 'episodeNumber', 'linkEpisode', 'duration', 'views'],
  });

  let currentEpisode = null;
  if (movie.type === 'series' && allEpisodes.length > 0) {
    const targetEpisodeNumber = episodeNumber ? parseInt(episodeNumber, 10) : 1;
    currentEpisode = allEpisodes.find(ep => ep.episodeNumber === targetEpisodeNumber);
    if (!currentEpisode) {
      throw new Error(`Tập phim số ${targetEpisodeNumber} không tồn tại.`);
    }
  } else if (movie.type === 'movie' && allEpisodes.length > 0) {
    // Phim lẻ chỉ có 1 tập, lấy tập đầu tiên
    currentEpisode = allEpisodes[0];
  } else if (allEpisodes.length === 0) {
    throw new Error('Không có tập phim nào cho phim này.');
  }

  // Tăng lượt xem cho tập phim hiện tại
  if (currentEpisode && movie) {
    await currentEpisode.increment('views', { by: 1, silent: 'updatedAt' });
    await movie.increment('views', { by: 1, silent: 'updatedAt' });
  }

  const recommendedMovies = await getRecommendedMovies(movie.id, { limit: 5 });
  const moviesInSameSeries = await getMoviesInSameSeries(movie.id, { limit: 5 });

  let watchProgress = 0;
  if (userId && currentEpisode) {
    const watchHistory = await WatchHistory.findOne({
      where: { userId, movieId: movie.id, episodeId: currentEpisode.id },
    });
    watchProgress = watchHistory ? watchHistory.progress : 0;
  }

  return {
    movie,
    currentEpisode,
    episodes: allEpisodes,
    recommendedMovies: recommendedMovies.data,
    moviesInSameSeries: moviesInSameSeries.data,
    watchProgress,
  };
};

/**
 * Sets genres for a movie instance.
 */
const _setMovieGenres = async (movieInstance, genreIds, transaction) => {
  if (!genreIds || !Array.isArray(genreIds) || genreIds.length === 0) {
      return;
  }
  const genres = await Genre.findAll({
      where: { id: { [Op.in]: genreIds.map(id => parseInt(id)) } },
      transaction,
  });
  await movieInstance.setGenres(genres, { transaction });
};

/**
 * @desc Tạo phim mới
 * @param {object} movieData - Dữ liệu phim
 * @param {object} files - File ảnh (poster, banner, cover)
 * @returns {Promise<Movie>} Phim vừa được tạo
 */
const createMovie = async (movieData, files) => {
  const t = await sequelize.transaction();
  try {
    // Kiểm tra seriesId
    if (movieData.seriesId === '' || movieData.seriesId === null || movieData.seriesId === undefined) {
      movieData.seriesId = null;
    } else {
      const seriesExists = await Series.findByPk(movieData.seriesId, { transaction: t });
      if (!seriesExists) {
        throw new Error('Series không tồn tại.');
      }
    }

    // Tạo slug thủ công trước khi xử lý ảnh
    if (movieData.titles && Array.isArray(movieData.titles)) {
      const defaultTitleObj = movieData.titles.find(t => t.type === 'default');
      if (defaultTitleObj && defaultTitleObj.title) {
        movieData.slug = generateSlug(defaultTitleObj.title);
      }
    }

    // Xử lý đường dẫn ảnh
    if (files) {
      const imagePaths = {};
      const slug = movieData.slug;
      if (files.poster) imagePaths.posterUrl = `/uploads/movies/${slug}/${files.poster[0].filename}`;
      if (files.banner) imagePaths.bannerUrl = `/uploads/movies/${slug}/${files.banner[0].filename}`;
      if (files.cover) imagePaths.coverUrl = `/uploads/movies/${slug}/${files.cover[0].filename}`;
      movieData.image = imagePaths;
    }

    const newMovie = await Movie.create(movieData, { transaction: t });

    // Gán thể loại cho phim
    await _setMovieGenres(newMovie, movieData.genres, t);

    // Tạo sections nếu có
    if (movieData.sections && movieData.sections.length > 0) {
      const sections = movieData.sections.map(section => ({
        ...section,
        movieId: newMovie.id,
      }));
      await Section.bulkCreate(sections, { transaction: t });
    }

    await t.commit();
    return getMovieById(newMovie.id);
  } catch (error) {
    await t.rollback();
    // Xóa file đã upload nếu có lỗi
    if (files) {
        Object.values(files).forEach(fileArray => {
            fileArray.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) console.error(`Lỗi khi xóa file ${file.path}:`, err);
                });
            });
        });
    }
    throw error;
  }
};

/**
 * @desc Cập nhật thông tin phim
 * @param {number} id - ID phim
 * @param {object} movieData - Dữ liệu cập nhật
 * @param {object} files - File ảnh mới
 * @returns {Promise<Movie>} Phim đã được cập nhật
 */
const updateMovie = async (id, movieData, files) => {
    const movie = await Movie.findByPk(id);
    if (!movie) {
        throw new Error('Phim không tồn tại.');
    }

    const t = await sequelize.transaction();
    try {
        // Kiểm tra seriesId
        if (movieData.seriesId === '' || movieData.seriesId === null || movieData.seriesId === undefined) {
            movieData.seriesId = null;
        } else {
            const seriesExists = await Series.findByPk(movieData.seriesId, { transaction: t });
            if (!seriesExists) {
                throw new Error('Series không tồn tại.');
            }
        }
        
        // Xử lý và xóa ảnh cũ nếu có ảnh mới
        if (files) {
            const newImagePaths = { ...movie.image };
            const slug = movie.slug;
            const uploadDir = path.join(__dirname, '../uploads/movies', slug);

            const deleteOldImage = (filePath) => {
                if (filePath) {
                    const fullPath = path.join(__dirname, '..', filePath);
                    try {
                        if (fs.existsSync(fullPath)) {
                            fs.unlinkSync(fullPath);
                        }
                    } catch (err) {
                        console.error(`Lỗi khi xóa ảnh cũ ${fullPath}:`, err);
                    }
                }
            };

            if (files.poster) {
                deleteOldImage(newImagePaths.posterUrl);
                newImagePaths.posterUrl = `/uploads/movies/${slug}/${files.poster[0].filename}`;
            }
            if (files.banner) {
                deleteOldImage(newImagePaths.bannerUrl);
                newImagePaths.bannerUrl = `/uploads/movies/${slug}/${files.banner[0].filename}`;
            }
            if (files.cover) {
                deleteOldImage(newImagePaths.coverUrl);
                newImagePaths.coverUrl = `/uploads/movies/${slug}/${files.cover[0].filename}`;
            }
            movieData.image = newImagePaths;
        }

        await movie.update(movieData, { transaction: t });

        // Cập nhật thể loại
        if (movieData.genres) { // Cho phép xóa hết genre nếu mảng rỗng
            await movie.setGenres(movieData.genres, { transaction: t });
        }

        await t.commit();
        return getMovieById(movie.id);
    } catch (error) {
        await t.rollback();
        // Xóa file mới upload nếu có lỗi
        if (files) {
            Object.values(files).forEach(fileArray => {
                fileArray.forEach(file => {
                    fs.unlink(file.path, (err) => {
                        if (err) console.error(`Lỗi khi xóa file ${file.path}:`, err);
                    });
                });
            });
        }
        throw error;
    }
};

/**
 * @desc Xóa phim
 * @param {number} id - ID phim
 * @returns {Promise<void>}
 */
const deleteMovie = async (id) => {
  const movie = await Movie.findByPk(id);
  if (!movie) {
    throw new Error('Phim không tồn tại.');
  }

  const t = await sequelize.transaction();
  try {
    // Xóa các liên kết và tài nguyên phụ thuộc
    await movie.setGenres([], { transaction: t }); // Xóa liên kết trong movie_genres
    await Episode.destroy({ where: { movieId: id }, transaction: t });
    await Section.destroy({ where: { movieId: id }, transaction:t });

    // Xóa phim
    await movie.destroy({ transaction: t });

    await t.commit();

    // Xóa thư mục uploads của phim
    const movieUploadDir = path.join(__dirname, `../uploads/movies/${movie.slug}`);
    try {
      if (fs.existsSync(movieUploadDir)) {
        fs.rmSync(movieUploadDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.error(`Lỗi khi xóa thư mục ${movieUploadDir}:`, err);
      // Không throw lỗi ở đây để không làm hỏng response thành công
    }
  } catch (error) {
    await t.rollback();
    throw error;
  }
};


const COMMON_MOVIE_INCLUDES = [
  { model: Genre, as: 'genres', attributes: ['id', 'title', 'slug'], through: { attributes: [] } },
  { model: Country, as: 'country', attributes: ['id', 'title', 'slug'] },
  { model: Category, as: 'category', attributes: ['id', 'title', 'slug'] },
  { model: Series, as: 'series' },
  { model: Episode, as: 'episodes', order: [['episodeNumber', 'DESC']], limit: 1 }
];
const HERO_SCORING_WEIGHTS = {
  views: 0.5,
  recency: 0.35,
  completeness: 0.15,
};
const _createDateOffset = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

const _calculateHeroScore = (movie) => {
  const now = new Date();
  const updatedAt = new Date(movie.updatedAt);
  const daysSinceUpdate = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));

  const views = Number(movie.views) || 0;
  const viewsScore = Math.min(views / 100000, 1);
  const recencyScore = Math.max(0, 1 - daysSinceUpdate / 30);

  let completenessScore = 0;
  const hasGenres = Array.isArray(movie.genres) && movie.genres.length > 0;
  const hasBanner = !!(movie.image && movie.image.bannerUrl);
  const hasTrailer = !!movie.trailerUrl;
  const hasEpisodes = Array.isArray(movie.episodes) && movie.episodes.length > 0;

  if (hasGenres) completenessScore += 0.2;
  if (hasBanner) completenessScore += 0.25;
  if (hasTrailer || hasEpisodes) completenessScore += 0.15;
  completenessScore = Math.min(completenessScore, 1);

  const score = (
      viewsScore * HERO_SCORING_WEIGHTS.views +
      recencyScore * HERO_SCORING_WEIGHTS.recency +
      completenessScore * HERO_SCORING_WEIGHTS.completeness
  );

  return Math.round(score * 1000) / 1000;
};

const _buildSmartHeroQuery = (daysBack, limit) => ({
  where: {
      updatedAt: {
          [Op.gte]: _createDateOffset(daysBack)
      },
      views: { [Op.gte]: 50 },
  },
  order: [['views', 'DESC'], ['updatedAt', 'DESC']],
  limit: limit * 3,
  include: COMMON_MOVIE_INCLUDES,
  distinct: true,
});

const _ensureHeroDiversity = (candidates, targetLimit) => {
  const selected = [];
  const genreCount = {};
  const countryCount = {};
  const maxPerGenre = Math.max(1, Math.floor(targetLimit * 0.6)); // Max 60% from same genre
  const maxPerCountry = Math.max(1, Math.floor(targetLimit * 0.7)); // Max 70% from same country

  for (const candidate of candidates) {
      if (selected.length >= targetLimit) break;

      // Safely extract arrays with proper null checks
      const movieGenres = Array.isArray(candidate.genres) ? candidate.genres : [];

      let genreConflict = false;

      // Check if adding this movie would violate diversity rules
      for (const genre of movieGenres) {
          if (genre && genre.slug && (genreCount[genre.slug] || 0) >= maxPerGenre) {
              genreConflict = true;
              break;
          }
      }

      // If no conflicts or we're still filling initial slots, add the candidate
      if (!genreConflict) {
          selected.push(candidate);

          // Update counters with null safety
          movieGenres.forEach(genre => {
              if (genre && genre.slug) {
                  genreCount[genre.slug] = (genreCount[genre.slug] || 0) + 1;
              }
          });
      }
  }

  if (selected.length < targetLimit) {
      const remaining = candidates.filter(c => !selected.find(s => s.id === c.id));
      selected.push(...remaining.slice(0, targetLimit - selected.length));
  }

  return selected;
};

const _getSmartFeaturedForHero = async (targetLimit) => {
  let featuredMovies = [];
  let candidateCount = 0;
  for (const period of [7, 14, 30, 60]) {
      const candidates = await Movie.findAll(_buildSmartHeroQuery(period, targetLimit));

      if (candidates.length === 0) continue;

      const scoredCandidates = candidates
          .map(movie => {
              try {
                  const movieData = movie.toJSON ? movie.toJSON() : movie;
                  return {
                      ...movieData,
                      heroScore: _calculateHeroScore(movieData)
                  };
              } catch (error) {
                  console.error('Error processing movie candidate:', movie.id, error);
                  return null;
              }
          })
          .filter(candidate => candidate !== null);

      const topCandidates = scoredCandidates
          .sort((a, b) => b.heroScore - a.heroScore)
          .slice(0, targetLimit);

      const diverseCandidates = _ensureHeroDiversity(topCandidates, targetLimit);

      if (diverseCandidates.length >= targetLimit) {
          featuredMovies = diverseCandidates;
          candidateCount = candidates.length;
          console.log(`✅ Featured hero selection: Found ${featuredMovies.length} movies from ${period}-day period (${candidateCount} candidates evaluated)`);
          break;
      }

      if (diverseCandidates.length > featuredMovies.length) {
          featuredMovies = diverseCandidates;
          candidateCount = candidates.length;
      }
  }

  if (featuredMovies.length < targetLimit) {
      console.warn(`⚠️ Insufficient featured candidates (${featuredMovies.length}/${targetLimit}). Applying final fallback.`);

      const fallbackMovies = await Movie.findAll({
          order: [['views', 'DESC'], ['createdAt', 'DESC']],
          limit: targetLimit,
          include: COMMON_MOVIE_INCLUDES,
          distinct: true,
      });

      featuredMovies = fallbackMovies
          .map(movie => {
              try {
                  const movieData = movie.toJSON ? movie.toJSON() : movie;
                  return {
                      ...movieData,
                      heroScore: _calculateHeroScore(movieData)
                  };
              } catch (error) {
                  console.error('Error processing fallback movie:', movie.id, error);
                  return movieData;
              }
          })
          .filter(movie => movie !== null);
  }

  return featuredMovies;
};

const TOP_MOVIE_SCORING_WEIGHTS = {
    views: 0.55,
    recency: 0.20,
    completeness: 0.15,
    imdb: 0.10,
};

const _calculateTopMovieScore = (movie) => {
    const now = new Date();
    const updatedAt = new Date(movie.updatedAt);
    const daysSinceUpdate = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));

    // 1. View Score (sử dụng thang đo logarit để phân biệt tốt hơn ở các mức view khác nhau)
    const views = Number(movie.views) || 1; // Tránh log(0)
    const viewsScore = Math.min(Math.log10(views) / 6, 1); // Chuẩn hóa, giả sử view thực tế tối đa khoảng 1,000,000

    // 2. Recency Score (giảm điểm chậm hơn so với hero section)
    const recencyScore = Math.max(0, 1 - daysSinceUpdate / 90); // Điểm giảm dần trong 90 ngày

    // 3. Completeness Score (điểm cho sự đầy đủ thông tin)
    let completenessScore = 0;
    const hasPoster = !!(movie.image && movie.image.posterUrl);
    const hasDescription = !!movie.description && movie.description.length > 50;
    const hasGenres = Array.isArray(movie.genres) && movie.genres.length > 0;
    // Phim lẻ được coi là "hoàn thành" nếu có thông tin cơ bản, phim bộ cần có tập phim
    const isComplete = movie.belongToCategory === 'Phim lẻ' || (Array.isArray(movie.episodes) && movie.episodes.length > 0);
    
    if (hasPoster) completenessScore += 0.25;
    if (hasDescription) completenessScore += 0.25;
    if (hasGenres) completenessScore += 0.25;
    if (isComplete) completenessScore += 0.25;
    completenessScore = Math.min(completenessScore, 1);

    // 4. IMDB Score (nếu có và là số hợp lệ)
    const imdbRating = parseFloat(movie.imdb);
    const imdbScore = !isNaN(imdbRating) ? Math.min(imdbRating / 10, 1) : 0.5; // Mặc định 0.5 nếu không có imdb

    const score = (
        viewsScore * TOP_MOVIE_SCORING_WEIGHTS.views +
        recencyScore * TOP_MOVIE_SCORING_WEIGHTS.recency +
        completenessScore * TOP_MOVIE_SCORING_WEIGHTS.completeness +
        imdbScore * TOP_MOVIE_SCORING_WEIGHTS.imdb
    );

    // Thêm một chút ngẫu nhiên để danh sách thay đổi nhẹ
    const randomFactor = 1 + (Math.random() - 0.5) * 0.02; // +/- 1%
    
    return score;
};

/**
 * @desc Lấy danh sách phim trending (theo views)
 * @param {object} query - Đối tượng query từ request (limit)
 * @returns {Promise<object>} Danh sách phim trending
 */
const getTrendingMovies = async (query) => {
  const { limit = 10 } = query;
  const featured = await _getSmartFeaturedForHero(parseInt(limit));
  return {
    data: featured,
    meta: {
      limit: parseInt(limit),
      total: featured.lsength
    },
  };
};

/**
 * @desc Lấy danh sách phim mới cập nhật
 * @param {object} query - Đối tượng query từ request (limit)
 * @returns {Promise<object>} Danh sách phim mới cập nhật
 */
const getLatestMovies = async (query) => {
  const { page = 1, limit = 10 } = query;
  const offset = (page - 1) * parseInt(limit);

  const { count, rows } = await Movie.findAndCountAll({
    include: [
      { model: Genre, as: 'genres',  attributes: ['title', 'slug'], through: { attributes: [] } },
      { model: Country, as: 'country' },
      { model: Category, as: 'category' },
      { model: Episode, as: 'episodes', order: [['episodeNumber', 'ASC']] },
    ],
    attributes: { exclude: ['uuid', 'createdAt', 'countryId', 'categoryId'] },
    limit: parseInt(limit),
    offset,
    order: [['updatedAt', 'DESC']],
    distinct: true,
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
};

/**
 * @desc Lấy danh sách phim cùng thể loại
 * @param {number} movieId - ID của phim gốc
 * @param {object} query - Đối tượng query từ request (limit)
 * @returns {Promise<object>} Danh sách phim cùng thể loại
 */
const getSimilarMovies = async (movieId, query) => {
  const { limit = 10 } = query;
  const movie = await Movie.findByPk(movieId, {
    include: [{ model: Genre, as: 'genres' }],
  });

  if (!movie) {
    throw new Error('Phim không tồn tại.');
  }

  const genreIds = movie.genres.map((genre) => genre.id);

  const { count, rows } = await Movie.findAndCountAll({
    where: {
      id: { [Op.ne]: movieId }, // Loại trừ phim hiện tại
    },
    include: [
      {
        model: Genre,
        as: 'genres',
        where: { id: { [Op.in]: genreIds } },
        through: { attributes: [] },
      },
      { model: Country, as: 'country' },
      { model: Category, as: 'category' },
      { model: Series, as: 'series' },
      { model: Episode, as: 'episodes', order: [['episodeNumber', 'ASC']] },
    ],
    limit: parseInt(limit),
    order: sequelize.random(), // Sắp xếp ngẫu nhiên
    distinct: true,
  });

  return {
    data: rows,
    meta: {
      limit: parseInt(limit),
      total: count,
    },
  };
};

/**
 * @desc Lấy danh sách phim cùng series
 * @param {number} movieId - ID của phim gốc
 * @param {object} query - Đối tượng query từ request (limit)
 * @returns {Promise<object>} Danh sách phim cùng series
 */
const getMoviesInSameSeries = async (movieId, query) => {
  const { limit = 10 } = query;
  const movie = await Movie.findByPk(movieId);

  if (!movie || !movie.seriesId) {
    return { data: [], meta: { limit: parseInt(limit), total: 0 } };
  }

  const { count, rows } = await Movie.findAndCountAll({
    where: {
      seriesId: movie.seriesId,
      id: { [Op.ne]: movieId }, // Loại trừ phim hiện tại
    },
    include: [
      { model: Genre, as: 'genres', through: { attributes: [] } },
      { model: Country, as: 'country' },
      { model: Category, as: 'category' },
      { model: Series, as: 'series' },
      { model: Episode, as: 'episodes', order: [['episodeNumber', 'ASC']] },
    ],
    order: [['releaseDate', 'ASC']],
    limit: parseInt(limit),
  });

  return {
    data: rows,
    meta: {
      limit: parseInt(limit),
      total: count,
    },
  };
};

/**
 * @desc Lấy danh sách tập của một phim
 * @param {number} movieId - ID của phim
 * @returns {Promise<object>} Danh sách tập phim
 */
const getMovieEpisodes = async (movieId) => {
  const movie = await Movie.findByPk(movieId, {
    include: [{ model: Episode, as: 'episodes', order: [['episodeNumber', 'ASC']] }],
  });

  if (!movie) {
    throw new Error('Phim không tồn tại.');
  }

  return {
    data: movie.episodes,
    meta: {
      total: movie.episodes.length,
    },
  };
};

/**
 * @desc Lấy danh sách phim đề xuất
 * @param {number} movieId - ID của phim đang xem
 * @param {object} query - Đối tượng query từ request (limit)
 * @returns {Promise<object>} Danh sách phim đề xuất
 */
const getRecommendedMovies = async (movieId, query) => {
  const { limit = 10 } = query;
  const movie = await Movie.findByPk(movieId, {
    include: [{ model: Genre, as: 'genres' }, { model: Country, as: 'country' }],
  });

  if (!movie) {
    // Nếu phim không tồn tại, trả về phim trending
    return getTrendingMovies(query);
  }

  const genreIds = movie.genres.map((genre) => genre.id);
  const countryId = movie.countryId;

    const where = {
      id: { [Op.ne]: movieId }, // Loại trừ phim hiện tại
    };

    const include = [
      { model: Genre, as: 'genres', through: { attributes: [] } },
      { model: Country, as: 'country' },
      { model: Category, as: 'category' },
      { model: Episode, as: 'episodes', order: [['episodeNumber', 'ASC']] },
    ];

  if (genreIds.length > 0) {
      include.push({
          model: Genre,
          as: 'genres',
          where: {
              id: { [Op.in]: genreIds }
          },
          through: { attributes: [] }
      });
  }

  if (countryId) {
      where.countryId = countryId;
  }

  const { count, rows } = await Movie.findAndCountAll({
    where,
    include,
    limit: parseInt(limit),
    order: sequelize.random(), // Sắp xếp ngẫu nhiên để đa dạng hóa đề xuất
    distinct: true,
  });

  // Nếu không tìm thấy đủ phim đề xuất, bổ sung bằng phim trending
  if (rows.length < limit) {
    const trending = await getTrendingMovies({ limit: limit - rows.length });
    const existingIds = new Set(rows.map(m => m.id));
    const combined = [...rows, ...trending.data.filter(m => !existingIds.has(m.id))];
    return {
      data: combined.slice(0, limit),
      meta: {
        limit: parseInt(limit),
        total: combined.length,
      },
    };
  }

  return {
    data: rows,
    meta: {
      limit: parseInt(limit),
      total: count,
    },
  };
};

/**
 * @desc Lấy danh sách top 10 phim đáng xem, sử dụng thuật toán tính điểm thông minh
 * @returns {Promise<object>} Danh sách top 10 phim đáng xem
 */
const getTop10Movies = async () => {
  // 1. Lấy một nhóm ứng viên tiềm năng lớn hơn
  const candidates = await Movie.findAll({
    where: {
      views: { [Op.gte]: 100 } // Lọc bớt những phim có ít lượt xem
    },
    order: [['views', 'DESC']],
    limit: 50, // Lấy 50 phim có lượt xem cao nhất làm ứng viên
    include: COMMON_MOVIE_INCLUDES,
    distinct: true,
  });

  // 2. Tính điểm cho từng ứng viên và lọc
  const scoredMovies = candidates
    .map(movie => {
      try {
        const movieData = movie.toJSON ? movie.toJSON() : movie;
        return {
          ...movieData,
          topMovieScore: _calculateTopMovieScore(movieData),
        };
      } catch (error) {
        console.error(`Lỗi khi tính điểm cho phim ID ${movie.id}:`, error);
        return null;
      }
    })
    .filter(movie => movie && movie.topMovieScore > 0);

  // 3. Sắp xếp theo điểm số từ cao đến thấp
  const topMovies = scoredMovies.sort((a, b) => b.topMovieScore - a.topMovieScore);

  // 4. Lấy 10 phim hàng đầu
  const result = topMovies.slice(0, 10);

  return {
    data: result,
    meta: {
      limit: 10,
      total: result.length
    },
  };
};

/**
 * @desc Tìm kiếm phim chuyên nghiệp
 * @param {object} query - Đối tượng query từ request (q, page, limit)
 * @returns {Promise<object>} Danh sách phim và thông tin phân trang
 */
const searchMovies = async (query) => {
  const { q, page = 1, limit = 5 } = query;

  if (!q) {
    return {
      data: [],
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        totalPages: 0,
      },
    };
  }

  const offset = (page - 1) * limit;
  const keyword = `%${q}%`;

  const where = {
    [Op.or]: [
      // Chuyển đổi mảng JSON thành văn bản để tìm kiếm
      sequelize.where(sequelize.cast(sequelize.col('titles'), 'CHAR'), { [Op.like]: keyword }),
      sequelize.where(sequelize.cast(sequelize.col('tags'), 'CHAR'), { [Op.like]: keyword }),
      sequelize.where(sequelize.cast(sequelize.col('seoKeywords'), 'CHAR'), { [Op.like]: keyword }),
      sequelize.where(sequelize.cast(sequelize.col('cast'), 'CHAR'), { [Op.like]: keyword }),
      { director: { [Op.like]: keyword } },
      { studio: { [Op.like]: keyword } },
    ],
  };

  const { count, rows } = await Movie.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [['releaseDate', 'DESC']],
    distinct: true,
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
};

/**
 * @desc Lấy danh sách phim chiếu rạp
 * @param {object} query - Đối tượng query từ request (page, limit)
 * @returns {Promise<object>} Danh sách phim và thông tin phân trang
 */
const getTheaterMovies = async (query) => {
  const { page = 1, limit = 12 } = query;

  const theaterCategory = await Category.findOne({ where: { title: 'Phim chiếu rạp' } });

  if (!theaterCategory) {
    return {
      data: [],
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        totalPages: 0,
      },
    };
  }

  const offset = (page - 1) * limit;
  const where = {
    categoryId: theaterCategory.id,
  };

  const { count, rows } = await Movie.findAndCountAll({
    where,
    include: [
      { model: Genre, as: 'genres', through: { attributes: [] } },
      { model: Country, as: 'country' },
      { model: Category, as: 'category' },
      { model: Episode, as: 'episodes', order: [['episodeNumber', 'ASC']] },
    ],
    limit: parseInt(limit),
    offset,
    order: [['releaseDate', 'DESC']],
    distinct: true,
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
};

export {
  searchMovies,
  getAllMoviesNoPagination,
  getMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  getTrendingMovies,
  getLatestMovies,
  getSimilarMovies,
  getMoviesInSameSeries,
  getMovieEpisodes,
  getRecommendedMovies,
  getTop10Movies,
  getTheaterMovies,
  getMovieDetailBySlug,
  getMovieWatchDataBySlug,
};
