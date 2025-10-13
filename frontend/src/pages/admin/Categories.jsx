import React, { useState } from 'react';
import { toast } from 'react-toastify';
import categoryService from '@/services/categoryService';
import useTableData from '@/hooks/useTableData';
import Pagination from '@/components/common/Pagination';
import classNames from '@/utils/classNames';
import { debounce } from 'lodash';

const Categories = () => {
  // State cho modal form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState({ id: null, title: '' });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sử dụng hook useTableData mới
  const {
    data: categories,
    meta,
    isLoading,
    error,
    refetch,
    setPage,
    setLimit,
    setSortRules,
    setFilters,
    queryParams,
  } = useTableData(categoryService.getCategories, {
    initialSortRules: [{ field: 'title', order: 'asc' }],
  });

  // Xử lý sắp xếp
  const handleSort = (field) => {
    const existingRule = queryParams.sortRules.find(rule => rule.field === field);
    let newSortRules;

    if (existingRule) {
      newSortRules = [{
        field,
        order: existingRule.order === 'asc' ? 'desc' : 'asc',
      }];
    } else {
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
    if (!currentCategory.title.trim()) {
      errors.title = 'Title is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Xử lý tạo hoặc cập nhật
  const handleCreateOrUpdateCategory = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (currentCategory.id) {
        await categoryService.updateCategory(currentCategory.id, { title: currentCategory.title });
        toast.success('Category updated successfully!');
      } else {
        await categoryService.createCategory({ title: currentCategory.title });
        toast.success('Category created successfully!');
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
  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await categoryService.deleteCategory(id);
        toast.success('Category deleted successfully!');
        refetch(); // Tải lại dữ liệu
      } catch (err) {
        toast.error(err.response?.data?.message || 'Deletion failed.');
      }
    }
  };

  // Mở modal
  const openCreateModal = () => {
    setCurrentCategory({ id: null, title: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (category) => {
    setCurrentCategory(category);
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

  if (isLoading && categories.length === 0) {
    return <div className="admin-page__loading">Loading categories...</div>;
  }

  if (error) {
    return <div className="admin-page__error">Error: {error.message}</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Manage Categories</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          Add New Category
        </button>
      </div>

      <div className="admin-page__controls">
        <div className="admin-page__search">
          <input
            type="text"
            placeholder="Search categories by title..."
            onChange={handleSearchChange}
          />
        </div>
        <div className="admin-page__limit-selector">
          <select value={queryParams.limit} onChange={(e) => setLimit(Number(e.target.value))}
          className='form-select'
            >
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
            ) : categories.length > 0 ? (
              categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.id}</td>
                  <td>{category.title}</td>
                  <td>{category.slug}</td>
                  <td className="actions">
                    <button className="btn btn--edit" onClick={() => openEditModal(category)}>
                      Edit
                    </button>
                    <button className="btn btn--delete" onClick={() => handleDeleteCategory(category.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="4">No categories found.</td></tr>
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
            <h2>{currentCategory.id ? 'Edit Category' : 'Add New Category'}</h2>
            <form onSubmit={handleCreateOrUpdateCategory}>
              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  value={currentCategory.title}
                  onChange={(e) => setCurrentCategory({ ...currentCategory, title: e.target.value })}
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

export default Categories;
