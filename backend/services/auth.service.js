import bcrypt from 'bcrypt';
import db from '../models/index.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { Op } from 'sequelize';
import admin from 'firebase-admin';

// Khởi tạo Firebase Admin SDK nếu chưa được khởi tạo
// Đảm bảo rằng bạn đã cấu hình biến môi trường FIREBASE_SERVICE_ACCOUNT_KEY
// hoặc cung cấp đường dẫn đến file service account JSON.
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error("Lỗi khi khởi tạo Firebase Admin SDK:", error);
    // Có thể throw error hoặc xử lý khác tùy theo yêu cầu
  }
}

const { User, Role, RefreshToken, LoginHistory } = db;

const registerUser = async (username, email, password, phoneNumber) => {
  const existingUser = await User.findOne({
    where: { email }
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new Error('Email đã được sử dụng.');
    }
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    phoneNumber,
  });

  const defaultRole = await Role.findOne({ where: { name: 'user' } });
  if (defaultRole) {
    await user.addRole(defaultRole);
  } else {
    console.warn('Default role "user" not found. Please seed the database.');
  }

  const userWithRoles = await User.findByPk(user.id, {
    include: [{ model: Role, as: 'roles', attributes: ['name'] }],
    attributes: { exclude: ['password', 'updatedAt', 'deletedAt', 'provider'] }
  });

  const accessToken = generateAccessToken(userWithRoles);
  const refreshToken = generateRefreshToken(userWithRoles);

  await RefreshToken.create({
    token: refreshToken,
    userId: user.id,
    expiryDate: new Date(Date.now() + parseInt(process.env.REFRESH_EXPIRES_MS)),
  });

  return { user: userWithRoles, accessToken, refreshToken };
};

const loginUser = async (email, password) => {
  const user = await User.findOne({
    where: { email }
  });

  if (!user) {
    throw new Error('Email hoặc mật khẩu không đúng.');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Email hoặc mật khẩu không đúng.');
  }

  const userWithRoles = await User.findByPk(user.id, {
    include: [{ model: Role, as: 'roles', attributes: ['name'] }],
    attributes: { exclude: ['password', 'updatedAt', 'deletedAt', 'provider'] }
  });

  const accessToken = generateAccessToken(userWithRoles);
  const refreshToken = generateRefreshToken(userWithRoles);

  await RefreshToken.destroy({ where: { userId: user.id } });
  await RefreshToken.create({
    token: refreshToken,
    userId: user.id,
    expiryDate: new Date(Date.now() + parseInt(process.env.REFRESH_EXPIRES_MS)),
  });

  return { user: userWithRoles, accessToken, refreshToken };
};

