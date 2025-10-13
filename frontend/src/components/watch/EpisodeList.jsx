import React from 'react';

const EpisodeList = ({ episodes, currentEpisode, onEpisodeChange }) => {
  if (!episodes || episodes.length === 0) return null;

  return (
    <div className="episode-list-container">
      <h3 className="sidebar__title">Danh sách tập</h3>
      <ul className="sidebar__episode-list">
        {episodes
          .sort((a, b) => a.episodeNumber - b.episodeNumber)
          .map((ep) => (
            <li
              key={ep.uuid}
              className={`episode-item ${
                ep.episodeNumber === currentEpisode.episodeNumber ? 'episode-item--active' : ''
              }`}
            >
              <button onClick={() => onEpisodeChange(ep.episodeNumber)}>
                Tập {ep.episodeNumber}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
};

export default EpisodeList;