import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    logging: process.env.NODE_ENV === 'development' ? console.log : false, // Chỉ log trong development
    pool: {
      max: 20, // Tăng số connection tối đa cho chat realtime
      min: 5,  // Giữ ít nhất 5 connection sẵn sàng
      acquire: 30000, // Thời gian chờ tối đa để lấy connection
      idle: 10000,    // Thời gian idle trước khi đóng connection
      evict: 1000,    // Kiểm tra connection idle mỗi 1 giây
      handleDisconnects: true, // Tự động xử lý ngắt kết nối
    },
    dialectOptions: {
      connectTimeout: 60000, // Timeout kết nối database
      acquireTimeout: 60000,
      timeout: 60000,
    },
    retry: {
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ETIMEDOUT/,
        /ESOCKETTIMEDOUT/,
        /EHOSTUNREACH/,
        /EPIPE/,
        /EAI_AGAIN/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/
      ],
      max: 3 // Thử lại tối đa 3 lần
    }
  }
);

export default sequelize;
