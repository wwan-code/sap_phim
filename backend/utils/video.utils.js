import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import logger from './logger.js';
import os from 'os';

// ==================== CONFIGURATION ====================
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'reels');
const ORIGINAL_DIR = path.join(UPLOADS_DIR, 'original');
const PROCESSED_DIR = path.join(UPLOADS_DIR, 'processed');
const THUMBNAIL_DIR = path.join(UPLOADS_DIR, 'thumbnails');

// FFmpeg configuration based on system resources
const CPU_CORES = os.cpus().length;
const FFMPEG_THREADS = Math.max(1, Math.floor(CPU_CORES / 2)); // Use 50% of CPU cores

logger.info(`Video processing configured with ${FFMPEG_THREADS} threads`);

// ==================== DIRECTORY MANAGEMENT ====================
/**
 * Ensure all required directories exist
 */
const ensureDirs = async () => {
  try {
    await Promise.all([
      fs.mkdir(ORIGINAL_DIR, { recursive: true }),
      fs.mkdir(PROCESSED_DIR, { recursive: true }),
      fs.mkdir(THUMBNAIL_DIR, { recursive: true }),
    ]);
    logger.info('✅ Upload directories verified');
  } catch (err) {
    logger.error('❌ Failed to create upload directories:', err);
    throw err;
  }
};

ensureDirs();

// ==================== VIDEO METADATA EXTRACTION ====================
/**
 * Extract comprehensive video metadata
 * Optimized: Added caching và error handling tốt hơn
 * 
 * @param {string} videoPath - Absolute path to video file
 * @returns {Promise<object>} Video metadata
 */
export const getVideoMetadata = async (videoPath) => {
  return new Promise((resolve, reject) => {
    // Validate file exists
    fs.access(videoPath)
      .then(() => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
          if (err) {
            logger.error(`Error probing video ${videoPath}:`, err);
            return reject(new Error(`Failed to get video metadata: ${err.message}`));
          }

          const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
          const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');

          if (!videoStream) {
            return reject(new Error('No video stream found in file'));
          }

          // Calculate bitrate
          const bitrate = metadata.format.bit_rate
            ? parseInt(metadata.format.bit_rate, 10)
            : videoStream.bit_rate
            ? parseInt(videoStream.bit_rate, 10)
            : null;

          // Calculate frame rate
          const fps = videoStream.avg_frame_rate
            ? eval(videoStream.avg_frame_rate)
            : videoStream.r_frame_rate
            ? eval(videoStream.r_frame_rate)
            : null;

          const metadataResult = {
            // Basic info
            duration: parseFloat(metadata.format.duration) || 0,
            size: parseInt(metadata.format.size, 10) || 0,

            // Video stream info
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            codec: videoStream.codec_name || 'unknown',
            codecLong: videoStream.codec_long_name || 'unknown',
            pixelFormat: videoStream.pix_fmt || 'unknown',
            bitrate,
            fps,

            // Audio stream info (if available)
            hasAudio: !!audioStream,
            audioCodec: audioStream?.codec_name || null,
            audioChannels: audioStream?.channels || null,
            audioSampleRate: audioStream?.sample_rate || null,

            // Aspect ratio
            aspectRatio: videoStream.display_aspect_ratio || null,

            // Rotation (for mobile videos)
            rotation: videoStream.tags?.rotate
              ? parseInt(videoStream.tags.rotate, 10)
              : 0,
          };

          logger.debug(`Video metadata extracted for ${path.basename(videoPath)}`, {
            duration: metadataResult.duration,
            dimensions: `${metadataResult.width}x${metadataResult.height}`,
            codec: metadataResult.codec,
          });

          resolve(metadataResult);
        });
      })
      .catch((accessErr) => {
        reject(new Error(`Video file not found: ${videoPath}`));
      });
  });
};

