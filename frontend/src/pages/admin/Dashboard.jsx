import React, { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { FaUsers, FaFilm, FaCommentDots, FaEye, FaFire } from 'react-icons/fa';

import dashboardService from '@/services/dashboardService';
import StatCard from '@/components/admin/StatCard';
import classNames from '@/utils/classNames';
import { formatDate } from '@/utils/dateUtils';
import { useTheme } from '@/hooks/useTheme';


// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const { theme } = useTheme(); // Get current theme
  const [selectedTrendingPeriod, setSelectedTrendingPeriod] = useState('week'); // Default to 'week'

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboardAnalytics'],
    queryFn: dashboardService.getDashboardAnalytics,
  });

  // Fetch trending movies for the selected period
  const {
    data: trendingMovies,
    isLoading: isTrendingLoading,
    isError: isTrendingError,
    error: trendingError,
  } = useQuery({
    queryKey: ['trendingMovies', selectedTrendingPeriod],
    queryFn: () => dashboardService.getTrendingMovies(selectedTrendingPeriod, 5),
  });

  const handlePeriodChange = (event) => {
    setSelectedTrendingPeriod(event.target.value);
  };
  
  const getMoviePoster = useCallback((image) => {
    return image?.posterUrl ? `${import.meta.env.VITE_SERVER_URL}${image.posterUrl}` : 'https://placehold.co/400x600?text=No+Poster';
  }, []);

  if (isLoading) {
    return <div className="dashboard-page">Loading dashboard data...</div>;
  }

  if (isError) {
    return <div className="dashboard-page">Error: {error.message}</div>;
  }

  const { overallStats, chartData, recentLists } = data;

  // Chart data configuration
  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--w-text-color').trim(),
        },
      },
      title: {
        display: true,
        font: {
          size: 16,
          weight: 'bold',
        },
        color: getComputedStyle(document.documentElement).getPropertyValue('--w-text-color').trim(),
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('vi-VN').format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--w-text-color-light').trim(),
        },
        grid: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--w-border-color').trim(),
        },
      },
      y: {
        ticks: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--w-text-color-light').trim(),
          callback: function(value) {
            return new Intl.NumberFormat('vi-VN').format(value);
          }
        },
        grid: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--w-border-color').trim(),
        },
      },
    },
  };

  const userRegistrationsChartData = {
    labels: chartData.userRegistrations.map((item) => formatDate(item.date, 'vi-VN', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Người dùng mới',
        data: chartData.userRegistrations.map((item) => item.count),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.4,
      },
    ],
  };

  const movieUploadsChartData = {
    labels: chartData.movieUploads.map((item) => formatDate(item.date, 'vi-VN', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Phim mới',
        data: chartData.movieUploads.map((item) => item.count),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.4,
      },
    ],
  };

  const commentActivityChartData = {
    labels: chartData.commentActivity.map((item) => formatDate(item.date, 'vi-VN', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Bình luận mới',
        data: chartData.commentActivity.map((item) => item.count),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.4,
      },
    ],
  };

  

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <h1>Dashboard Admin</h1>
        <p>Tổng quan về các chỉ số quan trọng của hệ thống.</p>
      </div>

      <div className="dashboard-page__stats">
        <StatCard title="Tổng người dùng" value={overallStats.totalUsers.toLocaleString('vi-VN')} icon={FaUsers} />
        <StatCard title="Tổng phim" value={overallStats.totalMovies.toLocaleString('vi-VN')} icon={FaFilm} />
        <StatCard title="Tổng bình luận" value={overallStats.totalComments.toLocaleString('vi-VN')} icon={FaCommentDots} />
        <StatCard title="Tổng lượt xem" value={overallStats.totalViews.toLocaleString('vi-VN')} icon={FaEye} />
      </div>

      <div className="dashboard-page__charts">
        <div className="chart-card">
          <h2>Đăng ký người dùng (7 ngày)</h2>
          <div style={{ height: '300px' }}>
            <Line options={{ ...commonChartOptions, plugins: { ...commonChartOptions.plugins, title: { ...commonChartOptions.plugins.title, text: 'Đăng ký người dùng' } } }} data={userRegistrationsChartData} />
          </div>
        </div>
        <div className="chart-card">
          <h2>Phim mới (7 ngày)</h2>
          <div style={{ height: '300px' }}>
            <Line options={{ ...commonChartOptions, plugins: { ...commonChartOptions.plugins, title: { ...commonChartOptions.plugins.title, text: 'Phim mới' } } }} data={movieUploadsChartData} />
          </div>
        </div>
        <div className="chart-card">
          <h2>Hoạt động bình luận (7 ngày)</h2>
          <div style={{ height: '300px' }}>
            <Line options={{ ...commonChartOptions, plugins: { ...commonChartOptions.plugins, title: { ...commonChartOptions.plugins.title, text: 'Hoạt động bình luận' } } }} data={commentActivityChartData} />
          </div>
        </div>
      </div>

      <div className="dashboard-page__lists">
        <div className="list-card">
          <h2>Người dùng mới đăng ký</h2>
          <ul>
            {recentLists.recentUsers.map((user) => (
              <li key={user.id}>
                <Link to={`/admin/users/${user.id}`} className="item-info">
                  <img src={`${import.meta.env.VITE_SERVER_URL}${user.avatarUrl}` || '/images/default-avatar.png'} alt={user.username} />
                  <div className="text-content">
                    <span className="title">{user.username}</span>
                    <span className="subtitle">{formatDate(user.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="list-card">
          <h2>Phim được xem nhiều nhất</h2>
          <ul>
            {recentLists.mostViewedMovies.map((movie) => (
              <li key={movie.id}>
                <Link to={`/admin/movies/${movie.slug}`} className="item-info">
                  <img src={getMoviePoster(movie.image)} alt={movie.titles[0]?.title} />
                  <div className="text-content">
                    <span className="title">{movie.titles[0]?.title}</span>
                    <span className="subtitle">{movie.views.toLocaleString('vi-VN')} lượt xem</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="list-card">
          <h2>Phim được bình luận nhiều nhất</h2>
          <ul>
            {recentLists.mostCommentedMovies.map((movie) => (
              <li key={movie.id}>
                <Link to={`/admin/movies/${movie.slug}`} className="item-info">
                  <img src={getMoviePoster(movie.image)} alt={movie.titles[0]?.title} />
                  <div className="text-content">
                    <span className="title">{movie.titles[0]?.title}</span>
                    {/* Comment count is not directly available here, need to fetch or pass it */}
                    <span className="subtitle">Nhiều bình luận</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="list-card">
          <div className="list-card__header">
            <h2>Phim Trending</h2>
            <select className="form-select" value={selectedTrendingPeriod} onChange={handlePeriodChange}>
              <option value="day">24 giờ qua</option>
              <option value="week">7 ngày qua</option>
              <option value="month">1 tháng qua</option>
            </select>
          </div>
          {isTrendingLoading && <p>Đang tải phim trending...</p>}
          {isTrendingError && <p>Lỗi: {trendingError.message}</p>}
          {!isTrendingLoading && !isTrendingError && (
            <ul>
              {trendingMovies?.map((movie) => (
                <li key={movie.id}>
                  <Link to={`/admin/movies/${movie.slug}`} className="item-info">
                    <img src={getMoviePoster(movie.image)} alt={movie.titles[0]?.title} />
                    <div className="text-content">
                      <span className="title">{movie.titles[0]?.title}</span>
                      <span className="subtitle">Score: {movie.trendingScore} <FaFire /></span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
