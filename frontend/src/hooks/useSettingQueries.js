import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as settingService from '@/services/settingService';
import useSettingStore from '@/stores/useSettingStore';
import { toast } from 'react-toastify';

/**
 * Hook to fetch privacy settings
 */
export const usePrivacySettings = () => {
  const { setPrivacySettings, setPrivacyLoading, setPrivacyError } = useSettingStore();

  return useQuery({
    queryKey: ['privacySettings'],
    queryFn: async () => {
      setPrivacyLoading(true);
      try {
        const response = await settingService.getPrivacySettings();
        setPrivacySettings(response.data);
        setPrivacyError(null);
        return response.data;
      } catch (error) {
        setPrivacyError(error.message);
        throw error;
      } finally {
        setPrivacyLoading(false);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to update privacy settings
 */
export const useUpdatePrivacySettings = () => {
  const queryClient = useQueryClient();
  const { setPrivacySettings } = useSettingStore();

  return useMutation({
    mutationFn: (settings) => settingService.updatePrivacySettings(settings),
    onSuccess: (response) => {
      setPrivacySettings(response.data);
      queryClient.invalidateQueries(['privacySettings']);
      toast.success(response.message || 'Cập nhật cài đặt quyền riêng tư thành công!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật cài đặt quyền riêng tư.');
    },
  });
};

/**
 * Hook to fetch notification settings
 */
export const useNotificationSettings = () => {
  const { setNotificationSettings, setNotificationLoading, setNotificationError } = useSettingStore();

  return useQuery({
    queryKey: ['notificationSettings'],
    queryFn: async () => {
      setNotificationLoading(true);
      try {
        const response = await settingService.getNotificationSettings();
        setNotificationSettings(response.data);
        setNotificationError(null);
        return response.data;
      } catch (error) {
        setNotificationError(error.message);
        throw error;
      } finally {
        setNotificationLoading(false);
      }
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to update notification settings
 */
export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();
  const { setNotificationSettings } = useSettingStore();

  return useMutation({
    mutationFn: (settings) => settingService.updateNotificationSettings(settings),
    onSuccess: (response) => {
      setNotificationSettings(response.data);
      queryClient.invalidateQueries(['notificationSettings']);
      toast.success(response.message || 'Cập nhật cài đặt thông báo thành công!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật cài đặt thông báo.');
    },
  });
};

/**
 * Hook to fetch account info
 */
export const useAccountInfo = () => {
  const { setAccountInfo, setAccountLoading, setAccountError } = useSettingStore();

  return useQuery({
    queryKey: ['accountInfo'],
    queryFn: async () => {
      setAccountLoading(true);
      try {
        const response = await settingService.getAccountInfo();
        setAccountInfo(response.data);
        setAccountError(null);
        return response.data;
      } catch (error) {
        setAccountError(error.message);
        throw error;
      } finally {
        setAccountLoading(false);
      }
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to download user data
 */
export const useDownloadUserData = () => {
  return useMutation({
    mutationFn: () => settingService.downloadUserData(),
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `user_data_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Tải xuống dữ liệu thành công!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Lỗi khi tải xuống dữ liệu.');
    },
  });
};

/**
 * Hook to delete account
 */
export const useDeleteAccount = () => {
  return useMutation({
    mutationFn: (password) => settingService.deleteAccount(password),
    onSuccess: (response) => {
      toast.success(response.message || 'Tài khoản đã được xóa thành công!');
      // Redirect to login or home page
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Lỗi khi xóa tài khoản.');
    },
  });
};

/**
 * Hook to fetch login history
 */
export const useLoginHistory = (page = 1, limit = 10) => {
  const { setLoginHistory, setLoginHistoryPagination, setLoginHistoryLoading, setLoginHistoryError } = useSettingStore();

  return useQuery({
    queryKey: ['loginHistory', page, limit],
    queryFn: async () => {
      setLoginHistoryLoading(true);
      try {
        const response = await settingService.getLoginHistory(page, limit);
        setLoginHistory(response.data);
        setLoginHistoryPagination(response.meta?.pagination);
        setLoginHistoryError(null);
        return response.data;
      } catch (error) {
        setLoginHistoryError(error.message);
        throw error;
      } finally {
        setLoginHistoryLoading(false);
      }
    },
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });
};