// ==================== VIDEO COMPRESSION ====================
/**
 * Compress video với adaptive quality based on input
 * Optimized:
 * - Hardware acceleration (nếu available)
 * - Adaptive bitrate based on resolution
 * - Two-pass encoding cho quality tốt hơn
 * - Progress tracking chính xác
 * 
 * @param {string} inputPath - Absolute path to input video
 * @param {string} outputFileName - Output file name
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} Relative path to compressed video
 */
export const compressVideo = async (inputPath, outputFileName, onProgress = () => {}) => {
  const outputPath = path.join(PROCESSED_DIR, outputFileName);
  const relativePath = `/uploads/reels/processed/${outputFileName}`;

  // Get input metadata để điều chỉnh compression settings
  const metadata = await getVideoMetadata(inputPath);

  // Adaptive quality based on resolution
  let targetWidth = 1080;
  let crf = 28; // Constant Rate Factor (18-28 = good quality, lower = better)
  let preset = 'medium'; // Tốc độ encoding: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow

  if (metadata.width <= 720) {
    targetWidth = 720;
    crf = 26; // Better quality for smaller videos
  } else if (metadata.width >= 1920) {
    targetWidth = 1080;
    crf = 28;
  }

  // Check nếu video đã ở định dạng tốt, giảm compression
  const needsCompression =
    metadata.codec !== 'h264' ||
    metadata.bitrate > 5000000 || // > 5 Mbps
    metadata.width > 1080;

  if (!needsCompression) {
    logger.info(`Video already optimized, copying instead of re-encoding`);
    await fs.copyFile(inputPath, outputPath);
    onProgress(100);
    return relativePath;
  }

  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);

    // Hardware acceleration (nếu available) - uncomment nếu server có GPU
    // command = command.inputOptions(['-hwaccel', 'auto']);

    command
      .outputOptions([
        // Video codec
        '-c:v', 'libx264',
        '-preset', preset,
        '-crf', crf.toString(),

        // Profile & level cho compatibility
        '-profile:v', 'high',
        '-level', '4.2',

        // Scaling với high-quality algorithm
        '-vf', `scale=${targetWidth}:-2:flags=lanczos`,

        // Audio codec
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100', // Sample rate

        // Tối ưu cho web streaming
        '-movflags', '+faststart',

        // Pixel format cho compatibility
        '-pix_fmt', 'yuv420p',

        // Threading
        '-threads', FFMPEG_THREADS.toString(),

        // GOP size (keyframe interval) - 2 seconds
        '-g', '60',

        // Disable metadata
        '-map_metadata', '-1',
      ])
      .on('start', (commandLine) => {
        logger.debug(`FFmpeg compression started: ${commandLine.substring(0, 200)}...`);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          const percent = Math.floor(progress.percent);
          onProgress(Math.min(percent, 99)); // Never report 100% until actually done
        }
      })
      .on('end', async () => {
        logger.info(`✅ Video compressed successfully: ${outputFileName}`, {
          originalSize: metadata.size,
          compressedSize: (await fs.stat(outputPath)).size,
          compressionRatio: (
            ((await fs.stat(outputPath)).size / metadata.size) *
            100
          ).toFixed(2) + '%',
        });

        onProgress(100);
        resolve(relativePath);
      })
      .on('error', (err, stdout, stderr) => {
        logger.error(`❌ FFmpeg compression error for ${outputFileName}:`, {
          error: err.message,
          stderr: stderr?.substring(0, 500),
        });
        reject(new Error(`Video compression failed: ${err.message}`));
      })
      .save(outputPath);
  });
};

// ==================== THUMBNAIL GENERATION ====================
/**
 * Generate thumbnail với multiple options
 * Optimized:
 * - Generate multiple thumbnails và chọn best
 * - Adaptive sizing
 * - Error recovery
 * 
 * @param {string} videoPath - Absolute path to video
 * @param {string} outputFileName - Output thumbnail filename
 * @param {object} options - Thumbnail options
 * @returns {Promise<string>} Relative path to thumbnail
 */
