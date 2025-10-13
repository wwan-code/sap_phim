import React, { useState, useEffect, useContext } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import { useDeviceType } from '@/hooks/useDeviceType';
import { AuthPopupContext } from '@/app/AppLayout';
import classNames from '@/utils/classNames';
import SearchBar from '@/components/search/SearchBar';
import NotificationDropdown from '../notifications/NotificationDropdown';
import { useNotificationQueries } from '@/hooks/useNotificationQueries';
import { useNotificationStore } from '@/stores/notificationStore';
import { useDropdown } from '@/hooks/useDropdown'; // Vẫn giữ lại cho user menu
import '@/assets/scss/components/layout/_header.scss';

const Header = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, accessToken } = useSelector((state) => state.auth);
  const deviceType = useDeviceType();
  const { openAuthPopup } = useContext(AuthPopupContext);

  // State & Hooks mới cho Notification
  const { unreadCount } = useNotificationQueries();
  const { isDropdownOpen, toggleDropdown, closeDropdown } = useNotificationStore();

  // Hook dropdown cũ chỉ dùng cho User Menu
  const { isOpen: isUserMenuOpen, toggle: toggleUserMenu, getTriggerProps, getDropdownProps } = useDropdown();

  const [isHeaderFixed, setIsHeaderFixed] = useState(false);

  const handleScroll = () => {
    if (window.scrollY > 0) { // Adjust scroll threshold as needed
      setIsHeaderFixed(true);
    } else {
      setIsHeaderFixed(false);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <header className={classNames('header', { 'header--fixed': isHeaderFixed })}>
      <div className="header__left">
        {deviceType !== 'desktop' && (
          <button className="header__hamburger-menu" onClick={toggleSidebar}>
            <i className="fas fa-bars"></i>
          </button>
        )}
        <Link to="/" className="header__logo">
          <img src="/vite.svg" alt="WWAN Logo" />
          <span>WWAN</span>
        </Link>
      </div>
      {deviceType === 'desktop' && (
        <div className="header__center">
          
          <div className="header__search">
            <SearchBar />
          </div>
        </div>
      )}

      <div className="header__right">
        {deviceType === 'desktop' && (
          <nav className="header__nav">
          <ul>
            <li>
              <NavLink to="/">Trang chủ</NavLink>
            </li>
            <li>
              <NavLink to="/movies">Phim</NavLink>
            </li>
            <li>
              <NavLink to="/friends">Bạn bè</NavLink>
            </li>
            {user && (
              <li>
                <NavLink to="/watchlist">Danh sách xem</NavLink>
              </li>
            )}
          </ul>
        </nav>
        )}

        {accessToken ? (
          <>
            {/* Notification Bell */}
            <div className="header__notification">
              <button
                className="header__notification-btn"
                onClick={() => toggleDropdown()}
                aria-haspopup="dialog"
                aria-expanded={isDropdownOpen}
                aria-label={`Thông báo, ${unreadCount} chưa đọc`}
              >
                <i className="fas fa-bell"></i>
                {unreadCount > 0 && (
                  <span className="header__notification-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <NotificationDropdown isOpen={isDropdownOpen} onClose={closeDropdown} />
            </div>

            {/* User Menu */}
            <div className="header__user-menu">
              <button
                className="header__user-menu-trigger"
                {...getTriggerProps('header-user-menu')}
              >
                <img
                  src={user?.avatarUrl ? `${import.meta.env.VITE_SERVER_URL}${user.avatarUrl}` : 'https://placehold.co/40?text=User'}
                  alt="User Avatar"
                  className="header__user-menu-avatar"
                />
              </button>
              <div
                className={classNames('header__user-menu-dropdown', {
                  'header__user-menu-dropdown--open': isUserMenuOpen('header-user-menu'),
                })}
                {...getDropdownProps('header-user-menu')}
              >
                <ul role="menu">
                  <li role="none">
                    <Link role="menuitem" to="/profile" onClick={() => toggleUserMenu('header-user-menu')}>
                      <i className="fas fa-user-circle"></i> Hồ sơ
                    </Link>
                  </li>
                  <li role="none">
                    <Link role="menuitem" to="/notifications" onClick={() => toggleUserMenu('header-user-menu')}>
                      <i className="fas fa-bell"></i> Thông báo
                    </Link>
                  </li>
                  {user && user.roles && (user.roles.find(role => role.name === 'admin' || role.name === 'editor')) && (
                    <li role="none">
                      <Link role="menuitem" to="/admin/dashboard" onClick={() => toggleUserMenu('header-user-menu')}>
                        <i className="fas fa-tachometer-alt"></i> Trang quản trị
                      </Link>
                    </li>
                  )}
                  <li role="none">
                    <button role="menuitem" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt"></i> Đăng xuất
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </>
        ) : (
          <button onClick={openAuthPopup} className="header__btn header__btn--primary">
            Đăng nhập
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
