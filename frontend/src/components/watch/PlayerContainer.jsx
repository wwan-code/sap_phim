import React from 'react';

const PlayerContainer = ({ episode, movieTitle }) => {
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  return (
    <div className="player-container">
      <div className="video-player">
        {episode && (
          <iframe
            src={isValidUrl(episode.linkEpisode) ? episode.linkEpisode : "https://www.example.com/placeholder"}
            title={`Xem ${movieTitle} - Tập ${episode.episodeNumber}`}
            allowFullScreen
          ></iframe>
        )}
      </div>
    </div>
  );
};

export default PlayerContainer;