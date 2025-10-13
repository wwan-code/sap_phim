import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import sectionsService from '@/services/sectionsService';
import movieService from '@/services/movieService';
import useTableData from '@/hooks/useTableData';
import Pagination from '@/components/common/Pagination';
import classNames from '@/utils/classNames';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { debounce } from 'lodash';

const Sections = () => {
  // State cho modal form và dữ liệu liên quan
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState({ id: null, title: '', order: '', movieId: '', seriesId: '' });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [movies, setMovies] = useState([]);
  const [seriesList, setSeriesList] = useState([]);

  // Sử dụng hook useTableData mới để quản lý dữ liệu sections
  const {
    data: sections,
    meta,
    isLoading,
    error,
    refetch,
    setPage,
    setLimit,
    setSortRules,
    setFilters,
    queryParams,
  } = useTableData(sectionsService.getSections, {
    initialSortRules: [{ field: 'order', order: 'asc' }],
  });

  useEffect(() => {
    const fetchRelatedData = async () => {
      try {
        const [moviesRes] = await Promise.all([
          movieService.getAllMovies(),
        ]);
        setMovies(moviesRes.data || []);
        setSeriesList([]);
      } catch (err) {
        toast.error('Lỗi khi tải dữ liệu cho form.');
      }
    };
    fetchRelatedData();
  }, []);

  // Helper functions để lấy tiêu đề
  const getMovieDefaultTitle = (titles) => titles?.find(t => t.type === 'default')?.title || 'N/A';
  const getMovieTitleById = useCallback((movieId) => movies.find(m => m.id === movieId)?.title || `Phim ID: ${movieId}`, [movies]);
  const getSeriesTitleById = useCallback((seriesId) => 'N/A', []);

  // Xử lý sắp xếp
  const handleSort = (field) => {
    const existingRule = queryParams.sortRules.find(rule => rule.field === field);
    setSortRules([{ field, order: existingRule?.order === 'asc' ? 'desc' : 'asc' }]);
  };

  // Xử lý tìm kiếm
  const debouncedSearch = debounce((value) => setFilters({ title: value }), 300);
  const handleSearchChange = (e) => debouncedSearch(e.target.value);

  // Validate form
  const validateForm = useCallback(() => {
    const errors = {};
    if (!currentSection.title.trim()) errors.title = 'Tiêu đề là bắt buộc.';
    if (!currentSection.order || currentSection.order <= 0) errors.order = 'Thứ tự phải là số dương.';
    if (!currentSection.movieId) errors.relation = 'Phải chọn một Phim.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [currentSection]);

  // Xử lý tạo/cập nhật
  const handleCreateOrUpdateSection = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const dataToSend = {
        title: currentSection.title,
        order: parseInt(currentSection.order),
        movieId: currentSection.movieId || null,
      };

      if (currentSection.id) {
        await sectionsService.updateSection(currentSection.id, dataToSend);
        toast.success('Section đã được cập nhật!');
      } else {
        await sectionsService.createSection(dataToSend);
        toast.success('Section đã được tạo!');
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
  const handleDeleteSection = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa section này không?')) {
      try {
        await sectionsService.deleteSection(id);
        toast.success('Section đã được xóa!');
        refetch();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Xóa section thất bại.');
      }
    }
  };

  // Mở modal
  const openCreateModal = () => {
    setCurrentSection({ id: null, title: '', order: '', movieId: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (section) => {
    setCurrentSection({ ...section, movieId: section.movieId || '' });
    setFormErrors({});
    setIsModalOpen(true);
  };
  
  const getSortInfo = (field) => {
    const rule = queryParams.sortRules.find(r => r.field === field);
    return { isSorted: !!rule, direction: rule?.order };
  };

  if (error) return <div className="admin-page__error">Lỗi: {error.message}</div>;

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Quản lý Sections</h1>
        <button className="btn btn-primary" onClick={openCreateModal}><FaPlus /> Thêm Section Mới</button>
      </div>

      <div className="admin-page__controls">
        <div className="admin-page__search">
          <input
            type="text"
            placeholder="Tìm kiếm series..."
            onChange={handleSearchChange}
          />
        </div>
        <div className="admin-page__limit-selector">
          <select value={queryParams.limit} onChange={(e) => setLimit(Number(e.target.value))} className='form-select'>
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
              <th className={classNames('sortable', { 'asc': getSortInfo('title').direction === 'asc', 'desc': getSortInfo('title').direction === 'desc' })} onClick={() => handleSort('title')}>
                Tiêu đề <i className={classNames('sort-icon fas', { 'fa-sort-up': getSortInfo('title').direction === 'asc', 'fa-sort-down': getSortInfo('title').direction === 'desc', 'fa-sort': !getSortInfo('title').isSorted })}></i>
              </th>
              <th className={classNames('sortable', { 'asc': getSortInfo('order').direction === 'asc', 'desc': getSortInfo('order').direction === 'desc' })} onClick={() => handleSort('order')}>
                Thứ tự <i className={classNames('sort-icon fas', { 'fa-sort-up': getSortInfo('order').direction === 'asc', 'fa-sort-down': getSortInfo('order').direction === 'desc', 'fa-sort': !getSortInfo('order').isSorted })}></i>
              </th>
              <th>Phim</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="6">Đang tải...</td></tr>
            ) : sections.length > 0 ? (
              sections.map((section) => (
                <tr key={section.id}>
                  <td>{section.id}</td>
                  <td>{section.title}</td>
                  <td>{section.order}</td>
                  <td>{section.movieId ? getMovieTitleById(section.movieId) : 'N/A'}</td>
                  
                  <td className="actions">
                    <button className="btn btn--edit" onClick={() => openEditModal(section)}><FaEdit /> Sửa</button>
                    <button className="btn btn--delete" onClick={() => handleDeleteSection(section.id)}><FaTrash /> Xóa</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6">Không có section nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {meta.totalPages > 1 && <Pagination currentPage={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />}

      {isModalOpen && (
        <div className="admin-page__form-modal">
          <div className="admin-page__form-modal--content">
            <button className="admin-page__form-modal--close" onClick={() => setIsModalOpen(false)}>&times;</button>
            <h2>{currentSection.id ? 'Chỉnh sửa Section' : 'Thêm Section Mới'}</h2>
            <form onSubmit={handleCreateOrUpdateSection}>
              <div className="form-group">
                <label htmlFor="title">Tiêu đề</label>
                <input type="text" id="title" value={currentSection.title} onChange={(e) => setCurrentSection({ ...currentSection, title: e.target.value })} required />
                {formErrors.title && <p className="error-message">{formErrors.title}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="order">Thứ tự</label>
                <input type="number" id="order" value={currentSection.order} onChange={(e) => setCurrentSection({ ...currentSection, order: e.target.value })} required min="1" />
                {formErrors.order && <p className="error-message">{formErrors.order}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="movieId">Phim</label>
                <select id="movieId" value={currentSection.movieId} onChange={(e) => setCurrentSection({ ...currentSection, movieId: e.target.value, seriesId: '' })} className='form-select'>
                  <option value="">Không thuộc phim nào</option>
                  {movies.map(movie => <option key={movie.id} value={movie.id}>{getMovieDefaultTitle(movie.titles)}</option>)}
                </select>
              </div>
              <div className="form-group">
                {formErrors.relation && <p className="error-message">{formErrors.relation}</p>}
              </div>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn--submit" disabled={isSubmitting}>{isSubmitting ? 'Đang lưu...' : 'Lưu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sections;
