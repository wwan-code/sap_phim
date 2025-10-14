import db from '../models/index.js';
import {
  buildPrompt,
  callAIProvider,
  parseAIResponse,
  validateInput,
  checkRateLimit,
  formatTitlesForPrompt,
  formatGenresForPrompt,
  PROMPT_TEMPLATES,
  generateOtherTitlesWithAI,
  classifyCommentWithAI 
} from '../utils/ai.utils.js';

const { AiLog, User, Movie, Genre, Country, Category, WatchHistory } = db;

/**
 * @desc Ghi log tương tác AI vào cơ sở dữ liệu
 * @param {number} userId - ID của người dùng
 * @param {string} prompt - Câu hỏi/yêu cầu của người dùng
 * @param {string} response - Phản hồi từ AI
 * @param {string} type - Loại tương tác AI (suggestMovie, chat, translate, etc.)
 * @param {object} metadata - Thông tin bổ sung
 */
const logAiInteraction = async (userId, prompt, response, type = 'general', metadata = {}) => {
  try {
    await AiLog.create({ 
      userId, 
      prompt, 
      response,
      type,
      metadata: JSON.stringify(metadata)
    });
  } catch (error) {
    console.error('Lỗi khi ghi log AI:', error);
  }
};

/**
 * @desc Xử lý truy vấn chatbot
 * @param {number} userId - ID của người dùng
 * @param {string} prompt - Câu hỏi của người dùng
 * @returns {Promise<string>} Phản hồi từ AI
 */
const chatWithAI = async (userId, prompt) => {
  try {
    // Lấy thông tin người dùng để làm ngữ cảnh
    const user = await User.findByPk(userId, {
      attributes: ['username', 'email', 'sex', 'bio', 'points', 'level', 'createdAt'],
    });

    // Lấy lịch sử tương tác AI gần đây của người dùng
    const recentLogs = await AiLog.findAll({
      where: { userId },
      order: [['timestamp', 'DESC']],
      limit: 5,
    });

    // Lấy một số phim mà người dùng có thể đã xem hoặc quan tâm (ví dụ: trending movies)
    const trendingMovies = await Movie.findAll({
      order: [['views', 'DESC']],
      limit: 5,
      include: [
        { model: Genre, as: 'genres', through: { attributes: [] } },
        { model: Country, as: 'country' },
        { model: Category, as: 'category' },
      ],
    });

    let context = `Bạn là "Trợ lý AI Rạp Rê", một chatbot thân thiện và hữu ích, chuyên về phim ảnh. Bạn có thể gợi ý phim, hỗ trợ tìm phim, giải thích nội dung phim và dịch thuật.
    Chào người dùng bằng tên của họ và hỏi xem bạn có thể giúp gì.
    Thông tin người dùng hiện tại:
    - Tên đăng nhập: ${user?.username || 'Khách'}
    - Giới tính: ${user?.sex || 'Không rõ'}
    - Mô tả bản thân: ${user?.bio || 'Không có'}
    - Điểm: ${user?.points || 0}
    - Cấp độ: ${user?.level || 1}
    - Ngày tham gia: ${user?.createdAt ? user.createdAt.toDateString() : 'Không rõ'}

    Lịch sử tương tác gần đây với người dùng:
    ${recentLogs.map(log => `Người dùng: ${log.prompt}\nBạn: ${log.response}`).join('\n') || 'Chưa có lịch sử tương tác.'}

    Một số phim phổ biến hiện tại:
    ${trendingMovies.map(movie => `- ${movie.titles.find(t => t.type === 'default')?.title} (${movie.year || 'N/A'}) - Thể loại: ${movie.genres.map(g => g.title).join(', ')}`).join('\n')}

    Hãy trả lời một cách tự nhiên, hữu ích và liên quan đến ngữ cảnh phim ảnh.
    Nếu người dùng hỏi về dịch thuật, hãy thực hiện dịch thuật.
    `;

    const fullPrompt = `${context}\n\nNgười dùng: ${prompt}\nBạn:`;

    const response = await callAIProvider(fullPrompt);

    await logAiInteraction(userId, fullPrompt, response, 'chat'); // Log full prompt
    return response;
  } catch (error) {
    console.error('Lỗi khi chat với AI:', error);
    throw new Error('Không thể xử lý yêu cầu AI vào lúc này.');
  }
};

