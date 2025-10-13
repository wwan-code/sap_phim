import express from 'express';
import cors from 'cors';
import session from "express-session";
import connectSessionSequelize from 'connect-session-sequelize';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';

import sequelize from './config/database.js';
import { initSocket } from './config/socket.js';
import { errorHandler } from './middlewares/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import friendRoutes from './routes/friend.routes.js';
import genreRoutes from './routes/genre.routes.js';
import countryRoutes from './routes/country.routes.js';
import categoryRoutes from './routes/category.routes.js';
import movieRoutes from './routes/movie.routes.js';
import episodeRoutes from './routes/episode.routes.js';
import seriesRoutes from './routes/series.routes.js';
import sectionRoutes from './routes/section.routes.js';
import aiRoutes from './routes/ai.routes.js';
import watchHistoryRoutes from './routes/watchHistory.routes.js';
import favoriteRoutes from './routes/favorite.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import commentRoutes from './routes/comment.routes.js';

// Cấu hình dotenv để đọc biến môi trường
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const corsOptions = {
    origin: process.env.CLIENT_URL, // Sử dụng CLIENT_URL từ .env
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
};
app.use(cors(corsOptions));

// Các middleware bảo mật và logging
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" }
    })
); 
app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cấu hình Rate Limiting cơ bản
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 20, // Giới hạn mỗi IP 20 request trong 15 phút
  message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút.',
  standardHeaders: true, // Trả về thông tin rate limit trong header `RateLimit-*`
  legacyHeaders: false, // Tắt header `X-RateLimit-*`
});

// session
const SequelizeStore = connectSessionSequelize(session.Store);
const sessionStore = new SequelizeStore({ db: sequelize });
app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 ngày
        secure: process.env.NODE_ENV === 'production', // Chỉ gửi cookie qua HTTPS trong production
        httpOnly: true, // Ngăn chặn truy cập cookie qua JavaScript client-side
        sameSite: 'lax', // Bảo vệ CSRF
    }
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the WWAN application.' });
});

// Routes
app.use('/api/auth', limiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api', movieRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/watch-history', watchHistoryRoutes);
app.use('/api', favoriteRoutes);
app.use('/api/comments', commentRoutes); // Add comment routes

// Gắn router con của episode vào movie
app.use('/api', episodeRoutes); 
// Gắn router con của section vào movie
app.use('/api', sectionRoutes);
app.use('/api/ai', aiRoutes);

// Middleware xử lý lỗi tập trung
app.use(errorHandler);

// Khởi tạo HTTP server
const httpServer = createServer(app);

// Khởi tạo Socket.IO
initSocket(httpServer);

// Lắng nghe cổng trên tất cả interfaces
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
  console.log(`Truy cập qua: http://localhost:${PORT} hoặc http://192.168.1.133:${PORT}`);
});
