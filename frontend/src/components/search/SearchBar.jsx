import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import movieService from '@/services/movieService';
import SearchResultDropdown from './SearchResultDropdown';
import '@/assets/scss/components/search/_search-bar.scss';
import classNames from '@/utils/classNames';

const SearchBar = () => {
  // Từ khóa người dùng nhập
  const [query, setQuery] = useState('');
  // Kết quả tìm kiếm từ API
  const [results, setResults] = useState([]);
  // Trạng thái loading
  const [isLoading, setIsLoading] = useState(false);
  // Trạng thái focus vào input
  const [isFocused, setIsFocused] = useState(false);
  // Trang hiện tại cho infinite scroll
  const [page, setPage] = useState(1);
  // Kiểm tra xem còn kết quả để tải thêm không
  const [hasMore, setHasMore] = useState(false);
  // Lỗi
  const [error, setError] = useState(null);

  // Sử dụng debounce cho từ khóa tìm kiếm để tránh gọi API liên tục
  const debouncedQuery = useDebounce(query, 300);

  // Ref để theo dõi AbortController, giúp hủy request API cũ
  const abortControllerRef = useRef(null);
  // Ref cho dropdown để xử lý click outside
  const searchContainerRef = useRef(null);

  // Hàm gọi API tìm kiếm
  const fetchMovies = useCallback(async (currentQuery, currentPage) => {
    if (!currentQuery) {
      setResults([]);
      setHasMore(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Hủy request trước đó nếu có
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Tạo AbortController mới cho request hiện tại
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const response = await movieService.searchMovies({ q: currentQuery, page: currentPage, limit: 5 }, signal);
      
      if (response && response.data) {
        // Nếu là trang 1, thay thế kết quả. Nếu không, nối vào kết quả cũ.
        setResults(prevResults => currentPage === 1 ? response.data : [...prevResults, ...response.data]);
        // Kiểm tra xem còn trang tiếp theo không
        setHasMore(response.meta.page < response.meta.totalPages);
      } else {
        if (currentPage === 1) {
            setResults([]);
        }
        setHasMore(false);
      }
    } catch (err) {
        if (err.name !== 'CanceledError') { // Bỏ qua lỗi do hủy request
            console.error("Lỗi khi tìm kiếm phim:", err);
            setError("Đã có lỗi xảy ra. Vui lòng thử lại.");
        }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect để gọi API khi debouncedQuery thay đổi
  useEffect(() => {
    setPage(1);
    fetchMovies(debouncedQuery, 1);
  }, [debouncedQuery, fetchMovies]);

  // Hàm tải thêm kết quả cho infinite scroll
  const loadMore = () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMovies(debouncedQuery, nextPage);
    }
  };
  
  // Xử lý khi click ra ngoài dropdown để đóng nó
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={classNames('search-bar', { 'search-bar--focused': isFocused })} ref={searchContainerRef}>
      <form onSubmit={(e) => e.preventDefault()} className="search-bar__form">
        <div className="search-bar__input-wrapper">
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="search-bar__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
          />
        </div>
        <button className="search-bar__button">
          <i className="fa-solid fa-search"></i>
        </button>
      </form>
      {isFocused && (
        <SearchResultDropdown
          results={results}
          isLoading={isLoading && page === 1}
          loadMore={loadMore}
          hasMore={hasMore}
          query={debouncedQuery}
          error={error}
          onClose={() => setIsFocused(false)}
        />
      )}
    </div>
  );
};

export default SearchBar;
