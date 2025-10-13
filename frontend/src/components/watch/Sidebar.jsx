import React from 'react';
import EpisodeList from './EpisodeList';
import RecommendedList from './RecommendedList';

const Sidebar = ({
  episodes,
  currentEpisode,
  recommendedMovies,
  onEpisodeChange,
  autoNext,
  onAutoNextChange,
}) => {
  return (
    <aside className="movie-watch-page__sidebar">
      <div className="sidebar__feature-controls">
        <div className="auto-next-toggle">
          <label htmlFor="auto-next">Tự động chuyển tập</label>
          <input
            type="checkbox"
            id="auto-next"
            checked={autoNext}
            onChange={(e) => onAutoNextChange(e.target.checked)}
          />
        </div>
      </div>
      <EpisodeList
        episodes={episodes}
        currentEpisode={currentEpisode}
        onEpisodeChange={onEpisodeChange}
      />
      <RecommendedList recommendedMovies={recommendedMovies} />
    </aside>
  );
};

export default Sidebar;