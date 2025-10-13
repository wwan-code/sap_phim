import React from 'react';
import '../../assets/scss/components/_movie-theater-card-skeleton.scss'; // Assuming a skeleton SCSS file

const MovieTheaterCardSkeleton = () => {
  return (
    <article className="movie-theater-card-skeleton" aria-hidden="true">
      <div className="movie-theater-card-skeleton__banner-wrapper shimmer">
        <div className="movie-theater-card-skeleton__tags">
          <span className="movie-theater-card-skeleton__tag shimmer"></span>
          <span className="movie-theater-card-skeleton__tag shimmer"></span>
        </div>
      </div>

      <div className="movie-theater-card-skeleton__info">
        <div className="movie-theater-card-skeleton__poster shimmer"></div>
        <div className="movie-theater-card-skeleton__details">
          <div className="movie-theater-card-skeleton__title shimmer"></div>
          <div className="movie-theater-card-skeleton__original-title shimmer"></div>
          <div className="movie-theater-card-skeleton__metadata">
            <span className="movie-theater-card-skeleton__metadata-item shimmer"></span>
            <span className="movie-theater-card-skeleton__metadata-item shimmer"></span>
            <span className="movie-theater-card-skeleton__metadata-item shimmer"></span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default MovieTheaterCardSkeleton;
