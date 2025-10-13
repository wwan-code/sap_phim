import React from 'react';
import { Link } from 'react-router-dom';

const RecommendedList = ({ recommendedMovies }) => {
  if (!recommendedMovies || recommendedMovies.length === 0) return null;

  return (
    <div className="recommended-list-container">
      <h3 className="sidebar__title">Phim đề xuất</h3>
      <ul className="sidebar__episode-list">
        {recommendedMovies.map((movie) => (
          <li key={movie.uuid} className="episode-item">
            <Link to={`/movie/${movie.slug}`}>
              {movie.titles?.find((t) => t.type === 'default')?.title || 'Untitled'}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecommendedList;