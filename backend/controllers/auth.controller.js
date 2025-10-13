import asyncHandler from 'express-async-handler';
import * as authService from '../services/auth.service.js';

// @desc    Đăng ký người dùng mới
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { username, email, password, phoneNumber } = req.body;

  if (!username || !email || !password) {
    res.status(400);
    throw new Error('Vui lòng nhập đầy đủ các trường bắt buộc.');
  }

  const { user, accessToken, refreshToken } = await authService.registerUser(username, email, password, phoneNumber);

  // Lưu refresh token vào cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: parseInt(process.env.REFRESH_EXPIRES_MS),
  });

  res.status(201).json({
    data: { user, accessToken },
    message: 'Đăng ký thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Đăng nhập người dùng
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Vui lòng nhập email và mật khẩu.');
  }

  const { user, accessToken, refreshToken } = await authService.loginUser(email, password);

  // Lưu refresh token vào cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: parseInt(process.env.REFRESH_EXPIRES_MS),
  });

  res.status(200).json({
    data: { user, accessToken },
    message: 'Đăng nhập thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Làm mới Access Token
// @route   POST /api/auth/refresh
// @access  Public (sử dụng Refresh Token từ cookie)
const refresh = asyncHandler(async (req, res) => {
  const oldRefreshToken = req.cookies.refreshToken;

  if (!oldRefreshToken) {
    res.status(401);
    throw new Error('Không có refresh token.');
  }

  const { accessToken, refreshToken } = await authService.refreshUserToken(oldRefreshToken);

  // Cập nhật refresh token mới vào cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: parseInt(process.env.REFRESH_EXPIRES_MS),
  });

  res.status(200).json({
    data: { accessToken },
    message: 'Làm mới token thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Đăng nhập/Đăng ký bằng tài khoản mạng xã hội
// @route   POST /api/auth/social-login
// @access  Public
const socialLogin = asyncHandler(async (req, res) => {
  const { idToken, provider } = req.body; // idToken từ Firebase, provider (google, facebook, github)

  if (!idToken || !provider) {
    res.status(400);
    throw new Error('Thiếu thông tin idToken hoặc provider.');
  }

  const { user, accessToken, refreshToken } = await authService.socialLogin(idToken, provider);

  // Lưu refresh token vào cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: parseInt(process.env.REFRESH_EXPIRES_MS),
  });

  res.status(200).json({
    data: { user, accessToken },
    message: `Đăng nhập bằng ${provider} thành công.`,
    errors: null,
    meta: null,
  });
});

// @desc    Đăng xuất người dùng
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    await authService.logoutUser(refreshToken);
  }

  // Xóa refresh token khỏi cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.status(200).json({
    data: null,
    message: 'Đăng xuất thành công.',
    errors: null,
    meta: null,
  });
});

export { register, login, refresh, socialLogin, logout };
