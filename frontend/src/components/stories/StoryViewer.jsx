import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useStoryViewerStore } from '@/stores/useStoryViewerStore';
import { getAvatarUrl, getImageUrl } from '@/utils/getAvatarUrl';
import { formatDistanceToNow } from '@/utils/dateUtils';
import { 
  useDeleteStory, 
  useMarkStoryAsViewed, 
  useAddStoryReaction, 
  useRemoveStoryReaction, 
  useGetStoryReactions 
} from '@/hooks/useStoryQueries';
import { useSelector } from 'react-redux';
import { 
  FaAngleLeft, 
  FaAngleRight, 
  FaTimes, 
  FaPause, 
  FaPlay, 
  FaVolumeUp, 
  FaVolumeMute, 
  FaMusic,
  FaLink,
  FaTag,
  FaSmile, 
  FaEye, 
  FaEllipsisH 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import EmojiPicker from 'emoji-picker-react';
import StoryViewersModal from './StoryViewersModal';
import EditStoryPrivacyModal from './EditStoryPrivacyModal';
import { useDropdown } from '@/hooks/useDropdown';
import { decodeStoryCaption, decodeTextStoryContent } from '@/utils/storyContent';

/**
 * StoryViewer - Full-screen story viewer với UI hiện đại
 * Features:
 * - Progress bars với smooth animation
 * - Pause/Play controls
 * - Reaction system với floating bubbles
 * - Swipe navigation
 * - Keyboard navigation
 * - View count for own stories
 * - Privacy settings
 */
const StoryViewer = () => {
  const {
    isOpen,
    storiesData,
    currentUserIndex,
    currentStoryIndex,
    closeViewer,
    nextStory,
    prevStory,
    init,
  } = useStoryViewerStore();

  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const currentUser = useSelector((state) => state.auth.user);
  
  const { mutate: deleteStory } = useDeleteStory();
  const { mutate: markAsViewed } = useMarkStoryAsViewed();
  const { mutate: addReaction } = useAddStoryReaction();
  const { mutate: removeReaction } = useRemoveStoryReaction();

  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionBubbles, setReactionBubbles] = useState([]);
  const [currentStoryReactions, setCurrentStoryReactions] = useState([]);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [showEditPrivacyModal, setShowEditPrivacyModal] = useState(false);
  
  const { isOpen: isDropdownOpen, toggle: toggleDropdown, getTriggerProps, getDropdownProps } = useDropdown();

  const preloadedMedia = useRef(new Set());
  const processedReactionIds = useRef(new Set());
  const elapsedTimeAtPauseRef = useRef(0);
  const startTimeRef = useRef(0);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);
  const progressRef = useRef(null);
  const videoRef = useRef(null);
  const viewerContentRef = useRef(null);

  const currentUserStories = storiesData[currentUserIndex];
  const currentStory = currentUserStories?.stories[currentStoryIndex];
  const isOwnStory = currentUser?.id === currentUserStories?.user.id;
  const textStoryContent = useMemo(() => {
    if (!currentStory || currentStory.type !== 'text') return null;
    return decodeTextStoryContent(currentStory.content);
  }, [currentStory]);

  const textStoryLines = useMemo(() => {
    if (!textStoryContent) return [];
    return (textStoryContent.text || '').split(/\r?\n/);
  }, [textStoryContent]);

  const {
    text: captionText,
    overlays: rawCaptionOverlays,
    stickers: rawCaptionStickers,
    musicTrack: captionMusicTrack,
    cta: captionCTA,
    taggedFriends: captionTaggedFriends,
    templateId: captionTemplateId,
    filter: captionFilter,
  } = useMemo(() => decodeStoryCaption(currentStory?.caption), [currentStory]);

  const overlayItems = useMemo(
    () =>
      (rawCaptionOverlays || [])
        .filter(
          (overlay) =>
            overlay &&
            typeof overlay.text === 'string' &&
            overlay.text.trim().length > 0
        )
        .map((overlay, index) => ({
          id: overlay.id || `overlay-${index}`,
          text: overlay.text || '',
          color: overlay.color || '#ffffff',
          highlight: overlay.highlight || 'transparent',
          fontFamily: overlay.fontFamily || 'Inter',
          fontSize: overlay.fontSize || 32,
          align: overlay.align || 'center',
          x: overlay.x ?? 50,
          y: overlay.y ?? 50,
          weight: overlay.weight || 600,
        })),
    [rawCaptionOverlays]
  );

  const stickerItems = useMemo(
    () =>
      (rawCaptionStickers || []).map((sticker, index) => ({
        id: sticker.id || `sticker-${index}`,
        content: sticker.content || '',
        type: sticker.type || 'text',
        size: sticker.size ?? 1,
        x: sticker.x ?? 50,
        y: sticker.y ?? 50,
        rotation: sticker.rotation ?? 0,
      })),
    [rawCaptionStickers]
  );

  const activeMusicTrack = useMemo(() => {
    if (textStoryContent?.musicTrack) return textStoryContent.musicTrack;
    if (captionMusicTrack) return captionMusicTrack;
    return null;
  }, [textStoryContent, captionMusicTrack]);

  const activeCTA = useMemo(() => {
    const textCTA = textStoryContent?.cta;
    if (textCTA && (textCTA.label || textCTA.url)) return textCTA;
    if (captionCTA && (captionCTA.label || captionCTA.url)) return captionCTA;
    return { label: '', url: '' };
  }, [textStoryContent, captionCTA]);

  const activeTaggedFriends = useMemo(() => {
    if (textStoryContent?.taggedFriends?.length) {
      return textStoryContent.taggedFriends;
    }
    if (captionTaggedFriends?.length) {
      return captionTaggedFriends;
    }
    return [];
  }, [textStoryContent, captionTaggedFriends]);

  const renderOverlayLayer = () => {
    if (!overlayItems.length && !stickerItems.length) return null;
    return (
      <div className="story-viewer__overlay-layer">
        {overlayItems.map((overlay) => {
          const lines = overlay.text.split(/\r?\n/);
          return (
            <div
              key={overlay.id}
              className="story-viewer__overlay-item"
              style={{
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                textAlign: overlay.align,
              }}
            >
              <span
                className="story-viewer__overlay-text"
                style={{
                  color: overlay.color,
                  fontFamily: overlay.fontFamily,
                  fontWeight: overlay.weight,
                  fontSize: `${overlay.fontSize}px`,
                  background:
                    overlay.highlight === 'transparent'
                      ? 'transparent'
                      : overlay.highlight,
                }}
              >
                {lines.map((line, index) => (
                  <React.Fragment key={`${overlay.id}-${index}`}>
                    {line || '\u00A0'}
                    {index < lines.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </span>
            </div>
          );
        })}
        {stickerItems.map((sticker) => (
          <div
            key={sticker.id}
            className="story-viewer__overlay-item story-viewer__overlay-item--sticker"
            style={{
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              transform: `translate(-50%, -50%) scale(${sticker.size}) rotate(${sticker.rotation}deg)`,
            }}
          >
            <span className="story-viewer__overlay-text story-viewer__overlay-text--sticker">
              {sticker.content}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const { data: fetchedReactions, refetch: refetchReactions } = useGetStoryReactions(currentStory?.id);

  // Initialize store with markAsViewed mutation
  useEffect(() => {
    init(markAsViewed);
  }, [init, markAsViewed]);

  // Manage reactions and bubbles
  useEffect(() => {
    setCurrentStoryReactions([]);
    setReactionBubbles([]);
    processedReactionIds.current.clear();
    elapsedTimeAtPauseRef.current = 0;
    setIsPaused(false);

    if (fetchedReactions && currentStory && fetchedReactions.length > 0 && fetchedReactions[0].storyId === currentStory.id) {
      setCurrentStoryReactions(fetchedReactions);
    } else if (fetchedReactions && currentStory && fetchedReactions.length === 0) {
      setCurrentStoryReactions([]);
    }
  }, [fetchedReactions, currentStory, isOpen]);

  // Handle reaction bubbles for story owner
  useEffect(() => {
    if (!currentStory || !isOwnStory || !fetchedReactions) return;

    const newReactionsForBubbles = fetchedReactions.filter(
      (fr) => !processedReactionIds.current.has(fr.id) && fr.userId !== currentUser.id
    );

    newReactionsForBubbles.forEach((reaction) => {
      setReactionBubbles((prev) => [
        ...prev,
        { id: reaction.id, emoji: reaction.emoji, user: reaction.reactor },
      ]);
      processedReactionIds.current.add(reaction.id);
    });
  }, [fetchedReactions, currentStory, isOwnStory, currentUser]);

  // Pause/resume based on modal/dropdown visibility
  useEffect(() => {
    const anyModalOpen = showViewersModal || showEditPrivacyModal || showEmojiPicker;
    setIsOverlayOpen(anyModalOpen || isDropdownOpen('story-options-dropdown'));
  }, [showViewersModal, showEditPrivacyModal, showEmojiPicker, isDropdownOpen]);

  useEffect(() => {
    if (isOverlayOpen) {
      togglePause(true);
    } else if (isOpen && currentStory) {
      togglePause(false);
    }
  }, [isOverlayOpen, isOpen, currentStory]);

  /**
   * Preload adjacent media for smooth transitions
   */
  const preloadAdjacentMedia = useCallback(() => {
    if (!storiesData || currentUserIndex === null) return;

    const storiesToConsider = [];
    const currentGroup = storiesData[currentUserIndex]?.stories || [];

    if (currentStory) {
      storiesToConsider.push(currentStory);
    }

    if (currentStoryIndex < currentGroup.length - 1) {
      storiesToConsider.push(currentGroup[currentStoryIndex + 1]);
    } else if (currentUserIndex < storiesData.length - 1) {
      storiesToConsider.push(storiesData[currentUserIndex + 1].stories[0]);
    }

    if (currentStoryIndex > 0) {
      storiesToConsider.push(currentGroup[currentStoryIndex - 1]);
    } else if (currentUserIndex > 0) {
      const prevGroupStories = storiesData[currentUserIndex - 1]?.stories || [];
      storiesToConsider.push(prevGroupStories[prevGroupStories.length - 1]);
    }

    storiesToConsider.forEach(story => {
      if (story && story.type !== 'text' && story.mediaUrl && !preloadedMedia.current.has(story.mediaUrl)) {
        const mediaUrl = getImageUrl(story.mediaUrl);
        if (story.type === 'image') {
          const img = new Image();
          img.src = mediaUrl;
          img.onload = () => preloadedMedia.current.add(story.mediaUrl);
        } else if (story.type === 'video') {
          const video = document.createElement('video');
          video.src = mediaUrl;
          video.preload = 'auto';
          video.onloadeddata = () => preloadedMedia.current.add(story.mediaUrl);
        }
      }
    });
  }, [storiesData, currentUserIndex, currentStoryIndex, currentStory]);

  /**
   * Start progress timer with smooth animation
   */
  const startTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    cancelAnimationFrame(animationFrameRef.current);

    const totalDuration = (currentStory?.duration || 5) * 1000;
    const initialElapsed = elapsedTimeAtPauseRef.current;

    if (initialElapsed >= totalDuration) {
      nextStory();
      return;
    }

    startTimeRef.current = performance.now() - initialElapsed;

    const animateProgressBar = (timestamp) => {
      const currentElapsed = timestamp - startTimeRef.current;
      const progress = Math.min(currentElapsed / totalDuration, 1);
      
      if (progressRef.current) {
        progressRef.current.style.width = `${progress * 100}%`;
      }

      if (currentElapsed < totalDuration) {
        animationFrameRef.current = requestAnimationFrame(animateProgressBar);
      } else {
        nextStory();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateProgressBar);
  }, [currentStory, nextStory]);

  useEffect(() => {
    if (isOpen && currentStory && !isPaused && !isOverlayOpen) {
      startTimer();
      preloadAdjacentMedia();
    }
    return () => {
      clearTimeout(timerRef.current);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isOpen, currentStory, isPaused, isOverlayOpen, startTimer, preloadAdjacentMedia]);

  const handleNavigation = useCallback((direction) => {
    if (direction === 'next') {
      nextStory();
    } else {
      prevStory();
    }
    setShowEmojiPicker(false);
    setReactionBubbles([]);
    refetchReactions();
  }, [nextStory, prevStory, refetchReactions]);

  // Touch gesture handlers for mobile
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    togglePause(true);
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    togglePause(false);
    const swipeDistance = touchEndX.current - touchStartX.current;
    const minSwipeDistance = 50;

    if (swipeDistance > minSwipeDistance) {
      handleNavigation('prev');
    } else if (swipeDistance < -minSwipeDistance) {
      handleNavigation('next');
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Click navigation (left/right thirds)
  const handleClick = useCallback((e) => {
    if (showEmojiPicker) {
      setShowEmojiPicker(false);
      return;
    }
    const viewerWidth = viewerContentRef.current.offsetWidth;
    const clickX = e.clientX - viewerContentRef.current.getBoundingClientRect().left;

    if (clickX < viewerWidth / 3) {
      handleNavigation('prev');
    } else if (clickX > (viewerWidth * 2) / 3) {
      handleNavigation('next');
    }
  }, [handleNavigation, showEmojiPicker]);

  const handleEmojiClick = (emojiObject) => {
    const emoji = emojiObject.emoji;
    addReaction({ storyId: currentStory.id, emoji }, {
      onSuccess: (data) => {
        toast.success(`Đã gửi phản ứng: ${emoji}`);
        setShowEmojiPicker(false);
        setCurrentStoryReactions(prev => [
          ...prev,
          { id: data.data.id, userId: currentUser.id, emoji, reactor: currentUser }
        ]);
      },
      onError: (err) => {
        if (err.response?.status === 409) {
          toast.info(`Bạn đã phản ứng bằng ${emoji} rồi.`);
        } else {
          toast.error('Gửi phản ứng thất bại.');
        }
      }
    });
  };

  const handleRemoveReaction = (emoji) => {
    removeReaction({ storyId: currentStory.id, emoji }, {
      onSuccess: () => {
        toast.info(`Đã xóa phản ứng: ${emoji}`);
        setCurrentStoryReactions(prev => prev.filter(r => !(r.userId === currentUser.id && r.emoji === emoji)));
      },
      onError: () => {
        toast.error('Xóa phản ứng thất bại.');
      }
    });
  };

  const togglePause = (pauseState) => {
    setIsPaused(pauseState);
    if (pauseState) {
      clearTimeout(timerRef.current);
      cancelAnimationFrame(animationFrameRef.current);
      
      if (progressRef.current) {
        const totalDuration = (currentStory?.duration || 5) * 1000;
        const currentWidth = parseFloat(progressRef.current.style.width);
        elapsedTimeAtPauseRef.current = (currentWidth / 100) * totalDuration;
      }
      videoRef.current?.pause();
    } else {
      startTimer();
      if (isOpen && currentStory?.type === 'video') {
        videoRef.current?.play();
      }
    }
  };

  useEffect(() => {
    if (currentStory?.type === 'video' && videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(error => {
          console.warn('Video autoplay prevented:', error);
        });
      }
    }
  }, [isPaused, currentStory]);

  const handleStoryDeleted = useCallback(() => {
    toast.info('Đã xóa story.');
    if (currentUserStories.stories.length <= 1 && storiesData.length <= 1) {
      closeViewer();
    } else {
      nextStory();
    }
  }, [currentUserStories, storiesData, closeViewer, nextStory]);

  if (!isOpen || !currentStory) return null;

  const userReaction = currentStoryReactions.find(r => r.userId === currentUser.id);

  return (
    <div className="story-viewer">
      {/* Backdrop with blur */}
      <div 
        className="story-viewer__backdrop"
        onMouseDown={() => togglePause(true)}
        onMouseUp={() => togglePause(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Close button */}
      <button 
        className="story-viewer__close"
        onClick={closeViewer}
        aria-label="Đóng"
      >
        <FaTimes />
      </button>

      {/* Main content container */}
      <div 
        className="story-viewer__container" 
        ref={viewerContentRef} 
        onClick={handleClick}
      >
        {/* Progress bars */}
        <div className="story-viewer__progress">
          {currentUserStories.stories.map((story, index) => (
            <div key={story.id} className="story-viewer__progress-bar">
              <div
                ref={index === currentStoryIndex ? progressRef : null}
                className={`story-viewer__progress-fill ${
                  index === currentStoryIndex ? 'active' : ''
                } ${index < currentStoryIndex ? 'completed' : ''}`}
                style={{
                  width: index < currentStoryIndex ? '100%' : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header with user info and controls */}
        <div className="story-viewer__header">
          <div className="story-viewer__user">
            <img 
              src={getAvatarUrl(currentUserStories.user)} 
              alt={`${currentUserStories.user.username}'s avatar`}
              className="story-viewer__avatar"
            />
            <div className="story-viewer__user-info">
              <span className="story-viewer__username">
                {currentUserStories.user.username}
              </span>
              <time className="story-viewer__time">
                {formatDistanceToNow(currentStory.createdAt)}
              </time>
            </div>
          </div>

          {activeMusicTrack && (
            <div className="story-viewer__music-pill">
              <FaMusic />
              <div>
                <span>{activeMusicTrack.title}</span>
                <small>{activeMusicTrack.artist}</small>
              </div>
            </div>
          )}

          <div className="story-viewer__controls">
            <button 
              onClick={(e) => { e.stopPropagation(); togglePause(!isPaused); }}
              aria-label={isPaused ? 'Play' : 'Pause'}
              className="story-viewer__control-btn"
            >
              {isPaused ? <FaPlay /> : <FaPause />}
            </button>
            
            {currentStory.type === 'video' && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="story-viewer__control-btn"
              >
                {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
              </button>
            )}
            
            {isOwnStory && (
              <div className="story-viewer__options">
                <button
                  {...getTriggerProps('story-options-dropdown', {
                    onFocus: () => togglePause(true),
                    onBlur: () => togglePause(false),
                  })}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    toggleDropdown('story-options-dropdown'); 
                  }}
                  className="story-viewer__control-btn"
                  aria-label="Options"
                >
                  <FaEllipsisH />
                </button>
                {isDropdownOpen('story-options-dropdown') && (
                  <div 
                    {...getDropdownProps('story-options-dropdown')} 
                    className="story-viewer__dropdown"
                  >
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setShowEditPrivacyModal(true); 
                        toggleDropdown('story-options-dropdown'); 
                      }}
                    >
                      Chỉnh sửa quyền riêng tư
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Media container */}
        <div className="story-viewer__media">
          {/* Caption */}
          {captionText?.trim() && (
            <div className="story-viewer__caption">
              {captionText}
            </div>
          )}
          {activeCTA.label && (
            <a
              href={activeCTA.url || '#'}
              className="story-viewer__cta"
              onClick={(event) => event.preventDefault()}
            >
              <FaLink />
              <span>{activeCTA.label}</span>
            </a>
          )}
          {activeTaggedFriends.length > 0 && (
            <div className="story-viewer__tags">
              <FaTag />
              <span>
                Dang gan the {`${activeTaggedFriends.length} nguoi ban`}
              </span>
            </div>
          )}
          {/* View count for own stories */}
          {isOwnStory && currentStory.viewCount > 0 && (
            <button
              className="story-viewer__view-count"
              onClick={(e) => { 
                e.stopPropagation(); 
                setShowViewersModal(true); 
              }}
              aria-label={`${currentStory.viewCount} người đã xem`}
            >
              <FaEye />
              <span>{currentStory.viewCount}</span>
            </button>
          )}

          {/* Media content */}
          {currentStory.type === 'image' && (
            <div className="story-viewer__media-frame">
              <img 
                src={getImageUrl(currentStory.mediaUrl)} 
                alt="Story content" 
                className="story-viewer__image"
              />
              {renderOverlayLayer()}
            </div>
          )}
          
          {currentStory.type === 'video' && (
            <div className="story-viewer__media-frame">
              <video
                ref={videoRef}
                src={getImageUrl(currentStory.mediaUrl)}
                autoPlay
                playsInline
                muted={isMuted}
                onCanPlay={() => !isPaused && videoRef.current?.play()}
                onEnded={nextStory}
                className="story-viewer__video"
              />
              {renderOverlayLayer()}
            </div>
          )}
          
          {currentStory.type === 'text' && textStoryContent && (
            <div 
              className="story-viewer__text" 
              style={{ background: currentStory.backgroundColor }}
            >
              <p
                style={{
                  color: textStoryContent.color,
                  fontFamily: textStoryContent.fontFamily,
                  fontWeight: textStoryContent.weight,
                  fontSize: `${textStoryContent.fontSize || 42}px`,
                  textAlign: textStoryContent.align || 'center',
                  background:
                    textStoryContent.highlight === 'transparent'
                      ? 'transparent'
                      : textStoryContent.highlight,
                  borderRadius: '18px',
                  padding: '12px 18px',
                  display: 'inline-block',
                }}
              >
                {textStoryLines.map((line, index) => (
                  <React.Fragment key={`text-line-${index}`}>
                    {line || '\u00A0'}
                    {index < textStoryLines.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
            </div>
          )}

          

          {/* Reaction bubbles for story owner */}
          {isOwnStory && reactionBubbles.length > 0 && (
            <div className="story-viewer__bubbles">
              {reactionBubbles.map((reaction) => (
                <div key={reaction.id} className="story-viewer__bubble">
                  <img 
                    src={getAvatarUrl(reaction.user)} 
                    alt={reaction.user.username}
                    className="story-viewer__bubble-avatar"
                  />
                  <span className="story-viewer__bubble-emoji">{reaction.emoji}</span>
                </div>
              ))}
            </div>
          )}

          {/* Reaction input for viewers */}
          {!isOwnStory && (
            <div className="story-viewer__reaction">
              {userReaction ? (
                <button 
                  className="story-viewer__reaction-btn active"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleRemoveReaction(userReaction.emoji); 
                  }}
                  aria-label="Xóa phản ứng"
                >
                  {userReaction.emoji}
                </button>
              ) : (
                <button 
                  className="story-viewer__reaction-btn"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    const newState = !showEmojiPicker;
                    setShowEmojiPicker(newState);
                    togglePause(newState); // Directly pause/play when emoji picker state changes
                  }}
                  aria-label="Thêm phản ứng"
                >
                  <FaSmile />
                </button>
              )}
              
              {showEmojiPicker && (
                <div 
                  className="story-viewer__emoji-picker"
                  onClick={(e) => e.stopPropagation()}
                >
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      <button 
        className="story-viewer__nav story-viewer__nav--prev"
        onClick={(e) => { 
          e.stopPropagation(); 
          handleNavigation('prev'); 
        }}
        aria-label="Story trước"
      >
        <FaAngleLeft />
      </button>
      
      <button 
        className="story-viewer__nav story-viewer__nav--next"
        onClick={(e) => { 
          e.stopPropagation(); 
          handleNavigation('next'); 
        }}
        aria-label="Story tiếp theo"
      >
        <FaAngleRight />
      </button>

      {/* Modals */}
      {showViewersModal && (
        <StoryViewersModal
          isOpen={showViewersModal}
          onClose={() => setShowViewersModal(false)}
          storyId={currentStory.id}
          storyOwnerId={currentUserStories.user.id}
        />
      )}

      {showEditPrivacyModal && (
        <EditStoryPrivacyModal
          isOpen={showEditPrivacyModal}
          onClose={() => setShowEditPrivacyModal(false)}
          storyId={currentStory.id}
          currentPrivacy={currentStory.privacy}
          currentExcludedUsers={currentStory.excludedUsers}
          currentAllowedUsers={currentStory.allowedUsers}
          onStoryDeleted={handleStoryDeleted}
        />
      )}
    </div>
  );
};

export default StoryViewer;
