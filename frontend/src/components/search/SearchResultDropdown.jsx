import React, { useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useCustomScrollbar from '@/hooks/useCustomScrollbar';

const getDefaultTitle = (titles) => {
  if (!titles || titles.length === 0) return "KhÃ´ng cÃ³ tiÃªu Ä‘á»";
  const defaultTitle = titles.find(t => t.type === 'default');
  return defaultTitle ? defaultTitle.title : titles[0].title;
};

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
  const { containerRef, scrollbarRef } = useCustomScrollbar([results.length, isLoading]);

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
    onClose();
    navigate(`/movie/${slug}`);
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="search-results__message">Đang tìm kiếm...</div>;
    }
    if (error) {
        return <div className="search-results__message search-results__message--error">{error}</div>;
    }
    if (results.length === 0 && query) {
      return <div className="search-results__message">KhÃ´ng tÃ¬m tháº¥y phim nÃ o cho "{query}"</div>;
    }
    if (results.length === 0 && !query) {
        return <div className="search-results__message">GÃµ Ä‘á»ƒ báº¯t Ä‘áº§u tÃ¬m kiáº¿m.</div>;
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

  const hasContent = results.length > 0 || isLoading || error;

  return (
    <div className={`search-results ${hasContent ? 'search-results--has-content' : ''}`}>
      <div className="search-results__container" ref={containerRef}>
        {renderContent()}
        {!isLoading && hasMore && (
          <div className="search-results__load-more">
            Äang táº£i thÃªm...
          </div>
        )}
      </div>
      <div className="search-results__scrollbar">
        <div className="search-results__scrollbar-thumb" ref={scrollbarRef}></div>
      </div>
    </div>
  );
};

export default SearchResultDropdown;