const refreshUserToken = async (oldRefreshToken) => {
  const existingRefreshToken = await RefreshToken.findOne({
    where: { token: oldRefreshToken },
    include: [{ model: User, as: 'user', include: [{ model: Role, as: 'roles', attributes: ['name'] }] }],
  });

  if (!existingRefreshToken || existingRefreshToken.expiryDate < new Date()) {
    throw new Error('Refresh token không hợp lệ hoặc đã hết hạn.');
  }

  const user = existingRefreshToken.user;
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  existingRefreshToken.token = newRefreshToken;
  existingRefreshToken.expiryDate = new Date(Date.now() + parseInt(process.env.REFRESH_EXPIRES_MS));
  await existingRefreshToken.save();

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

const logoutUser = async (refreshToken) => {
  await RefreshToken.destroy({ where: { token: refreshToken } });
};

const socialLogin = async (idToken, provider, req) => {
  // 1. Validate input
  if (!idToken ||!provider) {
    throw new Error('Thiếu thông tin idToken hoặc provider.');
  }

  let decodedToken;
  try {
    // 2. Xác thực idToken từ Firebase
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error('Lỗi xác thực Firebase ID Token:', error);
    throw new Error('ID Token không hợp lệ hoặc đã hết hạn.');
  }

  // 3. Chống Replay Attack: Kiểm tra thời gian xác thực của token
  // `auth_time` là thời điểm người dùng được xác thực bởi Firebase.
  // Nếu `auth_time` quá cũ, có thể là một cuộc tấn công replay.
  // Cần định nghĩa một ngưỡng thời gian hợp lý, ví dụ 5 phút (300 giây).
  const REPLAY_ATTACK_THRESHOLD_SECONDS = 300; // 5 phút
  const currentTimeInSeconds = Math.floor(Date.now() / 1000);
  if (decodedToken.auth_time < (currentTimeInSeconds - REPLAY_ATTACK_THRESHOLD_SECONDS)) {
    throw new Error('ID Token quá cũ, có thể là một cuộc tấn công replay.');
  }

  const { email, uid, name, picture } = decodedToken;

  // Tìm kiếm người dùng trong hệ thống
  let user = await User.findOne({
    where: {
      [Op.or]: [
        { email: email },
        { uuid: uid, provider: provider } // Tìm theo Firebase UID và provider
      ]
    }
  });

  let isNewUser = false;
  if (!user) {
    // Nếu người dùng chưa tồn tại, tạo tài khoản mới
    isNewUser = true;
    const defaultRole = await Role.findOne({ where: { name: 'user' } });
    if (!defaultRole) {
      console.warn('Default role "user" not found. Please seed the database.');
      throw new Error('Hệ thống chưa cấu hình vai trò mặc định.');
    }

    user = await User.create({
      uuid: uid, // Lưu Firebase UID vào trường uuid của User
      username: name || email.split('@')[0], // Sử dụng tên từ Firebase hoặc phần trước @ của email
      email: email,
      password: bcrypt.hashSync(uid, 10), // Tạo mật khẩu giả hoặc ngẫu nhiên cho social login
      avatarUrl: picture,
      provider: provider,
      // Các trường khác có thể được điền sau hoặc để mặc định
    });
    await user.addRole(defaultRole);
  } else {
    // Nếu người dùng đã tồn tại, cập nhật thông tin nếu cần
    // Ví dụ: cập nhật avatar, username nếu có thay đổi từ provider
    const updateFields = {};
    if (name && user.username !== name) updateFields.username = name;
    if (picture && user.avatarUrl !== picture) updateFields.avatarUrl = picture;
    if (!user.provider) updateFields.provider = provider; // Gán provider nếu chưa có

    if (Object.keys(updateFields).length > 0) {
      await user.update(updateFields);
    }
  }

  // Lấy thông tin người dùng kèm vai trò để tạo token
  const userWithRoles = await User.findByPk(user.id, {
    include: [{ model: Role, as: 'roles', attributes: ['name'] }],
    attributes: { exclude: ['password', 'updatedAt', 'deletedAt'] } // Loại bỏ password
  });

  // Tạo Access Token và Refresh Token
  const accessToken = generateAccessToken(userWithRoles);
  const refreshToken = generateRefreshToken(userWithRoles);

  // Xóa tất cả refresh token cũ của người dùng này để đảm bảo chỉ có một token hợp lệ tại một thời điểm
  // Điều này giúp tăng cường bảo mật và tránh token rác
  await RefreshToken.destroy({ where: { userId: user.id } });

  // Lưu refresh token mới vào cơ sở dữ liệu
  await RefreshToken.create({
    token: refreshToken,
    userId: user.id,
    expiryDate: new Date(Date.now() + parseInt(process.env.REFRESH_EXPIRES_MS)),
  });

  // Ghi log lịch sử đăng nhập
  const ipAddress = req ? req.ip : null; // Lấy IP từ request nếu có
  const userAgent = req ? req.headers['user-agent'] : null; // Lấy User-Agent từ request nếu có

  await LoginHistory.create({
    userId: user.id,
    provider: provider,
    ipAddress: ipAddress,
    userAgent: userAgent,
  });

  return { user: userWithRoles, accessToken, refreshToken, isNewUser };
};

export { registerUser, loginUser, refreshUserToken, logoutUser, socialLogin };
