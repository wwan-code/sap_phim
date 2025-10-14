import React, { useEffect, useState } from 'react';
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/useSettingQueries';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorMessage from '@/components/common/ErrorMessage';
import '../../assets/scss/components/settings/_notification-settings.scss';

const NotificationSettings = () => {
  const { data: notificationData, isLoading, isError, error } = useNotificationSettings();
  const updateNotificationMutation = useUpdateNotificationSettings();

  const [settings, setSettings] = useState({
    friendRequest: { inApp: true, email: false, sms: false },
    friendRequestStatus: { inApp: true, email: false, sms: false },
    newMessage: { inApp: true, email: false, sms: false },
    movieActivity: { inApp: true, email: false, sms: false },
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (notificationData) {
      setSettings(notificationData);
    }
  }, [notificationData]);

  const handleChange = (category, channel, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [channel]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateNotificationMutation.mutate(settings, {
      onSuccess: () => {
        setHasChanges(false);
      },
    });
  };

  const handleReset = () => {
    if (notificationData) {
      setSettings(notificationData);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullscreen label="Đang tải cài đặt thông báo..." />;
  }

  if (isError) {
    return (
      <ErrorMessage
        variant="card"
        title="Lỗi tải dữ liệu"
        message="Không thể tải cài đặt thông báo của bạn. Vui lòng thử lại sau."
        details={error?.message}
      />
    );
  }

  const notificationCategories = [
    {
      key: 'friendRequest',
      title: 'Lời mời kết bạn mới',
      description: 'Nhận thông báo khi có người gửi lời mời kết bạn',
    },
    {
      key: 'friendRequestStatus',
      title: 'Trạng thái lời mời kết bạn',
      description: 'Nhận thông báo khi lời mời được chấp nhận hoặc từ chối',
    },
    {
      key: 'newMessage',
      title: 'Tin nhắn mới',
      description: 'Nhận thông báo khi có tin nhắn mới',
    },
    {
      key: 'movieActivity',
      title: 'Hoạt động phim ảnh',
      description: 'Nhận thông báo về bình luận, yêu thích và hoạt động khác',
    },
  ];

  return (
    <div className="notification-settings">
      <div className="notification-settings__header">
        <h2 className="notification-settings__title">Cài Đặt Thông Báo</h2>
        <p className="notification-settings__description">
          Chọn cách bạn muốn nhận thông báo
        </p>
      </div>

      <div className="notification-settings__content">
        {updateNotificationMutation.isError && (
          <ErrorMessage
            variant="banner"
            title="Lưu cài đặt thất bại"
            message={updateNotificationMutation.error?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.'}
            dismissible
          />
        )}

        <div className="notification-settings__table">
          <div className="notification-settings__table-header">
            <div className="notification-settings__table-cell notification-settings__table-cell--type">
              Loại thông báo
            </div>
            <div className="notification-settings__table-cell notification-settings__table-cell--channel">
              Trong ứng dụng
            </div>
            <div className="notification-settings__table-cell notification-settings__table-cell--channel">
              Email
            </div>
            <div className="notification-settings__table-cell notification-settings__table-cell--channel">
              SMS
            </div>
          </div>

          {notificationCategories.map((category) => (
            <div key={category.key} className="notification-settings__table-row">
              <div className="notification-settings__table-cell notification-settings__table-cell--type">
                <div className="notification-settings__category">
                  <h4 className="notification-settings__category-title">{category.title}</h4>
                  <p className="notification-settings__category-desc">{category.description}</p>
                </div>
              </div>
              <div className="notification-settings__table-cell notification-settings__table-cell--channel">
                <label className="notification-settings__checkbox">
                  <input
                    type="checkbox"
                    checked={settings[category.key]?.inApp || false}
                    onChange={(e) => handleChange(category.key, 'inApp', e.target.checked)}
                  />
                  <span className="notification-settings__checkbox-mark"></span>
                </label>
              </div>
              <div className="notification-settings__table-cell notification-settings__table-cell--channel">
                <label className="notification-settings__checkbox">
                  <input
                    type="checkbox"
                    checked={settings[category.key]?.email || false}
                    onChange={(e) => handleChange(category.key, 'email', e.target.checked)}
                  />
                  <span className="notification-settings__checkbox-mark"></span>
                </label>
              </div>
              <div className="notification-settings__table-cell notification-settings__table-cell--channel">
                <label className="notification-settings__checkbox">
                  <input
                    type="checkbox"
                    checked={settings[category.key]?.sms || false}
                    onChange={(e) => handleChange(category.key, 'sms', e.target.checked)}
                    disabled
                    title="Tính năng SMS chưa khả dụng"
                  />
                  <span className="notification-settings__checkbox-mark"></span>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="notification-settings__info">
          <p className="notification-settings__info-text">
            <strong>Lưu ý:</strong> Tính năng thông báo qua SMS hiện chưa khả dụng.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {hasChanges && (
        <div className="notification-settings__actions">
          <button
            className="notification-settings__btn notification-settings__btn--secondary"
            onClick={handleReset}
            disabled={updateNotificationMutation.isLoading}
          >
            Hủy
          </button>
          <button
            className="notification-settings__btn notification-settings__btn--primary"
            onClick={handleSave}
            disabled={updateNotificationMutation.isLoading}
          >
            {updateNotificationMutation.isLoading ? <LoadingSpinner size="xs" /> : 'Lưu thay đổi'}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
