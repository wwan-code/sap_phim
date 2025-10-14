import React, { useMemo } from 'react';
import { FaMars, FaVenus, FaGenderless, FaGithub, FaTwitter, FaInstagram, FaFacebook, FaUserFriends, FaHeart, FaHistory, FaInfoCircle } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import classNames from '@/utils/classNames';
import { formatDistanceToNow } from '@/utils/dateUtils';
import { getAvatarUrl } from '@/utils/getAvatarUrl';
import ProfileTabs from './ProfileTabs';

const ProfileSidebar = ({ user: propUser, activeTab, setActiveTab, isOwnProfile = true }) => {
  const { user: authUser } = useSelector((state) => state.auth);
  const user = propUser || authUser;

  const socialIcons = {
    github: <FaGithub />,
    twitter: <FaTwitter />,
    instagram: <FaInstagram />,
    facebook: <FaFacebook />,
  };

  const getGenderIcon = (gender) => {
    const className = classNames('profile-sidebar__gender-icon', {
      male: gender === 'nam',
      female: gender === 'nữ',
      other: gender !== 'nam' && gender !== 'nữ',
    });

    if (gender === 'nam') return <FaMars className={className} />;
    if (gender === 'nữ') return <FaVenus className={className} />;
    return <FaGenderless className={className} />;
  };

  const coverImageUrl = user?.coverUrl
    ? `${import.meta.env.VITE_SERVER_URL}${user.coverUrl}`
    : 'https://placehold.co/1200x300?text=Cover+Image';

  const hasSocialLinks = user?.socialLinks && Object.values(user.socialLinks).some((link) => link);

  const statusText = useMemo(() => {
    if (!user) return '';
    return user.online ? 'Online' : `Offline — lần cuối ${user.lastOnline ? formatDistanceToNow(user.lastOnline) : 'không rõ'}`;
  }, [user]);

  return (
    <aside className="profile-sidebar">
      <div className="profile-sidebar__cover" style={{ backgroundImage: `url(${coverImageUrl})` }}>
        <div className="profile-sidebar__avatar-wrapper">
          <img src={getAvatarUrl(user)} alt="Avatar" className="profile-sidebar__avatar" />
          <span
            className={classNames('profile-sidebar__status', {
              'profile-sidebar__status--online': user?.online,
              'profile-sidebar__status--offline': !user?.online,
            })}
            title={statusText}
          ></span>
        </div>
      </div>
      <div className="profile-sidebar__info">
        <h3 className="profile-sidebar__username">
          {user?.username || 'Username'}
          {user?.sex && getGenderIcon(user.sex)}
        </h3>
        <p className="profile-sidebar__bio" dangerouslySetInnerHTML={{ __html: user?.bio || 'Chưa có tiểu sử' }}></p>
      </div>
      <div className="profile-sidebar__tabs">
        <ProfileTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOwnProfile={isOwnProfile}
        />
      </div>
      {hasSocialLinks && (
        <div className="profile-sidebar__socials">
          {Object.entries(user.socialLinks).map(([key, value]) =>
            value ? (
              <a
                key={key}
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className={classNames('profile-sidebar__social-link', `social-link--${key}`)}
              >
                {socialIcons[key]}
              </a>
            ) : null
          )}
        </div>
      )}
    </aside>
  );
};

export default ProfileSidebar;
