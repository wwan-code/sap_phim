import React from 'react';
import PropTypes from 'prop-types';
import classNames from '@/utils/classNames';
import UserAvatar from '@/components/common/UserAvatar';
import { FaUserFriends } from 'react-icons/fa';

/**
 * @component MentionSuggestion
 * @description Component hiển thị danh sách gợi ý bạn bè để mention.
 * Hỗ trợ trạng thái loading (skeleton), empty, và danh sách người dùng.
 * @param {object} props
 * @param {Array<object>} props.users - Danh sách người dùng để gợi ý.
 * @param {Function} props.onSelect - Callback khi một người dùng được chọn.
 * @param {number} props.activeIndex - Index của người dùng đang được highlight.
 * @param {Function} props.setActiveIndex - Function để cập nhật activeIndex.
 * @param {boolean} props.isLoading - Trạng thái đang tải dữ liệu.
 */
const MentionSuggestion = ({ users, onSelect, activeIndex, setActiveIndex, isLoading }) => {
  // Skeleton Loader Component
  const SkeletonItem = () => (
    <li className="mention-suggestion__item is-loading" aria-hidden="true">
      <div className="mention-suggestion__avatar skeleton" />
      <div className="mention-suggestion__username skeleton" />
    </li>
  );

  if (isLoading) {
    return (
      <ul className="mention-suggestion" role="listbox" aria-label="Đang tải gợi ý...">
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </ul>
    );
  }

  if (users.length === 0) {
    return (
      <div className="mention-suggestion is-empty" role="status">
        <FaUserFriends className="mention-suggestion__empty-icon" />
        <p>Không tìm thấy bạn bè</p>
      </div>
    );
  }

  return (
    <ul className="mention-suggestion" role="listbox" aria-label="Gợi ý bạn bè">
      {users.map((user, index) => (
        <li
          key={user.uuid}
          role="option"
          aria-selected={index === activeIndex}
          className={classNames('mention-suggestion__item', { 'is-active': index === activeIndex })}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => onSelect(user)}
        >
          <UserAvatar user={user} size={28} className="mention-suggestion__avatar" />
          <span className="mention-suggestion__username">
            {user.username}
          </span>
          {/* Có thể thêm значки vai trò ở đây nếu cần */}
        </li>
      ))}
    </ul>
  );
};

MentionSuggestion.propTypes = {
  users: PropTypes.arrayOf(PropTypes.shape({
    uuid: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    avatarUrl: PropTypes.string,
  })).isRequired,
  onSelect: PropTypes.func.isRequired,
  activeIndex: PropTypes.number.isRequired,
  setActiveIndex: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
};

export default MentionSuggestion;
