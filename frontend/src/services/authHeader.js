import { store } from '@/store';

// Hàm lấy header Authorization với Access Token
export default function authHeader() {
  const { accessToken } = store.getState().auth;

  if (accessToken) {
    return { Authorization: 'Bearer ' + accessToken };
  } else {
    return {};
  }
}