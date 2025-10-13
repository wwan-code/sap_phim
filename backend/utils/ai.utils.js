import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * AI Provider Configuration
 */
const AI_PROVIDERS = {
    GEMINI: 'gemini',
    OPENAI: 'openai',
    GROK: 'grok'
};

const CURRENT_PROVIDER = AI_PROVIDERS.GEMINI;

/**
 * Prompt Templates for different AI tasks
 */
const PROMPT_TEMPLATES = {
    SUGGEST_MOVIE: {
        template: `Bạn là một chuyên gia phân tích phim ảnh & thu thập dữ liệu điện ảnh toàn cầu, có khả năng tìm kiếm web theo thời gian thực và chuẩn hóa thông tin từ nhiều nguồn uy tín.

THÔNG TIN PHIM ĐẦU VÀO:
- Tiêu đề chính: {defaultTitle}
- Tiêu đề khác: {otherTitles}
- Mùa: {season}
- Quốc gia: {country}
- Năm phát hành: {releaseYear}
- Mô tả hiện tại: {description}
- Thể loại: {genres}
- Phim liên quan trong hệ thống: {relatedMovies}

YÊU CẦU: Dựa trên thông tin trên, hãy gợi ý dữ liệu phim chính xác và chi tiết. Trả về kết quả dưới dạng JSON với cấu trúc sau:

{
  "title": "Tiêu đề chính được gợi ý bằng tiếng Việt",
  "otherTitles": [
    {"type": "Japanese", "title": "タイトル"},
    {"type": "English", "title": "English Title"},
    {"type": "Vietnamese", "title": "Tiêu đề tiếng Việt (nếu khác defaultTitle)"},
    {"type": "Original", "title": "Tên gốc"},
    {"type": "Other", "title": "Tên khác"}
  ],
  "description": {
    "vietnamese": "Mô tả chi tiết bằng tiếng Việt",
    "english": "Detailed description in English", 
    "japanese": "日本語での詳細な説明"
  },
  "totalViews": 123456789,
  "season" "Mùa",
  "status": "ongoing || completed || upcoming"
  "tags": ["tag1", "tag2", "tag3"],
  "seoKeywords": ["keyword1", "keyword2", "keyword3"],
  "genres": ["Action", "Adventure", "Harem", "Fantasy", "Sci-Fi"],
  "country": "Việt Nam",
  "category": "Phim bộ || Phim lẻ || Phim chiếu rạp",
  "releaseYear": "2023",
  "releaseDate": "2023-01-15",
  "classification": "PG-13",
  "duration": "120 phút",
  "totalEpisodes": 12,
  "quality": "FHD",
  "subtitles": ["VietSub", "EngSub", "Thuyết minh"],
  "marketingContent": {
    "vietnamese": "Nội dung marketing hấp dẫn bằng tiếng Việt",
    "english": "Engaging marketing content in English"
  },
  "relatedSeries": ["Series liên quan 1", "Series liên quan 2"],
  "cast": [
        {"actor": "Tên diễn viên 1", "role": "Vai diễn nhân vật 1" },
        {"actor": "Tên diễn viên 2", "role": "Vai diễn nhân vật 2" }
  ],
  "director": "Đạo diễn",
  "studio": "Studio sản xuất",
  "imdb": 7.8,
  "awards": ["Oscar 2023: Best Visual Effects"],
  "contentRating": "R",
  "franchise": "Tên vũ trụ phim (nếu có)",
  "soundtrack": ["Bài hát OST 1", "Bài hát OST 2"],
  "sources": [
    {"name": "IMDb", "url": "https://..."},
    {"name": "Wikipedia", "url": "https://..."},
    {"name": "MAL", "url": "https://..."}
  ]
}

QUAN TRỌNG:
- **BẮT BUỘC TÌM KIẾM WEB**: Hãy chủ động tìm kiếm trên Internet để thu thập thông tin mới và chính xác nhất về bộ phim này.
- **NGUỒN ƯU TIÊN**: Sử dụng các nguồn uy tín sau đây làm tài liệu tham khảo chính:
  1. IMDb (https://www.imdb.com/)
  2. Wikipedia (https://www.wikipedia.org/)
  3. MyAnimeList (https://myanimelist.net/) - Đặc biệt quan trọng cho Anime.
  4. Netflix (https://www.netflix.com/) - Cho các phim và series gốc của Netflix.
  5. TMDb, Rotten Tomatoes, Variety, ScreenRant, AnimeNewsNetwork,...
- **ĐỘ CHÍNH XÁC**: Đảm bảo mọi thông tin (ngày phát hành, diễn viên, số tập,...) đều được kiểm chứng từ các nguồn trên. Không được suy diễn hay điền thông tin không chắc chắn.
- **CẬP NHẬT**: Lấy thông tin mới nhất, đặc biệt là trạng thái phim (status), ngày phát hành (releaseDate), và số tập (totalEpisodes).
- **NỘI DUNG**:
    - Mô tả phải hấp dẫn và không tiết lộ nội dung quan trọng (spoiler).
    - Tags và SEO keywords phải được tối ưu hóa cho công cụ tìm kiếm và phù hợp với nội dung phim.
    - genres: Các thể loại của phim (Bằng tiếng Anh).
    - totalViews: Tổng lượt xem phim của phim dựa trên các nguồn tìm kiếm không tự tạo hoặc tự suy diễn số lượt xem.
    - imdb: Điểm IMDb (nếu có).
    - totalEpisodes: Chính xác số tập cho phim bộ, phim lẻ thì để 1.
    - Nếu phim chưa phát hành → status = upcoming, releaseDate phải chính xác theo công bố.
    - relatedSeries: Gợi ý các series/phim liên quan thực sự, dựa trên vũ trụ phim, tiền truyện, hậu truyện, hoặc cùng tác giả/đạo diễn.
    - otherTitles: Nếu không được cung cấp, AI sẽ tự động tìm kiếm và bổ sung các tiêu đề thay thế (Japanese, English, Vietnamese, Original…) dựa trên tiêu đề chính.
    - Sources: bắt buộc trả về danh sách link tham khảo.`,

        variables: ['defaultTitle', 'otherTitles', 'season', 'country', 'releaseYear', 'description', 'genres', 'relatedMovies']
    },

    GENERATE_OTHER_TITLES: {
        template: `Bạn là một chuyên gia ngôn ngữ và điện ảnh. Dựa trên tiêu đề phim chính sau, hãy gợi ý các tiêu đề thay thế bằng các ngôn ngữ phổ biến (Tiếng Nhật, Tiếng Anh, Tiếng Việt, Tên gốc).

TIÊU ĐỀ CHÍNH: {defaultTitle}

YÊU CẦU: Trả về kết quả dưới dạng JSON với cấu trúc sau:

{
  "otherTitles": [
    {"type": "Japanese", "title": "タイトル"},
    {"type": "English", "title": "English Title"},
    {"type": "Vietnamese", "title": "Tiêu đề tiếng Việt (nếu khác defaultTitle)"},
    {"type": "Original", "title": "Tên gốc"}
  ]
}

LƯU Ý:
- Nếu không tìm thấy tiêu đề cụ thể cho một ngôn ngữ, hãy bỏ qua hoặc để trống.
- Ưu tiên các tiêu đề chính thức nếu có.
- Đảm bảo tính chính xác và phù hợp với ngữ cảnh phim ảnh.`,
        variables: ['defaultTitle']
    },

    GENERATE_MARKETING: {
        template: `Tạo nội dung marketing hấp dẫn cho phim "{title}".

THÔNG TIN PHIM:
- Tiêu đề: {title}
- Mô tả: {description}
- Thể loại: {genres}
- Năm: {year}

YÊU CẦU: Tạo nội dung marketing đa dạng:

{
  "socialMedia": {
    "facebook": "Nội dung cho Facebook",
    "twitter": "Nội dung cho Twitter",
    "instagram": "Nội dung cho Instagram"
  },
  "email": "Nội dung email marketing",
  "banner": "Nội dung banner quảng cáo",
  "pressRelease": "Thông cáo báo chí"
}`,

        variables: ['title', 'description', 'genres', 'year']
    },

    TRANSLATE_DESCRIPTION: {
        template: `Dịch mô tả phim sau sang {targetLanguage}:

Tiêu đề: {title}
Mô tả gốc: {description}

YÊU CẦU: Dịch chính xác, giữ nguyên ý nghĩa và phong cách, phù hợp với văn hóa địa phương.

{
  "translatedDescription": "Mô tả đã dịch",
  "culturalNotes": "Ghi chú văn hóa nếu cần"
}`,

        variables: ['title', 'description', 'targetLanguage']
    },

    SEO_OPTIMIZATION: {
        template: `Tối ưu SEO cho phim "{title}".

THÔNG TIN:
- Tiêu đề: {title}
- Mô tả: {description}
- Thể loại: {genres}
- Tags: {tags}

YÊU CẦU: Tạo nội dung SEO tối ưu:

{
  "metaTitle": "Tiêu đề SEO tối ưu",
  "metaDescription": "Mô tả meta tối ưu",
  "keywords": ["keyword1", "keyword2"],
  "structuredData": {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": "{title}",
    "description": "Mô tả cho structured data"
  }
}`,

        variables: ['title', 'description', 'genres', 'tags']
    },
    
    // New prompt template for comment classification
    CLASSIFY_COMMENT: {
        template: `Bạn là một chuyên gia phân tích bình luận, có khả năng phân loại các bình luận thành các loại sau: toxic, spam, hate speech, neutral, positive, negative.

BÌNH LUẬN ĐẦU VÀO:
"{commentText}"

YÊU CẦU: Phân loại bình luận trên. Trả về kết quả dưới dạng JSON với cấu trúc sau:

{
  "sentiment": "positive || negative || neutral",
  "categories": ["toxic", "spam", "hate_speech"], // Có thể có nhiều loại hoặc không có
  "reason": "Giải thích ngắn gọn lý do phân loại"
}

QUAN TRỌNG:
- **CHÍNH XÁC**: Đảm bảo phân loại chính xác dựa trên nội dung bình luận.
- **NGẮN GỌN**: Giải thích lý do ngắn gọn và súc tích.
- **KHÔNG SUY DIỄN**: Chỉ phân loại dựa trên thông tin có sẵn trong bình luận.
- **TIẾNG VIỆT**: Phản hồi bằng tiếng Việt.`,
        variables: ['commentText']
    }
};

