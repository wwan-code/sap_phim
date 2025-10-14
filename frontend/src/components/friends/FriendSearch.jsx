import React, { useState } from 'react';
import { useSearchUsers } from '@/hooks/useFriendQueries';
import { useDebounce } from '@/hooks/useDebounce';
import FriendCard from './FriendCard';
import '@/assets/scss/components/_friend-search.scss';

const FriendSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce 500ms

  const {
    data: searchResults,
    isLoading,
    isFetching,
    isError,
    error,
  } = useSearchUsers(debouncedSearchTerm, {
    // Chỉ chạy query khi debouncedSearchTerm có giá trị
    enabled: debouncedSearchTerm.length > 0,
  });

  const loading = isLoading || isFetching;

  return (
    <div className="friend-search">
      <div className="friend-search__input-group">
        <input
          type="text"
          className="friend-search__input"
          placeholder="Tìm kiếm bạn bè theo tên, email hoặc UUID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="friend-search__btn" disabled={loading}>
          {loading ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-search" />}
        </button>
      </div>

      {isError && <div className="error-message">Lỗi: {error.message}</div>}

      {searchResults && searchResults.length > 0 && (
        <div className="friend-search__results">
          {searchResults.map((user) => (
            <FriendCard key={user.id} user={user} type="search" />
          ))}
        </div>
      )}

      {!loading && debouncedSearchTerm && (!searchResults || searchResults.length === 0) && (
        <div className="no-results">Không tìm thấy người dùng nào.</div>
      )}
    </div>
  );
};

export default FriendSearch;
