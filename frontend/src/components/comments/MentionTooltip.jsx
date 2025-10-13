import React from 'react';
import PropTypes from 'prop-types';
import { FaMars, FaVenus, FaGenderless } from 'react-icons/fa';
import UserAvatar from '@/components/common/UserAvatar';

/**
 * @component MentionTooltip
 * @description Tooltip hiển thị thông tin cơ bản của người dùng khi hover vào mention.
 * @param {object} props
 * @param {object} props.user - Thông tin người dùng (uuid, username, avatarUrl, sex).
 * @param {boolean} props.visible - Trạng thái hiển thị của tooltip.
 * @param {Function} props.popperRef - Ref callback cho popper element.
 * @param {object} props.styles - Styles từ usePopperTooltip.
 * @param {object} props.attributes - Attributes từ usePopperTooltip.
 */
const MentionTooltip = ({ user, visible, popperRef, styles, attributes }) => {
  if (!visible || !user) {
    return null;
  }

  // Hàm helper để lấy icon giới tính tương ứng
  const getGenderIcon = (sex) => {
    switch (sex) {
      case 'male':
        return <FaMars className="mention-tooltip__gender-icon male" title="Nam" />;
      case 'female':
        return <FaVenus className="mention-tooltip__gender-icon female" title="Nữ" />;
      default:
        return <FaGenderless className="mention-tooltip__gender-icon other" title="Khác" />;
    }
  };

  return (
    <div
      ref={popperRef}
      style={styles}
      {...attributes}
      className="mention-tooltip"
      role="tooltip"
      aria-hidden={!visible}
    >
      <div className="mention-tooltip__header">
        <UserAvatar user={user} size={48} className="mention-tooltip__avatar" />
      </div>
      <div className="mention-tooltip__body">
        <span className="mention-tooltip__username">{user.username}</span>
        {user.sex && getGenderIcon(user.sex)}
      </div>
      {/* Khu vực này có thể mở rộng để hiển thị thêm thông tin như vai trò, trạng thái online, v.v. */}
    </div>
  );
};

MentionTooltip.propTypes = {
  user: PropTypes.shape({
    uuid: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    avatarUrl: PropTypes.string,
    sex: PropTypes.oneOf(['male', 'female', 'other']),
  }),
  visible: PropTypes.bool.isRequired,
  popperRef: PropTypes.func.isRequired,
  styles: PropTypes.object,
  attributes: PropTypes.object,
};

export default MentionTooltip;
