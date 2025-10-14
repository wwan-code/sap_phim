import React, { useState, useEffect, createContext, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ScrollToTop from '@/components/common/ScrollToTop';
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
  const location = useLocation();
  const isChatPage = useMemo(() => location.pathname.includes('/chat'), [location.pathname]);
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
        <ScrollToTop />
        <Header toggleSidebar={toggleSidebar} />
        {deviceType !== 'desktop' && (
          <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        )}
        <main className="app-layout__main">
          <Outlet />
        </main>
        {
          !isChatPage && <Footer />
        }
        {!user && <AuthPopup isOpen={isAuthPopupOpen} onClose={closeAuthPopup} />}
        {!isChatPage && <ChatAIPopup />}
      </div>
    </AuthPopupContext.Provider>
  );
};

export default AppLayout;
