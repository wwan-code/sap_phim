import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { generateSlug } from '../utils/slugUtil.js';

// Lấy đường dẫn thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cấu hình kích thước và tỷ lệ cho từng loại ảnh
const IMAGE_CONFIGS = {
  poster: {
    width: 300,
    height: 450,
    ratio: '2:3',
    thumbnail: { width: 150, height: 225 },
    quality: 90
  },
  banner: {
    width: 1280,
    height: 720,
    ratio: '16:9',
    quality: 85
  },
  cover: {
    width: 2160,
    height: 1080,
    ratio: '18:9',
    quality: 85
  }
};

// Định dạng ảnh được phép
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp'
];

// Cấu hình giới hạn
const LIMITS = {
  fileSize: 1024 * 1024 * 20, // 20MB
  maxFiles: 3
};

/**
 * Kiểm tra định dạng file có hợp lệ không
 */
const imageFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`Chỉ chấp nhận file ảnh định dạng: ${ALLOWED_FORMATS.join(', ')}`);
    error.code = 'INVALID_FILE_FORMAT';
    cb(error, false);
  }
};

/**
 * Tối ưu hóa ảnh thành WebP với Sharp
 */
const processImageToWebP = async (inputPath, outputPath, config, isThumbnail = false) => {
  try {
    const targetConfig = isThumbnail && config.thumbnail ? config.thumbnail : config;
    const quality = isThumbnail ? (config.quality || 85) - 10 : (config.quality || 85);

    await sharp(inputPath)
      .resize(targetConfig.width, targetConfig.height, {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: false
      })
      .webp({
        quality: quality,
        effort: 6,
        progressive: true
      })
      .toFile(outputPath);
    
    // Kiểm tra kích thước file sau khi tối ưu
    const stats = await fs.stat(outputPath);
    return {
      success: true,
      size: stats.size,
      path: outputPath
    };

  } catch (error) {
    console.error('Lỗi khi tối ưu ảnh:', error);
    throw new Error(`Không thể tối ưu ảnh: ${error.message}`);
  }
};

/**
 * Dọn dẹp files khi có lỗi
 */
const cleanupFiles = async (filePaths) => {
  const cleanupPromises = filePaths.map(async (filePath) => {
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
    } catch (error) {
      // File không tồn tại hoặc đã bị xóa - bỏ qua
    }
  });

  await Promise.allSettled(cleanupPromises);
};

/**
 * Validate và parse titles từ request
 */
const parseMovieTitle = (titlesString) => {
  if (!titlesString) {
    return 'default-movie';
  }

  try {
    const parsedTitles = JSON.parse(titlesString);
    
    if (!Array.isArray(parsedTitles)) {
      return 'default-movie';
    }

    // Tìm title mặc định
    const defaultTitle = parsedTitles.find(t => t.type === 'default');
    if (defaultTitle?.title) {
      return defaultTitle.title;
    }

    // Fallback sang title đầu tiên
    const firstTitle = parsedTitles.find(t => t.title);
    return firstTitle?.title || 'default-movie';

  } catch (error) {
    console.error("Lỗi khi parse titles:", error);
    return 'default-movie';
  }
};

/**
 * Tạo thư mục với retry logic
 */
const ensureDirectoryExists = async (dirPath, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      if (error.code === 'EEXIST') {
        return true; // Thư mục đã tồn tại
      }
      
      if (i === retries - 1) {
        throw error;
      }
      
      // Đợi một chút trước khi retry
      await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
    }
  }
};

// Cấu hình lưu trữ cho Multer với validation tốt hơn
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const { titles } = req.body;
      const movieTitle = parseMovieTitle(titles);
      const slug = generateSlug(movieTitle);
      const uploadPath = path.join(__dirname, `../uploads/movies/${slug}`);

      await ensureDirectoryExists(uploadPath);
      cb(null, uploadPath);
    } catch (error) {
      console.error('Lỗi khi tạo thư mục:', error);
      cb(error);
    }
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
    cb(null, filename);
  },
});

// Tạo middleware multer với cấu hình nâng cao
const uploadMovie = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: LIMITS.fileSize,
    files: LIMITS.maxFiles,
    fieldSize: 1024 * 100, // 100KB cho các field text
  },
});

/**
 * Middleware chính xử lý upload và tối ưu ảnh
 */
