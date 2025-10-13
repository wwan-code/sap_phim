import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import favoriteService from '@/services/favoriteService';
import userService from '@/services/userService';
import genreService from '@/services/genreService';
import { toast } from 'react-toastify';
import MovieCardSkeleton from '@/components/skeletons/MovieCardSkeleton';
import MovieCard from '../../MovieCard';

const FavoritesTab = ({ user, isOwnProfile = true }) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('dateAdded');

  const fetchGenres = useCallback(async () => {
    try {
      const response = await genreService.getAllGenres();
      if (response.success) {
        setGenres(response.data);
      }
    } catch (error) {
      console.error('Error fetching genres:', error);
      toast.error('Không thể tải danh sách thể loại.');
    }
  }, []);

  const loadFavorites = useCallback(async (nextPage = 1) => {
    setLoading(true);
    try {
      let response;
      if (isOwnProfile) {
        // Load favorites của chính mình với filter và sort
        response = await favoriteService.list({ page: nextPage, limit, genre: selectedGenre, sort: sortBy });
      } else {
        // Load favorites của người khác (chỉ có pagination, không có filter/sort)
        response = await userService.getUserFavoritesByUuid(user.uuid, nextPage, limit);
      }
      
      if (response.data) {
        setItems(response.data);
        setPage(response.meta?.page || nextPage);
        setTotalPages(response.meta?.totalPages || 1);
      } else {
        toast.error(response.message || 'Không thể tải danh sách yêu thích');
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Không thể tải danh sách yêu thích');
    } finally {
      setLoading(false);
    }
  }, [selectedGenre, sortBy, isOwnProfile, user?.uuid]);

  useEffect(() => {
    if (isOwnProfile) {
      fetchGenres();
    }
  }, [fetchGenres, isOwnProfile]);

  useEffect(() => {
    setItems([]);
    setPage(1);
    loadFavorites(1);
  }, [selectedGenre, sortBy, loadFavorites]);

  const handleRemove = async (movieId) => {
    if (!isOwnProfile) return;
    
    try {
      const response = await favoriteService.remove(movieId);
      if (response.success) {
        setItems(prev => prev.filter(m => m.id !== movieId));
        toast.success(response.message || 'Đã xóa khỏi yêu thích');
      } else {
        toast.error(response.message || 'Xóa thất bại');
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Xóa thất bại');
    }
  };

  const handleGenreChange = (e) => {
    setSelectedGenre(e.target.value);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  return (
    <div className="favorites-tab">
      {isOwnProfile && (
        <div className="favorites-tab__controls">
          <div className="control-group">
            <label htmlFor="genre-filter">Thể loại:</label>
            <select id="genre-filter" value={selectedGenre} onChange={handleGenreChange} disabled={loading}>
              <option value="">Tất cả</option>
              {genres.map(genre => (
                <option key={genre.id} value={genre.title}>{genre.title}</option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="sort-by">Sắp xếp theo:</label>
            <select id="sort-by" value={sortBy} onChange={handleSortChange} disabled={loading}>
              <option value="dateAdded">Ngày thêm</option>
              <option value="rating">Đánh giá</option>
            </select>
          </div>
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="favorites-grid">
          {[...Array(limit)].map((_, index) => (
            <MovieCardSkeleton key={index} />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="favorites-empty">
          <p>{isOwnProfile ? 'Chưa có phim yêu thích nào.' : 'Người này chưa có phim yêu thích nào.'}</p>
          {isOwnProfile && <p>Hãy thêm một vài bộ phim vào danh sách yêu thích của bạn!</p>}
        </div>
      )}

      {items.length > 0 && (
        <div className="favorites-grid">
          {items.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}

      {page < totalPages && (
        <div className="favorites-load-more">
          <button className="btn btn-primary" disabled={loading} onClick={() => loadFavorites(page + 1)}>
            {loading ? 'Đang tải...' : 'Tải thêm'}
          </button>
        </div>
      )}
    </div>
  );
};

export default FavoritesTab;
