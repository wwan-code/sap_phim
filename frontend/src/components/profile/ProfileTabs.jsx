import React from 'react';
import { FaHeart, FaUserFriends, FaHistory, FaCog } from 'react-icons/fa';
import classNames from '@/utils/classNames';

const ProfileTabs = ({ activeTab, setActiveTab, isOwnProfile = true }) => {
  const tabs = [
    { id: 'friends', label: 'Bạn bè', icon: <FaUserFriends /> },
    { id: 'favorites', label: 'Phim yêu thích', icon: <FaHeart /> },
    { id: 'history', label: 'Lịch sử xem', icon: <FaHistory /> },
    // Chỉ hiển thị tab Settings cho profile của chính mình
    ...(isOwnProfile ? [{ id: 'settings', label: 'Cài đặt', icon: <FaCog /> }] : []),
  ];

  return (
    <div className="profile-tabs">
      <ul className="profile-tabs__list">
        {tabs.map((tab) => (
          <li
            key={tab.id}
            className={classNames('profile-tabs__item', { 'is-active': activeTab === tab.id })}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="profile-tabs__icon">{tab.icon}</span>
            <span className="profile-tabs__label">{tab.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProfileTabs;
