import React from 'react';
import SettingsTab from './tabs/SettingsTab';
import FriendsTab from './tabs/FriendsTab';
import HistoryTab from './tabs/HistoryTab';
import FavoritesTab from './tabs/FavoritesTab';

const ProfileTabContent = ({ activeTab, user, isOwnProfile = true }) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'favorites':
        return <FavoritesTab user={user} isOwnProfile={isOwnProfile} />;
      case 'friends':
        return <FriendsTab user={user} isOwnProfile={isOwnProfile} />;
      case 'history':
        return <HistoryTab user={user} isOwnProfile={isOwnProfile} />;
      case 'settings':
        return <SettingsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="profile-tab-content">
      <div className="profile-tab-content__pane is-active">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ProfileTabContent;
