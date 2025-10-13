import React from 'react';
import '@/assets/scss/components/_skeletons.scss';

const WatchPageSkeleton = () => {
  return (
    <div className="movie-watch-page-skeleton">
      <div className="main-content-skeleton">
        <div className="skeleton skeleton-player"></div>
        <div className="info-skeleton">
          <div className="skeleton skeleton-text skeleton-title"></div>
          <div className="skeleton skeleton-text skeleton-subtitle"></div>
        </div>
      </div>
      <div className="sidebar-skeleton">
        <div className="skeleton skeleton-text skeleton-sidebar-title"></div>
        <div className="episode-list-skeleton">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="skeleton skeleton-episode-item"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WatchPageSkeleton;