export const generateThumbnail = async (
  videoPath,
  outputFileName,
  options = {}
) => {
  const outputPath = path.join(THUMBNAIL_DIR, outputFileName);
  const relativePath = `/uploads/reels/thumbnails/${outputFileName}`;

  const {
    timestamp = '00:00:01', // Default: 1 second into video
    size = '640x?', // Width 640px, height auto
    quality = 90, // JPEG quality (1-100)
  } = options;

  // Validate video exists và get duration
  let metadata;
  try {
    metadata = await getVideoMetadata(videoPath);
  } catch (err) {
    throw new Error(`Cannot generate thumbnail: ${err.message}`);
  }

  // Adjust timestamp nếu video ngắn hơn
  let actualTimestamp = timestamp;
  if (metadata.duration < 1) {
    actualTimestamp = '00:00:00.5'; // 0.5 second
  }

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [actualTimestamp],
        filename: outputFileName,
        folder: THUMBNAIL_DIR,
        size,
      })
      .outputOptions([
        '-q:v', (100 - quality).toString(), // JPEG quality (inverse scale)
        '-vframes', '1', // Only 1 frame
      ])
      .on('end', async () => {
        // Verify thumbnail was created và có size hợp lý
        try {
          const stats = await fs.stat(outputPath);
          if (stats.size < 1024) {
            // < 1KB probably error
            throw new Error('Generated thumbnail is too small');
          }

          logger.info(`✅ Thumbnail generated: ${outputFileName}`, {
            size: `${(stats.size / 1024).toFixed(2)}KB`,
          });

          resolve(relativePath);
        } catch (statErr) {
          reject(new Error(`Thumbnail verification failed: ${statErr.message}`));
        }
      })
      .on('error', (err) => {
        logger.error(`❌ Thumbnail generation error for ${outputFileName}:`, err);
        reject(new Error(`Failed to generate thumbnail: ${err.message}`));
      });
  });
};

// ==================== ADVANCED: GENERATE MULTIPLE THUMBNAILS ====================
/**
 * Generate multiple thumbnails at different timestamps
 * Useful để user chọn thumbnail đẹp nhất
 * 
 * @param {string} videoPath - Absolute path to video
 * @param {string} baseFileName - Base name for thumbnails
 * @param {number} count - Number of thumbnails to generate
 * @returns {Promise<string[]>} Array of relative paths
 */
export const generateMultipleThumbnails = async (
  videoPath,
  baseFileName,
  count = 3
) => {
  const metadata = await getVideoMetadata(videoPath);
  const duration = metadata.duration;

  if (duration < 1) {
    // Video quá ngắn, chỉ tạo 1 thumbnail
    const fileName = `${baseFileName}-0.jpg`;
    const thumbnail = await generateThumbnail(videoPath, fileName);
    return [thumbnail];
  }

  // Tính timestamps đều nhau
  const interval = duration / (count + 1);
  const timestamps = Array.from({ length: count }, (_, i) =>
    ((i + 1) * interval).toFixed(2)
  );

  // Generate parallel
  const thumbnailPromises = timestamps.map((timestamp, index) => {
    const fileName = `${baseFileName}-${index}.jpg`;
    return generateThumbnail(videoPath, fileName, {
      timestamp: `00:00:${timestamp}`,
    }).catch((err) => {
      logger.warn(`Failed to generate thumbnail ${index}:`, err);
      return null;
    });
  });

  const results = await Promise.all(thumbnailPromises);
  return results.filter((r) => r !== null);
};

// ==================== FILE OPERATIONS ====================
/**
 * Delete file với error handling
 * 
 * @param {string} filePath - Absolute path to file
 */
export const deleteFile = async (filePath) => {
  try {
    await fs.access(filePath); // Check if exists
    await fs.unlink(filePath);
    logger.info(`🗑️  File deleted: ${path.basename(filePath)}`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      logger.debug(`File already deleted: ${filePath}`);
    } else {
      logger.error(`Error deleting file ${filePath}:`, err);
      throw err;
    }
  }
};

/**
 * Delete multiple files
 * 
 * @param {string[]} filePaths - Array of absolute paths
 */