/**
 * @desc Gợi ý phim cho người dùng dựa trên sở thích và lịch sử
 * @param {number} userId - ID của người dùng
 * @param {object} options - Các tùy chọn gợi ý (ví dụ: số lượng, thể loại ưu tiên)
 * @returns {Promise<Array<Movie>>} Danh sách phim gợi ý
 */
const recommendMovies = async (userId, options = {}) => {
  try {
    const { limit = 10, preferredGenres = [] } = options;

    // Lấy thông tin người dùng
    const user = await User.findByPk(userId);

    // Lấy lịch sử xem phim của người dùng
    const userWatchHistory = await WatchHistory.findAll({
      where: { userId },
      include: [{ model: Movie, as: 'movie', include: [{ model: Genre, as: 'genres' }] }],
      order: [['updatedAt', 'DESC']],
      limit: 20, // Lấy 20 phim gần nhất để phân tích
    });

    const watchedMovieGenres = userWatchHistory.flatMap(history =>
      history.movie?.genres.map(genre => genre.title) || []
    );
    const genreCounts = watchedMovieGenres.reduce((acc, genre) => {
      acc[genre] = (acc[genre] || 0) + 1;
      return acc;
    }, {});

    const topGenres = Object.entries(genreCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 3)
      .map(([genre]) => genre);

    const finalPreferredGenres = [...new Set([...preferredGenres, ...topGenres])];

    let recommendationPrompt = `Gợi ý ${limit} phim cho người dùng.
    Người dùng có thể quan tâm đến các thể loại: ${finalPreferredGenres.length > 0 ? finalPreferredGenres.join(', ') : 'bất kỳ'}.
    Dựa trên lịch sử xem gần đây, người dùng đã xem các phim thuộc thể loại: ${topGenres.join(', ')}.
    Hãy đưa ra các gợi ý đa dạng và hấp dẫn, ưu tiên các phim chưa được xem bởi người dùng.
    Định dạng phản hồi là một danh sách các tiêu đề phim, mỗi tiêu đề trên một dòng.
    `;

    // Nếu có thông tin người dùng, thêm vào ngữ cảnh
    if (user) {
      recommendationPrompt += `\nThông tin người dùng:
      - Tên đăng nhập: ${user.username}
      - Giới tính: ${user.sex || 'Không rõ'}
      - Mô tả bản thân: ${user.bio || 'Không có'}
      `;
    }

    const aiResponse = await callAIProvider(recommendationPrompt);
    await logAiInteraction(userId, recommendationPrompt, aiResponse, 'recommendMovies');

    // Phân tích phản hồi từ AI để lấy danh sách tiêu đề phim
    const movieTitles = aiResponse.split('\n').map(line => line.replace(/^- /, '').trim()).filter(line => line !== '');

    // Lấy danh sách ID phim đã xem để loại trừ
    const watchedMovieIds = userWatchHistory.map(history => history.movieId);

    // Tìm kiếm các phim trong DB dựa trên tiêu đề gợi ý
    const recommendedMovies = await Movie.findAll({
      where: {
        titles: {
          [db.Sequelize.Op.or]: movieTitles.map(title => ({
            [db.Sequelize.Op.like]: `%${title}%`
          }))
        },
        id: { [db.Sequelize.Op.notIn]: watchedMovieIds } // Loại trừ phim đã xem
      },
      include: [
        { model: Genre, as: 'genres', through: { attributes: [] } },
        { model: Country, as: 'country' },
        { model: Category, as: 'category' },
      ],
      limit: limit,
    });

    // Nếu không tìm thấy đủ phim từ gợi ý AI, bổ sung bằng phim trending chưa xem
    if (recommendedMovies.length < limit) {
      const trending = await Movie.findAll({
        order: [['views', 'DESC']],
        limit: limit - recommendedMovies.length,
        where: {
          id: { [db.Sequelize.Op.notIn]: [...recommendedMovies.map(m => m.id), ...watchedMovieIds] }
        },
        include: [
          { model: Genre, as: 'genres', through: { attributes: [] } },
          { model: Country, as: 'country' },
          { model: Category, as: 'category' },
        ],
      });
      recommendedMovies.push(...trending);
    }

    return recommendedMovies;
  } catch (error) {
    console.error('Lỗi khi gợi ý phim:', error);
    throw new Error('Không thể gợi ý phim vào lúc này.');
  }
};

