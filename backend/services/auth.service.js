import bcrypt from 'bcrypt';
import db from '../models/index.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { Op } from 'sequelize';

const { User, Role, RefreshToken } = db;

const registerUser = async (username, email, password, phoneNumber) => {
  const existingUser = await User.findOne({
    where: { email }
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new Error('Email đã được sử dụng.');
    }
  }

  // Hash password
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
    expiryDate: new Date(Date.now() + parseInt(process.env.REFRESH_EXPIRES_MS)), // Assuming REFRESH_EXPIRES is in ms
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

export { registerUser, loginUser, refreshUserToken, logoutUser };
