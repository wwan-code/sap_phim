import React from 'react';
import { NavLink } from 'react-router-dom';
import classNames from '@/utils/classNames';

import { FaTachometerAlt, FaFilm, FaGlobe, FaTags, FaComment, FaChartBar } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import '@/assets/scss/components/admin/_admin-sidebar.scss';

const AdminSidebar = ({ isOpen, toggleSidebar }) => {
  // Define menu items with icons and paths
  const menuItems = [
    {
      path: '/admin/dashboard',
      label: 'Dashboard',
      icon: <FaTachometerAlt className="icon" />,
    },
    {
      path: '/admin/genres',
      label: 'Genres',
      icon: <FaFilm className="icon" />,
    },
    {
      path: '/admin/countries',
      label: 'Countries',
      icon: <FaGlobe className="icon" />,
    },
    {
      path: '/admin/categories',
      label: 'Categories',
      icon: <FaTags className="icon" />,
    },
    {
      path: '/admin/movies',
      label: 'Movies',
      icon: <FaFilm className="icon" />,
    },
    {
      path: '/admin/episodes',
      label: 'Episodes',
      icon: <FaFilm className="icon" />,
    },
    {
      path: '/admin/series',
      label: 'Series',
      icon: <FaFilm className="icon" />,
    },
    {
      path: '/admin/sections',
      label: 'Sections',
      icon: <FaFilm className="icon" />,
    },
    {
      path: '/admin/comments/reported',
      label: 'Reported Comments',
      icon: <FaComment className="icon" />,
    },
    {
      path: '/admin/comments/analytics',
      label: 'Comment Analytics',
      icon: <FaChartBar className="icon" />,
    },
  ];

  return (
    <aside className={classNames("admin-sidebar", { "is-open": isOpen })}>
      <div className="admin-sidebar__header">
        <NavLink to="/admin/dashboard" className="admin-sidebar__brand">
          {/* Placeholder for logo */}
          <img src="/vite.svg" alt="Admin Logo" className="admin-sidebar__logo"/>
          <h2 className="admin-sidebar__title">Admin RapRe</h2>
        </NavLink>
        <div className="admin-sidebar__controls">
          {/* Close button for mobile/tablet */}
          <button className="admin-sidebar__close-btn" onClick={toggleSidebar}>
            <MdClose />
          </button>
        </div>
      </div>
      <nav className="admin-sidebar__nav">
        <div className="admin-sidebar__menu">
          <div className="admin-sidebar__menu-item">
            <h4 className="admin-sidebar__menu-header">Admin Navigation</h4>
          </div>
          {menuItems.map((item, index) => (
            <div className="admin-sidebar__menu-item" key={index}>
              <NavLink
                to={item.path}
                className={({ isActive }) => classNames("admin-sidebar__menu-link", { "active": isActive })}
                onClick={toggleSidebar}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
