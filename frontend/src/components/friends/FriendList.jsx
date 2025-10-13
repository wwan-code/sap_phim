import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFriends } from '@/store/slices/friendSlice';
import userService from '@/services/userService'; // Import userService
import FriendCard from './FriendCard';
import '@/assets/scss/components/_friend-list.scss';

const FriendList = ({ user, isOwnProfile = true }) => {
  const dispatch = useDispatch();
  const { friends, loading, error, lastFetchedFriends } = useSelector((state) => state.friends);
  const [otherUserFriends, setOtherUserFriends] = useState([]);
  const [otherUserLoading, setOtherUserLoading] = useState(false);
  const [otherUserError, setOtherUserError] = useState(null);

  const friendsList = isOwnProfile ? friends : otherUserFriends;

  useEffect(() => {
    if (isOwnProfile) {
      if (!lastFetchedFriends) {
        dispatch(fetchFriends());
      }
    } else if (user?.uuid) {
      // Fetch danh sách bạn bè của người dùng khác
      const fetchOtherUserFriends = async () => {
        setOtherUserLoading(true);
        setOtherUserError(null);
        try {
          const response = await userService.getUserFriendsByUuid(user.uuid);
          if (response.data) {
            setOtherUserFriends(response.data);
          } else {
            setOtherUserError(response.message || 'Không thể tải danh sách bạn bè.');
          }
        } catch (e) {
          setOtherUserError(e?.response?.data?.message || 'Không thể tải danh sách bạn bè.');
        } finally {
          setOtherUserLoading(false);
        }
      };
      fetchOtherUserFriends();
    }
  }, [dispatch, lastFetchedFriends, isOwnProfile, user?.uuid]);

  if ((loading && isOwnProfile) || (otherUserLoading && !isOwnProfile)) {
    return <div>Đang tải...</div>;
  }

  if ((error && isOwnProfile) || (otherUserError && !isOwnProfile)) {
    return <div className="error-message">Lỗi: {isOwnProfile ? error : otherUserError}</div>;
  }

  if (friendsList.length === 0) {
    const message = isOwnProfile ? 'Bạn chưa có người bạn nào.' : 'Người này chưa có người bạn nào.';
    return <div className="no-results">{message}</div>;
  }

  return (
    <div className="friend-list">
      {friendsList.map((friend) => (
        <FriendCard key={friend.id} user={{ ...friend, friendshipStatus: 'accepted' }} type="friends" />
      ))}
    </div>
  );
};

export default FriendList;
