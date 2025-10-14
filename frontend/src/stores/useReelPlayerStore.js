import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Zustand Store cho Reel Player
 * Quản lý trạng thái video: play/pause, volume, mute, current reel
 */
const useReelPlayerStore = create(
  devtools(
    persist(
      (set, get) => ({
        // ==================== STATE ====================
        
        // Current reel đang được xem
        currentReelId: null,
        currentReelIndex: 0,
        
        // Player controls
        isPlaying: false,
        volume: 0.8, // 0-1
        isMuted: false,
        playbackRate: 1, // 0.5x, 0.75x, 1x, 1.5x, 2x
        
        // UI state
        showControls: true,
        isFullscreen: false,
        
        // Video metadata
        duration: 0,
        currentTime: 0,
        buffered: 0,
        
        // Interaction state
        isLiked: false,
        likesCount: 0,
        commentsCount: 0,
        viewsCount: 0,
        
        // Preload state
        preloadedReels: new Set(), // Track which reels are preloaded
        
        // ==================== ACTIONS ====================
        
        /**
         * Set current reel đang xem
         */
        setCurrentReel: (reelId, reelIndex) => {
          set({ currentReelId: reelId, currentReelIndex: reelIndex });
        },
        
        /**
         * Play/Pause controls
         */
        play: () => set({ isPlaying: true }),
        pause: () => set({ isPlaying: false }),
        togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
        
        /**
         * Volume controls
         */
        setVolume: (volume) => {
          const clampedVolume = Math.max(0, Math.min(1, volume));
          set({ volume: clampedVolume, isMuted: clampedVolume === 0 });
        },
        
        increaseVolume: () => {
          const { volume } = get();
          const newVolume = Math.min(1, volume + 0.1);
          set({ volume: newVolume, isMuted: newVolume === 0 });
        },
        
        decreaseVolume: () => {
          const { volume } = get();
          const newVolume = Math.max(0, volume - 0.1);
          set({ volume: newVolume, isMuted: newVolume === 0 });
        },
        
        /**
         * Mute controls
         */
        toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
        mute: () => set({ isMuted: true }),
        unmute: () => set({ isMuted: false }),
        
        /**
         * Playback rate
         */
        setPlaybackRate: (rate) => {
          const validRates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
          if (validRates.includes(rate)) {
            set({ playbackRate: rate });
          }
        },
        
        /**
         * UI controls
         */
        toggleControls: () => set((state) => ({ showControls: !state.showControls })),
        showControlsBar: () => set({ showControls: true }),
        hideControlsBar: () => set({ showControls: false }),
        
        toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
        
        /**
         * Video progress
         */
        setDuration: (duration) => set({ duration }),
        setCurrentTime: (time) => set({ currentTime: time }),
        setBuffered: (buffered) => set({ buffered }),
        
        /**
         * Seek video
         */
        seekTo: (time) => {
          const { duration } = get();
          const clampedTime = Math.max(0, Math.min(duration, time));
          set({ currentTime: clampedTime });
          return clampedTime;
        },
        
        seekToPercentage: (percentage) => {
          const { duration } = get();
          const time = (duration * percentage) / 100;
          return get().seekTo(time);
        },
        
        /**
         * Interaction updates (from Socket.IO)
         */
        updateStats: (stats) => {
          set({
            likesCount: stats.likesCount ?? get().likesCount,
            commentsCount: stats.commentsCount ?? get().commentsCount,
            viewsCount: stats.viewsCount ?? get().viewsCount,
          });
        },
        
        setLiked: (isLiked) => set({ isLiked }),
        
        toggleLike: () => {
          const { isLiked, likesCount } = get();
          set({
            isLiked: !isLiked,
            likesCount: isLiked ? likesCount - 1 : likesCount + 1,
          });
        },
        
        incrementViews: () => {
          set((state) => ({ viewsCount: state.viewsCount + 1 }));
        },
        
        incrementComments: () => {
          set((state) => ({ commentsCount: state.commentsCount + 1 }));
        },
        
        /**
         * Preload management
         */
        markAsPreloaded: (reelId) => {
          set((state) => ({
            preloadedReels: new Set(state.preloadedReels).add(reelId),
          }));
        },
        
        isReelPreloaded: (reelId) => {
          return get().preloadedReels.has(reelId);
        },
        
        /**
         * Navigate between reels
         */
        goToNextReel: () => {
          set((state) => ({
            currentReelIndex: state.currentReelIndex + 1,
            isPlaying: true,
            currentTime: 0,
          }));
        },
        
        goToPreviousReel: () => {
          set((state) => ({
            currentReelIndex: Math.max(0, state.currentReelIndex - 1),
            isPlaying: true,
            currentTime: 0,
          }));
        },
        
        /**
         * Reset player state
         */
        resetPlayer: () => {
          set({
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            buffered: 0,
          });
        },
        
        /**
         * Reset all state (logout)
         */
        resetAll: () => {
          set({
            currentReelId: null,
            currentReelIndex: 0,
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            buffered: 0,
            isLiked: false,
            likesCount: 0,
            commentsCount: 0,
            viewsCount: 0,
            preloadedReels: new Set(),
          });
        },
      }),
      {
        name: 'reel-player-storage',
        // Chỉ persist một số settings, không persist state tạm thời
        partialize: (state) => ({
          volume: state.volume,
          isMuted: state.isMuted,
          playbackRate: state.playbackRate,
        }),
      }
    ),
    { name: 'ReelPlayerStore' }
  )
);

// ==================== SELECTORS ====================
// Export các selector để optimize re-renders

export const useCurrentReel = () => useReelPlayerStore((state) => ({
  id: state.currentReelId,
  index: state.currentReelIndex,
}));

export const usePlayerControls = () => useReelPlayerStore((state) => ({
  isPlaying: state.isPlaying,
  volume: state.volume,
  isMuted: state.isMuted,
  playbackRate: state.playbackRate,
  showControls: state.showControls,
}));

export const useVideoProgress = () => useReelPlayerStore((state) => ({
  duration: state.duration,
  currentTime: state.currentTime,
  buffered: state.buffered,
  percentage: state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0,
}));

export const useReelStats = () => useReelPlayerStore((state) => ({
  isLiked: state.isLiked,
  likesCount: state.likesCount,
  commentsCount: state.commentsCount,
  viewsCount: state.viewsCount,
}));

export default useReelPlayerStore;