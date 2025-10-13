import React, { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import seriesService from '@/services/seriesService';
import useTableData from '@/hooks/useTableData';
import Pagination from '@/components/common/Pagination';
import classNames from '@/utils/classNames';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { debounce } from 'lodash';

const Series = () => {
  // State cho modal form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSeries, setCurrentSeries] = useState({ id: null, title: '' });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sử dụng hook useTableData mới
  const {
    data: seriesList,
    meta,
    isLoading,
    error,
    refetch,
    setPage,
    setLimit,
    setSortRules,
    setFilters,
    queryParams,
  } = useTableData(seriesService.getSeries, {
    initialSortRules: [{ field: 'title', order: 'asc' }],
  });

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
    if (!currentSeries.title.trim()) {
      errors.title = 'Tiêu đề là bắt buộc.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [currentSeries]);

  // Xử lý tạo/cập nhật
  const handleCreateOrUpdateSeries = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (currentSeries.id) {
        await seriesService.updateSeries(currentSeries.id, { title: currentSeries.title });
        toast.success('Series đã được cập nhật thành công!');
      } else {
        await seriesService.createSeries({ title: currentSeries.title });
        toast.success('Series đã được tạo thành công!');
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
  const handleDeleteSeries = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa series này không?')) {
      try {
        await seriesService.deleteSeries(id);
        toast.success('Series đã được xóa thành công!');
        refetch();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Xóa series thất bại.');
      }
    }
  };

  // Mở modal
  const openCreateModal = () => {
    setCurrentSeries({ id: null, title: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (series) => {
    setCurrentSeries(series);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const getSortInfo = (field) => {
    const rule = queryParams.sortRules.find(r => r.field === field);
    return { isSorted: !!rule, direction: rule?.order };
  };

  if (error) {
    return <div className="admin-page__error">Lỗi: {error.message}</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Quản lý Series</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <FaPlus /> Thêm Series Mới
        </button>
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
              <th>Slug</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="4">Đang tải...</td></tr>
            ) : seriesList.length > 0 ? (
              seriesList.map((series) => (
                <tr key={series.id}>
                  <td>{series.id}</td>
                  <td>{series.title}</td>
                  <td>{series.slug}</td>
                  <td className="actions">
                    <button className="btn btn--edit" onClick={() => openEditModal(series)}>
                      <FaEdit /> Sửa
                    </button>
                    <button className="btn btn--delete" onClick={() => handleDeleteSeries(series.id)}>
                      <FaTrash /> Xóa
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="4">Không có series nào.</td></tr>
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
            <h2>{currentSeries.id ? 'Chỉnh sửa Series' : 'Thêm Series Mới'}</h2>
            <form onSubmit={handleCreateOrUpdateSeries}>
              <div className="form-group">
                <label htmlFor="title">Tiêu đề</label>
                <input
                  type="text"
                  id="title"
                  value={currentSeries.title}
                  onChange={(e) => setCurrentSeries({ ...currentSeries, title: e.target.value })}
                  required
                />
                {formErrors.title && <p className="error-message">{formErrors.title}</p>}
              </div>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn--submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Series'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Series;
