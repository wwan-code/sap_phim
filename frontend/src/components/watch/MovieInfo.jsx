import React from 'react';

const MovieInfo = ({
  movie,
  currentEpisode,
  onToggleCinemaMode,
  isCinemaMode,
  onNextEpisode,
  hasNextEpisode,
}) => {
  if (!movie || !currentEpisode) return null;

  const defaultTitle = movie.titles?.find(t => t.type === 'default')?.title || 'Untitled';

  return (
    <div className="movie-info">
      <div className="movie-info__header">
        <h1 className="movie-info__title">
          {defaultTitle} - Tập {currentEpisode.episodeNumber}
        </h1>
        <div className="movie-info__controls">
          {hasNextEpisode && (
            <button onClick={onNextEpisode} className="movie-info__next-btn">
              Tập tiếp theo
            </button>
          )}
          <button onClick={onToggleCinemaMode} className="movie-info__cinema-btn">
            {isCinemaMode ? 'Thoát chế độ rạp' : 'Chế độ rạp'}
          </button>
        </div>
      </div>
      <p className="movie-info__views">Lượt xem: {movie.views.toLocaleString()}</p>
    </div>
  );
};

export default MovieInfo;