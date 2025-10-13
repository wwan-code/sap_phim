import { create } from 'zustand';

/**
 * @typedef {'all' | 'unread' | 'system'} NotificationTab
 */

/**
 * @typedef {object} NotificationUIState
 * @property {boolean} isDropdownOpen - Trạng thái đóng/mở của dropdown.
 * @property {NotificationTab} activeTab - Tab đang được chọn.
 * @property {(isOpen?: boolean) => void} toggleDropdown - Action để bật/tắt dropdown.
 * @property {(tab: NotificationTab) => void} setActiveTab - Action để đổi tab.
 * @property {() => void} closeDropdown - Action để đóng dropdown.
 */

/**
 * Zustand store để quản lý trạng thái UI của hệ thống thông báo.
 * @returns {NotificationUIState}
 */
export const useNotificationStore = create((set) => ({
  isDropdownOpen: false,
  activeTab: 'all',

  /**
   * Mở/đóng dropdown. Có thể truyền vào một giá trị boolean cụ thể.
   * @param {boolean} [isOpen] - Trạng thái mong muốn.
   */
  toggleDropdown: (isOpen) =>
    set((state) => ({
      isDropdownOpen: typeof isOpen === 'boolean' ? isOpen : !state.isDropdownOpen,
    })),

  /**
   * Đặt tab đang hoạt động.
   * @param {NotificationTab} tab - Tab mới.
   */
  setActiveTab: (tab) => set({ activeTab: tab, isDropdownOpen: true }), // Mở dropdown khi đổi tab

  /**
   * Đóng dropdown.
   */
  closeDropdown: () => set({ isDropdownOpen: false }),
}));
