import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ScrollToTop from '@/components/common/ScrollToTop';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';
import '@/assets/scss/components/admin/_admin-layout.scss';
import '@/assets/scss/pages/admin/_admin-pages.scss';
import classNames from '@/utils/classNames';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className={classNames('admin-layout', { 'admin-layout--sidebar-open': isSidebarOpen })}>
      <ScrollToTop />
      {/* Sidebar */}
      <AdminSidebar isOpen={isSidebarOpen} toggleSidebar={closeSidebar} />

      {/* Main content area */}
      <div className="admin-layout__main">
        <AdminHeader toggleSidebar={toggleSidebar} />
        <div className='admin-layout__content'>
          <Outlet />
        </div>
        <div className='admin-footer'>
            <div className='admin-footer__left'>&copy; {new Date().getFullYear()} WWAN. All rights reserved.</div>
            <div className='admin-footer__right'></div>
          </div>
      </div>

      {/* Overlay for mobile/tablet when sidebar is open */}
      {isSidebarOpen && (
        <div className="admin-layout__overlay" onClick={closeSidebar}></div>
      )}
    </div>
  );
};

export default AdminLayout;