/**
 * Build dynamic prompt from template
 * @param {string} templateType - Type of prompt template
 * @param {object} variables - Variables to replace in template
 * @returns {string} Built prompt
 */
const buildPrompt = (templateType, variables) => {
    const template = PROMPT_TEMPLATES[templateType];
    if (!template) {
        throw new Error(`Template type ${templateType} not found`);
    }

    let prompt = template.template;

    // Replace variables in template
    template.variables.forEach(variable => {
        const value = variables[variable] || '';
        const placeholder = `{${variable}}`;
        prompt = prompt.replace(new RegExp(placeholder, 'g'), value);
    });

    return prompt;
};

/**
 * Call AI provider with prompt
 * @param {string} prompt - The prompt to send to AI
 * @param {string} provider - AI provider to use
 * @returns {Promise<string>} AI response
 */
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_DELAY = 1000; // 1 second

/**
 * Exponential backoff delay
 * @param {number} retryCount - Current retry attempt
 * @returns {number} Delay in milliseconds
 */
const getBackoffDelay = (retryCount) => {
    return INITIAL_BACKOFF_DELAY * Math.pow(2, retryCount) + Math.random() * 1000;
};

/**
 * Call AI provider with prompt and retry mechanism
 * @param {string} prompt - The prompt to send to AI
 * @param {string} provider - AI provider to use
 * @returns {Promise<string>} AI response
 */
