import React from 'react';
import PropTypes from 'prop-types';
import classNames from '@/utils/classNames';

/**
 * @component UserAvatar
 * @description Component linh hoạt để hiển thị avatar người dùng.
 * Tự động fallback về UI-Avatars nếu không có avatarUrl.
 * @param {object} props
 * @param {object} props.user - Object người dùng (phải có username, có thể có avatarUrl).
 * @param {number} props.size - Kích thước avatar (width & height).
 * @param {string} props.className - Class CSS tùy chọn.
 */
const UserAvatar = ({ user, size = 48, className }) => {
  const avatarUrl = user?.avatarUrl
    ? `${import.meta.env.VITE_SERVER_URL}${user.avatarUrl}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || '?')}&background=random&color=fff&size=${size * 2}`;

  return (
    <img
      src={avatarUrl}
      alt={`${user?.username || 'Avatar'}'s avatar`}
      className={classNames('user-avatar', className)}
      style={{ width: `${size}px`, height: `${size}px` }}
      loading="lazy"
      // onError={(e) => { // Fallback dự phòng nếu ảnh lỗi
      //   e.target.onerror = null;
      //   e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || '?')}&background=random&color=fff&size=${size * 2}`;
      // }}
    />
  );
};

UserAvatar.propTypes = {
  user: PropTypes.shape({
    username: PropTypes.string,
    avatarUrl: PropTypes.string,
  }),
  size: PropTypes.number,
  className: PropTypes.string,
};

export default UserAvatar;