/**
 * @desc Dịch nội dung sử dụng AI
 * @param {number} userId - ID của người dùng
 * @param {string} text - Nội dung cần dịch
 * @param {string} targetLanguage - Ngôn ngữ đích (ví dụ: "English", "Vietnamese")
 * @returns {Promise<string>} Nội dung đã dịch
 */
const translateText = async (userId, text, targetLanguage) => {
  try {
    const prompt = `Dịch văn bản sau sang ${targetLanguage}: "${text}"`;
    const response = await callAIProvider(prompt);
    await logAiInteraction(userId, prompt, response, 'translate');
    return response;
  } catch (error) {
    console.error('Lỗi khi dịch văn bản:', error);
    throw new Error('Không thể dịch văn bản vào lúc này.');
  }
};

/**
 * @desc Gợi ý dữ liệu phim mới cho admin với context đầy đủ
 * @param {number} userId - ID của người dùng (admin)
 * @param {object} movieInfo - Thông tin phim hiện có
 * @param {Array} movieInfo.titles - Array of title objects [{type: "default", title: "..."}, ...]
 * @param {string} movieInfo.season - Season information (optional)
 * @param {string} movieInfo.description - Current description
 * @param {Array} movieInfo.genres - Array of genre objects (optional)
 * @param {string} movieInfo.type - Movie type (movie/series)
 * @returns {Promise<object>} Dữ liệu phim được gợi ý
 */
const suggestMovieData = async (userId, movieInfo) => {
  try {
    // Rate limiting check
    checkRateLimit(userId, 5, 60000);

    // Validate input
    if (!validateInput(movieInfo)) {
      throw new Error('Invalid input detected. Possible prompt injection attempt.');
    }

    const { titles = [], season, releaseYear = '', country = '', description = '', genres = [], type = 'movie' } = movieInfo;

    // Format titles for prompt
    let { defaultTitle, otherTitles } = formatTitlesForPrompt(titles);
    let aiGeneratedOtherTitlesCount = 0;
    
    if (!defaultTitle.trim()) {
      throw new Error('Default title is required for AI suggestion');
    }

    // If otherTitles are not provided, generate them using AI
    if (!otherTitles || otherTitles.length === 0) {
      const generatedTitles = await generateOtherTitlesWithAI(defaultTitle);
      if (generatedTitles.length > 0) {
        otherTitles = generatedTitles.map(t => `${t.type}: ${t.title}`).join(', ');
        aiGeneratedOtherTitlesCount = generatedTitles.length;
      }
    }
    
    // Format genres for prompt
    const genresString = formatGenresForPrompt(genres);

    // Fetch related movies from DB for better AI context
    const relatedMoviesArr = await getRelatedMoviesForContext(defaultTitle, Array.isArray(genres) ? genres : [], type);
    const relatedMovies = Array.isArray(relatedMoviesArr) && relatedMoviesArr.length > 0 ? relatedMoviesArr.join(', ') : '';

    // Build enhanced prompt with full context
    const prompt = buildPrompt('SUGGEST_MOVIE', {
      defaultTitle,
      otherTitles,
      season: season || '',
      country,
      description,
      genres: genresString,
      releaseYear,
      relatedMovies
    });

    // Call AI provider
    const aiResponse = await callAIProvider(prompt);
    
    // Parse response
    const suggestedData = parseAIResponse(aiResponse);

    // Add the AI-generated otherTitles to the suggestedData if they were generated
    if (aiGeneratedOtherTitlesCount > 0) {
      suggestedData.aiGeneratedOtherTitlesCount = aiGeneratedOtherTitlesCount;
    }
    
    return suggestedData;
  } catch (error) {
    console.error('Lỗi khi gợi ý dữ liệu phim:', error);
    throw new Error(`Không thể gợi ý dữ liệu phim: ${error.message}`);
  }
};

/**
 * Extracts the base title from a movie title by removing season, part, and other identifiers.
 * @param {string} title - The full movie title.
 * @returns {string} The base title.
 */
const getBaseTitle = (title) => {
    if (!title) return '';
    // Remove common suffixes like "Season 2", "Part 1", "2nd Season", etc.
    // Also removes text after a colon, which often indicates a subtitle for a specific season/arc.
    return title
        .replace(/\s*:\s*.*/, '') // "Title: Subtitle" -> "Title"
        .replace(/\s+((\d+)(st|nd|rd|th)?\s*season|season\s*(\d+))/i, '') // "Title Season 2" -> "Title"
        .replace(/\s+part\s+\d+/i, '') // "Title Part 2" -> "Title"
        .trim();
};

