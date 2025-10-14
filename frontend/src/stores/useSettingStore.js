import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Zustand store for managing settings state
 */
const useSettingStore = create(
  devtools(
    (set) => ({
      // Privacy Settings
      privacySettings: null,
      privacyLoading: false,
      privacyError: null,

      // Notification Settings
      notificationSettings: null,
      notificationLoading: false,
      notificationError: null,

      // Account Info
      accountInfo: null,
      accountLoading: false,
      accountError: null,

      // Login History
      loginHistory: [],
      loginHistoryPagination: null,
      loginHistoryLoading: false,
      loginHistoryError: null,

      // Active Tab
      activeTab: 'privacy', // 'privacy', 'notifications', 'account'

      // Actions
      setPrivacySettings: (settings) => set({ privacySettings: settings }),
      setPrivacyLoading: (loading) => set({ privacyLoading: loading }),
      setPrivacyError: (error) => set({ privacyError: error }),

      setNotificationSettings: (settings) => set({ notificationSettings: settings }),
      setNotificationLoading: (loading) => set({ notificationLoading: loading }),
      setNotificationError: (error) => set({ notificationError: error }),

      setAccountInfo: (info) => set({ accountInfo: info }),
      setAccountLoading: (loading) => set({ accountLoading: loading }),
      setAccountError: (error) => set({ accountError: error }),

      setLoginHistory: (history) => set({ loginHistory: history }),
      setLoginHistoryPagination: (pagination) => set({ loginHistoryPagination: pagination }),
      setLoginHistoryLoading: (loading) => set({ loginHistoryLoading: loading }),
      setLoginHistoryError: (error) => set({ loginHistoryError: error }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      // Reset all settings
      resetSettings: () =>
        set({
          privacySettings: null,
          privacyLoading: false,
          privacyError: null,
          notificationSettings: null,
          notificationLoading: false,
          notificationError: null,
          accountInfo: null,
          accountLoading: false,
          accountError: null,
          loginHistory: [],
          loginHistoryPagination: null,
          loginHistoryLoading: false,
          loginHistoryError: null,
          activeTab: 'privacy',
        }),
    }),
    { name: 'SettingStore' }
  )
);

export default useSettingStore;
