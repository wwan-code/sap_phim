import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorMessage from '@/components/common/ErrorMessage';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import ProfileTabContent from '@/components/profile/ProfileTabContent';
import userService from '@/services/userService';
import '@/assets/scss/pages/_profile-page.scss';

const ProfilePage = () => {
  const { uuid } = useParams();
  const { user: currentUser, loading: authLoading, error: authError } = useSelector((state) => state.auth);
  
  // State cho profile của người khác
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('friends');

  // Xác định xem đang xem profile của ai
  const isViewingOwnProfile = !uuid || uuid === currentUser?.uuid;
  const targetUser = isViewingOwnProfile ? currentUser : profileData;

  // Load profile data khi có UUID
  useEffect(() => {
    if (uuid && uuid !== currentUser?.uuid) {
      loadUserProfile(uuid);
    }
  }, [uuid, currentUser?.uuid]);

  const loadUserProfile = async (userUuid) => {
    setLoading(true);
    setError(null);
    try {
      const response = await userService.getUserByUuid(userUuid);
      if (response.data) {
        setProfileData(response.data);
      } else {
        setError('Người dùng không tồn tại');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Không thể tải thông tin người dùng';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return <LoadingSpinner fullscreen label="Đang tải hồ sơ..." />;
  }

  // Error state
  if (authError || error) {
    const errorMessage = authError?.message || error || 'Đã xảy ra lỗi khi tải trang hồ sơ.';
    const retryAction = uuid && uuid !== currentUser?.uuid ? () => loadUserProfile(uuid) : undefined;

    return (
      <div className="container-fluid page-container">
        <ErrorMessage 
          variant="card"
          title="Không thể tải trang hồ sơ" 
          message={errorMessage} 
          onRetry={retryAction}
        />
      </div>
    );
  }

  // Không có user data
  if (!targetUser) {
    return (
      <div className="container-fluid page-container">
        <ErrorMessage 
          variant="card"
          title="Người dùng không tồn tại" 
          message="Không tìm thấy thông tin người dùng bạn đang tìm kiếm." 
        />
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-page__sidebar">
        <ProfileSidebar user={targetUser} activeTab={activeTab} setActiveTab={setActiveTab} isOwnProfile={isViewingOwnProfile} />
      </div>
      <main className="profile-page__main">
        
        <ProfileTabContent 
          activeTab={activeTab} 
          user={targetUser}
          isOwnProfile={isViewingOwnProfile}
        />
      </main>
    </div>
  );
};

export default ProfilePage;
