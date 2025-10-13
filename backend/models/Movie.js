import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { generateSlug } from '../utils/slugUtil.js';

// Định nghĩa Model Movie
const Movie = sequelize.define('Movie', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    unique: true,
    allowNull: false,
  },
  titles: {
    type: DataTypes.JSON, // Định dạng: [{"type":"default"|"Japanese"|"English"|"v.v other", "title": "string"}, ...]
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('titles');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return rawValue || [];
    }
  },
  slug: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  duration: {
    type: DataTypes.STRING, // Ví dụ: "120 phút, 24 phút"
    allowNull: true,
  },
  quality: {
    type: DataTypes.STRING, // Ví dụ: "HD", "FHD", "4K"
    allowNull: true,
  },
  subtitles: {
    type: DataTypes.JSON, // Ví dụ: ["VietSub", "EngSub", "Thuyết minh"]
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('subtitles');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return rawValue || [];
    }
  },
  image: {
    type: DataTypes.JSON, // Định dạng: { posterUrl, bannerUrl, coverUrl }
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('image');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return {};
        }
      }
      return rawValue || {};
    },
  },
  status: {
    type: DataTypes.STRING, // Ví dụ: "ongoing", "completed", "upcoming"
    allowNull: true,
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  countryId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Có thể null nếu phim không có quốc gia cụ thể
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Có thể null nếu phim không có danh mục cụ thể
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  belongToCategory: {
    type: DataTypes.STRING, // Ví dụ: "Phim lẻ", "Phim bộ"
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  totalEpisodes: {
    type: DataTypes.INTEGER, 
    defaultValue: 0,
    allowNull: false,
  },
  releaseDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  classification: {
    type: DataTypes.STRING, // Ví dụ: "G", "PG", "PG-13", "R", "NC-17"
    allowNull: true,
  },
  trailerUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  seriesId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Có thể null nếu phim không thuộc series nào
  },
  type: {
    type: DataTypes.STRING, // Ví dụ: "movie", "series"
    allowNull: true,
  },
  tags: {
    type: DataTypes.JSON, // Ví dụ: ["action", "adventure"]
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('tags');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return rawValue || [];
    },
  },
  season: {
    type: DataTypes.STRING, // Ví dụ: "Season 1"
    allowNull: true,
  },
  seoKeywords: {
    type: DataTypes.JSON, // Định dạng: ["keyword1", "keyword2"]
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('seoKeywords');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return rawValue || [];
    },
  },
  marketingContent: {
    type: DataTypes.JSON, // Định dạng: { vietnamese: "...", english: "..." }
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('marketingContent');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return {};
        }
      }
      return rawValue || {};
    },
  },
  director: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  studio: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  imdb: {
    type: DataTypes.STRING, // Có thể lưu dưới dạng string để linh hoạt (ví dụ: "tt1234567" hoặc "7.8")
    allowNull: true,
  },
  cast: {
    type: DataTypes.JSON, // Định dạng: [{ actor: "Tên diễn viên", role: "Vai diễn" }]
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('cast');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return rawValue || [];
    },
  },
}, {
  timestamps: true, // Tự động thêm createdAt và updatedAt
  hooks: {
    beforeValidate: (movie) => {
      // Tạo slug từ tiêu đề mặc định nếu có
      if (movie.titles && Array.isArray(movie.titles)) {
        const defaultTitleObj = movie.titles.find(t => t.type === 'default');
        if (defaultTitleObj && defaultTitleObj.title) {
          movie.slug = generateSlug(defaultTitleObj.title);
        }
      }
    },
  },
});

export default Movie;
