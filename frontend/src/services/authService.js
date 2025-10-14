import api from './api';

const register = (userData) => {
  return api.post('/auth/register', userData);
};

const login = (email, password) => {
  return api.post('/auth/login', { email, password });
};

const socialLogin = (idToken, provider) => {
  return api.post('/auth/social-login', { idToken, provider });
};

const refreshToken = () => {
  // Refresh token được gửi qua cookie, không cần truyền vào body
  return api.post('/auth/refresh');
};

const logout = () => {
  return api.post('/auth/logout');
};

export {
  register,
  login,
  socialLogin,
  refreshToken,
  logout,
};