const callAIProvider = async (prompt, provider = CURRENT_PROVIDER) => {
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            switch (provider) {
                case AI_PROVIDERS.GEMINI:
                    const result = await model.generateContent(prompt);
                    return result.response.text();

                case AI_PROVIDERS.OPENAI:
                    // TODO: Implement OpenAI integration
                    throw new Error('OpenAI provider not implemented yet');

                case AI_PROVIDERS.GROK:
                    // TODO: Implement Grok integration
                    throw new Error('Grok provider not implemented yet');

                default:
                    throw new Error(`Unsupported AI provider: ${provider}`);
            }
        } catch (error) {
            console.error(`AI Provider Error (Attempt ${i + 1}/${MAX_RETRIES}):`, error);

            // Check for 429 Too Many Requests error
            if (error.message.includes('429 Too Many Requests') && i < MAX_RETRIES - 1) {
                const delay = getBackoffDelay(i);
                console.log(`Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw new Error(`AI service error: ${error.message}`);
            }
        }
    }
    throw new Error(`AI service error: Failed after ${MAX_RETRIES} retries due to too many requests.`);
};

/**
 * Parse AI response to JSON
 * @param {string} response - Raw AI response
 * @returns {object} Parsed JSON object
 */
const parseAIResponse = (response) => {
    try {
        // Clean response - remove markdown code blocks
        let cleanedResponse = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        // Try to extract JSON from response if it's mixed with text
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanedResponse = jsonMatch[0];
        }

        return JSON.parse(cleanedResponse);
    } catch (error) {
        console.error('Error parsing AI response:', error);
        console.error('Raw response:', response);
        throw new Error('Invalid AI response format');
    }
};

/**
 * Validate input to prevent prompt injection
 * @param {object} input - Input object to validate
 * @returns {boolean} Is input valid
 */
const validateInput = (input) => {
    const dangerousPatterns = [
        /ignore\s+previous\s+instructions/i,
        /system\s*:/i,
        /assistant\s*:/i,
        /user\s*:/i,
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i
    ];

    const inputString = JSON.stringify(input);

    return !dangerousPatterns.some(pattern => pattern.test(inputString));
};

/**
 * Rate limiting check (simple in-memory implementation)
 */
const rateLimitStore = new Map();

const checkRateLimit = (userId, maxRequests = 10, windowMs = 60000) => {
    const now = Date.now();
    const userRequests = rateLimitStore.get(userId) || [];

    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);

    if (validRequests.length >= maxRequests) {
        throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Add current request
    validRequests.push(now);
    rateLimitStore.set(userId, validRequests);

    return true;
};

/**
 * Format titles array for prompt
 * @param {Array} titles - Array of title objects
 * @returns {object} Formatted titles
 */
const formatTitlesForPrompt = (titles) => {
    if (!Array.isArray(titles) || titles.length === 0) {
        return { defaultTitle: '', otherTitles: '' };
    }

    const defaultTitle = titles.find(t => t.type === 'default')?.title || '';
    const otherTitles = titles
        .filter(t => t.type !== 'default' && t.title)
        .map(t => `${t.type}: ${t.title}`)
        .join(', ');

    return { defaultTitle, otherTitles };
};

/**
 * Format genres array for prompt
 * @param {Array} genres - Array of genre objects
 * @returns {string} Formatted genres string
 */
const formatGenresForPrompt = (genres) => {
    if (!Array.isArray(genres) || genres.length === 0) {
        return '';
    }

    return genres.map(g => g.title || g).join(', ');
};

/**
 * Generate other titles using AI
 * @param {string} defaultTitle - The default title of the movie
 * @returns {Promise<Array<object>>} Array of other title objects
 */
const generateOtherTitlesWithAI = async (defaultTitle) => {
    try {
        const prompt = buildPrompt('GENERATE_OTHER_TITLES', { defaultTitle });
        const aiResponse = await callAIProvider(prompt);
        const parsedResponse = parseAIResponse(aiResponse);
        return parsedResponse.otherTitles || [];
    } catch (error) {
        console.error('Error generating other titles with AI:', error);
        return [];
    }
};

/**
 * Classify comment using AI
 * @param {string} commentText - The text of the comment to classify
 * @returns {Promise<object>} Classification result (sentiment, categories, reason)
 */
const classifyCommentWithAI = async (commentText) => {
    try {
        const prompt = buildPrompt('CLASSIFY_COMMENT', { commentText });
        const aiResponse = await callAIProvider(prompt);
        const parsedResponse = parseAIResponse(aiResponse);
        return parsedResponse;
    } catch (error) {
        console.error('Error classifying comment with AI:', error);
        return {
            sentiment: 'neutral',
            categories: [],
            reason: 'Không thể phân loại bình luận tự động.'
        };
    }
};

export {
    buildPrompt,
    callAIProvider,
    parseAIResponse,
    validateInput,
    checkRateLimit,
    formatTitlesForPrompt,
    formatGenresForPrompt,
    PROMPT_TEMPLATES,
    AI_PROVIDERS,
    generateOtherTitlesWithAI,
    classifyCommentWithAI // Export the new function
};
