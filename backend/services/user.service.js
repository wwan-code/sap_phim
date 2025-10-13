import db from '../models/index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize'; // Import Op

const { User, Role } = db;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đường dẫn thư mục uploads
const uploadDir = path.join(__dirname, '../uploads/users');

/**
 * @desc Cập nhật thông tin profile của người dùng
 * @param {number} userId - ID của người dùng
 * @param {object} updatedData - Dữ liệu cần cập nhật
 * @returns {Promise<User>} Đối tượng người dùng đã được cập nhật
 */
const updateUserProfile = async (userId, updatedData) => {
  const user = await User.findByPk(userId, {
    include: [{ model: Role, as: 'roles', attributes: ['name'] }],
    attributes: { exclude: ['password', 'updatedAt', 'deletedAt', 'provider'], include: ['online', 'lastOnline'] },
  });

  if (!user) {
    throw new Error('Người dùng không tồn tại.');
  }
  const { username, email, phoneNumber, sex, bio } = updatedData;

  if (username) user.username = username;
  if (phoneNumber) user.phoneNumber = phoneNumber;
  if (sex) user.sex = sex;
  if (bio) user.bio = bio;

  // Cập nhật email (nếu thay đổi và chưa tồn tại)
  if (email && email.toLowerCase() !== user.email.toLowerCase()) {
    const existing = await User.findOne({ where: { email, id: { [Op.ne]: userId } } });
    if (existing) {
      throw createError('Email đã được sử dụng bởi tài khoản khác.', 409);
    }
    user.email = email;
  }
  await user.save();
  await user.reload();
  return user;
};

/**
 * @desc Cập nhật ảnh đại diện (avatar) của người dùng
 * @param {number} userId - ID của người dùng
 * @param {string} avatarUrl - Đường dẫn URL của ảnh avatar mới
 * @returns {Promise<User>} Đối tượng người dùng đã được cập nhật
 */
const updateUserAvatar = async (userId, avatarUrl) => {
  const user = await User.findByPk(userId, {
    include: [{ model: Role, as: 'roles', attributes: ['name'] }],
    attributes: { exclude: ['password', 'updatedAt', 'deletedAt', 'provider'] }
  });

  if (!user) {
    throw new Error('Người dùng không tồn tại.');
  }

  // Xóa ảnh cũ nếu có và không phải là ảnh mặc định
  if (user.avatarUrl && !user.avatarUrl.endsWith('/default-avatar.png')) {
    const oldAvatarPath = path.join(uploadDir, path.basename(user.avatarUrl));
    if (fs.existsSync(oldAvatarPath)) {
      fs.unlinkSync(oldAvatarPath);
    }
  }

  user.avatarUrl = avatarUrl;
  await user.save();
  return user;
};

/**
 * @desc Cập nhật ảnh bìa (cover) của người dùng
 * @param {number} userId - ID của người dùng
 * @param {string} coverUrl - Đường dẫn URL của ảnh cover mới
 * @returns {Promise<User>} Đối tượng người dùng đã được cập nhật
 */
const updateUserCover = async (userId, coverUrl) => {
  const user = await User.findByPk(userId, {
    include: [{ model: Role, as: 'roles', attributes: ['name'] }],
    attributes: { exclude: ['password', 'updatedAt', 'deletedAt', 'provider'] },
  });

  if (!user) {
    throw new Error('Người dùng không tồn tại.');
  }

  // Xóa ảnh cũ nếu có và không phải là ảnh mặc định
  if (user.coverUrl && !user.coverUrl.endsWith('/default-cover.png')) {
    const oldCoverPath = path.join(uploadDir, path.basename(user.coverUrl));
    if (fs.existsSync(oldCoverPath)) {
      fs.unlinkSync(oldCoverPath);
    }
  }

  user.coverUrl = coverUrl;
  await user.save();
  return user;
};

/**
 * @desc Lấy thông tin người dùng theo UUID
 * @param {string} uuid - UUID của người dùng
 * @returns {Promise<User>} Đối tượng người dùng
 */
const getUserByUuid = async (uuid) => {
  const user = await User.findOne({
    where: { uuid },
    include: [
      { 
        model: Role, 
        as: 'roles', 
        attributes: ['name'] 
      }
    ],
    attributes: { exclude: ['password', 'updatedAt', 'deletedAt', 'provider'], include: ['online', 'lastOnline'] },
  });

  if (!user) {
    throw new Error('Người dùng không tồn tại.');
  }

  return user;
};

/**
 * @desc Lấy danh sách bạn bè của người dùng theo UUID
 * @param {string} uuid - UUID của người dùng
 * @returns {Promise<Array<User>>} Danh sách bạn bè
 */
const getUserFriendsByUuid = async (uuid) => {
  const user = await User.findOne({ where: { uuid } });

  if (!user) {
    throw new Error('Người dùng không tồn tại.');
  }

  const friendships = await db.Friendship.findAll({
    where: {
      [Op.or]: [{ senderId: user.id }, { receiverId: user.id }],
      status: 'accepted',
    },
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'uuid', 'username', 'avatarUrl', 'online', 'lastOnline'],
      },
      {
        model: User,
        as: 'receiver',
        attributes: ['id', 'uuid', 'username', 'avatarUrl', 'online', 'lastOnline'],
      },
    ],
  });

  const friends = friendships.map((f) => {
    return f.senderId === user.id ? f.receiver : f.sender;
  });

  return friends;
};

