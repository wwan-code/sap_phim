import api from './api';

const dashboardService = {
  getDashboardAnalytics: async () => {
    try {
      const response = await api.get('/dashboard/analytics');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  getTrendingMovies: async (period, limit = 10) => {
    try {
      const response = await api.get(`/dashboard/trending-movies/${period}`, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default dashboardService;