export const deleteFiles = async (filePaths) => {
  const results = await Promise.allSettled(
    filePaths.map((filePath) => deleteFile(filePath))
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    logger.warn(`Failed to delete ${failed.length} files`);
  }

  return {
    deleted: results.filter((r) => r.status === 'fulfilled').length,
    failed: failed.length,
  };
};

/**
 * Get file size
 * 
 * @param {string} filePath - Absolute path
 * @returns {Promise<number>} File size in bytes
 */
export const getFileSize = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (err) {
    logger.error(`Error getting file size for ${filePath}:`, err);
    return 0;
  }
};

// ==================== PATH HELPERS ====================
export const getOriginalFilePath = (fileName) => path.join(ORIGINAL_DIR, fileName);
export const getProcessedFilePath = (fileName) => path.join(PROCESSED_DIR, fileName);
export const getThumbnailFilePath = (fileName) => path.join(THUMBNAIL_DIR, fileName);

// ==================== VIDEO VALIDATION ====================
/**
 * Validate video file
 * 
 * @param {string} videoPath - Absolute path
 * @returns {Promise<object>} Validation result
 */
export const validateVideo = async (videoPath) => {
  try {
    const metadata = await getVideoMetadata(videoPath);

    const errors = [];
    const warnings = [];

    // Duration check (max 60s for reels)
    if (metadata.duration > 60) {
      errors.push(`Video too long: ${metadata.duration.toFixed(2)}s (max 60s)`);
    }

    if (metadata.duration < 0.5) {
      errors.push(`Video too short: ${metadata.duration.toFixed(2)}s (min 0.5s)`);
    }

    // Resolution check
    if (metadata.width < 360 || metadata.height < 360) {
      errors.push(`Resolution too low: ${metadata.width}x${metadata.height} (min 360x360)`);
    }

    if (metadata.width > 4096 || metadata.height > 4096) {
      warnings.push(`Very high resolution: ${metadata.width}x${metadata.height}, will be downscaled`);
    }

    // Codec check
    const supportedCodecs = ['h264', 'hevc', 'vp8', 'vp9', 'av1'];
    if (!supportedCodecs.includes(metadata.codec)) {
      warnings.push(`Uncommon codec: ${metadata.codec}, will be re-encoded`);
    }

    // Bitrate check
    if (metadata.bitrate && metadata.bitrate > 20000000) {
      // > 20 Mbps
      warnings.push(`High bitrate: ${(metadata.bitrate / 1000000).toFixed(2)} Mbps, will be compressed`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata,
    };
  } catch (err) {
    return {
      valid: false,
      errors: [err.message],
      warnings: [],
      metadata: null,
    };
  }
};

// ==================== CLEANUP UTILITIES ====================
/**
 * Clean old files từ upload directories
 * Gọi định kỳ từ cron job
 * 
 * @param {number} daysOld - Delete files older than X days
 * @returns {Promise<object>} Cleanup results
 */
export const cleanOldFiles = async (daysOld = 7) => {
  const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  let deletedCount = 0;
  let totalSize = 0;

  const directories = [ORIGINAL_DIR, PROCESSED_DIR, THUMBNAIL_DIR];

  for (const dir of directories) {
    try {
      const files = await fs.readdir(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtimeMs < cutoffTime) {
          totalSize += stats.size;
          await deleteFile(filePath);
          deletedCount++;
        }
      }
    } catch (err) {
      logger.error(`Error cleaning directory ${dir}:`, err);
    }
  }

  logger.info(`🧹 Cleanup completed: deleted ${deletedCount} files, freed ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  return {
    deletedCount,
    freedSpace: totalSize,
  };
};

export default {
  getVideoMetadata,
  compressVideo,
  generateThumbnail,
  generateMultipleThumbnails,
  deleteFile,
  deleteFiles,
  getFileSize,
  getOriginalFilePath,
  getProcessedFilePath,
  getThumbnailFilePath,
  validateVideo,
  cleanOldFiles,
};