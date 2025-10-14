import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSettingStore from '../stores/useSettingStore';
import PrivacySettings from '../components/settings/PrivacySettings';
import NotificationSettings from '../components/settings/NotificationSettings';
import AccountManagement from '../components/settings/AccountManagement';
import { FaLock, FaBell, FaCog, FaBars } from 'react-icons/fa';
import { useDeviceType } from '../hooks/useDeviceType';
import '../assets/scss/pages/_setting-page.scss';

const SettingPage = () => {
  const navigate = useNavigate();
  const { activeTab, setActiveTab } = useSettingStore();
  const deviceType = useDeviceType();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const tabs = [
    { id: 'privacy', label: 'Quyền Riêng Tư', icon: <FaLock /> },
    { id: 'notifications', label: 'Thông Báo', icon: <FaBell /> },
    { id: 'account', label: 'Tài Khoản', icon: <FaCog /> },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'privacy':
        return <PrivacySettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'account':
        return <AccountManagement />;
      default:
        return <PrivacySettings />;
    }
  };

  return (
    <div className="setting-page">
      <div className="setting-page__container">
        <div className="setting-page__content">
          {
            deviceType === 'desktop' ?
              <div className="setting-page__sidebar">
                <nav className="setting-page__nav">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      className={`setting-page__nav-item ${activeTab === tab.id ? 'setting-page__nav-item--active' : ''
                        }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <span className="setting-page__nav-icon">{tab.icon}</span>
                      <span className="setting-page__nav-label">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div> : null
          }

          {
            deviceType !== 'desktop' ? (
              <>
                <div className={`setting-page__sidebar-menu ${isSidebarOpen ? 'setting-page__sidebar-menu--open' : ''}`}>
                  <ul className="setting-page__menu-list">
                    {tabs.map((tab) => (
                      <li
                        key={tab.id}
                        className={`setting-page__menu-item ${activeTab === tab.id ? 'setting-page__menu-item--active' : ''}`}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setIsSidebarOpen(false);
                        }}
                      >
                        <span className="setting-page__menu-icon">{tab.icon}</span>
                        <span className="setting-page__menu-label">{tab.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="setting-page__toggle-menu">
                  <button 
                    className={`setting-page__toggle-button ${isSidebarOpen ? 'setting-page__toggle-button--active' : ''}`}
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  >
                    <FaBars />
                  </button>
                </div>
              </>
            )
              : null
          }

          {/* Main content area */}
          <div className="setting-page__main">{renderTabContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default SettingPage;
