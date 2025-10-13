import React, { useMemo } from 'react';
import { getAvatarUrl, getImageUrl } from '@/utils/getAvatarUrl';
import { decodeTextStoryContent } from '@/utils/storyContent';

const StoryAvatar = ({ user, stories = [], allViewed, onClick }) => {
  const coverStory = stories[0];
  const avatarUrl = getAvatarUrl(user);
  const classNames = ['story-card'];
  if (allViewed) classNames.push('story-card--viewed');

  const isMediaStory =
    coverStory && (coverStory.type === 'image' || coverStory.type === 'video');

  const mediaSource =
    getImageUrl(coverStory?.thumbnailUrl) ||
    getImageUrl(coverStory?.mediaUrl) ||
    avatarUrl;

  const cardStyle = isMediaStory
    ? {
        backgroundImage: `url(${mediaSource})`,
      }
    : {
        background: coverStory?.backgroundColor || 'var(--w-surface-elevated)',
      };

  const textPreview = useMemo(() => {
    if (coverStory?.type !== 'text') return null;
    const parsed = decodeTextStoryContent(coverStory.content);
    const previewText = (parsed.text || '').trim();
    if (!previewText) return null;
    return previewText.length > 80
      ? `${previewText.slice(0, 77)}...`
      : previewText;
  }, [coverStory]);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <button
      type="button"
      className={classNames.join(' ')}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`Open story from ${user.username}`}
    >
      <div className="story-card__media" style={cardStyle}>
        <div className="story-card__overlay" />
        <div className="story-card__profile">
          <img
            src={avatarUrl}
            alt={user.username}
            className="story-card__avatar"
          />
          {!allViewed && <span className="story-card__badge" />}
        </div>

        {textPreview && (
          <p className="story-card__caption">{textPreview}</p>
        )}

        <span className="story-card__name" title={user.username}>
          {user.username}
        </span>
      </div>
    </button>
  );
};

export default StoryAvatar;
