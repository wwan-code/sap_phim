import React, { useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Hàm tiện ích để lấy tiêu đề mặc định
const getDefaultTitle = (titles) => {
  if (!titles || titles.length === 0) return "Không có tiêu đề";
  const defaultTitle = titles.find(t => t.type === 'default');
  return defaultTitle ? defaultTitle.title : titles[0].title;
};

// Component để highlight từ khóa
const Highlight = ({ text, highlight }) => {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>
      )}
    </span>
  );
};

const SearchResultDropdown = ({ results, isLoading, loadMore, hasMore, query, error, onClose }) => {
  const navigate = useNavigate();
  const observer = useRef();

  // Callback ref cho phần tử cuối cùng trong danh sách
  // Khi phần tử này xuất hiện trên màn hình, sẽ trigger loadMore
  const lastResultElementRef = useCallback(node => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore, loadMore]);

  const handleResultClick = (slug) => {
    onClose(); // Đóng dropdown
    navigate(`/movie/${slug}`); // Điều hướng
  };

  // Render nội dung của dropdown
  const renderContent = () => {
    if (isLoading) {
      return <div className="search-results__message">Đang tìm kiếm...</div>;
    }
    if (error) {
        return <div className="search-results__message search-results__message--error">{error}</div>;
    }
    if (results.length === 0 && query) {
      return <div className="search-results__message">Không tìm thấy phim nào cho "{query}"</div>;
    }
    if (results.length === 0 && !query) {
        return <div className="search-results__message">Gõ để bắt đầu tìm kiếm.</div>;
    }

    return (
      <ul className="search-results__list">
        {results.map((movie, index) => {
          const isLastElement = results.length === index + 1;
          return (
            <li
              key={movie.uuid}
              ref={isLastElement ? lastResultElementRef : null}
              className="search-results__item"
              onClick={() => handleResultClick(movie.slug)}
            >
              <img
                src={movie.image?.posterUrl ? `${import.meta.env.VITE_SERVER_URL}${movie.image.posterUrl}` : 'https://placehold.co/40x60.png'}
                alt={getDefaultTitle(movie.titles)}
                className="search-results__item-poster"
              />
              <div className="search-results__item-info">
                <h4 className="search-results__item-title">
                  <Highlight text={getDefaultTitle(movie.titles)} highlight={query} />
                </h4>
                <p className="search-results__item-meta">
                  {movie.year} &bull; {movie.duration || 'N/A'}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="search-results">
      {renderContent()}
      {!isLoading && hasMore && (
        <div className="search-results__load-more">
          Đang tải thêm...
        </div>
      )}
    </div>
  );
};

export default SearchResultDropdown;
