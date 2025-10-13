import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import classNames from '@/utils/classNames';
import { sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend } from '@/store/slices/friendSlice';
import { FaUserPlus, FaCheck, FaTimes, FaUserMinus, FaHourglassHalf } from 'react-icons/fa';
import { formatDistanceToNow } from '@/utils/dateUtils'; // Import formatDistanceToNow
import '@/assets/scss/components/_friend-card.scss';

const FriendCard = ({ user, type }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.user);
  const isLoading = useSelector((state) => state.friends.loading);

  // Xử lý click vào username để điều hướng đến profile
  const handleUsernameClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (user.uuid) {
      navigate(`/profile/${user.uuid}`);
    }
  };

  const handleSendRequest = () => {
    dispatch(sendFriendRequest(user.id));
  };

  const handleAcceptRequest = () => {
    dispatch(acceptFriendRequest(user.friendshipId)); // user.friendshipId sẽ là id của lời mời
  };

  const handleRejectRequest = () => {
    dispatch(rejectFriendRequest(user.friendshipId)); // user.friendshipId sẽ là id của lời mời
  };

  const handleRemoveFriend = () => {
    dispatch(removeFriend(user.id));
  };

  const renderActions = () => {
    if (currentUser.id === user.id) {
      return null; // Không hiển thị nút hành động cho chính người dùng
    }

    switch (user.friendshipStatus) {
      case 'none':
        return (
          <button
            className="friend-card__action-btn friend-card__action-btn--add"
            onClick={handleSendRequest}
            disabled={isLoading}
            title="Gửi lời mời kết bạn"
          >
            <FaUserPlus />
          </button>
        );
      case 'pending':
        if (type === 'pending') { // Người dùng hiện tại là receiver
          return (
            <>
              <button
                className="friend-card__action-btn friend-card__action-btn--accept"
                onClick={handleAcceptRequest}
                disabled={isLoading}
                title="Chấp nhận lời mời"
              >
                <FaCheck /> Chấp nhận
              </button>
              <button
                className="friend-card__action-btn friend-card__action-btn--reject"
                onClick={handleRejectRequest}
                disabled={isLoading}
                title="Từ chối lời mời"
              >
                <FaTimes /> Từ chối
              </button>
            </>
          );
        } else if (type === 'sent') { // Người dùng hiện tại là sender
          return (
            <button
              className="friend-card__action-btn friend-card__action-btn--pending"
              disabled
              title="Đang chờ phản hồi"
            >
              <FaHourglassHalf />
            </button>
          );
        }
        return null;
      case 'accepted':
        return (
          <button
            className="friend-card__action-btn friend-card__action-btn--remove"
            onClick={handleRemoveFriend}
            disabled={isLoading}
            title="Hủy kết bạn"
          >
            <FaUserMinus />
          </button>
        );
      case 'rejected':
        return (
          <button
            className="friend-card__action-btn friend-card__action-btn--add"
            onClick={handleSendRequest}
            disabled={isLoading}
            title="Gửi lại lời mời kết bạn"
          >
            <FaUserPlus />
          </button>
        );
      case 'cancelled': // Nếu người gửi hủy lời mời
        return (
          <button
            className="friend-card__action-btn friend-card__action-btn--add"
            onClick={handleSendRequest}
            disabled={isLoading}
            title="Gửi lời mời kết bạn"
          >
            <FaUserPlus />
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="friend-card">
      <div className="friend-card__header">
        <div className="friend-card__avatar-wrapper">
          <img src={user.avatarUrl ? `${import.meta.env.VITE_SERVER_URL}${user.avatarUrl}` : 'https://placehold.co/150?text=Avatar'} alt={user.username} className="friend-card__avatar" />
          <span 
            className={classNames('friend-card__status', {
              'friend-card__status--online': user.online,
              'friend-card__status--offline': !user.online,
            })}
            title={user.online ? 'Online' : `Offline — lần cuối ${user.lastOnline ? formatDistanceToNow(user.lastOnline) : 'không rõ'}`}
          ></span>
        </div>
        <div className="friend-card__info">
          <h3 
            className="friend-card__username line-count-1 friend-card__username--clickable" 
            onClick={handleUsernameClick}
            title="Xem trang cá nhân"
          >
            {user.username}
          </h3>
          {user.friendshipStatus && user.friendshipStatus !== 'none' && (
            <p className="friend-card__status-text">
              Trạng thái: {
                user.friendshipStatus === 'pending' ? 'Đang chờ' :
                  user.friendshipStatus === 'accepted' ? 'Bạn bè' :
                    user.friendshipStatus === 'rejected' ? 'Đã từ chối' :
                      user.friendshipStatus === 'cancelled' ? 'Đã hủy' : ''
              }
            </p>
          )}
        </div>
      </div>
      <div className="friend-card__actions">
        {renderActions()}
      </div>
    </div>
  );
};

export default FriendCard;
