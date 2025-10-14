import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import { useDropdown } from '@/hooks/useDropdown';
import classNames from '@/utils/classNames';

import { BsBell, BsChatDots, BsList } from 'react-icons/bs';
import { FaUser, FaCog, FaSignOutAlt, FaHome } from 'react-icons/fa';
import '@/assets/scss/components/admin/_admin-header.scss';

const AdminHeader = ({ toggleSidebar }) => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const { isOpen, toggle, getTriggerProps, getDropdownProps, close } = useDropdown();

    const handleLogout = () => {
        dispatch(logout());
        close('admin-user-menu');
    };

    return (
        <header className="admin-header">
            <div className="admin-header__left">
                {/* Hamburger button for mobile/tablet */}
                <button className="admin-header__hamburger-btn" onClick={toggleSidebar}>
                    <BsList />
                </button>
            </div>
            <div className="admin-header__right">
                {/* Notification Icon */}
                <button className="admin-header__icon-btn" {...getTriggerProps('admin-notifications', { role: 'menu', ariaLabel: 'Notifications' })}>
                    <BsBell />
                </button>
                {/* Message Icon */}
                <button className="admin-header__icon-btn" {...getTriggerProps('admin-messages', { role: 'menu', ariaLabel: 'Messages' })}>
                    <BsChatDots />
                </button>

                {/* User Avatar Dropdown */}
                <div className="admin-header__user-menu">
                    <button className="admin-header__avatar-btn" {...getTriggerProps('admin-user-menu', { role: 'menu', ariaLabel: 'User menu' })}>
                        <img
                            src={`${import.meta.env.VITE_SERVER_URL}${user.avatarUrl}` || 'https://placehold.co/40'}
                            alt="User Avatar"
                            className="admin-header__avatar"
                        />
                    </button>
                    <div
                        className={classNames('admin-header__dropdown-menu', { 'is-open': isOpen('admin-user-menu') })}
                        {...getDropdownProps('admin-user-menu', { role: 'menu', ariaLabel: 'User menu' })}
                    >
                        <div className="dropdown-header">
                            <p className="dropdown-header__name">{user?.username || 'Admin User'}</p>
                            <p className="dropdown-header__email">{user?.email || 'admin@example.com'}</p>
                        </div>
                        <Link to="/profile" className="dropdown-item" onClick={() => { toggle('admin-user-menu'); }}>
                            <FaUser className="icon" />
                            <span>Profile</span>
                        </Link>
                        <Link to="/" title="Trang chủ" className="dropdown-item" onClick={() => { toggle('admin-user-menu'); }}>
                            <FaHome className="icon" />
                            <span>Trang chủ</span>
                        </Link>
                        <div className="dropdown-divider"></div>
                        <button className="dropdown-item dropdown-button" onClick={handleLogout}>
                            <FaSignOutAlt className="icon" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
