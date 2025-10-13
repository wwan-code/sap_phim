import React, { useState, useEffect, useRef, useCallback } from 'react';
import movieService from '@/services/movieService';
import MovieCard from '@/components/MovieCard';
import MovieCardSkeleton from '@/components/skeletons/MovieCardSkeleton';
import { toast } from 'react-toastify';
import classNames from '@/utils/classNames';

const TheaterMoviesPage = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();

  const fetchTheaterMovies = useCallback(async () => {
    if (!hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const response = await movieService.getTheaterMovies({ page, limit: 18 });
      if (response.success) {
        setMovies(prevMovies => {
          const newMovies = response.data.filter(
            (newMovie) => !prevMovies.some((prevMovie) => prevMovie.id === newMovie.id)
          );
          return [...prevMovies, ...newMovies];
        });
        setHasMore(response.meta.page < response.meta.totalPages);
        setPage(prevPage => prevPage + 1);
      } else {
        toast.error(response.message || 'Lỗi khi tải phim chiếu rạp.');
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching theater movies:', err);
      setError('Không thể tải phim chiếu rạp. Vui lòng thử lại sau.');
      toast.error('Không thể tải phim chiếu rạp.');
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page, hasMore]);

  useEffect(() => {
    document.title = 'Phim Chiếu Rạp - Rạp Rê';
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Xem danh sách phim chiếu rạp mới nhất được cập nhật liên tục trên Rạp Rê.');

    fetchTheaterMovies();
  }, [fetchTheaterMovies]); // Initial fetch and re-fetch on dependency change

  const lastMovieElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchTheaterMovies();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchTheaterMovies]);

  const renderSkeletons = () => {
    return Array.from({ length: 18 }).map((_, index) => (
      <MovieCardSkeleton key={index} />
    ));
  };

  return (
    <div className="card-section page-section">
        <div className="section-title">
          <h3 className="section-title__text">
            <i className="fa-solid fa-film"></i> Phim Chiếu Rạp
          </h3>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {movies.length === 0 && !loading && !error && (
          <div className="no-movies-found">
            <p>Chưa có phim chiếu rạp nào được cập nhật.</p>
          </div>
        )}

        <div className={classNames('section-list', { 'section-list--loading': loading })}>
          {movies.map((movie, index) => {
            if (movies.length === index + 1) {
              return (
                <div ref={lastMovieElementRef} key={movie.id} className="section-list__item">
                  <MovieCard movie={movie} />
                </div>
              );
            } else {
              return (
                <div key={movie.id} className="section-list__item">
                  <MovieCard movie={movie} />
                </div>
              );
            }
          })}
          {loading && renderSkeletons()}
        </div>
      </div>
  );
};

export default TheaterMoviesPage;
