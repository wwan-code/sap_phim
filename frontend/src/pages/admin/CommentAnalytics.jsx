import React, { useState, useMemo } from 'react';
import { useCommentStatsAdmin } from '@/hooks/useCommentQueries';
import { useTheme } from '@/hooks/useTheme'; // Import useTheme hook
import '@/assets/scss/pages/admin/_admin-pages.scss';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const CommentAnalytics = () => {
  const { theme } = useTheme(); // Get current theme
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    contentType: '',
    contentId: '',
    userId: '',
  });

  const { data: stats, isLoading, isError, error } = useCommentStatsAdmin(filters);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const renderStatsCard = (title, value, description = '') => (
    <div className="admin-page__card" style={{ padding: 'var(--w-spacing-lg)' }}>
      <h3 className="admin-page__card--title" style={{ fontSize: 'var(--w-font-size-md)', color: 'var(--w-text-color-light)' }}>{title}</h3>
      <p style={{ fontSize: 'var(--w-font-size-h3)', fontWeight: 'var(--w-font-weight-bold)', margin: 'var(--w-spacing-sm) 0' }}>
        {value !== undefined && value !== null ? value.toLocaleString('vi-VN') : 'N/A'}
      </p>
      {description && <p style={{ fontSize: 'var(--w-font-size-sm)', color: 'var(--w-text-color-light)', margin: 0 }}>{description}</p>}
    </div>
  );

  // Prepare data for Comments by Date chart
  const commentsByDateData = useMemo(() => {
    const labels = stats?.commentsByDate?.map(item => item.date) || [];
    const data = stats?.commentsByDate?.map(item => item.count) || [];

    return {
      labels,
      datasets: [
        {
          label: 'Số bình luận',
          data,
          borderColor: 'rgb(232, 194, 110)', // Primary color
          backgroundColor: 'rgba(232, 194, 110, 0.5)',
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }, [stats]);

  const commentsByDateOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--w-text-color').trim(),
        },
      },
      title: {
        display: true,
        text: 'Bình luận theo ngày',
        color: getComputedStyle(document.documentElement).getPropertyValue('--w-text-color').trim(),
        font: {
          size: 16,
        },
      },
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
        },
        grid: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--w-border-color').trim(),
        },
      },
    },
  };

  // Prepare data for Sentiment Analysis chart
  const sentimentData = useMemo(() => {
    const sentimentStats = stats?.sentimentStats || {
      positive: 0,
      negative: 0,
      neutral: 0,
      toxic: 0,
      spam: 0,
      hateSpeech: 0
    };

    const labels = ['Tích cực', 'Tiêu cực', 'Trung lập', 'Độc hại', 'Spam', 'Thù địch'];
    const data = [
      sentimentStats.positive,
      sentimentStats.negative,
      sentimentStats.neutral,
      sentimentStats.toxic,
      sentimentStats.spam,
      sentimentStats.hateSpeech,
    ];
    const backgroundColors = [
      'rgba(40, 167, 69, 0.8)', // Success (Positive)
      'rgba(220, 53, 69, 0.8)', // Danger (Negative)
      'rgba(108, 117, 125, 0.8)', // Secondary (Neutral)
      'rgba(255, 193, 7, 0.8)', // Warning (Toxic)
      'rgba(23, 162, 184, 0.8)', // Info (Spam)
      'rgba(111, 66, 193, 0.8)', // Purple (Hate Speech)
    ];
    const borderColors = [
      'rgba(40, 167, 69, 1)',
      'rgba(220, 53, 69, 1)',
      'rgba(108, 117, 125, 1)',
      'rgba(255, 193, 7, 1)',
      'rgba(23, 162, 184, 1)',
      'rgba(111, 66, 193, 1)',
    ];

    return {
      labels,
      datasets: [
        {
          label: 'Số lượng bình luận',
          data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
    };
  }, [stats]);

  const sentimentOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--w-text-color').trim(),
        },
      },
      title: {
        display: true,
        text: 'Phân tích cảm xúc bình luận (AI)',
        color: getComputedStyle(document.documentElement).getPropertyValue('--w-text-color').trim(),
        font: {
          size: 16,
        },
      },
    },
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Bảng điều khiển & Thống kê bình luận</h1>
      </div>

      <div className="admin-page__filters">
        <div className="filter-group">
          <label htmlFor="startDate">Từ ngày</label>
          <input type="date" id="startDate" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
        </div>
        <div className="filter-group">
          <label htmlFor="endDate">Đến ngày</label>
          <input type="date" id="endDate" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
        </div>
        <div className="filter-group">
          <label htmlFor="contentType">Loại nội dung</label>
          <select id="contentType" name="contentType" value={filters.contentType} onChange={handleFilterChange} 
          className='form-select'
          >
            <option value="">Tất cả</option>
            <option value="movie">Phim</option>
            <option value="episode">Tập phim</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="contentId">Content ID</label>
          <input type="number" id="contentId" name="contentId" value={filters.contentId} onChange={handleFilterChange} placeholder="ID phim/tập..." />
        </div>
        <div className="filter-group">
          <label htmlFor="userId">User ID</label>
          <input type="number" id="userId" name="userId" value={filters.userId} onChange={handleFilterChange} placeholder="ID người dùng..." />
        </div>
      </div>

      {isLoading && <div className="admin-page__loading">Đang tải dữ liệu thống kê...</div>}
      {isError && <div className="admin-page__error">Lỗi: {error.message}</div>}

      {stats && !isLoading && (
        <>
          <div className="admin-page__grid">
            {renderStatsCard('Tổng số bình luận', stats.totalComments)}
            {renderStatsCard('Bình luận đã duyệt', stats.approvedComments)}
            {renderStatsCard('Bình luận bị ẩn', stats.hiddenComments)}
            {renderStatsCard('Bình luận bị báo cáo', stats.reportedCommentsCount, 'Số bình luận có ít nhất 1 báo cáo')}
          </div>

          <div className="admin-page__grid" style={{ marginTop: 'var(--w-spacing-xl)' }}>
            <div className="admin-page__card" style={{ padding: 'var(--w-spacing-lg)' }}>
              <Line data={commentsByDateData} options={commentsByDateOptions} />
            </div>
            <div className="admin-page__card" style={{ padding: 'var(--w-spacing-lg)' }}>
              <Doughnut data={sentimentData} options={sentimentOptions} />
            </div>
          </div>

          <div style={{ marginTop: 'var(--w-spacing-xl)' }}>
            <h2>Chi tiết</h2>
            
            <div className="admin-page__grid">
                <div className="admin-page__card" style={{ padding: 'var(--w-spacing-lg)' }}>
                    <h4 className="admin-page__card--title">Top người dùng bình luận</h4>
                    <ul>
                        {stats.topUsers?.map(user => (
                            <li key={user.userId}>{user.user.username} ({user.commentCount} bình luận)</li>
                        ))}
                    </ul>
                </div>
                <div className="admin-page__card" style={{ padding: 'var(--w-spacing-lg)' }}>
                    <h4 className="admin-page__card--title">Top nội dung được bình luận</h4>
                    <ul>
                        {stats.topContent?.map(content => (
                            <li key={`${content.contentType}-${content.contentId}`}>{content.contentType} #{content.contentId} ({content.commentCount} bình luận)</li>
                        ))}
                    </ul>
                </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CommentAnalytics;
