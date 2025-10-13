import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { useReportedComments, useApproveComment, useHideComment, useAdminDeleteComment } from '@/hooks/useCommentQueries';
import aiService from '@/services/aiService';
import Pagination from '@/components/common/Pagination';
import { formatDistanceToNow, formatDate } from '@/utils/dateUtils';
import { stripMentionLinks } from '@/utils/textUtils';
import { toast } from 'react-toastify';

const ReportedComments = () => {
  const { user: userInfo } = useSelector((state) => state.auth);
  const currentUserId = userInfo?.id;

  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    sort: 'most_reports',
    minReports: 1,
    userId: '',
    contentId: '',
    contentType: '',
    startDate: '',
    endDate: '',
  });

  const { data, isLoading, isError, error, refetch } = useReportedComments(filters);
  const comments = data?.data || [];
  const meta = data?.meta || { page: 1, limit: 10, total: 0, totalPages: 0 };

  const approveMutation = useApproveComment(['reportedComments', filters]);
  const hideMutation = useHideComment(['reportedComments', filters]);
  const deleteMutation = useAdminDeleteComment(['reportedComments', filters]);

  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [selectedComment, setSelectedComment] = useState(null);

  const { mutate: classifyComment, isPending: isClassifying, data: aiSuggestion } = useMutation({
    mutationFn: aiService.classifyComment,
    onSuccess: (data) => {
      setShowAiSuggestion(true);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Lỗi khi phân loại bình luận.');
    }
  });

  const handleAiClassifyClick = (comment) => {
    setSelectedComment(comment);
    // Use the utility function to clean the text before sending to AI
    const cleanedText = stripMentionLinks(comment.text);
    classifyComment(cleanedText);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleApprove = async (id, isApproved) => {
    await approveMutation.mutateAsync({ id, isApproved });
  };

  const handleHide = async (id, isHidden) => {
    await hideMutation.mutateAsync({ id, isHidden });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn bình luận này?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const getAvatarUrl = (avatarUrl) => {
    return avatarUrl ? `${import.meta.env.VITE_SERVER_URL}${avatarUrl}` : '/vite.svg';
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Quản lý báo cáo bình luận</h1>
      </div>

      <div className="admin-page__filters">
        <div className="filter-group">
          <label htmlFor="minReports">Tối thiểu số report</label>
          <input
            type="number"
            id="minReports"
            name="minReports"
            min={1}
            value={filters.minReports}
            onChange={handleFilterChange}
            className='form-control'
          />
        </div>
        <div className="filter-group">
          <label htmlFor="userId">User ID</label>
          <input
            type="text"
            id="userId"
            name="userId"
            value={filters.userId}
            onChange={handleFilterChange}
            placeholder="Lọc theo User ID"
            className='form-control'
          />
        </div>
        <div className="filter-group">
          <label htmlFor="contentType">Loại nội dung</label>
          <select
            id="contentType"
            name="contentType"
            value={filters.contentType}
            onChange={handleFilterChange}
            className='form-select'
          >
            <option value="">Tất cả</option>
            <option value="movie">Phim</option>
            <option value="episode">Tập phim</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="contentId">Content ID</label>
          <input
            type="text"
            id="contentId"
            name="contentId"
            value={filters.contentId}
            onChange={handleFilterChange}
            placeholder="Lọc theo Content ID"
            className='form-control'
          />
        </div>
        <div className="filter-group">
          <label htmlFor="startDate">Từ ngày</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className='form-control'
          />
        </div>
        <div className="filter-group">
          <label htmlFor="endDate">Đến ngày</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className='form-control'
          />
        </div>
        <div className="filter-group">
          <label htmlFor="sort">Sắp xếp</label>
          <select
            id="sort"
            name="sort"
            value={filters.sort}
            onChange={handleFilterChange}
            className='form-select'
          >
            <option value="most_reports">Nhiều report nhất</option>
            <option value="latest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="limit">Số mục mỗi trang</label>
          <select
            id="limit"
            name="limit"
            value={filters.limit}
            onChange={handleFilterChange}
            className='form-select'
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {isError && <div className="admin-page__error">Lỗi: {error.message}</div>}
      <div className="admin-page__table-container">
        <table className="admin-page__table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Người dùng</th>
              <th>Nội dung</th>
              <th>Bình luận</th>
              <th>Reports</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7">Đang tải...</td></tr>
            ) : comments.length === 0 ? (
              <tr><td colSpan="7">Không có bình luận nào bị báo cáo.</td></tr>
            ) : (
              comments.map(comment => (
                <tr key={comment.id}>
                  <td>#{comment.id}</td>
                  <td className="cell--info">
                    <img src={getAvatarUrl(comment.user?.avatarUrl)} alt={comment.user?.username} />
                    <div>
                      <div className="username">{comment.user?.username}</div>
                      <div className="meta">{formatDate(comment.createdAt)} {formatDistanceToNow(comment.createdAt)}</div>
                    </div>
                  </td>
                  <td>
                    {comment.contentType === 'movie' ? 'Phim' : 'Tập phim'} ID: {comment.contentId}
                    {comment.episodeNumber && ` (Tập ${comment.episodeNumber})`}
                  </td>
                  <td className="cell--text">
                    <div className={comment.isSpoiler ? 'spoiler' : ''}>
                      {stripMentionLinks(comment.text)}
                    </div>
                  </td>
                  <td className="cell--counts">
                    <strong>{comment.reportsCount}</strong>
                  </td>
                  <td>
                    <div>Duyệt: {comment.isApproved ? 'Có' : 'Không'}</div>
                    <div>Ẩn: {comment.isHidden ? 'Có' : 'Không'}</div>
                  </td>
                  <td className="cell--actions actions">
                    <button
                      className={`btn btn--edit ${comment.isApproved ? 'btn--unapprove' : 'btn--approve'}`}
                      onClick={() => handleApprove(comment.id, !comment.isApproved)}
                      disabled={approveMutation.isPending}
                    >
                      {comment.isApproved ? 'Bỏ duyệt' : 'Duyệt'}
                    </button>
                    <button
                      className={`btn ${comment.isHidden ? 'btn--unhide' : 'btn--hide'}`}
                      onClick={() => handleHide(comment.id, !comment.isHidden)}
                      disabled={hideMutation.isPending}
                    >
                      {comment.isHidden ? 'Hiện' : 'Ẩn'}
                    </button>
                    <button
                      className="btn btn--delete"
                      onClick={() => handleDelete(comment.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Xóa
                    </button>
                    <button
                      className="btn btn--ai-suggest"
                      onClick={() => handleAiClassifyClick(comment)}
                      disabled={isClassifying && selectedComment?.id === comment.id}
                      style={{ backgroundColor: '#6f42c1', color: 'white' }}
                    >
                      {isClassifying && selectedComment?.id === comment.id ? '...' : 'AI Suggest'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta.totalPages > 1 && (
        <Pagination
          currentPage={meta.page}
          totalPages={meta.totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {showAiSuggestion && selectedComment && (
        <div className="admin-page__form-modal">
          <div className="admin-page__form-modal--content">
            <button className="admin-page__form-modal--close" onClick={() => setShowAiSuggestion(false)}>&times;</button>
            <h2>Gợi ý từ AI cho bình luận #{selectedComment.id}</h2>
            <p><strong>Nội dung:</strong> "{stripMentionLinks(selectedComment.text)}"</p>
            {aiSuggestion && (
              <div>
                <p><strong>Cảm xúc:</strong> {aiSuggestion.data.sentiment}</p>
                <p><strong>Phân loại:</strong> {aiSuggestion.data.categories.join(', ') || 'Không có'}</p>
                <p><strong>Lý do:</strong> {aiSuggestion.data.reason}</p>
              </div>
            )}
            <div className="admin-page__form-modal--actions">
              <button className="btn" onClick={() => setShowAiSuggestion(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReportedComments;
