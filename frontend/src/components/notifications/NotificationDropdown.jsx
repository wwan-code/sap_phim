import React, { useEffect, useRef, useCallback } from 'react';
import { useNotificationQueries } from '@/hooks/useNotificationQueries';
import { useNotificationStore } from '@/stores/notificationStore';
import { useDeviceType } from '@/hooks/useDeviceType';
import NotificationItem from './NotificationItem';
import classNames from '@/utils/classNames';
import '@/assets/scss/components/notifications/_notification-dropdown.scss';

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'unread', label: 'Chưa đọc' },
  { key: 'system', label: 'Hệ thống' },
];

const NotificationDropdown = ({ isOpen, onClose }) => {
  const { activeTab, setActiveTab } = useNotificationStore();
  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    markAllAsRead,
  } = useNotificationQueries();

  const deviceType = useDeviceType();
  const observer = useRef();
  const containerRef = useRef(null);

  // Logic cho infinite scroll
  const lastNotificationElementRef = useCallback(
    (node) => {
      if (isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        // Kiểm tra thêm để không bị đóng khi click vào nút chuông
        if (!event.target.closest('.header__notification-btn')) {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleMarkAllRead = () => {
    if (unreadCount > 0) {
      markAllAsRead();
    }
  };

  return (
    <div
      ref={containerRef}
      className={classNames('notification-dropdown', {
        'notification-dropdown--open': isOpen,
        'notification-dropdown--mobile': deviceType === 'mobile',
      })}
      role="dialog"
      aria-modal="true"
      aria-label="Thông báo"
    >
      {/* Header */}
      <div className="notification-dropdown__header">
        <h3 className="notification-dropdown__title">Thông báo</h3>
        <div className="notification-dropdown__actions">
          {unreadCount > 0 && (
            <button
              className="notification-dropdown__action-btn"
              onClick={handleMarkAllRead}
              title="Đánh dấu tất cả đã đọc"
            >
              <i className="fas fa-check-double" />
            </button>
          )}
          <button
            className="notification-dropdown__action-btn"
            onClick={onClose}
            title="Đóng"
          >
            <i className="fas fa-times" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="notification-dropdown__tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={classNames('notification-dropdown__tab', {
              'notification-dropdown__tab--active': activeTab === tab.key,
            })}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="notification-dropdown__content">
        {isLoading && (
          <div className="notification-dropdown__skeleton">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div className="notification-dropdown__skeleton-item" key={idx}>
                <div className="notification-dropdown__skeleton-avatar" />
                <div className="notification-dropdown__skeleton-lines">
                  <div className="notification-dropdown__skeleton-line" />
                  <div className="notification-dropdown__skeleton-line--short" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="notification-dropdown__error" role="alert">
            <i className="fas fa-exclamation-triangle" />
            <span>{error.message || 'Đã có lỗi xảy ra'}</span>
          </div>
        )}

        {!isLoading && !isError && notifications.length === 0 && (
          <div className="notification-dropdown__empty">
            <i className="fas fa-bell-slash" />
            <p>Chưa có thông báo nào</p>
          </div>
        )}

        <ul className="notification-dropdown__list" role="listbox">
          {notifications.map((notification, index) => {
            const ref = notifications.length === index + 1 ? lastNotificationElementRef : null;
            return (
              <NotificationItem
                ref={ref}
                key={notification.id}
                notification={notification}
                onClose={onClose}
              />
            );
          })}
        </ul>

        {isFetchingNextPage && (
          <div className="notification-dropdown__loading-more">
            <i className="fas fa-spinner fa-spin" /> Đang tải thêm...
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
