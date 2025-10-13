import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import episodeService from '@/services/episodeService';
import movieService from '@/services/movieService';
import useTableData from '@/hooks/useTableData';
import Pagination from '@/components/common/Pagination';
import classNames from '@/utils/classNames';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { debounce } from 'lodash';

const Episodes = () => {
  // State cho modal form và dữ liệu liên quan
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState({ id: null, movieId: '', episodeNumber: '', linkEpisode: '', duration: '' });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [movies, setMovies] = useState([]);

  // Sử dụng hook useTableData mới
  const {
    data: episodes,
    meta,
    isLoading,
    error,
    refetch,
    setPage,
    setLimit,
    setSortRules,
    setFilters,
    queryParams,
  } = useTableData(episodeService.getEpisodes, {
    initialSortRules: [{ field: 'episodeNumber', order: 'asc' }],
  });

  // Fetch movies cho form select (chỉ chạy 1 lần)
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await movieService.getAllMovies();
        setMovies(response.data || []);
      } catch (err) {
        toast.error('Lỗi khi tải danh sách phim.');
      }
    };
    fetchMovies();
  }, []);

  // Helper functions để lấy tiêu đề phim
  const getMovieDefaultTitle = (titles) => titles?.find(t => t.type === 'default')?.title || 'Không có tiêu đề';
  const getMovieTitleById = useCallback((movieId) => {
    const movie = movies.find(m => m.id === movieId);
    return movie ? getMovieDefaultTitle(movie.titles) : `Phim ID: ${movieId}`;
  }, [movies]);

  // Xử lý sắp xếp
  const handleSort = (field) => {
    const existingRule = queryParams.sortRules.find(rule => rule.field === field);
    setSortRules([{ field, order: existingRule?.order === 'asc' ? 'desc' : 'asc' }]);
  };

  // Xử lý tìm kiếm (ví dụ tìm theo số tập)
  const debouncedSearch = debounce((value) => setFilters({ episodeNumber: value }), 300);
  const handleSearchChange = (e) => debouncedSearch(e.target.value);

  // Validate form
  const validateForm = useCallback(() => {
    const errors = {};
    if (!currentEpisode.movieId) errors.movieId = 'Phim là bắt buộc.';
    if (!currentEpisode.episodeNumber || currentEpisode.episodeNumber <= 0) errors.episodeNumber = 'Số tập phải là số dương.';
    if (!currentEpisode.linkEpisode.trim()) errors.linkEpisode = 'Link tập phim là bắt buộc.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [currentEpisode]);

  // Xử lý tạo/cập nhật
  const handleCreateOrUpdateEpisode = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (currentEpisode.id) {
        await episodeService.updateEpisode(currentEpisode.id, currentEpisode);
        toast.success('Tập phim đã được cập nhật thành công!');
      } else {
        await episodeService.createEpisode(currentEpisode.movieId, currentEpisode);
        toast.success('Tập phim đã được tạo thành công!');
      }
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thao tác thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý xóa
  const handleDeleteEpisode = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tập phim này không?')) {
      try {
        await episodeService.deleteEpisode(id);
        toast.success('Tập phim đã được xóa thành công!');
        refetch();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Xóa tập phim thất bại.');
      }
    }
  };

  // Mở modal
  const openCreateModal = () => {
    setCurrentEpisode({ id: null, movieId: '', episodeNumber: '', linkEpisode: '', duration: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (episode) => {
    setCurrentEpisode(episode);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const getSortInfo = (field) => {
    const rule = queryParams.sortRules.find(r => r.field === field);
    return { isSorted: !!rule, direction: rule?.order };
  };

  if (isLoading && episodes.length === 0) {
    return <div className="admin-page__loading">Đang tải tập phim...</div>;
  }

  if (error) {
    return <div className="admin-page__error">Lỗi: {error.message}</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Quản lý Tập phim</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <FaPlus /> Thêm Tập phim Mới
        </button>
      </div>

      <div className="admin-page__controls">
        <div className="admin-page__search">
          <input
            type="text"
            placeholder="Tìm theo số tập..."
            onChange={handleSearchChange}
          />
        </div>
        <div className="admin-page__limit-selector">
          <select value={queryParams.limit} onChange={(e) => setLimit(Number(e.target.value))} 
            className='form-select'
            >
            <option value="5">5 / trang</option>
            <option value="10">10 / trang</option>
            <option value="20">20 / trang</option>
          </select>
        </div>
      </div>

      <div className="admin-page__table-container">
        <table className="admin-page__table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Phim</th>
              <th className={classNames('sortable', { 'asc': getSortInfo('episodeNumber').direction === 'asc', 'desc': getSortInfo('episodeNumber').direction === 'desc' })} onClick={() => handleSort('episodeNumber')}>
                Số tập <i className={classNames('sort-icon fas', { 'fa-sort-up': getSortInfo('episodeNumber').direction === 'asc', 'fa-sort-down': getSortInfo('episodeNumber').direction === 'desc', 'fa-sort': !getSortInfo('episodeNumber').isSorted })}></i>
              </th>
              <th>Link</th>
              <th>Thời lượng</th>
              <th>Lượt xem</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7">Đang tải...</td></tr>
            ) : episodes.length > 0 ? (
              episodes.map((episode) => (
                <tr key={episode.id}>
                  <td>{episode.id}</td>
                  <td>{getMovieTitleById(episode.movieId)}</td>
                  <td>{episode.episodeNumber}</td>
                  <td><a href={episode.linkEpisode} target="_blank" rel="noopener noreferrer">Link</a></td>
                  <td>{episode.duration || 'N/A'}</td>
                  <td>{episode.views}</td>
                  <td className="actions">
                    <button className="btn btn--edit" onClick={() => openEditModal(episode)}><FaEdit /> Sửa</button>
                    <button className="btn btn--delete" onClick={() => handleDeleteEpisode(episode.id)}><FaTrash /> Xóa</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7">Không có tập phim nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {meta.totalPages > 1 && (
        <Pagination
          currentPage={meta.page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
        />
      )}

      {isModalOpen && (
        <div className="admin-page__form-modal">
          <div className="admin-page__form-modal--content">
            <button className="admin-page__form-modal--close" onClick={() => setIsModalOpen(false)}>&times;</button>
            <h2>{currentEpisode.id ? 'Chỉnh sửa Tập phim' : 'Thêm Tập phim Mới'}</h2>
            <form onSubmit={handleCreateOrUpdateEpisode}>
              <div className="form-group">
                <label htmlFor="movieId">Phim</label>
                <select
                  id="movieId"
                  name="movieId"
                  value={currentEpisode.movieId}
                  onChange={(e) => setCurrentEpisode({ ...currentEpisode, movieId: e.target.value })}
                  required
                  disabled={!!currentEpisode.id}
                  className='form-select'
                >
                  <option value="">Chọn phim</option>
                  {movies.map(movie => (
                    <option key={movie.id} value={movie.id}>{getMovieDefaultTitle(movie.titles)}</option>
                  ))}
                </select>
                {formErrors.movieId && <p className="error-message">{formErrors.movieId}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="episodeNumber">Số tập</label>
                <input
                  type="number"
                  id="episodeNumber"
                  name="episodeNumber"
                  value={currentEpisode.episodeNumber}
                  onChange={(e) => setCurrentEpisode({ ...currentEpisode, episodeNumber: e.target.value })}
                  required
                  min="1"
                />
                {formErrors.episodeNumber && <p className="error-message">{formErrors.episodeNumber}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="linkEpisode">Link Tập phim</label>
                <input
                  type="text"
                  id="linkEpisode"
                  name="linkEpisode"
                  value={currentEpisode.linkEpisode}
                  onChange={(e) => setCurrentEpisode({ ...currentEpisode, linkEpisode: e.target.value })}
                  placeholder="https://example.com/episode1.mp4"
                  required
                />
                {formErrors.linkEpisode && <p className="error-message">{formErrors.linkEpisode}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="duration">Thời lượng (ví dụ: 01:23:45)</label>
                <input
                  type="text"
                  id="duration"
                  name="duration"
                  value={currentEpisode.duration}
                  onChange={(e) => setCurrentEpisode({ ...currentEpisode, duration: e.target.value })}
                  placeholder="hh:mm:ss hoặc mm:ss"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn--submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Episodes;
