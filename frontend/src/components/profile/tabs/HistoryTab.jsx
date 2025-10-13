import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import watchHistoryService from '@/services/watchHistoryService';
import userService from '@/services/userService';
import { toast } from 'react-toastify';
import { formatTime, formatDate } from '@/utils/dateUtils';
import { FaTrashAlt, FaPlayCircle } from 'react-icons/fa';

const HistoryTab = ({ user, isOwnProfile = true }) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const observer = useRef();
  const historyContainerRef = useRef(null);

  const loadHistory = useCallback(async (nextPage = 1) => {
    setLoading(true);
    try {
      let response;
      if (isOwnProfile) {
        response = await watchHistoryService.getHistory({ page: nextPage, limit });
      } else {
        response = await userService.getUserWatchHistoryByUuid(user.uuid, nextPage, limit);
      }
      
      if (response.data) {
        setItems(prev => nextPage === 1 ? response.data : [...prev, ...response.data]);
        setTotalPages(response.meta?.totalPages || 1);
        setPage(response.meta?.page || nextPage);
      } else {
        toast.error(response.message || 'Không thể tải lịch sử xem.');
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Không thể tải lịch sử xem.');
    } finally {
      setLoading(false);
    }
  }, [limit, isOwnProfile, user?.uuid]);

  useEffect(() => {
    loadHistory(1);
  }, [loadHistory]);

  const lastItemRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && page < totalPages) {
        loadHistory(page + 1);
      }
    }, {
      root: historyContainerRef.current,
      rootMargin: '0px 0px 200px 0px', // Load when 200px from bottom
    });
    if (node) observer.current.observe(node);
  }, [loading, page, totalPages, loadHistory]);

  const handleDeleteOne = async (id) => {
    // Chỉ cho phép xóa khi đang xem profile của chính mình
    if (!isOwnProfile) return;
    
    try {
      const response = await watchHistoryService.deleteOne(id);
      if (response.success) {
        setItems(prev => prev.filter(i => i.id !== id));
        toast.success(response.message || 'Đã xóa một mục khỏi lịch sử xem.');
      } else {
        toast.error(response.message || 'Xóa mục lịch sử thất bại.');
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Xóa mục lịch sử thất bại.');
    }
  };

  const handleClearAll = async () => {
    // Chỉ cho phép xóa khi đang xem profile của chính mình
    if (!isOwnProfile) return;
    
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem?')) {
      return;
    }
    setClearing(true);
    try {
      const response = await watchHistoryService.clearAll();
      if (response.success) {
        setItems([]);
        setPage(1);
        setTotalPages(1);
        toast.success(response.message || 'Đã xóa toàn bộ lịch sử xem.');
      } else {
        toast.error(response.message || 'Xóa toàn bộ lịch sử thất bại.');
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Xóa toàn bộ lịch sử thất bại.');
    } finally {
      setClearing(false);
    }
  };

  // Helper functions for date comparison using native Date objects
  const isToday = (someDate) => {
    const today = new Date();
    return someDate.getDate() === today.getDate() &&
           someDate.getMonth() === today.getMonth() &&
           someDate.getFullYear() === today.getFullYear();
  };

  const isYesterday = (someDate) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return someDate.getDate() === yesterday.getDate() &&
           someDate.getMonth() === yesterday.getMonth() &&
           someDate.getFullYear() === yesterday.getFullYear();
  };

  const groupHistoryByDate = (historyItems) => {
    const grouped = {};
    historyItems.forEach(item => {
      const date = new Date(item.updatedAt || item.timestamp);
      let dateKey;
      if (isToday(date)) {
        dateKey = 'Hôm nay';
      } else if (isYesterday(date)) {
        dateKey = 'Hôm qua';
      } else {
        dateKey = formatDate(date, 'vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      }
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });
    return grouped;
  };

  const groupedItems = groupHistoryByDate(items);
  const sortedDates = Object.keys(groupedItems).sort((a, b) => {
    if (a === 'Hôm nay') return -1;
    if (b === 'Hôm nay') return 1;
    if (a === 'Hôm qua') return -1;
    if (b === 'Hôm qua') return 1;
    // For other dates, parse and compare
    const dateA = new Date(groupedItems[a][0].updatedAt || groupedItems[a][0].timestamp);
    const dateB = new Date(groupedItems[b][0].updatedAt || groupedItems[b][0].timestamp);
    return dateB - dateA;
  });

  const renderHistoryItem = (h) => {
    const posterUrl = h.movie?.image?.posterUrl ? `${import.meta.env.VITE_SERVER_URL}${h.movie.image.posterUrl}` : 'https://placehold.co/150x225?text=No+Image';
    const title = (h.movie?.titles || []).find(t => t.type === 'default')?.title || 'Untitled';
    const progressPercent = h.episode?.duration ? Math.min(100, Math.round((h.progress / parseTime(h.episode.duration)) * 100)) : 0;
    const slug = h.movie?.slug;
    const episodeNumber = h.episode?.episodeNumber;
    const watchLink = slug ? `/watch/${slug}${episodeNumber ? `/episode/${episodeNumber}` : ''}` : '#';
    const watchTime = formatTime(h.updatedAt || h.timestamp, 'vi-VN');

    return (
      <div key={h.id} className="history-item">
        <Link to={watchLink} className="history-item__poster">
          <img src={posterUrl} alt={title} loading="lazy" />
          <div className="play-overlay"><FaPlayCircle /></div>
        </Link>
        <div className="history-item__content">
          <div className="history-item__top">
            <h4 className="history-item__title">
              <Link to={watchLink}>{title}</Link>
            </h4>
            {episodeNumber && <span className="history-item__episode">Tập {episodeNumber}</span>}
          </div>
          <div className="history-item__progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <span className="progress-text">{progressPercent}% đã xem</span>
          </div>
          <div className="history-item__bottom">
            <span className="history-item__time">Xem lúc: {watchTime}</span>
            {/* Chỉ hiển thị nút xóa cho profile của chính mình */}
            {isOwnProfile && (
              <button className="history-item__delete" onClick={() => handleDeleteOne(h.id)} aria-label="Xóa khỏi lịch sử">
                <FaTrashAlt />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="history-tab fade-in">
      <div className="history-tab__header">
        <h3>Lịch sử xem</h3>
        {/* Chỉ hiển thị nút xóa cho profile của chính mình */}
        {isOwnProfile && (
          <button className="btn btn--danger" disabled={clearing || items.length === 0} onClick={handleClearAll}>
            <FaTrashAlt /> Xóa toàn bộ
          </button>
        )}
      </div>

      <div className="history-timeline-container" ref={historyContainerRef}>
        {!loading && items.length === 0 && (
          <div className="history-empty">
            <p>{isOwnProfile ? 'Chưa có lịch sử xem nào.' : 'Người này chưa có lịch sử xem nào.'}</p>
            {isOwnProfile && <p>Hãy bắt đầu xem một bộ phim để lưu lại lịch sử!</p>}
          </div>
        )}

        {sortedDates.map((dateKey, dateIndex) => (
          <div key={dateKey} className="history-day-group">
            <h4 className="history-day-group__date">{dateKey}</h4>
            <div className="history-day-group__items">
              {groupedItems[dateKey].map((item, itemIndex) => {
                const isLastItem = dateIndex === sortedDates.length - 1 && itemIndex === groupedItems[dateKey].length - 1;
                return (
                  <div key={item.id} ref={isLastItem ? lastItemRef : null}>
                    {renderHistoryItem(item)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {loading && items.length > 0 && (
          <div className="history-loading-more">
            <HistoryItemSkeleton count={3} /> {/* Show a few skeletons for loading more */}
          </div>
        )}

        {/* AI Recommendation Layer Placeholder - chỉ hiển thị cho profile của chính mình */}
        {!loading && items.length > 0 && isOwnProfile && (
          <div className="ai-recommendation-placeholder">
            <h4>Gợi ý từ AI</h4>
            <p>Dựa trên lịch sử xem của bạn, AI sẽ sớm đưa ra các gợi ý phim cá nhân hóa tại đây!</p>
            {/* Future integration for AI recommendations */}
          </div>
        )}
      </div>
    </div>
  );
};

function parseTime(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return Number(timeStr) || 0;
}

export default HistoryTab;
