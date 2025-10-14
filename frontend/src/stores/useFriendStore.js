import { create } from 'zustand';

/**
 * @typedef {'friends-list' | 'pending-requests' | 'sent-requests' | 'friend-search'} FriendTab
 */

/**
 * @typedef {object} FriendUIState
 * @property {FriendTab} activeTab - Tab đang được chọn trong giao diện bạn bè.
 * @property {(tab: FriendTab) => void} setActiveTab - Action để thay đổi tab đang hoạt động.
 */

/**
 * Zustand store để quản lý trạng thái UI của trang bạn bè.
 * @returns {FriendUIState}
 */
export const useFriendStore = create((set) => ({
  activeTab: 'friends-list',

  /**
   * Đặt tab đang hoạt động.
   * @param {FriendTab} tab - Tab mới.
   */
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
