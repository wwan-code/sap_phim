import React, { useEffect, useState } from 'react';
import { usePrivacySettings, useUpdatePrivacySettings } from '@/hooks/useSettingQueries';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorMessage from '@/components/common/ErrorMessage';
import '../../assets/scss/components/settings/_privacy-settings.scss';

const PrivacySettings = () => {
  const { data: privacyData, isLoading, isError, error } = usePrivacySettings();
  const updatePrivacyMutation = useUpdatePrivacySettings();

  const [settings, setSettings] = useState({
    profileVisibility: 'public',
    canReceiveFriendRequests: 'everyone',
    showOnlineStatus: true,
    showFriendList: 'public',
    showFavorites: 'public',
    showWatchHistory: 'public',
    allowSearchEngineIndexing: true,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (privacyData) {
      setSettings(privacyData);
    }
  }, [privacyData]);

  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updatePrivacyMutation.mutate(settings, {
      onSuccess: () => {
        setHasChanges(false);
      },
    });
  };

  const handleReset = () => {
    if (privacyData) {
      setSettings(privacyData);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullscreen label="Đang tải cài đặt quyền riêng tư..." />;
  }

  if (isError) {
    return (
      <ErrorMessage
        variant="card"
        title="Lỗi tải dữ liệu"
        message="Không thể tải cài đặt quyền riêng tư của bạn. Vui lòng thử lại sau."
        details={error?.message}
      />
    );
  }

  return (
    <div className="privacy-settings">
      <div className="privacy-settings__header">
        <h2 className="privacy-settings__title">Cài Đặt Quyền Riêng Tư</h2>
        <p className="privacy-settings__description">
          Kiểm soát ai có thể xem thông tin và hoạt động của bạn
        </p>
      </div>

      <div className="privacy-settings__content">
        {updatePrivacyMutation.isError && (
          <ErrorMessage
            variant="banner"
            title="Lưu cài đặt thất bại"
            message={updatePrivacyMutation.error?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.'}
            dismissible
          />
        )}
        
        {/* Profile Visibility */}
        <div className="privacy-settings__section">
          <div className="privacy-settings__section-header">
            <h3 className="privacy-settings__section-title">Ai có thể xem hồ sơ của tôi?</h3>
            <p className="privacy-settings__section-description">
              Kiểm soát ai có thể truy cập trang hồ sơ của bạn
            </p>
          </div>
          <div className="privacy-settings__options">
            <label className="privacy-settings__option">
              <input
                type="radio"
                name="profileVisibility"
                value="public"
                checked={settings.profileVisibility === 'public'}
                onChange={(e) => handleChange('profileVisibility', e.target.value)}
              />
              <span className="privacy-settings__option-label">
                <strong>Công khai</strong>
                <span className="privacy-settings__option-desc">Mọi người đều có thể xem</span>
              </span>
            </label>
            <label className="privacy-settings__option">
              <input
                type="radio"
                name="profileVisibility"
                value="friends"
                checked={settings.profileVisibility === 'friends'}
                onChange={(e) => handleChange('profileVisibility', e.target.value)}
              />
              <span className="privacy-settings__option-label">
                <strong>Chỉ bạn bè</strong>
                <span className="privacy-settings__option-desc">Chỉ bạn bè của bạn có thể xem</span>
              </span>
            </label>
            <label className="privacy-settings__option">
              <input
                type="radio"
                name="profileVisibility"
                value="private"
                checked={settings.profileVisibility === 'private'}
                onChange={(e) => handleChange('profileVisibility', e.target.value)}
              />
              <span className="privacy-settings__option-label">
                <strong>Riêng tư</strong>
                <span className="privacy-settings__option-desc">Chỉ bạn có thể xem</span>
              </span>
            </label>
          </div>
        </div>

        {/* Friend Requests */}
        <div className="privacy-settings__section">
          <div className="privacy-settings__section-header">
            <h3 className="privacy-settings__section-title">Ai có thể gửi lời mời kết bạn?</h3>
            <p className="privacy-settings__section-description">
              Kiểm soát ai có thể gửi lời mời kết bạn cho bạn
            </p>
          </div>
          <div className="privacy-settings__options">
            <label className="privacy-settings__option">
              <input
                type="radio"
                name="canReceiveFriendRequests"
                value="everyone"
                checked={settings.canReceiveFriendRequests === 'everyone'}
                onChange={(e) => handleChange('canReceiveFriendRequests', e.target.value)}
              />
              <span className="privacy-settings__option-label">
                <strong>Mọi người</strong>
                <span className="privacy-settings__option-desc">Bất kỳ ai cũng có thể gửi lời mời</span>
              </span>
            </label>
            <label className="privacy-settings__option">
              <input
                type="radio"
                name="canReceiveFriendRequests"
                value="friends_of_friends"
                checked={settings.canReceiveFriendRequests === 'friends_of_friends'}
                onChange={(e) => handleChange('canReceiveFriendRequests', e.target.value)}
              />
              <span className="privacy-settings__option-label">
                <strong>Bạn của bạn bè</strong>
                <span className="privacy-settings__option-desc">Chỉ bạn của bạn bè có thể gửi</span>
              </span>
            </label>
            <label className="privacy-settings__option">
              <input
                type="radio"
                name="canReceiveFriendRequests"
                value="nobody"
                checked={settings.canReceiveFriendRequests === 'nobody'}
                onChange={(e) => handleChange('canReceiveFriendRequests', e.target.value)}
              />
              <span className="privacy-settings__option-label">
                <strong>Không ai</strong>
                <span className="privacy-settings__option-desc">Tắt lời mời kết bạn</span>
              </span>
            </label>
          </div>
        </div>

        {/* Online Status */}
        <div className="privacy-settings__section">
          <div className="privacy-settings__section-header">
            <h3 className="privacy-settings__section-title">Hiển thị trạng thái online?</h3>
            <p className="privacy-settings__section-description">
              Cho phép người khác thấy khi bạn đang online
            </p>
          </div>
          <div className="privacy-settings__toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.showOnlineStatus}
                onChange={(e) => handleChange('showOnlineStatus', e.target.checked)}
              />
              <span className="toggle-switch__slider"></span>
            </label>
            <span className="privacy-settings__toggle-label">
              {settings.showOnlineStatus ? 'Đang bật' : 'Đang tắt'}
            </span>
          </div>
        </div>

        {/* Friend List Visibility */}
        <div className="privacy-settings__section">
          <div className="privacy-settings__section-header">
            <h3 className="privacy-settings__section-title">Hiển thị danh sách bạn bè?</h3>
            <p className="privacy-settings__section-description">
              Kiểm soát ai có thể xem danh sách bạn bè của bạn
            </p>
          </div>
          <div className="privacy-settings__options">
            <label className="privacy-settings__option">
              <input
                type="radio"
                name="showFriendList"
                value="public"
                checked={settings.showFriendList === 'public'}
                onChange={(e) => handleChange('showFriendList', e.target.value)}
              />
              <span className="privacy-settings__option-label">
                <strong>Công khai</strong>
              </span>
            </label>
            <label className="privacy-settings__option">
              <input
                type="radio"
                name="showFriendList"
                value="friends"
                checked={settings.showFriendList === 'friends'}
                onChange={(e) => handleChange('showFriendList', e.target.value)}
              />
              <span className="privacy-settings__option-label">
                <strong>Chỉ bạn bè</strong>
              </span>
            </label>
            <label className="privacy-settings__option">
              <input
                type="radio"
                name="showFriendList"
                value="private"
                checked={settings.showFriendList === 'private'}
                onChange={(e) => handleChange('showFriendList', e.target.value)}
              />
              <span className="privacy-settings__option-label">
                <strong>Riêng tư</strong>
              </span>
            </label>
          </div>
        </div>

        {/* Favorites Visibility */}
        <div className="privacy-settings__section">
          <div className="privacy-settings__section-header">
            <h3 className="privacy-settings__section-title">Hiển thị phim yêu thích?</h3>
            <p className="privacy-settings__section-description">
              Kiểm soát ai có thể xem danh sách phim yêu thích của bạn
            </p>
          </div>
          <div className="privacy-settings__options">
            <label className="privacy-settings__option">
              <input
                type="radio"
                name="showFavorites"
                value="public"
                checked={settings.showFavorites === 'public'}
                onChange={(e) => handleChange('showFavorites', e.target.value)}
              />
              <span className="privacy-settings__option-label">
                <strong>Công khai</strong>
              </span>
            </label>
            <label className="privacy-settings__option">
              <input
                type="radio"
                name="showFavorites"
                value="friends"
                checked={settings.showFavorites === 'friends'}
                onChange={(e) => handleChange('showFavorites', e.target.value)}
              />
              <span className="privacy-settings__option-label">
                <strong>Chỉ bạn bè</strong>
              </span>
            </label>
            <label className="privacy-settings__option">
              <input
                type="radio"
                name="showFavorites"
                value="private"
                checked={settings.showFavorites === 'private'}
                onChange={(e) => handleChange('showFavorites', e.target.value)}
              />
              <span className="privacy-settings__option-label">
                <strong>Riêng tư</strong>
              </span>
            </label>
          </div>
        </div>

        {/* Watch History Visibility */}
        <div className="privacy-settings__section">
          <div className="privacy-settings__section-header">
            <h3 className="privacy-settings__section-title">Hiển thị lịch sử xem phim?</h3>
            <p className="privacy-settings__section-description">
              Kiểm soát ai có thể xem lịch sử xem phim của bạn
            </p>
          </div>
          <div className="privacy-settings__options">
            <label className="privacy-settings__option">
              <input
                type="radio"
                name="showWatchHistory"
                value="public"
                checked={settings.showWatchHistory === 'public'}
                onChange={(e) => handleChange('showWatchHistory', e.target.value)}
              />
              <span className="privacy-settings__option-label">
                <strong>Công khai</strong>
              </span>
            </label>
            <label className="privacy-settings__option">
              <input
                type="radio"
                name="showWatchHistory"
                value="friends"
                checked={settings.showWatchHistory === 'friends'}
                onChange={(e) => handleChange('showWatchHistory', e.target.value)}
              />
              <span className="privacy-settings__option-label">
                <strong>Chỉ bạn bè</strong>
              </span>
            </label>
            <label className="privacy-settings__option">
              <input
                type="radio"
                name="showWatchHistory"
                value="private"
                checked={settings.showWatchHistory === 'private'}
                onChange={(e) => handleChange('showWatchHistory', e.target.value)}
              />
              <span className="privacy-settings__option-label">
                <strong>Riêng tư</strong>
              </span>
            </label>
          </div>
        </div>

        {/* Search Engine Indexing */}
        <div className="privacy-settings__section">
          <div className="privacy-settings__section-header">
            <h3 className="privacy-settings__section-title">Cho phép công cụ tìm kiếm?</h3>
            <p className="privacy-settings__section-description">
              Cho phép hồ sơ của bạn xuất hiện trên công cụ tìm kiếm
            </p>
          </div>
          <div className="privacy-settings__toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.allowSearchEngineIndexing}
                onChange={(e) => handleChange('allowSearchEngineIndexing', e.target.checked)}
              />
              <span className="toggle-switch__slider"></span>
            </label>
            <span className="privacy-settings__toggle-label">
              {settings.allowSearchEngineIndexing ? 'Đang bật' : 'Đang tắt'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {hasChanges && (
        <div className="privacy-settings__actions">
          <button
            className="privacy-settings__btn privacy-settings__btn--secondary"
            onClick={handleReset}
            disabled={updatePrivacyMutation.isLoading}
          >
            Hủy
          </button>
          <button
            className="privacy-settings__btn privacy-settings__btn--primary"
            onClick={handleSave}
            disabled={updatePrivacyMutation.isLoading}
          >
            {updatePrivacyMutation.isLoading ? <LoadingSpinner size="xs" /> : 'Lưu thay đổi'}
          </button>
        </div>
      )}
    </div>
  );
};

export default PrivacySettings;
