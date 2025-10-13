import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import movieService from '@/services/movieService';
import episodeService from '@/services/episodeService';
import Pagination from '@/components/common/Pagination';
import classNames from '@/utils/classNames';
import { FaEdit, FaTrash, FaPlus, FaPlayCircle, FaFilm } from 'react-icons/fa'; // Icons
import '@/assets/scss/pages/admin/movie/_movie-detail.scss';

const MovieDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMarketingLang, setSelectedMarketingLang] = useState('vietnamese'); // New state for marketing content language

  const [isEpisodeModalOpen, setIsEpisodeModalOpen] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState({
    id: null,
    episodeNumber: '',
    linkEpisode: '',
    duration: '',
  });
  const [episodeFormErrors, setEpisodeFormErrors] = useState({});
  const [episodeLoading, setEpisodeLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const totalPages = useMemo(() => Math.ceil(totalEpisodes / itemsPerPage), [totalEpisodes, itemsPerPage]);

  const fetchEpisodes = useCallback(async () => {
    setError(null);
    try {
      const episodesRes = await episodeService.getEpisodesByMovieId(id, { page: currentPage, limit: itemsPerPage });
      setEpisodes(episodesRes.data);
      setTotalEpisodes(episodesRes.meta.total);
    } catch (err) {
      setError('Không thể tải danh sách tập phim.');
      toast.error('Lỗi khi tải danh sách tập phim.');
      console.error('Lỗi tải tập phim:', err);
    }
  }, [id, currentPage, itemsPerPage]);

  const fetchMovie = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const movieRes = await movieService.getMovieById(id);
      setMovie(movieRes.data);
    } catch (err) {
      setError('Không thể tải thông tin phim.');
      toast.error('Lỗi khi tải thông tin phim.');
      console.error('Lỗi tải phim:', err);
      navigate('/admin/movies');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchMovie();
  }, [fetchMovie]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes]);

  const getMovieDefaultTitle = useCallback((titles) => {
    const defaultTitle = titles?.find(t => t.type === 'default');
    return defaultTitle ? defaultTitle.title : 'Không có tiêu đề';
  }, []);

  const getMoviePoster = useCallback((image) => {
    return image?.posterUrl ? `${import.meta.env.VITE_SERVER_URL}${image.posterUrl}` : 'https://placehold.co/400x600?text=No+Poster';
  }, []);

  const handleEpisodePageChange = useCallback((page) => {
    setCurrentPage(page);
    fetchEpisodes();
  }, [fetchEpisodes]);

  const handleEpisodeItemsPerPageChange = useCallback((limit) => {
    setItemsPerPage(parseInt(limit));
    setCurrentPage(1); // Reset về trang 1 khi thay đổi số lượng item
    fetchEpisodes(); // Fetch episodes with new limit
  }, [fetchEpisodes]);

  // Episode Form Handlers
  const validateEpisodeForm = useCallback(() => {
    const errors = {};
    if (!currentEpisode.episodeNumber || currentEpisode.episodeNumber <= 0) {
      errors.episodeNumber = 'Số tập phải là số dương.';
    }
    if (!currentEpisode.linkEpisode.trim()) {
      errors.linkEpisode = 'Link tập phim là bắt buộc.';
    }
    setEpisodeFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [currentEpisode]);

  const handleEpisodeChange = useCallback((e) => {
    const { name, value } = e.target;
    setCurrentEpisode(prev => ({ ...prev, [name]: value }));
  }, []);

  const openCreateEpisodeModal = useCallback(() => {
    setCurrentEpisode({ id: null, episodeNumber: '', linkEpisode: '', duration: '' });
    setEpisodeFormErrors({});
    setIsEpisodeModalOpen(true);
  }, []);

  const openEditEpisodeModal = useCallback((episode) => {
    setCurrentEpisode({
      id: episode.id,
      episodeNumber: episode.episodeNumber,
      linkEpisode: episode.linkEpisode,
      duration: episode.duration || '',
    });
    setEpisodeFormErrors({});
    setIsEpisodeModalOpen(true);
  }, []);

  const handleSaveEpisode = async (e) => {
    e.preventDefault();
    if (!validateEpisodeForm()) {
      toast.error('Vui lòng kiểm tra lại thông tin tập phim.');
      return;
    }

    setEpisodeLoading(true);
    try {
      if (currentEpisode.id) {
        await episodeService.updateEpisode(currentEpisode.id, currentEpisode);
        toast.success('Cập nhật tập phim thành công!');
      } else {
        await episodeService.createEpisode(id, currentEpisode);
        toast.success('Tạo tập phim mới thành công!');
      }
      setIsEpisodeModalOpen(false);
      fetchEpisodes(); // Tải lại danh sách tập phim
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thao tác thất bại.');
      console.error('Lỗi khi lưu tập phim:', err);
    } finally {
      setEpisodeLoading(false);
    }
  };

  const handleDeleteEpisode = async (episodeId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tập phim này không?')) {
      try {
        await episodeService.deleteEpisode(episodeId);
        toast.success('Tập phim đã được xóa thành công!');
        fetchEpisodes(); // Tải lại danh sách tập phim
      } catch (err) {
        toast.error(err.response?.data?.message || 'Xóa tập phim thất bại.');
        console.error('Lỗi xóa tập phim:', err);
      }
    }
  };

  // Handle delete movie - assuming this function exists elsewhere or needs to be added
  const handleDeleteMovie = async (movieId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phim này không?')) {
      try {
        await movieService.deleteMovie(movieId);
        toast.success('Phim đã được xóa thành công!');
        navigate('/admin/movies');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Xóa phim thất bại.');
        console.error('Lỗi xóa phim:', err);
      }
    }
  };


  if (loading) {
    return <div className="admin-movie-detail admin-page__loading">Đang tải thông tin phim...</div>;
  }

  if (error) {
    return <div className="admin-movie-detail admin-page__error">Lỗi: {error}</div>;
  }

  if (!movie) {
    return <div className="admin-movie-detail admin-page__loading">Không tìm thấy phim.</div>;
  }

  return (
    <div className="admin-movie-detail">
      <div className="admin-movie-detail__header">
        <h1><FaFilm /> Chi tiết Phim: {getMovieDefaultTitle(movie.titles)}</h1>
        <div className="admin-movie-detail__actions">
          {movie.trailerUrl && (
            <a href={movie.trailerUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <FaPlayCircle /> Xem Trailer
            </a>
          )}
          <Link to={`/admin/movies/${movie.id}/edit`} className="btn btn-primary">
            <FaEdit /> Chỉnh sửa Phim
          </Link>
          <button className="btn btn--delete" onClick={() => handleDeleteMovie(movie.id)}>
            <FaTrash /> Xóa Phim
          </button>
        </div>
      </div>

      <div className="admin-movie-detail__content">
        <div className="admin-movie-detail__poster">
          <img src={getMoviePoster(movie.image)} alt={getMovieDefaultTitle(movie.titles)} />
          <div className="admin-movie-detail__info">
            <div className="info-group">
              <h2 className="info-group__title">Thông tin cơ bản</h2>
              <div className="info-group__item">
                <strong className="info-group__label">Tiêu đề khác:</strong>
                <span className="info-group__value">
                  {movie.titles?.filter(t => t.type !== 'default').map(t => `${t.title} (${t.type})`).join(', ') || 'N/A'}
                </span>
              </div>
              <div className="info-group__item">
                <strong className="info-group__label">Slug:</strong>
                <span className="info-group__value">{movie.slug}</span>
              </div>
              <div className="info-group__item">
                <strong className="info-group__label">Thời lượng:</strong>
                <span className="info-group__value">{movie.duration || 'N/A'}</span>
              </div>
              <div className="info-group__item">
                <strong className="info-group__label">Chất lượng:</strong>
                <span className="info-group__value">{movie.quality || 'N/A'}</span>
              </div>
              <div className="info-group__item">
                <strong className="info-group__label">Phụ đề:</strong>
                <span className="info-group__value">{movie.subtitles?.join(', ') || 'N/A'}</span>
              </div>
              <div className="info-group__item">
                <strong className="info-group__label">Trạng thái:</strong>
                <span className="info-group__value">{movie.status || 'N/A'}</span>
              </div>
              <div className="info-group__item">
                <strong className="info-group__label">Lượt xem:</strong>
                <span className="info-group__value">{movie.views}</span>
              </div>
              <div className="info-group__item">
                <strong className="info-group__label">Năm phát hành:</strong>
                <span className="info-group__value">{movie.year || 'N/A'}</span>
              </div>
              <div className="info-group__item">
                <strong className="info-group__label">Ngày phát hành:</strong>
                <span className="info-group__value">
                  {movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString('vi-VN') : 'N/A'}
                </span>
              </div>
              <div className="info-group__item">
                <strong className="info-group__label">Phân loại:</strong>
                <span className="info-group__value">{movie.classification || 'N/A'}</span>
              </div>
              <div className="info-group__item">
                <strong className="info-group__label">Đạo diễn:</strong>
                <span className="info-group__value">{movie.director || 'N/A'}</span>
              </div>
              <div className="info-group__item">
                <strong className="info-group__label">Studio:</strong>
                <span className="info-group__value">{movie.studio || 'N/A'}</span>
              </div>
              <div className="info-group__item">
                <strong className="info-group__label">IMDb:</strong>
                <span className="info-group__value">{movie.imdb || 'N/A'}</span>
              </div>
            </div>

          </div>

        </div>
        <div className="admin-movie-detail__info">
          <div className="info-group">
            <h2 className="info-group__title">Marketing Content</h2>
            <div className="info-group__language-tabs">
              <button
                className={classNames('btn', { 'btn-secondary': selectedMarketingLang === 'vietnamese' })}
                onClick={() => setSelectedMarketingLang('vietnamese')}
              >
                Tiếng Việt
              </button>
              <button
                className={classNames('btn', { 'btn-secondary': selectedMarketingLang === 'english' })}
                onClick={() => setSelectedMarketingLang('english')}
              >
                English
              </button>
            </div>
            <div className="info-group__item info-group__item--full-width">
              <span className="info-group__value">
                {movie.marketingContent?.[selectedMarketingLang] || 'Chưa có nội dung marketing.'}
              </span>
            </div>
          </div>

          <div className="info-group">
            <h2 className="info-group__title">Phân loại & Tags</h2>
            <div className="info-group__item">
              <strong className="info-group__label">Quốc gia:</strong>
              <span className="info-group__value">{movie.country?.title || 'N/A'}</span>
            </div>
            <div className="info-group__item">
              <strong className="info-group__label">Danh mục:</strong>
              <span className="info-group__value">{movie.category?.title || 'N/A'}</span>
            </div>
            <div className="info-group__item info-group__item--full-width">
              <strong className="info-group__label">Thể loại:</strong>
              <div className="info-group__tags">
                {movie.genres?.length > 0 ? (
                  movie.genres.map(genre => <span key={genre.id} className="info-group__tag-item">{genre.title}</span>)
                ) : (
                  <span className="info-group__value">N/A</span>
                )}
              </div>
            </div>
            <div className="info-group__item info-group__item--full-width">
              <strong className="info-group__label">Tags:</strong>
              <div className="info-group__tags">
                {movie.tags?.length > 0 ? (
                  movie.tags.map((tag, index) => <span key={index} className="info-group__tag-item">{tag}</span>)
                ) : (
                  <span className="info-group__value">N/A</span>
                )}
              </div>
            </div>
            <div className="info-group__item info-group__item--full-width">
              <strong className="info-group__label">SEO Keywords:</strong>
              <div className="info-group__tags">
                {movie.seoKeywords?.length > 0 ? (
                  movie.seoKeywords.map((keyword, index) => <span key={index} className="info-group__tag-item">{keyword}</span>)
                ) : (
                  <span className="info-group__value">N/A</span>
                )}
              </div>
            </div>
          </div>

          <div className="info-group">
            <h2 className="info-group__title">Mô tả</h2>
            <div className="info-group__item info-group__item--full-width">
              <span className="info-group__value">{movie.description || 'Chưa có mô tả.'}</span>
            </div>
          </div>

          <div className="info-group">
            <h2 className="info-group__title">Diễn viên</h2>
            <div className="info-group__item info-group__item--full-width">
              <div className="info-group__cast-list">
                {movie.cast?.length > 0 ? (
                  movie.cast.map((member, index) => (
                    <div key={index} className="cast-member">
                      <strong>{member.actor}</strong> as <span>{member.role}</span>
                    </div>
                  ))
                ) : (
                  <span className="info-group__value">N/A</span>
                )}
              </div>
            </div>
          </div>


        </div>
      </div>

      <div className="admin-movie-detail__episodes">
        <div className="admin-movie-detail__episodes--header">
          <h2>Danh sách Tập phim ({totalEpisodes})</h2>
          <button className="btn btn-primary" onClick={openCreateEpisodeModal}>
            <FaPlus /> Thêm Tập phim Mới
          </button>
        </div>

        <div className="admin-page__limit-selector">
          <select value={itemsPerPage} onChange={(e) => handleEpisodeItemsPerPageChange(e.target.value)} className='form-select' >
            <option value="5">5 tập/trang</option>
            <option value="10">10 tập/trang</option>
            <option value="20">20 tập/trang</option>
          </select>
        </div>

        <div className="admin-movie-detail__episodes--list">
          {episodes.length > 0 ? (
            episodes.map(episode => (
              <div className="admin-movie-detail__episodes--item" key={episode.id}>
                <div className="episode-info">
                  <h3>Tập {episode.episodeNumber}</h3>
                  <p>Link: <a href={episode.linkEpisode} target="_blank" rel="noopener noreferrer">{episode.linkEpisode}</a></p>
                  <p>Thời lượng: {episode.duration || 'N/A'}</p>
                  <p>Lượt xem: {episode.views}</p>
                </div>
                <div className="episode-actions">
                  <a href={episode.linkEpisode} target="_blank" rel="noopener noreferrer" className="btn btn--play">
                    <FaPlayCircle /> Xem
                  </a>
                  <button className="btn btn--edit" onClick={() => openEditEpisodeModal(episode)}>
                    <FaEdit /> Sửa
                  </button>
                  <button className="btn btn--delete" onClick={() => handleDeleteEpisode(episode.id)}>
                    <FaTrash /> Xóa
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>Chưa có tập phim nào.</p>
          )}
        </div>

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handleEpisodePageChange}
          />
        )}
      </div>

      {/* Episode Form Modal */}
      {isEpisodeModalOpen && (
        <div className="admin-movie-detail__episode-form-modal">
          <div className="admin-movie-detail__episode-form-modal--content">
            <button className="admin-movie-detail__episode-form-modal--close" onClick={() => setIsEpisodeModalOpen(false)}>
              &times;
            </button>
            <h2>{currentEpisode.id ? 'Chỉnh sửa Tập phim' : 'Thêm Tập phim Mới'}</h2>
            <form onSubmit={handleSaveEpisode}>
              <div className="form-group">
                <label htmlFor="episodeNumber">Số tập</label>
                <input
                  type="number"
                  id="episodeNumber"
                  name="episodeNumber"
                  value={currentEpisode.episodeNumber}
                  onChange={handleEpisodeChange}
                  required
                  min="1"
                />
                {episodeFormErrors.episodeNumber && <p className="error-message">{episodeFormErrors.episodeNumber}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="linkEpisode">Link Tập phim</label>
                <input
                  type="text"
                  id="linkEpisode"
                  name="linkEpisode"
                  value={currentEpisode.linkEpisode}
                  onChange={handleEpisodeChange}
                  placeholder="https://example.com/episode1.mp4"
                  required
                />
                {episodeFormErrors.linkEpisode && <p className="error-message">{episodeFormErrors.linkEpisode}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="duration">Thời lượng (ví dụ: 01:23:45)</label>
                <input
                  type="text"
                  id="duration"
                  name="duration"
                  value={currentEpisode.duration}
                  onChange={handleEpisodeChange}
                  placeholder="hh:mm:ss hoặc mm:ss"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setIsEpisodeModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn--submit" disabled={episodeLoading}>
                  {episodeLoading ? 'Đang lưu...' : 'Lưu Tập phim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetail;
