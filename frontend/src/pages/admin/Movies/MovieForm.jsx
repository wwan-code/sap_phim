import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import movieService from '@/services/movieService';
import genreService from '@/services/genreService';
import countryService from '@/services/countryService';
import categoryService from '@/services/categoryService';
import seriesService from '@/services/seriesService';
import AiSuggestionPanel from '@/components/admin/AiSuggestionPanel';
import useAiSuggestion from '@/hooks/useAiSuggestion';
import '@/assets/scss/pages/admin/movie/_movie-form.scss';

// Import new child components
import FormMovieBasicInfo from '@/components/admin/movie-form/FormMovieBasicInfo';
import FormMovieDetails from '@/components/admin/movie-form/FormMovieDetails';
import FormMovieMedia from '@/components/admin/movie-form/FormMovieMedia';
import FormMovieProduction from '@/components/admin/movie-form/FormMovieProduction';
import FormMovieStats from '@/components/admin/movie-form/FormMovieStats';

// React Hook Form and Yup imports
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Create a context for the Movie Form
export const MovieFormContext = createContext(null);

// Define Yup validation schema
const movieSchema = yup.object().shape({
  titles: yup.array().of(
    yup.object().shape({
      type: yup.string().nullable(),
      title: yup.string().required('Tiêu đề là bắt buộc.'),
    })
  ).min(1, 'Phải có ít nhất một tiêu đề.').test(
    'has-default-title',
    'Phải có tiêu đề mặc định.',
    (value) => value.some(title => title.type === 'default' && title.title.trim() !== '')
  ),
  duration: yup.string().nullable(),
  quality: yup.string().nullable(),
  subtitles: yup.array().of(yup.string()).nullable(),
  status: yup.string().required('Trạng thái là bắt buộc.'),
  views: yup.number().min(0, 'Lượt xem không thể âm.').required('Lượt xem là bắt buộc.'),
  countryId: yup.string().nullable(),
  categoryId: yup.string().nullable(),
  year: yup.number().nullable().transform(value => (isNaN(value) || value === null) ? undefined : value).min(1900, 'Năm sản xuất không hợp lệ.').max(new Date().getFullYear() + 5, 'Năm sản xuất không hợp lệ.'),
  belongToCategory: yup.string().required('Thuộc thể loại là bắt buộc.'),
  description: yup.string().nullable(),
  totalEpisodes: yup.number().min(0, 'Tổng số tập không thể âm.').nullable(),
  releaseDate: yup.string().nullable(),
  classification: yup.string().nullable(),
  trailerUrl: yup.string().url('URL Trailer không hợp lệ.').nullable(),
  seriesId: yup.string().nullable(),
  type: yup.string().required('Loại là bắt buộc.'),
  tags: yup.array().of(yup.string()).nullable(),
  season: yup.string().nullable(),
  seoKeywords: yup.array().of(yup.string()).nullable(),
  marketingContent: yup.object().shape({
    vietnamese: yup.string().nullable(),
    english: yup.string().nullable(),
  }).nullable(),
  director: yup.string().nullable(),
  studio: yup.string().nullable(),
  imdb: yup.string().nullable(),
  cast: yup.array().of(
    yup.object().shape({
      actor: yup.string().nullable(),
      role: yup.string().nullable(),
    })
  ).nullable(),
});

const MovieForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = useMemo(() => !!id, [id]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    watch,
    formState: { errors },
    reset
  } = useForm({
    resolver: yupResolver(movieSchema),
    defaultValues: {
      titles: [{ type: 'default', title: '' }],
      duration: '',
      quality: '',
      subtitles: [],
      status: 'upcoming',
      views: 0,
      countryId: '',
      categoryId: '',
      year: '',
      belongToCategory: 'Phim lẻ',
      description: '',
      totalEpisodes: 0,
      releaseDate: '',
      classification: '',
      trailerUrl: '',
      seriesId: '',
      type: 'movie',
      tags: [],
      season: '',
      seoKeywords: [],
      marketingContent: { vietnamese: '', english: '' },
      director: '',
      studio: '',
      imdb: '',
      cast: [],
    }
  });

  const formData = watch(); // Watch all form data for real-time updates

  const [genres, setGenres] = useState([]);
  const [countries, setCountries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [series, setSeries] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);

  const [imagePreviews, setImagePreviews] = useState({
    poster: null,
    banner: null,
    cover: null,
  });
  const [imageFiles, setImageFiles] = useState({
    poster: null,
    banner: null,
    cover: null,
  });

  const [loading, setLoading] = useState(false);
  
  // AI Suggestion state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiSuggestionData, setAiSuggestionData] = useState(null);
  const { 
    loading: aiLoading, 
    data: aiData, 
    error: aiError, 
    suggestMovieData, 
    clearState: clearAiState 
  } = useAiSuggestion();

  // Fetch initial data for selects (genres, countries, categories)
  useEffect(() => {
    const fetchSelectOptions = async () => {
      try {
        const [genresRes, countriesRes, categoriesRes, seriesRes] = await Promise.all([
          genreService.getAllGenres(),
          countryService.getAllCountries(),
          categoryService.getAllCategories(),
          seriesService.getAllSeries(),
        ]);
        setGenres(genresRes.data.map(g => ({ id: g.id, title: g.title })));
        setCountries(countriesRes.data.map(c => ({ id: c.id, title: c.title })));
        setCategories(categoriesRes.data.map(c => ({ id: c.id, title: c.title })));
        setSeries(seriesRes.data.map(s => ({ id: s.id, title: s.title })));
      } catch (err) {
        toast.error('Lỗi khi tải các tùy chọn.');
        console.error('Lỗi tải tùy chọn:', err);
      }
    };
    fetchSelectOptions();
  }, []);

  // Fetch movie data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      const fetchMovie = async () => {
        try {
          const response = await movieService.getMovieById(id);
          const movieData = response.data;

          // Chuyển đổi định dạng dữ liệu từ API sang state của form
          const defaultValues = {
            titles: movieData.titles || [{ type: 'default', title: '' }],
            duration: movieData.duration || '',
            quality: movieData.quality || '',
            subtitles: movieData.subtitles || [],
            status: movieData.status || 'upcoming',
            views: movieData.views || 0,
            countryId: movieData.countryId || '',
            categoryId: movieData.categoryId || '',
            year: movieData.year || '',
            belongToCategory: movieData.belongToCategory || 'Phim lẻ',
            description: movieData.description || '',
            totalEpisodes: movieData.totalEpisodes || 0,
            releaseDate: movieData.releaseDate ? movieData.releaseDate.split('T')[0] : '', // Format YYYY-MM-DD
            classification: movieData.classification || '',
            trailerUrl: movieData.trailerUrl || '',
            seriesId: movieData.seriesId || '',
            type: movieData.type || 'movie',
            tags: movieData.tags || [],
            season: movieData.season || '',
            seoKeywords: movieData.seoKeywords || [],
            marketingContent: movieData.marketingContent || { vietnamese: '', english: '' },
            director: movieData.director || '',
            studio: movieData.studio || '',
            imdb: movieData.imdb || '',
            cast: movieData.cast || [],
          };
          reset(defaultValues); // Reset form with fetched data

          setSelectedGenres(movieData.genres?.map(g => ({ id: g.id, title: g.title })) || []);

          // Set image previews from existing URLs
          setImagePreviews({
            poster: movieData.image?.posterUrl ? `${import.meta.env.VITE_SERVER_URL}${movieData.image.posterUrl}` : null,
            banner: movieData.image?.bannerUrl ? `${import.meta.env.VITE_SERVER_URL}${movieData.image.bannerUrl}` : null,
            cover: movieData.image?.coverUrl ? `${import.meta.env.VITE_SERVER_URL}${movieData.image.coverUrl}` : null,
          });
        } catch (err) {
          toast.error('Lỗi khi tải thông tin phim.');
          console.error('Lỗi tải phim:', err);
          navigate('/admin/movies'); // Quay lại danh sách nếu không tìm thấy phim
        } finally {
          setLoading(false);
        }
      };
      fetchMovie();
    }
  }, [id, isEditMode, navigate, reset]);

  const handleTitleChange = useCallback((index, field, value) => {
    const newTitles = [...getValues('titles')];
    newTitles[index] = { ...newTitles[index], [field]: value };
    setValue('titles', newTitles, { shouldValidate: true });
  }, [getValues, setValue]);

  const addTitleField = useCallback(() => {
    const currentTitles = getValues('titles');
    setValue('titles', [...currentTitles, { type: '', title: '' }], { shouldValidate: true });
  }, [getValues, setValue]);

  const removeTitleField = useCallback((index) => {
    const newTitles = getValues('titles').filter((_, i) => i !== index);
    setValue('titles', newTitles, { shouldValidate: true });
  }, [getValues, setValue]);

  const handleTagsChange = useCallback((e) => {
    const tagsArray = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    setValue('tags', tagsArray, { shouldValidate: true });
  }, [setValue]);

  const handleSeoKeywordsChange = useCallback((e) => {
    const keywordsArray = e.target.value.split(',').map(keyword => keyword.trim()).filter(keyword => keyword !== '');
    setValue('seoKeywords', keywordsArray, { shouldValidate: true });
  }, [setValue]);

  const handleMarketingContentChange = useCallback((lang, value) => {
    setValue(`marketingContent.${lang}`, value, { shouldValidate: true });
  }, [setValue]);

  const handleCastChange = useCallback((index, field, value) => {
    const newCast = [...getValues('cast')];
    newCast[index] = { ...newCast[index], [field]: value };
    setValue('cast', newCast, { shouldValidate: true });
  }, [getValues, setValue]);

  const addCastField = useCallback(() => {
    const currentCast = getValues('cast');
    setValue('cast', [...currentCast, { actor: '', role: '' }], { shouldValidate: true });
  }, [getValues, setValue]);

  const removeCastField = useCallback((index) => {
    const newCast = getValues('cast').filter((_, i) => i !== index);
    setValue('cast', newCast, { shouldValidate: true });
  }, [getValues, setValue]);

  const handleImageChange = useCallback((e, type) => {
    const file = e.target.files[0];
    if (file) {
      setImageFiles(prev => ({ ...prev, [type]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => ({ ...prev, [type]: reader.result }));
      };
      reader.readAsDataURL(file);
    } else {
      setImageFiles(prev => ({ ...prev, [type]: null }));
      setImagePreviews(prev => ({ ...prev, [type]: null }));
    }
  }, []);

  const onSubmit = async (data) => {
    // Manual validation for selectedGenres as it's outside RHF
    if (selectedGenres.length === 0) {
      toast.error('Phải chọn ít nhất một thể loại.');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = new FormData();

      // Append all form data fields from RHF
      for (const key in data) {
        if (key === 'genres') {
          dataToSend.append('genres', JSON.stringify(selectedGenres.map(g => g.id)));
        } else if (Array.isArray(data[key]) || typeof data[key] === 'object') {
          dataToSend.append(key, JSON.stringify(data[key]));
        } else if (data[key] !== null && typeof data[key] !== 'undefined') {
          dataToSend.append(key, data[key]);
        }
      }
      // Append selected genres
      // dataToSend.append('genres', JSON.stringify(selectedGenres.map(g => g.id)));

      // Append image files
      if (imageFiles.poster) dataToSend.append('poster', imageFiles.poster);
      if (imageFiles.banner) dataToSend.append('banner', imageFiles.banner);
      if (imageFiles.cover) dataToSend.append('cover', imageFiles.cover);

      let response;
      if (isEditMode) {
        response = await movieService.updateMovie(id, dataToSend);
        toast.success('Cập nhật phim thành công!');
      } else {
        response = await movieService.createMovie(dataToSend);
        toast.success('Tạo phim mới thành công!');
      }
      navigate(`/admin/movies/${response.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thao tác thất bại.');
      console.error('Lỗi khi gửi form phim:', err);
    } finally {
      setLoading(false);
    }
  };

  const defaultTitleForPreview = useMemo(() => {
    const titles = getValues('titles');
    const defaultTitleObj = titles.find(t => t.type === 'default');
    return defaultTitleObj ? defaultTitleObj.title : 'Chưa có tiêu đề';
  }, [getValues]);

  const handleAiSuggest = useCallback(async () => {
    const currentTitles = getValues('titles');
    if (!currentTitles.find(t => t.type === 'default')?.title.trim()) {
      toast.warn('Vui lòng nhập tiêu đề mặc định trước khi sử dụng AI Suggest.');
      return;
    }
    const movieInfo = {
      titles: currentTitles,
      season: getValues('season'),
      country: countries.find(country => country.id === parseInt(getValues('countryId')))?.title,
      description: getValues('description'),
      genres: selectedGenres,
      releaseYear: getValues('year'),
      type: getValues('type')
    };

    const suggestedData = await suggestMovieData(movieInfo);
    
    if (suggestedData) {
      setAiSuggestionData(suggestedData);
      setShowAiPanel(true);
    }
  }, [getValues, selectedGenres, countries, suggestMovieData]);

  const handleAcceptAiSuggestion = useCallback((suggestionData) => {
    if (!suggestionData) return;

    // Map AI suggestions to form data
    const updatedFields = {
      description: suggestionData.description?.vietnamese || suggestionData.description,
      tags: suggestionData.tags,
      duration: suggestionData.duration,
      quality: suggestionData.quality,
      subtitles: suggestionData.subtitles,
      releaseDate: suggestionData.releaseDate,
      classification: suggestionData.classification,
      year: suggestionData.releaseYear,
      totalEpisodes: suggestionData.totalEpisodes,
      seoKeywords: suggestionData.seoKeywords,
      marketingContent: suggestionData.marketingContent,
      director: suggestionData.director,
      studio: suggestionData.studio,
      imdb: suggestionData.imdb,
      cast: suggestionData.cast,
      season: suggestionData.season,
      status: suggestionData.status
    };

    // Update form fields using setValue
    for (const key in updatedFields) {
      if (updatedFields[key] !== undefined && updatedFields[key] !== null) {
        setValue(key, updatedFields[key], { shouldValidate: true });
      }
    }

    // Handle otherTitles
    let newTitles = [...getValues('titles')];
    const defaultTitleIndex = newTitles.findIndex(t => t.type === 'default');

    // Update default title if AI suggested a new one
    if (suggestionData.title && defaultTitleIndex !== -1) {
      newTitles[defaultTitleIndex] = { ...newTitles[defaultTitleIndex], title: suggestionData.title };
    } else if (suggestionData.title && defaultTitleIndex === -1) {
      newTitles.push({ type: 'default', title: suggestionData.title });
    }

    // Add or update otherTitles from AI suggestion
    if (suggestionData.otherTitles && Array.isArray(suggestionData.otherTitles)) {
      suggestionData.otherTitles.forEach(aiOtherTitle => {
        const existingTitleIndex = newTitles.findIndex(t => t.type === aiOtherTitle.type);
        if (existingTitleIndex !== -1) {
          newTitles[existingTitleIndex] = aiOtherTitle;
        } else {
          newTitles.push(aiOtherTitle);
        }
      });
    }
    setValue('titles', newTitles, { shouldValidate: true });
    
    // Map suggested genres to selected genres if possible
    if (suggestionData.genres && Array.isArray(suggestionData.genres)) {
      const mappedGenres = suggestionData.genres
        .map(genreName => genres.find(g => g.title.toLowerCase() === genreName.toLowerCase()))
        .filter(Boolean);
      
      if (mappedGenres.length > 0) {
        setSelectedGenres(mappedGenres);
      }
    }

    // Map suggested country to countryId if possible
    if (suggestionData.country) {
      const mappedCountry = countries.find(c => c.title.toLowerCase() === suggestionData.country.toLowerCase());
      if (mappedCountry) {
        setValue('countryId', mappedCountry.id, { shouldValidate: true });
      }
    }

    // Map suggested category to countryId if possible
    if (suggestionData.category) {
      const mappedCategory = categories.find(c => c.title.toLowerCase() === suggestionData.category.toLowerCase());
      if (mappedCategory) {
        setValue('categoryId', mappedCategory.id, { shouldValidate: true });
      }
    }

    toast.success('Đã áp dụng gợi ý AI thành công!');
    setShowAiPanel(false);
    clearAiState();
  }, [getValues, setValue, genres, clearAiState, setSelectedGenres]);

  const handleEditAiSuggestion = useCallback((suggestionData) => {
    if (!suggestionData) return;

    const fieldsToUpdate = {
      description: suggestionData.description?.vietnamese || suggestionData.description,
      tags: suggestionData.tags,
      duration: suggestionData.duration,
      quality: suggestionData.quality,
      subtitles: suggestionData.subtitles,
      releaseDate: suggestionData.releaseDate,
      trailerUrl: suggestionData.trailerUrl,
      classification: suggestionData.classification,
      year: suggestionData.releaseYear,
      totalEpisodes: suggestionData.totalEpisodes,
      seoKeywords: suggestionData.seoKeywords,
      marketingContent: suggestionData.marketingContent,
      director: suggestionData.director,
      studio: suggestionData.studio,
      imdb: suggestionData.imdb,
      cast: suggestionData.cast,
    };

    for (const key in fieldsToUpdate) {
      if (fieldsToUpdate[key] !== undefined && fieldsToUpdate[key] !== null) {
        setValue(key, fieldsToUpdate[key], { shouldValidate: true });
      }
    }

    toast.info('Đã sao chép dữ liệu AI vào form để chỉnh sửa.');
    setShowAiPanel(false);
  }, [setValue]);

  const handleCloseAiPanel = useCallback(() => {
    setShowAiPanel(false);
    clearAiState();
  }, [clearAiState]);

  const contextValue = useMemo(() => ({
    formData,
    register,
    control,
    errors,
    setValue,
    getValues,
    handleTitleChange,
    addTitleField,
    removeTitleField,
    handleAiSuggest,
    aiLoading,
    genres,
    countries,
    categories,
    series,
    selectedGenres,
    setSelectedGenres,
    handleTagsChange,
    handleSeoKeywordsChange,
    handleMarketingContentChange,
    handleCastChange,
    addCastField,
    removeCastField,
    handleImageChange,
    imagePreviews,
  }), [
    formData, register, control, errors, setValue, getValues,
    handleTitleChange, addTitleField, removeTitleField,
    handleAiSuggest, aiLoading, genres, countries, categories, series,
    selectedGenres, setSelectedGenres, handleTagsChange, handleSeoKeywordsChange,
    handleMarketingContentChange, handleCastChange, addCastField, removeCastField,
    handleImageChange, imagePreviews,
  ]);

  return (
    <MovieFormContext.Provider value={contextValue}>
      <div className="admin-movie-form admin-page">
        <div className="admin-movie-form__header admin-page__header">
          <h1>{isEditMode ? `Chỉnh sửa Phim: ${defaultTitleForPreview}` : 'Thêm Phim Mới'}</h1>
          <button className="btn btn-primary" onClick={() => navigate('/admin/movies')}>
            Quay lại danh sách
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="admin-movie-form__grid">
            {/* Cột trái: thông tin chính */}
            <div>
              <FormMovieBasicInfo />
              <FormMovieDetails />
            </div>

            {/* Cột phải: metadata, production, marketing */}
            <div>
              <FormMovieProduction />
              <FormMovieMedia />
              <FormMovieStats />
            </div>
          </div>

          <div className="admin-movie-form__actions">
            <button type="button" className="btn" onClick={() => navigate('/admin/movies')}>
              Hủy
            </button>
            <button type="submit" className="btn btn--submit" disabled={loading}>
              {loading ? 'Đang lưu...' : (isEditMode ? 'Cập nhật Phim' : 'Tạo Phim')}
            </button>
          </div>
        </form>

        {/* AI Suggestion Panel */}
        <AiSuggestionPanel
          isOpen={showAiPanel}
          onClose={handleCloseAiPanel}
          onAccept={handleAcceptAiSuggestion}
          onEdit={handleEditAiSuggestion}
          data={aiSuggestionData}
          loading={aiLoading}
          error={aiError}
        />
      </div>
    </MovieFormContext.Provider>
  );
};

export default MovieForm;