/**
 * @desc Lấy danh sách phim yêu thích của người dùng theo UUID
 * @param {string} uuid - UUID của người dùng
 * @param {number} page - Trang hiện tại
 * @param {number} limit - Số lượng item mỗi trang
 * @returns {Promise<object>} Danh sách phim yêu thích với phân trang
 */
const getUserFavoritesByUuid = async (uuid, page = 1, limit = 10) => {
  const user = await User.findOne({ where: { uuid } });
  
  if (!user) {
    throw new Error('Người dùng không tồn tại.');
  }

  const offset = (page - 1) * limit;
  
  const { count, rows: favorites } = await db.Favorite.findAndCountAll({
    where: { userId: user.id },
    include: [{
      model: db.Movie,
      as: 'movie',
      include: [
        { model: db.Genre, as: 'genres', attributes: ['title'] },
        { model: db.Country, as: 'country', attributes: ['title'] },
        { model: db.Category, as: 'category', attributes: ['title'] }
      ],
      attributes: ['id', 'titles', 'slug', 'image', 'releaseDate', 'duration', 'image']
    }],
    limit,
    offset,
    order: [['createdAt', 'DESC']]
  });

  return {
    favorites: favorites.map(fav => fav.movie),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      itemsPerPage: limit
    }
  };
};

/**
 * @desc Lấy lịch sử xem phim của người dùng theo UUID
 * @param {string} uuid - UUID của người dùng
 * @param {number} page - Trang hiện tại
 * @param {number} limit - Số lượng item mỗi trang
 * @returns {Promise<object>} Lịch sử xem phim với phân trang
 */
const getUserWatchHistoryByUuid = async (uuid, page = 1, limit = 10) => {
  const user = await User.findOne({ where: { uuid } });
  
  if (!user) {
    throw new Error('Người dùng không tồn tại.');
  }

  const offset = (page - 1) * limit;
  
  const { count, rows: watchHistories } = await db.WatchHistory.findAndCountAll({
    where: { userId: user.id },
    include: [
      {
        model: db.Movie,
        as: 'movie',
        include: [
          { model: db.Genre, as: 'genres', attributes: ['title'] },
          { model: db.Country, as: 'country', attributes: ['title'] },
          { model: db.Category, as: 'category', attributes: ['title'] }
        ],
        attributes: ['id', 'titles', 'slug', 'image', 'releaseDate', 'duration', 'imdb']
      },
      {
        model: db.Episode,
        as: 'episode',
        attributes: ['id', 'episodeNumber'],
        required: false
      }
    ],
    limit,
    offset,
    order: [['timestamp', 'DESC']]
  });

  return {
    watchHistories,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      itemsPerPage: limit
    }
  };
};

export { updateUserProfile, updateUserAvatar, updateUserCover, getUserByUuid, getUserFavoritesByUuid, getUserWatchHistoryByUuid, getUserFriendsByUuid };
/**
 * @desc Tìm kiếm người dùng theo username (phục vụ mention)
 * @param {string} query - Từ khóa tìm kiếm
 * @param {number} limit - Số lượng kết quả tối đa
 * @returns {Promise<Array>} Danh sách người dùng rút gọn
 */
const searchUsers = async (query, limit = 10) => {
  const trimmed = query;
  if (!trimmed || trimmed.trim().length === 0) return [];

  const users = await User.findAll({
    where: {
      username: { [Op.like]: `%${trimmed.trim()}%` },
    },
    attributes: ['id', 'uuid', 'username', 'avatarUrl'],
    limit,
    order: [['username', 'ASC']],
  });

  return users;
};

export { searchUsers };

/**
 * @desc Tìm kiếm bạn bè của người dùng theo username
 * @param {number} userId - ID người dùng hiện tại
 * @param {string} query - Từ khóa
 * @param {number} limit - Số kết quả tối đa
 * @returns {Promise<Array>} Danh sách bạn bè rút gọn
 */
const searchFriendsByUserId = async (userId, query, limit = 10) => {
  const trimmed = (query || '').trim();

  const friendships = await db.Friendship.findAll({
    where: {
      [Op.or]: [{ senderId: userId }, { receiverId: userId }],
      status: 'accepted',
    },
    include: [
      { model: User, as: 'sender', attributes: ['id', 'uuid', 'username', 'avatarUrl'] },
      { model: User, as: 'receiver', attributes: ['id', 'uuid', 'username', 'avatarUrl'] },
    ],
  });

  let friends = friendships.map((f) => (f.senderId === userId ? f.receiver : f.sender));
  if (trimmed) {
    const qLower = trimmed.toLowerCase();
    friends = friends.filter((u) => (u?.username || '').toLowerCase().includes(qLower));
  }

  // Remove duplicates by id
  const uniqueById = new Map();
  for (const u of friends) {
    if (!uniqueById.has(u.id)) uniqueById.set(u.id, u);
  }

  return Array.from(uniqueById.values()).slice(0, limit);
};

export { searchFriendsByUserId };
