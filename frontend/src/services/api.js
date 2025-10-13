import axios from 'axios';
import { store } from '@/store';
import { refreshAccessToken, logout } from '@/store/slices/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Quan trọng để gửi cookie (refresh token)
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const { accessToken } = store.getState().auth;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi là 401 và không phải là request refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Đánh dấu request này đã được thử lại

      if (isRefreshing) {
        // Nếu đang refresh, thêm request vào hàng đợi
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
        .then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch(err => {
          return Promise.reject(err);
        });
      }

      isRefreshing = true;

      const { refreshToken: currentRefreshToken } = store.getState().auth;

      if (!currentRefreshToken) {
        store.dispatch(logout());
        processQueue(error, null);
        return Promise.reject(error);
      }

      try {
        // Gọi API refresh token
        // refreshAccessToken thunk tự lấy refreshToken từ Redux state
        const refreshResponse = await store.dispatch(refreshAccessToken()).unwrap();
        const newAccessToken = refreshResponse.accessToken;

        // Cập nhật token trong header của request gốc và các request trong hàng đợi
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken); // Xử lý hàng đợi với token mới

        return api(originalRequest); // Thực hiện lại request gốc
      } catch (refreshError) {
        // Refresh token thất bại, đăng xuất người dùng
        store.dispatch(logout());
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
