import React from 'react';
import PropTypes from 'prop-types';
import classNames from '@/utils/classNames';

const MovieCardSkeleton = ({ isMini = false, isHorizontal = false }) => {
  return (
    <div className={classNames('movie-card-skeleton', {
      'movie-card-skeleton--mini': isMini,
      'movie-card-skeleton--horizontal': isHorizontal
    })}>
      <div className="movie-card-skeleton__cover-wrap">
        <div className="movie-card-skeleton__image skeleton-shimmer"></div>
      </div>
      <div className="movie-card-skeleton__info">
        <div className="movie-card-skeleton__title skeleton-shimmer"></div>
        <div className="movie-card-skeleton__meta">
          <div className="movie-card-skeleton__year skeleton-shimmer"></div>
          <div className="movie-card-skeleton__quality skeleton-shimmer"></div>
        </div>
      </div>
    </div>
  );
};

MovieCardSkeleton.propTypes = {
  isMini: PropTypes.bool,
  isHorizontal: PropTypes.bool,
};

export default MovieCardSkeleton;