/**
 * @desc Get related movies from database for context
 * @param {string} title - Movie title
 * @param {Array} genres - Array of genres
 * @param {string} type - Movie type
 * @returns {Promise<Array>} Array of related movie titles
 */
const getRelatedMoviesForContext = async (title, genres, type) => {
  try {
    const relatedMovies = [];
    
    const baseTitle = getBaseTitle(title);
    // Use the shorter, more generic title for searching if it's different from the original
    const searchTitle = (baseTitle && baseTitle.length < title.length) ? baseTitle : title;

    // Find movies with similar titles
    const similarTitles = await Movie.findAll({
      where: db.sequelize.where(
        db.sequelize.cast(db.sequelize.col('titles'), 'CHAR'),
        db.Sequelize.Op.like,
        `%${searchTitle}%`
      ),
      limit: 3,
      attributes: ['titles']
    });
    
    similarTitles.forEach(movie => {
      const defaultTitle = movie.titles.find(t => t.type === 'default')?.title;
      if (defaultTitle && defaultTitle !== title) {
        relatedMovies.push(defaultTitle);
      }
    });

    // Find movies with similar genres
    if (genres.length > 0) {
      const genreIds = genres.map(g => g.id || g);
      const similarGenres = await Movie.findAll({
        include: [{
          model: Genre,
          as: 'genres',
          where: { id: genreIds },
          through: { attributes: [] }
        }],
        limit: 3,
        attributes: ['titles']
      });
      
      similarGenres.forEach(movie => {
        const defaultTitle = movie.titles.find(t => t.type === 'default')?.title;
        if (defaultTitle && defaultTitle !== title && !relatedMovies.includes(defaultTitle)) {
          relatedMovies.push(defaultTitle);
        }
      });
    }

    return relatedMovies.slice(0, 5); // Limit to 5 related movies
  } catch (error) {
    console.error('Error getting related movies:', error);
    return [];
  }
};

/**
 * @desc Generate marketing content for movie
 * @param {number} userId - User ID
 * @param {object} movieInfo - Movie information
 * @returns {Promise<object>} Marketing content
 */
const generateMarketingContent = async (userId, movieInfo) => {
  try {
    checkRateLimit(userId, 3, 60000); // 3 requests per minute
    
    if (!validateInput(movieInfo)) {
      throw new Error('Invalid input detected');
    }

    const { title, description, genres, year } = movieInfo;
    
    const prompt = buildPrompt('GENERATE_MARKETING', {
      title: title || '',
      description: description || '',
      genres: formatGenresForPrompt(genres),
      year: year || ''
    });

    const aiResponse = await callAIProvider(prompt);
    const marketingData = parseAIResponse(aiResponse);
    
    await logAiInteraction(userId, prompt, aiResponse, 'generateMarketing', {
      movieTitle: title
    });

    return marketingData;
  } catch (error) {
    console.error('Error generating marketing content:', error);
    throw new Error(`Không thể tạo nội dung marketing: ${error.message}`);
  }
};

/**
 * @desc Translate movie description
 * @param {number} userId - User ID
 * @param {object} translationInfo - Translation information
 * @returns {Promise<object>} Translated content
 */
const translateDescription = async (userId, translationInfo) => {
  try {
    checkRateLimit(userId, 10, 60000); // 10 requests per minute
    
    if (!validateInput(translationInfo)) {
      throw new Error('Invalid input detected');
    }

    const { title, description, targetLanguage } = translationInfo;
    
    if (!title || !description || !targetLanguage) {
      throw new Error('Title, description, and target language are required');
    }

    const prompt = buildPrompt('TRANSLATE_DESCRIPTION', {
      title,
      description,
      targetLanguage
    });

    const aiResponse = await callAIProvider(prompt);
    const translationData = parseAIResponse(aiResponse);
    
    await logAiInteraction(userId, prompt, aiResponse, 'translateDescription', {
      movieTitle: title,
      targetLanguage
    });

    return translationData;
  } catch (error) {
    console.error('Error translating description:', error);
    throw new Error(`Không thể dịch mô tả: ${error.message}`);
  }
};

/**
 * @desc Generate SEO optimized content
 * @param {number} userId - User ID
 * @param {object} seoInfo - SEO information
 * @returns {Promise<object>} SEO optimized content
 */
