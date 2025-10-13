import React, { useState, useEffect } from 'react';
import { FaTimes, FaCheck, FaEdit, FaMagic, FaSpinner, FaGlobe, FaTag, FaCalendar, FaUsers, FaVideo, FaLanguage, FaInfoCircle } from 'react-icons/fa';
import classNames from '@/utils/classNames';
import { formatSubtitleDisplay } from '@/utils/subtitleUtils';
import '@/assets/scss/components/admin/_ai-suggestion-panel.scss';

const AiSuggestionPanel = ({ 
  isOpen, 
  onClose, 
  onAccept, 
  onEdit, 
  data, 
  loading, 
  error,
  aiGeneratedOtherTitlesCount = 0
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedLanguage, setSelectedLanguage] = useState('vietnamese');

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview');
      setSelectedLanguage('vietnamese');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (data && onAccept) {
      onAccept(data);
      onClose();
    }
  };

  const handleEdit = () => {
    if (data && onEdit) {
      onEdit(data);
    }
  };

  const renderDescription = () => {
    if (!data?.description) return 'Không có mô tả';
    
    if (typeof data.description === 'object') {
      return data.description[selectedLanguage] || data.description.vietnamese || 'Không có mô tả';
    }
    
    return data.description;
  };

  const renderMarketingContent = () => {
    if (!data?.marketingContent) return 'Không có nội dung marketing';
    
    if (typeof data.marketingContent === 'object') {
      return data.marketingContent[selectedLanguage] || data.marketingContent.vietnamese || 'Không có nội dung marketing';
    }
    
    return data.marketingContent;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="ai-suggestion-panel__overview">
            <div className="overview-section">
              <h4><FaTag /> Tiêu đề</h4>
              <div className="info-grid">
                <div className="info-item full-width">
                  <label>Tiêu đề chính:</label>
                  <span>{data?.title || 'N/A'}</span>
                </div>
                {data?.otherTitles && data.otherTitles.length > 0 && (
                  <div className="info-item full-width">
                    <label>Các tiêu đề khác:</label>
                    <div className="other-titles-list">
                      {data.otherTitles.map((ot, idx) => (
                        <span key={idx} className="other-title-item">
                          <strong>{ot.type}:</strong> {ot.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {aiGeneratedOtherTitlesCount > 0 && (
                  <div className="ai-generated-message full-width">
                    <FaInfoCircle /> AI đã gợi ý thêm {aiGeneratedOtherTitlesCount} tiêu đề khác.
                  </div>
                )}
              </div>
            </div>

            <div className="overview-section">
              <h4><FaTag /> Thông tin cơ bản</h4>
              <div className="info-grid">
                <div className="info-item">
                  <label>Năm phát hành:</label>
                  <span>{data?.releaseYear || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Ngày phát hành:</label>
                  <span>{data?.releaseDate || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Quốc gia:</label>
                  <span>{data?.country || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Danh mục:</label>
                  <span>{data?.category || 'N/A'}</span>
                </div>
                {
                  data?.season && 
                    <div className="info-item">
                      <label>Mùa:</label>
                      <span>{data?.season || 'N/A'}</span>
                    </div>
                }
                {
                  data?.section && 
                    <div className="info-item">
                      <label>Phần:</label>
                      <span>{data?.section || 'N/A'}</span>
                    </div>
                }
                <div className="info-item">
                  <label>Thời lượng:</label>
                  <span>{data?.duration || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Chất lượng:</label>
                  <span>{data?.quality || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Phân loại:</label>
                  <span>{data?.classification || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Điểm imdb:</label>
                  <span>{data?.imdb ? `${data.imdb}/10` : 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Trạng thái:</label>
                  <span>{data?.status || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Tổng số lượt xem:</label>
                  <span>{data?.totalViews || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Tổng số tập:</label>
                  <span>{data?.totalEpisodes || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="overview-section">
              <h4><FaUsers /> Thông tin sản xuất</h4>
              <div className="info-grid">
                <div className="info-item">
                  <label>Đạo diễn:</label>
                  <span>{data?.director || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Studio:</label>
                  <span>{data?.studio || 'N/A'}</span>
                </div>
              </div>
            </div>

            {data?.cast && data.cast.length > 0 && (
              <div className="overview-section">
                <h4><FaUsers /> Diễn viên</h4>
                <div className="cast-table-container">
                  <table className="cast-table">
                    <thead>
                      <tr>
                        <th>Diễn viên</th>
                        <th>Vai diễn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cast.map((cst, index) => (
                        <tr key={index}>
                          <td>{cst.actor}</td>
                          <td>{cst.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        );

      case 'description':
        return (
          <div className="ai-suggestion-panel__description">
            <div className="language-tabs">
              <button 
                className={classNames('lang-tab', { active: selectedLanguage === 'vietnamese' })}
                onClick={() => setSelectedLanguage('vietnamese')}
              >
                <FaLanguage /> Tiếng Việt
              </button>
              <button 
                className={classNames('lang-tab', { active: selectedLanguage === 'english' })}
                onClick={() => setSelectedLanguage('english')}
              >
                <FaLanguage /> English
              </button>
              <button 
                className={classNames('lang-tab', { active: selectedLanguage === 'japanese' })}
                onClick={() => setSelectedLanguage('japanese')}
              >
                <FaLanguage /> 日本語
              </button>
            </div>
            <div className="description-content">
              <p>{renderDescription()}</p>
            </div>
          </div>
        );

      case 'tags':
        return (
          <div className="ai-suggestion-panel__tags">
            <div className="tags-section">
              <h4><FaTag /> Tags</h4>
              <div className="tags-list">
                {data?.tags?.map((tag, index) => (
                  <span key={index} className="tag-item">{tag}</span>
                )) || <span className="no-data">Không có tags</span>}
              </div>
            </div>

            <div className="tags-section">
              <h4><FaGlobe /> SEO Keywords</h4>
              <div className="tags-list">
                {data?.seoKeywords?.map((keyword, index) => (
                  <span key={index} className="keyword-item">{keyword}</span>
                )) || <span className="no-data">Không có keywords</span>}
              </div>
            </div>

            <div className="tags-section">
              <h4><FaTag /> Thể loại</h4>
              <div className="tags-list">
                {data?.genres?.map((genre, index) => (
                  <span key={index} className="genre-item">{genre}</span>
                )) || <span className="no-data">Không có thể loại</span>}
              </div>
            </div>
          </div>
        );

      case 'media':
        return (
          <div className="ai-suggestion-panel__media">
            <div className="media-section">
              <h4><FaVideo /> Trailer</h4>
              {data?.trailerUrl ? (
                <div className="trailer-info">
                  <a 
                    href={data.trailerUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="trailer-link"
                  >
                    <FaVideo /> Xem trailer
                  </a>
                </div>
              ) : (
                <span className="no-data">Không có trailer</span>
              )}
            </div>

            <div className="media-section">
              <h4><FaCalendar /> Phụ đề</h4>
              <div className="subtitles-list">
                {data?.subtitles?.map((subtitle, index) => (
                  <span key={index} className="subtitle-item">
                    {formatSubtitleDisplay(subtitle)}
                  </span>
                )) || <span className="no-data">Không có phụ đề</span>}
              </div>
            </div>

            <div className="media-section">
              <h4><FaVideo /> Series liên quan</h4>
              <div className="related-series">
                {data?.relatedSeries && data.relatedSeries.length > 0 ? (
                  data.relatedSeries.map((series, index) => (
                    <span key={index} className="series-item">{series}</span>
                  ))
                ) : (
                  <span className="no-data">Không có series liên quan</span>
                )}
              </div>
            </div>
          </div>
        );

      case 'marketing':
        return (
          <div className="ai-suggestion-panel__marketing">
            <div className="language-tabs">
              <button 
                className={classNames('lang-tab', { active: selectedLanguage === 'vietnamese' })}
                onClick={() => setSelectedLanguage('vietnamese')}
              >
                <FaLanguage /> Tiếng Việt
              </button>
              <button 
                className={classNames('lang-tab', { active: selectedLanguage === 'english' })}
                onClick={() => setSelectedLanguage('english')}
              >
                <FaLanguage /> English
              </button>
            </div>
            <div className="marketing-content">
              <p>{renderMarketingContent()}</p>
            </div>
          </div>
        );

      case 'related':
        return (
          <div className="ai-suggestion-panel__related">
            <div className="related-section">
              <h4><FaVideo /> Series liên quan</h4>
              <div className="related-series-list">
                {data?.relatedSeries && data.relatedSeries.length > 0 ? (
                  data.relatedSeries.map((series, index) => (
                    <div key={index} className="related-series-item">
                      <div className="series-info">
                        <h5>{series}</h5>
                        <p className="series-description">
                          Series liên quan được AI gợi ý dựa trên nội dung và thể loại phim
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-related-series">
                    <p>Không có series liên quan được gợi ý</p>
                    <p className="help-text">
                      AI sẽ gợi ý các series liên quan dựa trên tiêu đề, thể loại và nội dung phim
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="ai-suggestion-panel-overlay" onClick={onClose}>
      <div className="ai-suggestion-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ai-suggestion-panel__header">
          <h3>
            <FaMagic /> AI Gợi ý Dữ liệu Phim
          </h3>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {loading && (
          <div className="ai-suggestion-panel__loading">
            <FaSpinner className="spinner" />
            <p>AI đang phân tích và gợi ý dữ liệu...</p>
          </div>
        )}

        {error && (
          <div className="ai-suggestion-panel__error">
            <p>{error}</p>
          </div>
        )}

        {data && !loading && (
          <>
            <div className="ai-suggestion-panel__tabs">
              <button 
                className={classNames('tab-btn', { active: activeTab === 'overview' })}
                onClick={() => setActiveTab('overview')}
              >
                Tổng quan
              </button>
              <button 
                className={classNames('tab-btn', { active: activeTab === 'description' })}
                onClick={() => setActiveTab('description')}
              >
                Mô tả
              </button>
              <button 
                className={classNames('tab-btn', { active: activeTab === 'tags' })}
                onClick={() => setActiveTab('tags')}
              >
                Tags & SEO
              </button>
              <button 
                className={classNames('tab-btn', { active: activeTab === 'media' })}
                onClick={() => setActiveTab('media')}
              >
                Media
              </button>
              <button 
                className={classNames('tab-btn', { active: activeTab === 'marketing' })}
                onClick={() => setActiveTab('marketing')}
              >
                Marketing
              </button>
              <button 
                className={classNames('tab-btn', { active: activeTab === 'related' })}
                onClick={() => setActiveTab('related')}
              >
                Series liên quan
              </button>
            </div>

            <div className="ai-suggestion-panel__content">
              {renderTabContent()}
            </div>

            <div className="ai-suggestion-panel__actions">
              <button className="btn btn--secondary" onClick={onClose}>
                Hủy
              </button>
              <button className="btn btn--primary" onClick={handleEdit}>
                <FaEdit /> Chỉnh sửa
              </button>
              <button className="btn btn--success" onClick={handleAccept}>
                <FaCheck /> Chấp nhận
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AiSuggestionPanel;
