import { Sequelize } from 'sequelize';
import sequelize from '../config/database.js';
import applyAssociations from './associations.js';

// Import models
import User from './User.js';
import Role from './Role.js';
import RefreshToken from './RefreshToken.js';
import Friendship from './Friendship.js';
import Genre from './Genre.js';
import Country from './Country.js';
import Category from './Category.js';
import Movie from './Movie.js';
import Episode from './Episode.js';
import Series from './Series.js';
import Section from './Section.js';
import AiLog from './AiLog.js';
import WatchHistory from './WatchHistory.js';
import Favorite from './Favorite.js';
import Comment from './Comment.js';
import Notification from './Notification.js';

const db = {
  Sequelize,
  sequelize,
  User,
  Role,
  RefreshToken,
  Friendship,
  Genre,
  Country,
  Category,
  Movie,
  Episode,
  Series,
  Section,
  AiLog,
  WatchHistory,
  Favorite,
  Comment,
  Notification,
};

// Apply all associations
applyAssociations(db);

// Đồng bộ hóa cơ sở dữ liệu và tạo vai trò mặc định
db.sequelize.sync({ force: false }).then(async () => {
  console.log('Cơ sở dữ liệu đã được đồng bộ.');
  // Tạo các vai trò nếu chúng chưa tồn tại
  const roles = ['user', 'editor', 'admin'];
  for (const roleName of roles) {
    const [role, created] = await db.Role.findOrCreate({
      where: { name: roleName },
      defaults: { name: roleName },
    });
    if (created) {
      console.log(`Vai trò '${role.name}' đã được tạo.`);
    }
  }
}).catch(err => {
  console.error('Lỗi khi đồng bộ hóa cơ sở dữ liệu:', err);
});

export default db;
