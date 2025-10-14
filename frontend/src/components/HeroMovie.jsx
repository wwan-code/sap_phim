import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { FaPlay, FaStar, FaClock, FaInfoCircle, FaHeart } from 'react-icons/fa';
import { toast } from 'react-toastify';
import movieService from '@/services/movieService';
import favoriteService from '@/services/favoriteService';
import { Link } from 'react-router-dom';
import HeroMovieSkeleton from './skeletons/HeroMovieSkeleton';
import classNames from '@/utils/classNames';

import 'swiper/css';
import 'swiper/css/navigation';
import CustomOverlayTrigger from './CustomTooltip/CustomOverlayTrigger';

const HeroMovie = () => {
  const { user: currentUser } = useSelector((state) => state.auth);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [currentMovie, setCurrentMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [swiperRef, setSwiperRef] = useState(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!currentMovie || !currentUser || !currentMovie.id) {
        setLoadingFavorite(false);
        return;
      }
      setLoadingFavorite(true);
      try {
        const response = await favoriteService.check(currentMovie.id);
        if (response.success) {
          setIsFavorite(response.data.isFavorite);
        }
      } catch (error) {
        console.error('Error checking favorite status:', error);
      } finally {
        setLoadingFavorite(false);
      }
    };
    fetchStatus();
  }, [currentMovie, currentUser]);

  useEffect(() => {
    const fetchTrendingMovies = async () => {
      try {
        setLoading(true);
        const response = await movieService.getTrendingMovies({ limit: 10 });
        if (response.success && Array.isArray(response.data)) {
          setTrendingMovies(response.data);
          if (response.data.length > 0) {
            setCurrentMovie(response.data[0]);
            setActiveSlideIndex(0);
          }
        }
      } catch (error) {
        console.error('Error fetching trending movies:', error);
        setError(error.message || 'Failed to fetch trending movies');
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingMovies();
  }, []);

  const handleMovieSelect = (movie, index) => {
    setCurrentMovie(movie);
    setActiveSlideIndex(index);
    if (swiperRef) {
      swiperRef.slideTo(index);
    }
  };

  const handleSlideChange = (swiper) => {
    const activeIndex = swiper.activeIndex;
    setActiveSlideIndex(activeIndex);
    if (trendingMovies[activeIndex]) {
      setCurrentMovie(trendingMovies[activeIndex]);
    }
  };

  const handleSlideClick = (movie, index) => {
    setCurrentMovie(movie);
    setActiveSlideIndex(index);
    if (swiperRef) {
      swiperRef.slideTo(index);
    }
  };

  const getMovieTitle = (movie) => {
    if (!movie?.titles) return 'Unknown Title';
    const defaultTitle = movie.titles.find(t => t.type === 'default');
    return defaultTitle?.title || movie.titles[0]?.title || 'Unknown Title';
  };

  const getCoverUrl = (movie) => {
    if (!movie?.image?.coverUrl) {
      return 'https://placehold.co/1920x1080?text=No+Cover';
    }
    return `${import.meta.env.VITE_SERVER_URL}${movie.image.coverUrl}`;
  };

  const getPosterUrl = (movie) => {
    if (!movie?.image?.posterUrl) {
      return 'https://placehold.co/300x450?text=No+Poster';
    }
    return `${import.meta.env.VITE_SERVER_URL}${movie.image.posterUrl}`;
  };

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    return duration;
  };

  const getIMDbRating = (movie) => {
    if (!movie?.imdb) return 'N/A';
    return movie.imdb;
  };

  const getClassification = (movie) => {
    return movie?.classification || 'N/A';
  };

  const getDescription = (movie) => {
    if (!movie?.description) return 'No description available.';
    return movie.description.length > 200
      ? movie.description.substring(0, 200) + '...'
      : movie.description;
  };

  const getGenres = (movie) => {
    if (!movie?.genres || !Array.isArray(movie.genres)) return [];
    return movie.genres.map(genre => genre.title);
  };

  const handleFavoriteClick = async () => {
    if (!currentUser) {
      toast.error("Vui lòng đăng nhập để thực hiện thao tác này.");
      return;
    }
    if (!currentMovie || !currentMovie.id) return;

    const originalIsFavorite = isFavorite;
    setIsFavorite(!originalIsFavorite);

    try {
      let response;
      if (originalIsFavorite) {
        response = await favoriteService.remove(currentMovie.id);
      } else {
        response = await favoriteService.add(currentMovie.id);
      }
      toast.success(response.message);
    } catch (error) {
      setIsFavorite(originalIsFavorite);
      toast.error(error.response?.data?.message || "Đã xảy ra lỗi khi thay đổi trạng thái yêu thích.");
    }
  };

  const handlePlayNow = () => {
    if (currentMovie) {
      window.location.href = `/watch/${currentMovie.uuid}/episode/1`;
    }
  };

  const handlePrevSlide = () => {
    if (swiperRef) {
      swiperRef.slidePrev();
    }
  };

  const handleNextSlide = () => {
    if (swiperRef) {
      swiperRef.slideNext();
    }
  };

  if (loading) {
    return <HeroMovieSkeleton />;
  }

  if (error) {
    return (
      <div className="hero-movie hero-movie--error">
        <div className="container">
          <div className="hero-movie__error">
            <h2>Error loading movies</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentMovie && !loading) {
    return (
      <div className="hero-movie hero-movie--error">
        <div className="container">
          <div className="hero-movie__error">
            <h2>No trending movies available</h2>
            <p>Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-movie">
      <div className="hero-movie__background">
        <div
          className="hero-movie__background-image"
          style={{ backgroundImage: `url(${getCoverUrl(currentMovie)})` }}
        ></div>
        <div className="hero-movie__cover-fade">
          <div
            className="hero-movie__cover-image"
            style={{ backgroundImage: `url(${getCoverUrl(currentMovie)})` }}
          ></div>
        </div>
      </div>

      <div className="hero-movie__content">
        <div className="hero-movie__left">
          <div className="hero-movie__info" key={currentMovie.uuid}>
            <h2 className="hero-movie__title texture-text">
              {getMovieTitle(currentMovie)}
            </h2>

            <div className="hero-movie__meta">
              <div className="hero-movie__classification">
                {getClassification(currentMovie)}
              </div>

              <div className="hero-movie__imdb">
                <span className="hero-movie__imdb-text">
                  {getIMDbRating(currentMovie)}
                </span>
              </div>

              <div className="hero-movie__duration">
                <FaClock className="hero-movie__duration-icon" />
                <span className="hero-movie__duration-text">
                  {formatDuration(currentMovie.duration)}
                </span>
              </div>
            </div>

            <p className="hero-movie__description line-count-3">
              {getDescription(currentMovie)}
            </p>

            <div className="hero-movie__details">
              {getGenres(currentMovie).length > 0 && (
                <div className="hero-movie__genres">
                  <span className="hero-movie__genres-label">Thể loại:</span>
                  <span className="hero-movie__genres-list">
                    {getGenres(currentMovie).join(', ')}
                  </span>
                </div>
              )}
            </div>
            <div className="hero-movie__touch">
              <button
                className="hero-movie__play-btn"
                onClick={handlePlayNow}
              >
                <FaPlay className="hero-movie__play-icon" />
              </button>
              <div className="hero-movie__touch-group">
                <CustomOverlayTrigger
                  placement="top"
                  tooltipId="tooltip-favorite"
                  tooltip={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                >
                  <button
                    className={classNames('touch-btn', { 'active': isFavorite, 'disabled': !currentUser })}
                    onClick={handleFavoriteClick}
                    disabled={!currentUser || loadingFavorite}
                  >
                    {loadingFavorite ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <FaHeart />
                    )}
                  </button>
                </CustomOverlayTrigger>
                <CustomOverlayTrigger
                  placement="top"
                  tooltipId="tooltip-info"
                  tooltip={<>Chi tiết</>}
                >
                  <Link className="touch-btn" to={`/movie/${currentMovie.slug}`}>
                    <FaInfoCircle />
                  </Link>
                </CustomOverlayTrigger>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-movie__right">
          <div className="hero-movie__carousel">
            <Swiper
              onSwiper={setSwiperRef}
              onSlideChange={handleSlideChange}
              modules={[Navigation]}
              spaceBetween={16}
              slidesPerView={5}
              breakpoints={{
                576: {
                  slidesPerView: 6,
                  spaceBetween: 10,
                },
                768: {
                  slidesPerView: 7,
                  spaceBetween: 10,
                },
                992: {
                  slidesPerView: 4.2,
                },
                1200: {
                  slidesPerView: 3.2,
                }
              }}
              centeredSlides={false}
              initialSlide={activeSlideIndex}
              watchSlidesProgress={true}
              className="hero-movie__swiper"
            >
              {trendingMovies.map((movie, index) => (
                <SwiperSlide
                  key={movie.uuid}
                  className={`hero-movie__slide ${activeSlideIndex === index ? 'hero-movie__slide--active' : ''
                    }`}
                >
                  <div
                    className={`hero-movie__card ${activeSlideIndex === index ? 'hero-movie__card--active' : ''
                      }`}
                    onClick={() => handleSlideClick(movie, index)}
                  >
                    <div className="hero-movie__card-poster">
                      <img
                        src={getPosterUrl(movie)}
                        alt={getMovieTitle(movie)}
                        className="hero-movie__card-image"
                      />
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroMovie;
