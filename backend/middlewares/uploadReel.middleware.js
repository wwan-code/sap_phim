import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'reels');
const ORIGINAL_DIR = path.join(UPLOADS_DIR, 'original');

// Đảm bảo thư mục tồn tại
const ensureUploadDir = async () => {
  try {
    await fs.mkdir(ORIGINAL_DIR, { recursive: true });
  } catch (err) {
    logger.error('Failed to create original reels upload directory:', err);
    throw new AppError('Server error: Could not create upload directory', 500);
  }
};

// Cấu hình Multer để lưu trữ file
const multerStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureUploadDir();
      cb(null, ORIGINAL_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = `reel-${Date.now()}${ext}`;
    cb(null, fileName);
  },
});

// Filter file để chỉ chấp nhận video
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new AppError('Chỉ chấp nhận file video!', 400), false);
  }
};

// Khởi tạo Multer upload
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // Giới hạn 100MB
  },
});

// Middleware để xử lý upload một file video duy nhất
export const uploadReel = upload.single('video');

// Middleware xử lý lỗi từ Multer
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('Kích thước video quá lớn (tối đa 100MB).', 400));
    }
    return next(new AppError(`Lỗi upload: ${err.message}`, 400));
  }
  if (err instanceof AppError) {
    return next(err);
  }
  next(err);
};
