import React, { useState } from 'react';
import { toast } from 'react-toastify';
import genreService from '@/services/genreService';
import useTableData from '@/hooks/useTableData';
import Pagination from '@/components/common/Pagination';
import classNames from '@/utils/classNames';
import { debounce } from 'lodash';

const Genres = () => {
  // State cho modal form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentGenre, setCurrentGenre] = useState({ id: null, title: '' });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sử dụng hook useTableData mới
  const {
    data: genres,
    meta,
    isLoading,
    error,
    refetch,
    setPage,
    setLimit,
    setSortRules,
    setFilters,
    queryParams,
  } = useTableData(genreService.getGenres, {
    initialSortRules: [{ field: 'title', order: 'asc' }],
  });

  // Xử lý sắp xếp
  const handleSort = (field) => {
    const existingRule = queryParams.sortRules.find(rule => rule.field === field);
    let newSortRules;

    if (existingRule) {
      // Đảo chiều sắp xếp nếu cột đã được chọn
      newSortRules = [{
        field,
        order: existingRule.order === 'asc' ? 'desc' : 'asc',
      }];
    } else {
      // Thêm quy tắc sắp xếp mới (ở đây ta chỉ sort 1 cột)
      newSortRules = [{ field, order: 'asc' }];
    }
    setSortRules(newSortRules);
  };
  
  // Xử lý tìm kiếm với debounce
  const debouncedSearch = debounce((value) => {
    setFilters({ title: value });
  }, 300);

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!currentGenre.title.trim()) {
      errors.title = 'Title is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Xử lý tạo hoặc cập nhật
  const handleCreateOrUpdateGenre = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (currentGenre.id) {
        await genreService.updateGenre(currentGenre.id, { title: currentGenre.title });
        toast.success('Genre updated successfully!');
      } else {
        await genreService.createGenre({ title: currentGenre.title });
        toast.success('Genre created successfully!');
      }
      setIsModalOpen(false);
      refetch(); // Tải lại dữ liệu
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý xóa
  const handleDeleteGenre = async (id) => {
    if (window.confirm('Are you sure you want to delete this genre?')) {
      try {
        await genreService.deleteGenre(id);
        toast.success('Genre deleted successfully!');
        refetch(); // Tải lại dữ liệu
      } catch (err) {
        toast.error(err.response?.data?.message || 'Deletion failed.');
      }
    }
  };

  // Mở modal
  const openCreateModal = () => {
    setCurrentGenre({ id: null, title: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (genre) => {
    setCurrentGenre(genre);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Lấy thông tin sắp xếp hiện tại để hiển thị UI
  const getSortInfo = (field) => {
    const rule = queryParams.sortRules.find(r => r.field === field);
    return {
      isSorted: !!rule,
      direction: rule ? rule.order : 'none',
    };
  };

  if (isLoading && genres.length === 0) {
    return <div className="admin-page__loading">Loading genres...</div>;
  }

  if (error) {
    return <div className="admin-page__error">Error: {error.message}</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Manage Genres</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          Add New Genre
        </button>
      </div>

      <div className="admin-page__controls">
        <div className="admin-page__search">
          <input
            type="text"
            placeholder="Search genres by title..."
            onChange={handleSearchChange}
          />
        </div>
        <div className="admin-page__limit-selector">
          <select value={queryParams.limit} onChange={(e) => setLimit(Number(e.target.value))} className='form-select'>
            <option value="5">5 per page</option>
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
          </select>
        </div>
      </div>

      <div className="admin-page__table-container">
        <table className="admin-page__table">
          <thead>
            <tr>
              <th>ID</th>
              <th 
                className={classNames('sortable', { 
                  'asc': getSortInfo('title').direction === 'asc', 
                  'desc': getSortInfo('title').direction === 'desc' 
                })} 
                onClick={() => handleSort('title')}
              >
                Title <i className={classNames('sort-icon', { 
                  'fas fa-sort-up': getSortInfo('title').direction === 'asc', 
                  'fas fa-sort-down': getSortInfo('title').direction === 'desc', 
                  'fas fa-sort': !getSortInfo('title').isSorted 
                })}></i>
              </th>
              <th>Slug</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="4">Loading...</td></tr>
            ) : genres.length > 0 ? (
              genres.map((genre) => (
                <tr key={genre.id}>
                  <td>{genre.id}</td>
                  <td>{genre.title}</td>
                  <td>{genre.slug}</td>
                  <td className="actions">
                    <button className="btn btn--edit" onClick={() => openEditModal(genre)}>
                      Edit
                    </button>
                    <button className="btn btn--delete" onClick={() => handleDeleteGenre(genre.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="4">No genres found.</td></tr>
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
            <button className="admin-page__form-modal--close" onClick={() => setIsModalOpen(false)}>
              &times;
            </button>
            <h2>{currentGenre.id ? 'Edit Genre' : 'Add New Genre'}</h2>
            <form onSubmit={handleCreateOrUpdateGenre}>
              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  value={currentGenre.title}
                  onChange={(e) => setCurrentGenre({ ...currentGenre, title: e.target.value })}
                  required
                />
                {formErrors.title && <p className="error-message">{formErrors.title}</p>}
              </div>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Genres;
