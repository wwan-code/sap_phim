import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import classNames from '@/utils/classNames';

const MovieCard = ({ movie, isMini = false, isHorizontal = false }) => {
  if (!movie) {
    return null;
  }

  const defaultTitle = movie.titles?.find(t => t.type === 'default')?.title || 'Untitled';
  const posterUrl = movie.image?.posterUrl ? `${import.meta.env.VITE_SERVER_URL}${movie.image.posterUrl}` : 'https://placehold.co/300x450?text=No+Image';
  const bannerUrl = movie.image?.bannerUrl ? `${import.meta.env.VITE_SERVER_URL}${movie.image.bannerUrl}` : 'https://placehold.co/300x450?text=No+Image';

  return (
    <Link to={`/movie/${movie.slug}`} className={classNames('movie-card', {'movie-card--mini': isMini, 'movie-card--horizontal': isHorizontal})}>
      <div className="movie-card__cover-wrap">
        <img src={isHorizontal ? bannerUrl : posterUrl} alt={defaultTitle} loading="lazy" />
        <div className="movie-card__overlay">
          <i className="fas fa-play"></i>
        </div>
      </div>
      <div className="movie-card__info">
        <h3 className="movie-card__title">{defaultTitle}</h3>
        <div className="movie-card__meta">
          {movie.year && <span>{movie.year}</span>}
          {movie.quality && <span className="movie-card__quality">{movie.quality}</span>}
        </div>
      </div>
    </Link>
  );
};

MovieCard.propTypes = {
  movie: PropTypes.shape({
    slug: PropTypes.string.isRequired,
    titles: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string,
        title: PropTypes.string,
      })
    ),
    image: PropTypes.shape({
      posterUrl: PropTypes.string,
    }),
    year: PropTypes.number,
    quality: PropTypes.string,
  }).isRequired,
  isMini: PropTypes.bool,
};

export default MovieCard;