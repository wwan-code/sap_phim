import { useState, useEffect, useCallback } from 'react';

/**
 * Hook tùy chỉnh để quản lý dữ liệu bảng với phân trang, sắp xếp và tìm kiếm phía máy chủ.
 * @param {Function} serviceMethod - Hàm service để gọi API (ví dụ: genreService.getGenres).
 * @param {Object} initialParams - Các tham số ban đầu.
 * @param {number} [initialParams.page=1] - Trang ban đầu.
 * @param {number} [initialParams.limit=10] - Số mục mỗi trang ban đầu.
 * @param {Array} [initialParams.sortRules=[]] - Quy tắc sắp xếp ban đầu, ví dụ: [{ field: 'name', order: 'asc' }].
 * @param {Object} [initialParams.filters={}] - Các bộ lọc ban đầu.
 */
const useTableData = (serviceMethod, initialParams = {}) => {
  // Trạng thái lưu trữ dữ liệu trả về từ API
  const [data, setData] = useState([]);
  // Trạng thái lưu trữ thông tin meta cho phân trang
  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  // Trạng thái quản lý việc tải dữ liệu
  const [isLoading, setIsLoading] = useState(true);
  // Trạng thái lưu trữ lỗi nếu có
  const [error, setError] = useState(null);

  // Trạng thái cho các tham số truy vấn
  const [queryParams, setQueryParams] = useState({
    page: initialParams.page || 1,
    limit: initialParams.limit || 10,
    sortRules: initialParams.sortRules || [],
    filters: initialParams.filters || {},
  });

  // Hàm để chuyển đổi quy tắc sắp xếp thành chuỗi query param
  const formatSortRules = (rules) => {
    if (!rules || rules.length === 0) {
      return undefined; // Không thêm param 'sort' nếu không có quy tắc
    }
    // Chuyển đổi từ [{ field: 'name', order: 'asc' }] sang 'name:asc'
    return rules.map(rule => `${rule.field}:${rule.order}`).join(',');
  };

  // Hàm gọi API để lấy dữ liệu
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Chuẩn bị các tham số để gửi đi
      const params = {
        page: queryParams.page,
        limit: queryParams.limit,
        sort: formatSortRules(queryParams.sortRules),
        ...queryParams.filters,
      };

      // Loại bỏ các param không có giá trị
      Object.keys(params).forEach(key => {
        if (params[key] === undefined || params[key] === null || params[key] === '') {
          delete params[key];
        }
      });

      const response = await serviceMethod(params);
      
      if (response && response.success) {
        setData(response.data || []);
        setMeta(response.meta || { page: 1, limit: 10, total: 0, totalPages: 1 });
      } else {
        throw new Error(response.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err);
      setData([]); // Xóa dữ liệu cũ khi có lỗi
    } finally {
      setIsLoading(false);
    }
  }, [serviceMethod, queryParams]);

  // Tự động gọi lại fetchData khi queryParams thay đổi
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Hàm để gọi lại dữ liệu một cách thủ công
  const refetch = () => {
    fetchData();
  };

  // Các hàm cập nhật trạng thái query params
  const setPage = (page) => {
    setQueryParams(prev => ({ ...prev, page }));
  };

  const setLimit = (limit) => {
    setQueryParams(prev => ({ ...prev, page: 1, limit })); // Reset về trang 1 khi thay đổi limit
  };

  const setSortRules = (rules) => {
    setQueryParams(prev => ({ ...prev, sortRules: rules }));
  };

  const setFilters = (filters) => {
    setQueryParams(prev => ({ ...prev, page: 1, filters: { ...prev.filters, ...filters } })); // Merge filters
  };

  return {
    data,
    meta,
    isLoading,
    error,
    refetch,
    setPage,
    setLimit,
    setSortRules,
    setFilters,
    queryParams,
  };
};

export default useTableData;
