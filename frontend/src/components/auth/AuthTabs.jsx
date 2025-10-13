import React from 'react';
import classNames from '@/utils/classNames';
import '@/assets/scss/components/_auth-tabs.scss';

const AuthTabs = ({ activeTab, setActiveTab }) => {
  return (
    <div className="auth-tabs">
      <div className="auth-tabs__header">
        <button
          className={classNames('auth-tabs__tab-button', { active: activeTab === 'login' })}
          onClick={() => setActiveTab('login')}
        >
          Đăng nhập
        </button>
        <button
          className={classNames('auth-tabs__tab-button', { active: activeTab === 'register' })}
          onClick={() => setActiveTab('register')}
        >
          Đăng ký
        </button>
      </div>
    </div>
  );
};

export default AuthTabs;
