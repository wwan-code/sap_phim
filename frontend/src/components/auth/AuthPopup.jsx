import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import AuthTabs from './AuthTabs';
import Loader from '@/components/common/Loader';
import {
  login,
  register,
  loginWithThirdParty,
  clearError,
} from '@/store/slices/authSlice';
import {
  auth,
  googleProvider,
  facebookProvider,
  githubProvider,
} from '@/utils/firebase';
import { signInWithPopup } from 'firebase/auth';
import classNames from '@/utils/classNames';
import '@/assets/scss/components/_auth-popup.scss';

const AuthPopup = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confPassword: '',
    phoneNumber: '',
  });

  const dispatch = useDispatch();
  const { loading, error, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError()); // Clear error after showing toast
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (user) {
      // Optionally close popup or redirect after successful login/register
      // For now, just show a success toast
      toast.success(`Chào mừng, ${user.username}!`);
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Vui lòng nhập email và mật khẩu.');
      return;
    }
    try {
      await dispatch(login({ email: formData.email, password: formData.password })).unwrap();
      // toast.success('Đăng nhập thành công!'); // Handled by useEffect
    } catch (err) {
      // toast.error(err.message || 'Đăng nhập thất bại.'); // Handled by useEffect
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.password || !formData.confPassword) {
      toast.error('Vui lòng nhập đầy đủ các trường.');
      return;
    }
    if (formData.password !== formData.confPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }
    try {
      await dispatch(register(formData)).unwrap();
      // toast.success('Đăng ký thành công!'); // Handled by useEffect
    } catch (err) {
      // toast.error(err.message || 'Đăng ký thất bại.'); // Handled by useEffect
    }
  };

  const handleSocialLogin = async (provider) => {
    try {
      let firebaseProvider;
      if (provider === 'google') firebaseProvider = googleProvider;
      else if (provider === 'facebook') firebaseProvider = facebookProvider;
      else if (provider === 'github') firebaseProvider = githubProvider;
      else throw new Error('Provider không hợp lệ.');

      const result = await signInWithPopup(auth, firebaseProvider);
      const idToken = await result.user.getIdToken();

      await dispatch(loginWithThirdParty({ idToken, provider })).unwrap();
      // toast.success(`Đăng nhập bằng ${provider} thành công!`); // Handled by useEffect
    } catch (err) {
      toast.error(err.message || `Đăng nhập bằng ${provider} thất bại.`);
    }
  };

  return (
    <div
      className={classNames('auth-popup-overlay', { 'auth-popup-overlay--open': isOpen })}
      onClick={onClose}
    >
      <div className="auth-popup" onClick={(e) => e.stopPropagation()}>
        {loading && <Loader />}
        <button className="auth-popup__close-btn" onClick={onClose} aria-label="Đóng">
          <i className="fa-solid fa-xmark"></i>
        </button>
        <div className="auth-popup__content">
          <AuthTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="auth-popup__form-container">
            {activeTab === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="auth-popup__form" noValidate>
                <div className="form-group">
                  <input
                    type="email"
                    id="login-email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Email"
                    required
                  />
                  <i className="form-icon fas fa-envelope"></i>
                </div>
                <div className="form-group">
                  <input
                    type="password"
                    id="login-password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Mật khẩu"
                    required
                  />
                  <i className="form-icon fas fa-lock"></i>
                </div>
                <button type="submit" className="btn auth-popup__submit-btn" disabled={loading}>
                  Đăng nhập
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="auth-popup__form" noValidate>
                <div className="form-group">
                  <input
                    type="text"
                    id="register-username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Tên người dùng"
                    required
                  />
                  <i className="form-icon fas fa-user"></i>
                </div>
                <div className="form-group">
                  <input
                    type="email"
                    id="register-email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Email"
                    required
                  />
                  <i className="form-icon fas fa-envelope"></i>
                </div>
                <div className="form-group">
                  <input
                    type="password"
                    id="register-password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Mật khẩu"
                    required
                  />
                  <i className="form-icon fas fa-lock"></i>
                </div>
                <div className="form-group">
                  <input
                    type="password"
                    id="register-confPassword"
                    name="confPassword"
                    value={formData.confPassword}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Xác nhận mật khẩu"
                    required
                  />
                  <i className="form-icon fas fa-lock"></i>
                </div>
                <div className="form-group">
                  <input
                    type="tel"
                    id="register-phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Số điện thoại (Tùy chọn)"
                  />
                  <i className="form-icon fas fa-phone"></i>
                </div>
                <button type="submit" className="btn auth-popup__submit-btn" disabled={loading}>
                  Đăng ký
                </button>
              </form>
            )}

            <div className="auth-popup__social-login">
              <p className="auth-popup__social-text">Hoặc tiếp tục với</p>
              <div className="auth-popup__social-buttons">
                <button
                  type="button"
                  className="btn btn-social btn-google"
                  onClick={() => handleSocialLogin('google')}
                  disabled={loading}
                  aria-label="Đăng nhập với Google"
                >
                  <i className="fab fa-google"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-social btn-facebook"
                  onClick={() => handleSocialLogin('facebook')}
                  disabled={loading}
                  aria-label="Đăng nhập với Facebook"
                >
                  <i className="fab fa-facebook-f"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-social btn-github"
                  onClick={() => handleSocialLogin('github')}
                  disabled={loading}
                  aria-label="Đăng nhập với GitHub"
                >
                  <i className="fab fa-github"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPopup;
