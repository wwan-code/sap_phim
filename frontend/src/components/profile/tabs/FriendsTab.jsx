import React, { useState } from 'react';
import classNames from '@/utils/classNames';
import FriendList from '@/components/friends/FriendList';
import FriendRequestList from '@/components/friends/FriendRequestList';
import FriendSearch from '@/components/friends/FriendSearch';

const FriendsTab = ({ user, isOwnProfile = true }) => {
  const [activeSubTab, setActiveSubTab] = useState('friends-list');

  // Chỉ hiển thị các tab quản lý bạn bè cho profile của chính mình
  const subTabs = isOwnProfile ? [
    { id: 'friends-list', label: 'Bạn bè' },
    { id: 'pending-requests', label: 'Lời mời đang chờ' },
    { id: 'sent-requests', label: 'Lời mời đã gửi' },
    { id: 'friend-search', label: 'Tìm kiếm bạn bè' },
  ] : [
    { id: 'friends-list', label: 'Bạn bè' },
  ];

  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case 'friends-list':
        return <FriendList user={user} isOwnProfile={isOwnProfile} />;
      case 'pending-requests':
        return <FriendRequestList type="pending" />;
      case 'sent-requests':
        return <FriendRequestList type="sent" />;
      case 'friend-search':
        return <FriendSearch />;
      default:
        return null;
    }
  };

  return (
    <div className="friends-tab">
      <div className="friends-tab__header">
        <ul className="friends-tab__nav">
          {subTabs.map((tab) => (
            <li
              key={tab.id}
              className={classNames('friends-tab__nav-item', { 'is-active': activeSubTab === tab.id })}
              onClick={() => setActiveSubTab(tab.id)}
            >
              {tab.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="friends-tab__content">
        {renderSubTabContent()}
      </div>
    </div>
  );
};

export default FriendsTab;
