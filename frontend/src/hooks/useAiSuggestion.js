import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import aiService from '@/services/aiService';

/**
 * Custom hook for managing AI suggestions
 * @returns {object} Hook state and functions
 */
const useAiSuggestion = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Suggest movie data using AI
   * @param {object} movieInfo - Movie information
   * @returns {Promise<object>} Suggested data
   */
  const suggestMovieData = useCallback(async (movieInfo) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await aiService.suggestMovieData(movieInfo);
      
      if (result.success) {
        setData(result.data);
        return result.data;
      } else {
        setError(result.message);
        toast.error(result.message);
        return null;
      }
    } catch (err) {
      const errorMessage = 'Có lỗi xảy ra khi gợi ý dữ liệu phim.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('AI Suggestion Error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate marketing content
   * @param {object} movieInfo - Movie information
   * @returns {Promise<object>} Marketing content
   */
  const generateMarketingContent = useCallback(async (movieInfo) => {
    setLoading(true);
    setError(null);

    try {
      const result = await aiService.generateMarketingContent(movieInfo);
      
      if (result.success) {
        return result.data;
      } else {
        setError(result.message);
        toast.error(result.message);
        return null;
      }
    } catch (err) {
      const errorMessage = 'Có lỗi xảy ra khi tạo nội dung marketing.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('AI Marketing Error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Translate description
   * @param {object} translationInfo - Translation information
   * @returns {Promise<object>} Translated content
   */
  const translateDescription = useCallback(async (translationInfo) => {
    setLoading(true);
    setError(null);

    try {
      const result = await aiService.translateDescription(translationInfo);
      
      if (result.success) {
        return result.data;
      } else {
        setError(result.message);
        toast.error(result.message);
        return null;
      }
    } catch (err) {
      const errorMessage = 'Có lỗi xảy ra khi dịch mô tả.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('AI Translation Error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate SEO content
   * @param {object} seoInfo - SEO information
   * @returns {Promise<object>} SEO content
   */
  const generateSEOContent = useCallback(async (seoInfo) => {
    setLoading(true);
    setError(null);

    try {
      const result = await aiService.generateSEOContent(seoInfo);
      
      if (result.success) {
        return result.data;
      } else {
        setError(result.message);
        toast.error(result.message);
        return null;
      }
    } catch (err) {
      const errorMessage = 'Có lỗi xảy ra khi tạo nội dung SEO.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('AI SEO Error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear all state
   */
  const clearState = useCallback(() => {
    setLoading(false);
    setData(null);
    setError(null);
  }, []);

  /**
   * Reset error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    loading,
    data,
    error,
    
    // Actions
    suggestMovieData,
    generateMarketingContent,
    translateDescription,
    generateSEOContent,
    clearState,
    clearError,
    
    // Computed
    hasData: !!data,
    hasError: !!error,
  };
};

export default useAiSuggestion;