const generateSEOContent = async (userId, seoInfo) => {
  try {
    checkRateLimit(userId, 5, 60000); // 5 requests per minute
    
    if (!validateInput(seoInfo)) {
      throw new Error('Invalid input detected');
    }

    const { title, description, genres, tags } = seoInfo;
    
    const prompt = buildPrompt('SEO_OPTIMIZATION', {
      title: title || '',
      description: description || '',
      genres: formatGenresForPrompt(genres),
      tags: Array.isArray(tags) ? tags.join(', ') : (tags || '')
    });

    const aiResponse = await callAIProvider(prompt);
    const seoData = parseAIResponse(aiResponse);
    
    await logAiInteraction(userId, prompt, aiResponse, 'generateSEO', {
      movieTitle: title
    });

    return seoData;
  } catch (error) {
    console.error('Error generating SEO content:', error);
    throw new Error(`Không thể tạo nội dung SEO: ${error.message}`);
  }
};

/**
 * @desc Classify a comment using AI
 * @param {number} userId - User ID
 * @param {string} commentText - The text of the comment to classify
 * @returns {Promise<object>} Classification result (sentiment, categories, reason)
 */
const classifyComment = async (userId, commentText) => {
  try {
    checkRateLimit(userId, 20, 60000); // Higher rate limit for classification
    
    if (!validateInput({ commentText })) {
      throw new Error('Invalid input detected.');
    }

    const classification = await classifyCommentWithAI(commentText);
    
    await logAiInteraction(userId, commentText, JSON.stringify(classification), 'classifyComment', {
      commentTextPreview: commentText.substring(0, 100)
    });

    return classification;
  } catch (error) {
    console.error('Error classifying comment:', error);
    throw new Error(`Không thể phân loại bình luận: ${error.message}`);
  }
};

/**
 * @desc Get AI analytics data
 * @param {number} userId - User ID (admin only)
 * @param {object} filters - Filter options
 * @returns {Promise<object>} Analytics data
 */
const getAIAnalytics = async (userId, filters = {}) => {
  try {
    const { startDate, endDate, type } = filters;
    
    const whereClause = { userId };
    
    if (startDate && endDate) {
      whereClause.timestamp = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    if (type) {
      whereClause.type = type;
    }

    const logs = await AiLog.findAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      limit: 100
    });

    // Calculate analytics
    const totalRequests = logs.length;
    const typeCounts = logs.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1;
      return acc;
    }, {});

    const recentActivity = logs.slice(0, 10).map(log => ({
      id: log.id,
      type: log.type,
      timestamp: log.timestamp,
      promptLength: log.prompt.length,
      responseLength: log.response.length
    }));

    return {
      totalRequests,
      typeCounts,
      recentActivity,
      period: { startDate, endDate }
    };
  } catch (error) {
    console.error('Error getting AI analytics:', error);
    throw new Error(`Không thể lấy dữ liệu analytics: ${error.message}`);
  }
};


/**
 * ===================== REELS AI ASSISTANT =====================
 * Gợi ý caption, hashtags; phân tích mood/tags; gợi ý reels tương tự
 */

/**
 * @desc Generate caption and hashtags for a Reel using AI
 * @param {number} userId - User ID
 * @param {string} videoDescription - Mô tả ngắn về nội dung video
 * @returns {Promise<object>} Gợi ý caption và hashtags
 */
export const generateReelCaptionAndHashtags = async (userId, videoDescription) => {
  try {
    checkRateLimit(userId, 5, 60000); // 5 requests per minute for AI caption/hashtag

    if (!validateInput({ videoDescription })) {
      throw new Error('Invalid input detected.');
    }

    const prompt = buildPrompt('SUGGEST_REEL_CAPTION_HASHTAGS', { videoDescription });
    const aiResponse = await callAIProvider(prompt);
    const parsedResponse = parseAIResponse(aiResponse);

    await logAiInteraction(userId, prompt, aiResponse, 'generateReelCaptionAndHashtags', {
      videoDescriptionPreview: videoDescription.substring(0, 100)
    });

    return parsedResponse;
  } catch (error) {
    console.error('Error generating Reel caption and hashtags:', error);
    throw new Error(`Không thể tạo caption và hashtags: ${error.message}`);
  }
};

export {
  chatWithAI,
  recommendMovies,
  translateText,
  suggestMovieData,
  generateMarketingContent,
  translateDescription,
  generateSEOContent,
  classifyComment,
  getAIAnalytics,
  logAiInteraction
};
