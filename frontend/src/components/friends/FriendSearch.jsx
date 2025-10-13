import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { searchUsers, clearSearchResults, sendFriendRequest } from '@/store/slices/friendSlice';
import FriendCard from './FriendCard';
import '@/assets/scss/components/_friend-search.scss';

const FriendSearch = () => {
  const dispatch = useDispatch();
  const { searchResults, loading, error } = useSelector((state) => state.friends);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = useCallback(() => {
    if (searchTerm.trim()) {
      dispatch(searchUsers(searchTerm.trim()));
    } else {
      dispatch(clearSearchResults());
    }
  }, [dispatch, searchTerm]);

  useEffect(() => {
    return () => {
      dispatch(clearSearchResults());
    };
  }, [dispatch]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="friend-search">
      <div className="friend-search__input-group">
        <input
          type="text"
          className="friend-search__input"
          placeholder="Tìm kiếm bạn bè theo tên, email hoặc UUID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button className="friend-search__btn" onClick={handleSearch} disabled={loading}>
          {loading ? <i className="fas fa-spinner fa-spin"/> : <i className="fas fa-search" />}
        </button>
      </div>

      {error && <div className="error-message">Lỗi: {error}</div>}
      {searchResults.length > 0 ? (
        <div className="friend-search__results">
          {
            searchResults.map((user) => (
              <FriendCard key={user.id} user={user} type="search" />
            ))
          }
        </div>) : (
        !loading && searchTerm.trim() && <div className="no-results">Không tìm thấy người dùng nào.</div>
      )}
    </div>
  );
};

export default FriendSearch;
