import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPendingRequests, fetchSentRequests } from '@/store/slices/friendSlice';
import FriendCard from './FriendCard';
import '@/assets/scss/components/_friend-request-list.scss';

const FriendRequestList = ({ type }) => {
  const dispatch = useDispatch();
  const { pendingRequests, sentRequests, loading, error, lastFetchedPendingRequests, lastFetchedSentRequests } = useSelector((state) => state.friends);

  useEffect(() => {
    if (type === 'pending' && !lastFetchedPendingRequests) {
      dispatch(fetchPendingRequests());
    } else if (type === 'sent' && !lastFetchedSentRequests) {
      dispatch(fetchSentRequests());
    }
  }, [dispatch, type, lastFetchedPendingRequests, lastFetchedSentRequests]);

  if (loading) {
    return <div>Đang tải...</div>;
  }

  if (error) {
    return <div className="error-message">Lỗi: {error}</div>;
  }

  const requests = type === 'pending' ? pendingRequests : sentRequests;

  if (requests.length === 0) {
    return (
      <div className="no-results">
        {type === 'pending' ? 'Không có lời mời kết bạn nào đang chờ.' : 'Bạn chưa gửi lời mời kết bạn nào.'}
      </div>
    );
  }

  return (
    <div className="friend-request-list">
      {requests.map((request) => (
        <FriendCard
          key={request.id}
          user={{
            ...(type === 'pending' ? request.sender : request.receiver),
            friendshipStatus: 'pending',
            friendshipId: request.id, // Truyền id của lời mời để chấp nhận/từ chối
          }}
          type={type}
        />
      ))}
    </div>
  );
};

export default FriendRequestList;