const uploadMovieImages = (req, res, next) => {
  uploadMovie.fields([
    { name: 'poster', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ])(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      return next(err);
    }

    // Kiểm tra xem có file nào được upload không
    if (!req.files || Object.keys(req.files).length === 0) {
      return next();
    }

    const processedFiles = {};
    const filesToCleanup = [];

    try {
      // Xử lý song song các loại ảnh
      const processingPromises = Object.entries(req.files).map(async ([fieldName, files]) => {
        if (!files || files.length === 0) return null;

        const file = files[0];
        const config = IMAGE_CONFIGS[fieldName];

        if (!config) {
          throw new Error(`Loại ảnh không được hỗ trợ: ${fieldName}`);
        }

        const originalPath = file.path;
        filesToCleanup.push(originalPath);

        // Tạo đường dẫn file WebP
        const webpPath = originalPath.replace(/\.[^/.]+$/, '.webp');

        // Tối ưu ảnh chính thành WebP
        const mainResult = await processImageToWebP(originalPath, webpPath, config, false);
        
        // Tạo thumbnail cho poster
        let thumbnailResult = null;
        let thumbnailPath = null;
        if (fieldName === 'poster' && config.thumbnail) {
          thumbnailPath = webpPath.replace('.webp', '-thumb.webp');
          thumbnailResult = await processImageToWebP(originalPath, thumbnailPath, config, true);
        }

        // Cập nhật thông tin file trong request
        file.path = webpPath;
        file.filename = path.basename(webpPath);
        file.mimetype = 'image/webp';

        return {
          fieldName,
          mainResult,
          thumbnailResult,
          webpPath,
          thumbnailPath,
          originalPath
        };
      });

      // Đợi tất cả các promise hoàn thành
      const results = await Promise.all(processingPromises);

      // Xử lý kết quả
      for (const result of results) {
        if (!result) continue;

        const { fieldName, mainResult, thumbnailResult, webpPath, thumbnailPath } = result;

        processedFiles[fieldName] = {
          path: webpPath,
          size: mainResult.size,
          mimetype: 'image/webp',
          filename: path.basename(webpPath)
        };

        if (thumbnailResult && thumbnailPath) {
          processedFiles[`${fieldName}_thumbnail`] = {
            path: thumbnailPath,
            size: thumbnailResult.size,
            mimetype: 'image/webp',
            filename: path.basename(thumbnailPath)
          };
        }
      }

      // Cleanup các file gốc
      await cleanupFiles(filesToCleanup);

      // Thêm thông tin vào request
      req.processedFiles = processedFiles;

      next();

    } catch (error) {
      console.error('Processing error:', error);

      // Cleanup tất cả files đã tạo khi có lỗi
      const allFilesToCleanup = [...filesToCleanup];
      
      // Thêm các file đã xử lý vào danh sách cleanup
      Object.values(processedFiles).forEach(fileInfo => {
        if (fileInfo.path) {
          allFilesToCleanup.push(fileInfo.path);
        }
      });

      await cleanupFiles(allFilesToCleanup);
      next(error);
    }
  });
};

/**
 * Enhanced error handler với logging tốt hơn
 */
const handleUploadError = (err, req, res, next) => {
  console.error('Upload error details:', {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Multer errors
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: `Kích thước file quá lớn. Tối đa ${LIMITS.fileSize / (1024 * 1024)}MB.`,
          code: 'FILE_TOO_LARGE'
        });
      
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: `Quá nhiều file được upload. Tối đa ${LIMITS.maxFiles} files.`,
          code: 'TOO_MANY_FILES'
        });
      
      case 'LIMIT_FIELD_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Quá nhiều fields trong request.',
          code: 'TOO_MANY_FIELDS'
        });
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Lỗi upload file.',
          code: 'UPLOAD_ERROR'
        });
    }
  }

  // Custom errors
  if (err.code === 'INVALID_FILE_FORMAT') {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'INVALID_FILE_FORMAT'
    });
  }

  if (err.message.includes('Không thể tối ưu ảnh') || err.message.includes('Không thể tạo thumbnail')) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý ảnh. Vui lòng kiểm tra định dạng ảnh và thử lại.',
      code: 'IMAGE_PROCESSING_ERROR'
    });
  }

  if (err.message.includes('Loại ảnh không được hỗ trợ')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'UNSUPPORTED_IMAGE_TYPE'
    });
  }

  // System errors
  if (err.code === 'ENOSPC') {
    return res.status(507).json({
      success: false,
      message: 'Không đủ dung lượng lưu trữ.',
      code: 'INSUFFICIENT_STORAGE'
    });
  }

  if (err.code === 'EACCES' || err.code === 'EPERM') {
    return res.status(500).json({
      success: false,
      message: 'Lỗi quyền truy cập hệ thống.',
      code: 'PERMISSION_ERROR'
    });
  }

  // Default error
  next(err);
};

/**
 * Middleware validation ảnh trước khi xử lý
 */
const validateImageDimensions = async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next();
  }

  try {
    const validationPromises = Object.entries(req.files).map(async ([fieldName, files]) => {
      if (!files || files.length === 0) return;

      const file = files[0];
      const metadata = await sharp(file.path).metadata();

      // Kiểm tra kích thước tối thiểu
      const config = IMAGE_CONFIGS[fieldName];
      if (config) {
        const minWidth = Math.floor(config.width * 0.5); // Tối thiểu 50% kích thước target
        const minHeight = Math.floor(config.height * 0.5);

        if (metadata.width < minWidth || metadata.height < minHeight) {
          throw new Error(`Ảnh ${fieldName} quá nhỏ. Kích thước tối thiểu: ${minWidth}x${minHeight}px`);
        }
      }
    });

    await Promise.all(validationPromises);
    next();

  } catch (error) {
    console.error('Image validation error:', error);
    next(error);
  }
};

export {
  uploadMovieImages,
  handleUploadError,
  validateImageDimensions,
  IMAGE_CONFIGS,
  ALLOWED_FORMATS,
  LIMITS
};