import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import classNames from '@/utils/classNames';
import SearchBar from '@/components/search/SearchBar'; // Import SearchBar
import '@/assets/scss/components/layout/_sidebar.scss';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className={classNames('sidebar', { 'sidebar--open': isOpen })}>
      <div className="sidebar__backdrop" onClick={toggleSidebar}></div>
      <div className="sidebar__content">
        <div className="sidebar__header">
          <Link to="/" className="sidebar__logo">
            <img src="/vite.svg" alt="WWAN Logo" />
            <span>WWAN</span>
          </Link>
          <button className="sidebar__close-btn" onClick={toggleSidebar}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="sidebar__search">
          <SearchBar />
        </div>

        <nav className="sidebar__nav">
          <ul>
            <li>
              <NavLink to="/" onClick={toggleSidebar}>
                <i className="fas fa-home"></i> Trang chủ
              </NavLink>
            </li>
            <li>
              <NavLink to="/movies" onClick={toggleSidebar}>
                <i className="fas fa-film"></i> Phim
              </NavLink>
            </li>
            <li>
              <NavLink to="/friends" onClick={toggleSidebar}>
                <i className="fas fa-users"></i> Bạn bè
              </NavLink>
            </li>
            {user && (
              <li>
                <NavLink to="/watchlist" onClick={toggleSidebar}>
                  <i className="fas fa-bookmark"></i> Danh sách xem
                </NavLink>
              </li>
            )}
            {user && user.roles && (user.roles.find(role => role.name === 'admin' || role.name === 'editor')) && (
              <li>
                <NavLink to="/admin/dashboard" onClick={toggleSidebar}>
                  <i className="fas fa-tachometer-alt"></i> Admin Dashboard
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        <div className="sidebar__footer">
          <p>&copy; {new Date().getFullYear()} WWAN. All rights reserved.</p>
          <p>Liên hệ: support@wwan.com</p>
          <div className="sidebar__social-links">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-discord"></i>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-youtube"></i>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
