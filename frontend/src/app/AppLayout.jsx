import React, { useState, useEffect, createContext } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Footer from '@/components/layout/Footer';
import { useDeviceType } from '@/hooks/useDeviceType';
import AuthPopup from '@/components/auth/AuthPopup';
import ChatAIPopup from '@/components/chat/ChatAIPopup';
import '@/assets/scss/components/layout/_app-layout.scss';
import '@/assets/scss/components/layout/_footer.scss';

export const AuthPopupContext = createContext(null);

const AppLayout = () => {
  const deviceType = useDeviceType();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthPopupOpen, setIsAuthPopupOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const openAuthPopup = () => {
    setIsAuthPopupOpen(true);
  };

  const closeAuthPopup = () => {
    setIsAuthPopupOpen(false);
  };

  // Đóng sidebar khi chuyển sang desktop
  useEffect(() => {
    if (deviceType === 'desktop' && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }, [deviceType, isSidebarOpen]);

  return (
    <AuthPopupContext.Provider value={{ openAuthPopup }}>
      <div className="app-layout">
        <Header toggleSidebar={toggleSidebar} />
        {deviceType !== 'desktop' && (
          <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        )}
        <main className="app-layout__main">
          <Outlet />
        </main>
        <Footer />
        {!user && <AuthPopup isOpen={isAuthPopupOpen} onClose={closeAuthPopup} />}
        <ChatAIPopup /> {/* Tích hợp ChatAIPopup */}
      </div>
    </AuthPopupContext.Provider>
  );
};

export default AppLayout;
