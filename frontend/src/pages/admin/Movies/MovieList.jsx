import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import movieService from '@/services/movieService';
import genreService from '@/services/genreService';
import countryService from '@/services/countryService';
import { useDebounce } from '@/hooks/useDebounce';
import Pagination from '@/components/common/Pagination';
import MultiSelect from '@/components/common/MultiSelect';
import classNames from '@/utils/classNames';
import { FaEye, FaPlus } from 'react-icons/fa';

const MovieList = () => {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    genre: [],
    country: '',
    year: '',
    q: '',
  });
  const [sort, setSort] = useState('releaseDate:desc'); // Mặc định sắp xếp theo ngày phát hành giảm dần

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = useMemo(() => Math.ceil(totalItems / itemsPerPage), [totalItems, itemsPerPage]);

  const debouncedSearchTerm = useDebounce(filters.q, 300);

  // Lấy danh sách Genres và Countries cho bộ lọc
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [genresRes, countriesRes] = await Promise.all([
          genreService.getAllGenres(),
          countryService.getAllCountries(),
        ]);
        setGenres(genresRes.data.map(g => ({ id: g.id, title: g.title })));
        setCountries(countriesRes.data.map(c => ({ id: c.id, title: c.title })));
      } catch (err) {
        toast.error('Lỗi khi tải các tùy chọn bộ lọc.');
        console.error('Lỗi tải tùy chọn bộ lọc:', err);
      }
    };
    fetchFilterOptions();
  }, []);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        q: debouncedSearchTerm,
        genre: filters.genre.map(g => g.id).join(','),
        country: filters.country,
        sort: sort,
      };
      const response = await movieService.getMovies(params);
      setMovies(response.data);
      setTotalItems(response.meta.total);
    } catch (err) {
      setError('Không thể tải danh sách phim.');
      toast.error('Không thể tải danh sách phim.');
      console.error('Lỗi tải phim:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearchTerm, filters.genre, filters.country, sort]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((e) => {
    setSort(e.target.value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((limit) => {
    setItemsPerPage(parseInt(limit));
    setCurrentPage(1);
  }, []);

  const handleDeleteMovie = async (idToDelete) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phim này không?')) {
      try {
        await movieService.deleteMovie(idToDelete);
        toast.success('Phim đã được xóa thành công!');
        fetchMovies();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Xóa phim thất bại.');
        console.error('Lỗi xóa phim:', err);
      }
    }
  };

  const getMovieDefaultTitle = useCallback((titles) => {
    const defaultTitle = titles?.find(t => t.type === 'default');
    return defaultTitle ? defaultTitle.title : 'Không có tiêu đề';
  }, []);

  const getMovieGenres = useCallback((movieGenres) => {
    return movieGenres?.map(g => g.title).join(', ') || 'N/A';
  }, []);

  const getMoviePoster = useCallback((image) => {
    return image?.posterUrl ? `${import.meta.env.VITE_SERVER_URL}${image.posterUrl}` : 'https://placehold.co/250x350?text=No+Poster';
  }, []);

  if (loading && movies.length === 0) {
    return <div className="admin-page__loading">Loading movies...</div>;
  }

  if (error) {
    return <div className="admin-page__error">Lỗi: {error}</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Quản lý Phim</h1>
        <Link to="/admin/movies/new" className="btn btn-primary">
          <FaPlus /> Thêm Phim Mới
        </Link>
      </div>

      <div className="admin-page__filters">
        <div className="filter-group">
          <label htmlFor="search-movie">Tìm kiếm theo tiêu đề</label>
          <input
            type="text"
            id="search-movie"
            placeholder="Nhập tiêu đề phim..."
            value={filters.q}
            onChange={(e) => handleFilterChange('q', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="genre-select">Thể loại</label>
          <MultiSelect
            options={genres}
            value={filters.genre}
            onChange={(selected) => handleFilterChange('genre', selected)}
            placeholder="Chọn thể loại..."
            label="" // Label đã có ở trên
          />
        </div>

        <div className="filter-group">
          <label htmlFor="country-select">Quốc gia</label>
          <select
            id="country-select"
            value={filters.country}
            onChange={(e) => handleFilterChange('country', e.target.value)}
            className='form-select'
          >
            <option value="">Tất cả</option>
            {countries.map(country => (
              <option key={country.id} value={country.id}>{country.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="admin-page__controls">
        <div className="admin-page__sort">
          <label htmlFor="sort-by">Sắp xếp theo:</label>
          <select id="sort-by" value={sort} onChange={handleSortChange} className='form-select'>
            <option value="releaseDate:desc">Ngày phát hành (Mới nhất)</option>
            <option value="releaseDate:asc">Ngày phát hành (Cũ nhất)</option>
            <option value="views:desc">Lượt xem (Giảm dần)</option>
            <option value="views:asc">Lượt xem (Tăng dần)</option>
            <option value="titles.default.title:asc">Tiêu đề (A-Z)</option>
            <option value="titles.default.title:desc">Tiêu đề (Z-A)</option>
          </select>
        </div>
        <div className="admin-page__limit-selector">
          <select value={itemsPerPage} onChange={(e) => handleItemsPerPageChange(e.target.value)} className='form-select'>
            <option value="5">5 phim/trang</option>
            <option value="10">10 phim/trang</option>
            <option value="20">20 phim/trang</option>
          </select>
        </div>
      </div>

      <div className="admin-page__grid">
        {movies.length > 0 ? (
          movies.map((movie) => (
            <div className="admin-page__card" key={movie.id}>
              <img
                src={getMoviePoster(movie.image)}
                alt={getMovieDefaultTitle(movie.titles)}
                className="admin-page__card--poster"
              />
              <div className="admin-page__card--info">
                <h3 className="admin-page__card--title">
                  {getMovieDefaultTitle(movie.titles)}
                </h3>
                <p className="admin-page__card--meta">
                  <span>{movie.year}</span> | <span>{movie.countries?.title || 'N/A'}</span>
                </p>
                <p className="admin-page__card--meta">
                  Thể loại: {getMovieGenres(movie.genres)}
                </p>
                <div className="admin-page__card--views">
                  <FaEye className="icon" /> {movie.views} lượt xem
                </div>
                <div className="admin-page__card--actions">
                  <Link to={`/admin/movies/${movie.id}`} className="btn btn--detail">
                    Chi tiết
                  </Link>
                  <Link to={`/admin/movies/${movie.id}/edit`} className="btn btn--edit">
                    Sửa
                  </Link>
                  <button
                    className="btn btn--delete"
                    onClick={() => handleDeleteMovie(movie.id)}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="admin-page__no-results">Không tìm thấy phim nào.</div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default MovieList;
