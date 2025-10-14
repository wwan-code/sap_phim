import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import movieService from '@/services/movieService';
import favoriteService from '@/services/favoriteService';
import { toast } from 'react-toastify';
import MovieCard from '@/components/MovieCard';
import '@/assets/scss/pages/_movie-detail-page.scss';
import { FaStar } from 'react-icons/fa';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorMessage from '@/components/common/ErrorMessage';
import { useSelector } from 'react-redux';
import CommentSection from '@/components/comments/CommentSection';

const MovieDetailPage = () => {
  const { slug } = useParams();
  const { user: currentUser } = useSelector((state) => state.auth);
  const [movieId, setMovieId] = useState(null);
  const [movie, setMovie] = useState(null);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [seriesMovies, setSeriesMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favAnimating, setFavAnimating] = useState(false);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        setLoading(true);
        const response = await movieService.getMovieDetailBySlug(slug); // Use new API
        if (response.success) {
          setMovie(response.data);
          setMovieId(response.data.id);
          setIsFavorite(response.data.isFavorite); // Set isFavorite directly from API response

          // Fetch similar movies
          const similarResponse = await movieService.getSimilarMovies(response.data.id, { limit: 6 });
          if (similarResponse.success) {
            setSimilarMovies(similarResponse.data);
          } else {
            console.warn('Could not fetch similar movies.');
          }

          // Fetch movies in the same series
          if (response.data.seriesId) { // Only fetch if it belongs to a series
            const seriesResponse = await movieService.getMoviesInSameSeries(response.data.id, { limit: 6 });
            if (seriesResponse.success) {
              setSeriesMovies(seriesResponse.data);
            } else {
              console.warn('Could not fetch movies in the same series.');
            }
          }
        } else {
          setError('Movie not found.');
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch movie details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchMovieDetails();
    }
  }, [slug, currentUser]); // Add currentUser to dependency array to re-fetch if login status changes

  const getImageUrl = (type = 'posterUrl') => {
    if (!movie || !movie.image || !movie.image[type]) {
      return 'https://placehold.co/1200x675?text=No+Banner';
    }
    return `${import.meta.env.VITE_SERVER_URL}${movie.image[type]}`;
  };

  const getGenres = (movie) => {
    if (!movie?.genres || !Array.isArray(movie.genres)) return [];
    return movie.genres.map(genre => genre.title);
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      const videoId = urlObj.searchParams.get('v');
      return `https://www.youtube.com/embed/${videoId}`;
    } catch (e) {
      console.error("Invalid trailer URL", e);
      return null;
    }
  };

  const handleToggleFavorite = async () => {
    if (!movie || !currentUser) {
      toast.info('Vui lòng đăng nhập để thêm vào yêu thích.');
      return;
    }
    try {
      setFavAnimating(true);
      if (isFavorite) {
        await favoriteService.remove(movie.id);
        setIsFavorite(false);
        toast.success('Đã bỏ yêu thích');
      } else {
        await favoriteService.add(movie.id);
        setIsFavorite(true);
        toast.success('Đã thêm vào yêu thích');
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setTimeout(() => setFavAnimating(false), 300);
    }
  };

  const getWatchLink = () => {
    if (!movie) return '#';
    const initialEpisodeNumber = movie.type === 'series' && movie.episodes?.length > 0 ? movie.episodes[0].episodeNumber : 1;
    return `/watch/${movie.slug}/episode/${initialEpisodeNumber}`;
  };

  if (loading) {
    return <LoadingSpinner fullscreen label="Đang tải chi tiết phim..." />;
  }

  if (error) {
    return (
      <div className="container page-container">
        <ErrorMessage
          variant="card"
          title="Không thể tải chi tiết phim"
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="container page-container">
        <ErrorMessage
          variant="card"
          title="Không tìm thấy phim"
          message="Dữ liệu cho phim này không có sẵn."
        />
      </div>
    );
  }

  const defaultTitle = movie.titles?.find(t => t.type === 'default')?.title || 'Untitled';
  const trailerUrl = getYouTubeEmbedUrl(movie.trailerUrl);

  return (
    <div className="movie-detail-page">
      <div className="movie-detail-page__hero">
        <div
          className="movie-detail-page__hero-background"
          style={{ backgroundImage: `url(${getImageUrl('coverUrl')})` }}
        ></div>
        <div className="movie-detail-page__hero-cover">
          <div
            className="movie-detail-page__hero-image"
            style={{ backgroundImage: `url(${getImageUrl('coverUrl')})` }}
          ></div>
        </div>
      </div>

      <div className="container movie-detail-page__content">
        <div className="movie-detail-page__main-info">
          <div className="movie-detail-page__main-left">
              <div className="movie-detail-page__poster">
                <img src={getImageUrl('posterUrl')} alt={defaultTitle} />
              </div>
          </div>
          <div className="movie-detail-page__main-right">
            <div className="movie-detail-page__details">
              <h2 className="movie-detail-page__title texture-text line-count-2">{defaultTitle}</h2>

              <div className="movie-detail-page__meta">
                <span>{movie.year}</span>
                <span>{movie.duration}</span>
                <span className="movie-detail-page__quality">{movie.quality}</span>
                {movie.country && <span>{movie.country.title}</span>}
                {movie.category && <span>{movie.category.title}</span>}
              </div>
              {getGenres(movie).length > 0 && (
                <div className="movie-detail-page__genres">
                  {getGenres(movie).map(genre => (
                    <span className="genres-item" key={genre}>{genre}</span>
                  ))}
                </div>
              )}
              <p className="movie-detail-page__description">{movie.description}</p>
              <div className="movie-detail-page__actions">
                <div className="movie-detail-page__actions-left">
                  <Link
                    to={getWatchLink()}
                    className="movie-detail-page__cta"
                  >
                    <i className="fas fa-play"></i>
                    <span>Xem ngay</span>
                  </Link>

                  <ul className="movie-detail-page__quick" role="list">
                    <li>
                      <button
                        className={`movie-detail-page__quick-item ${isFavorite ? 'is-active' : ''} ${favAnimating ? 'is-animating' : ''}`}
                        onClick={handleToggleFavorite}
                        aria-pressed={isFavorite}
                        aria-label={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                      >
                        <i className="fas fa-heart" aria-hidden="true"></i>
                        <span>Yêu thích</span>
                      </button>
                    </li>
                    <li>
                      <button
                        className="movie-detail-page__quick-item"
                        onClick={async () => {
                          const shareUrl = window.location.href;
                          if (navigator.share) {
                            try { await navigator.share({ title: document.title, url: shareUrl }); } catch (_) {}
                          } else {
                            try { await navigator.clipboard.writeText(shareUrl); toast.success('Đã sao chép liên kết'); } catch (_) {}
                          }
                        }}
                        aria-label="Chia sẻ"
                      >
                        <i className="fas fa-paper-plane" aria-hidden="true"></i>
                        <span>Chia sẻ</span>
                      </button>
                    </li>
                    <li>
                      <a className="movie-detail-page__quick-item" href="#comments" aria-label="Bình luận">
                        <i className="fas fa-comment" aria-hidden="true"></i>
                        <span>Bình luận</span>
                      </a>
                    </li>
                  </ul>
                </div>

                <div className="movie-detail-page__rating">
                  <div className="movie-detail-page__rating-pill">
                    <FaStar />
                    <span className="movie-detail-page__rating-score">{movie.imdb}</span>
                    <a className="movie-detail-page__rating-link">IMDB</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {trailerUrl && (
          <section className="movie-detail-page__trailer">
            <h2 className="section-title">Trailer</h2>
            <div className="video-responsive">
              <iframe
                src={trailerUrl}
                title={`${defaultTitle} Trailer`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </section>
        )}

        {movie.episodes && movie.episodes.length > 0 && (
          <section className="movie-detail-page__episodes">
            <h2 className="section-title">Danh sách tập</h2>
            <div className="episode-grid">
              {movie.episodes.map(episode => (
                <Link key={episode.uuid} to={`/watch/${movie.slug}/episode/${episode.episodeNumber}`} className="episode-card">
                  Tập {episode.episodeNumber}
                </Link>
              ))}
            </div>
          </section>
        )}

        {similarMovies.length > 0 && (
          <section className="movie-detail-page__similar-movies card-section">
            <div className="section-title"><h3 className="section-title__text">Phim cùng thể loại</h3></div>
            <div className="section-list section-list--multi section-list--column">
              {similarMovies.map((movie) => (
                <MovieCard key={movie.uuid} movie={movie} />
              ))}
            </div>
          </section>
        )}

        {seriesMovies.length > 0 && (
          <section className="movie-detail-page__series-movies card-section">
            <div className="section-title"><h3 className="section-title__text">Phim cùng Series</h3></div>
            <div className="section-list section-list--multi section-list--column">
              {seriesMovies.map((movie) => (
                <MovieCard key={movie.uuid} movie={movie} />
              ))}
            </div>
          </section>
        )}

        {movie && movieId && (
          <section id="comments" className="container">
            <CommentSection
              contentType="movie"
              contentId={movie.id}
              movieId={movieId}
              currentUser={currentUser}
              showEpisodeFilter={false}
              moderationMode={true}
            />
          </section>
        )}
      </div>
    </div>
  );
};

export default MovieDetailPage;
