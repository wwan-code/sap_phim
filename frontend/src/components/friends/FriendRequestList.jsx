import React from 'react';
import { useGetPendingRequests, useGetSentRequests } from '@/hooks/useFriendQueries';
import FriendCard from './FriendCard';
import '@/assets/scss/components/_friend-request-list.scss';

const FriendRequestList = ({ type }) => {
  // Chọn hook phù hợp dựa trên 'type' prop
  const { 
    data, 
    isLoading, 
    isError, 
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = type === 'pending' ? useGetPendingRequests() : useGetSentRequests();

  // Flatten pages data
  const requests = data?.pages?.flatMap(page => page.data) || [];

  if (isLoading) {
    return <div className="loading-state">Đang tải...</div>;
  }

  if (isError) {
    return <div className="error-message">Lỗi: {error.message}</div>;
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="no-results">
        {type === 'pending' ? 'Không có lời mời kết bạn nào đang chờ.' : 'Bạn chưa gửi lời mời kết bạn nào.'}
      </div>
    );
  }

  return (
    <div className="friend-request-list-container">
      <div className="friend-request-list">
        {requests.map((request) => (
          <FriendCard
            key={request.id}
            user={{
              ...(type === 'pending' ? request.sender : request.receiver),
              friendshipStatus: 'pending',
              friendshipId: request.id,
            }}
            type={type}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasNextPage && (
        <div className="load-more-container">
          <button 
            className="btn-load-more"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Đang tải...' : 'Xem thêm'}
          </button>
        </div>
      )}
    </div>
  );
};

export default FriendRequestList;
