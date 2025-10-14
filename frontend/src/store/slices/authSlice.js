import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import * as authService from '@/services/authService';
import userService from '@/services/userService';
import { disconnectSocket } from '@/socket/socketManager';

// Redux Persist sẽ tự động tải và lưu trạng thái này
const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  error: null,
};

// Async action: Đăng ký người dùng
export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);
      return response.data.data; // Lấy data từ response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Đăng ký thất bại.';
      return rejectWithValue(message);
    }
  }
);

// Async action: Đăng nhập người dùng
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials.email, credentials.password);
      return response.data.data; // Lấy data từ response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Đăng nhập thất bại.';
      return rejectWithValue(message);
    }
  }
);

// Async action: Đăng nhập bằng ứng dụng bên thứ 3 (Firebase)
export const loginWithThirdParty = createAsyncThunk(
  'auth/socialLogin',
  async ({ idToken, provider }, { rejectWithValue }) => {
    try {
      const response = await authService.socialLogin(idToken, provider);
      return response.data.data; // Lấy data từ response.data
    } catch (error) {
      console.log(error);
      const message = error.response?.data?.message || error.message || 'Đăng nhập bằng bên thứ 3 thất bại.';
      return rejectWithValue(message);
    }
  }
);

// Async action: Làm mới Access Token
export const refreshAccessToken = createAsyncThunk(
  'auth/refreshAccessToken',
  async (_, { getState, rejectWithValue }) => {
    const { refreshToken: currentRefreshToken } = getState().auth;
    if (!currentRefreshToken) {
      return rejectWithValue('Không có refresh token.');
    }
    try {
      const response = await authService.refreshToken(currentRefreshToken);
      return response.data.data; // Lấy data từ response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Làm mới token thất bại.';
      return rejectWithValue(message);
    }
  }
);

// Async action: Cập nhật thông tin profile
export const updateUserProfile = createAsyncThunk(
  'user/updateProfile',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await userService.updateProfile(userData);
      return response.data.data; // Lấy data từ response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Cập nhật profile thất bại.';
      return rejectWithValue(message);
    }
  }
);

// Async action: Tải lên ảnh đại diện
export const uploadUserAvatar = createAsyncThunk(
  'user/uploadAvatar',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await userService.uploadAvatar(formData);
      return response.data.data; // Lấy data từ response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Tải lên ảnh đại diện thất bại.';
      return rejectWithValue(message);
    }
  }
);

// Async action: Tải lên ảnh bìa
export const uploadUserCover = createAsyncThunk(
  'user/uploadCover',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await userService.uploadCover(formData);
      return response.data.data; // Lấy data từ response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Tải lên ảnh bìa thất bại.';
      return rejectWithValue(message);
    }
  }
);


const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Action: Đăng xuất người dùng
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      disconnectSocket();
    },
    // Action: Cập nhật thông tin người dùng (ví dụ sau khi chỉnh sửa profile)
    setUser: (state, action) => {
      state.user = action.payload;
    },
    // Action: Xóa lỗi
    clearError: (state) => {
      state.error = null;
    },
    // Action: Cập nhật trạng thái online/offline của người dùng hiện tại
    setCurrentUserOnlineStatus: (state, action) => {
      const { online, lastOnline } = action.payload;
      if (state.user) {
        state.user.online = online;
        state.user.lastOnline = lastOnline;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        // Socket initialization will be handled in Root.jsx
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Social Login
      .addCase(loginWithThirdParty.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithThirdParty.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        // Socket initialization will be handled in Root.jsx
      })
      .addCase(loginWithThirdParty.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Refresh Access Token
      .addCase(refreshAccessToken.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.loading = false;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken; // Cập nhật refresh token mới
      })
      .addCase(refreshAccessToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // Nếu refresh token thất bại, tự động đăng xuất
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        disconnectSocket();
        toast.error('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(uploadUserAvatar.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(uploadUserCover.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      });
  },
});

export const { logout, setUser, clearError, setCurrentUserOnlineStatus } = authSlice.actions;
export default authSlice.reducer;
