import React from 'react';
import ReelFeed from '@/components/reels/ReelFeed';
import ReelUploader from '@/components/reels/ReelUploader';
import ReelSidebar from '@/components/reels/ReelSidebar';
import '@/assets/scss/pages/_reels-page.scss';

const ReelsPage = () => {
  return (
    <div className="reels-page">
      <div className="reels-page__content">
        <ReelFeed />
      </div>
      <aside className="reels-page__sidebar">
        <ReelUploader />
        <ReelSidebar />
      </aside>
    </div>
  );
};

export default ReelsPage;

