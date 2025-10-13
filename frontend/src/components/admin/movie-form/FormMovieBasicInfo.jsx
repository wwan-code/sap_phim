import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { FaPlus, FaTimes, FaMagic, FaSpinner } from 'react-icons/fa';
import MultiSelect from '@/components/common/MultiSelect';
import { MovieFormContext } from '@/pages/admin/Movies/MovieForm';
import { Controller } from 'react-hook-form';

const FormMovieBasicInfo = () => {
  const {
    formData,
    register,
    control,
    errors,
    setValue,
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
  } = useContext(MovieFormContext);

  const defaultTitleIndex = formData.titles.findIndex(t => t.type === 'default');
  const defaultTitle = defaultTitleIndex !== -1 ? formData.titles[defaultTitleIndex].title : '';

  return (
    <div className="admin-movie-form__section admin-movie-form__section--basic-info">
      <h2 className="admin-movie-form__section-header">Thông tin chính</h2>

      <div className="form-group">
        <label htmlFor="defaultTitle" className="form-group__label">Tiêu đề phim (Mặc định)</label>
        <div className="input-with-ai-suggest">
          <input
            type="text"
            id="defaultTitle"
            {...register(`titles.${defaultTitleIndex}.title`)}
            onChange={(e) => handleTitleChange(defaultTitleIndex, 'title', e.target.value)}
            placeholder="Tiêu đề mặc định"
            required
            className="form-control"
          />
          <button type="button" className="btn btn--ai-suggest" onClick={handleAiSuggest} disabled={aiLoading}>
            {aiLoading ? <FaSpinner className="loading-spinner" /> : <FaMagic />} AI Suggest
          </button>
        </div>
        {errors.titles?.[defaultTitleIndex]?.title && <p className="error-message">{errors.titles[defaultTitleIndex].title.message}</p>}
      </div>

      <div className="form-group">
        <label className="form-group__label">Các tiêu đề khác</label>
        <div className="admin-movie-form__dynamic-list">
          {formData.titles.map((titleObj, index) => (
            titleObj.type !== 'default' && (
              <div className="admin-movie-form__dynamic-list__item" key={index}>
                <div className="form-group">
                  <select
                    {...register(`titles.${index}.type`)}
                    onChange={(e) => handleTitleChange(index, 'type', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Chọn loại</option>
                    <option value="Japanese">Tiếng Nhật</option>
                    <option value="English">Tiếng Anh</option>
                    <option value="Vietnamese">Tiếng Việt</option>
                    <option value="Original">Nguyên bản</option>
                    <option value="Other">Khác</option>
                  </select>
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    {...register(`titles.${index}.title`)}
                    onChange={(e) => handleTitleChange(index, 'title', e.target.value)}
                    placeholder="Tiêu đề"
                    className="form-control"
                  />
                </div>
                <button type="button" className="admin-movie-form__dynamic-list__item__remove-btn" onClick={() => removeTitleField(index)}>
                  <FaTimes />
                </button>
              </div>
            )
          ))}
          <button type="button" className="admin-movie-form__dynamic-list__add-btn" onClick={addTitleField}>
            <FaPlus /> Thêm tiêu đề khác
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="type" className="form-group__label">Loại</label>
        <select id="type" {...register('type')} className="form-select">
          <option value="movie">Phim lẻ</option>
          <option value="series">Phim bộ</option>
        </select>
        {errors.type && <p className="error-message">{errors.type.message}</p>}
      </div>

      {formData.type === 'series' && (
        <>
          <div className="form-group">
            <label htmlFor="seriesId" className="form-group__label">Thuộc Series</label>
            <select id="seriesId" {...register('seriesId')} className="form-select">
              <option value="">Không thuộc series nào</option>
              {series.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
            {errors.seriesId && <p className="error-message">{errors.seriesId.message}</p>}
          </div>
        </>
      )}

      <div className="form-row">
        <div className="form-group form-group--half">
          <label htmlFor="season" className="form-group__label">Season</label>
          <input
            type="text"
            id="season"
            {...register('season')}
            placeholder="Ví dụ: Season 1"
            className="form-control"
          />
          {errors.season && <p className="error-message">{errors.season.message}</p>}
        </div>
        <div className="form-group form-group--half">
          <label htmlFor="totalEpisodes" className="form-group__label">Tổng số tập</label>
          <input
            type="number"
            id="totalEpisodes"
            {...register('totalEpisodes', { valueAsNumber: true })}
            min="0"
            placeholder="0"
            className="form-control"
          />
          {errors.totalEpisodes && <p className="error-message">{errors.totalEpisodes.message}</p>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="description" className="form-group__label">Mô tả</label>
        <textarea
          id="description"
          {...register('description')}
          placeholder="Mô tả phim..."
          className="form-group__textarea"
        ></textarea>
        {errors.description && <p className="error-message">{errors.description.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="countryId" className="form-group__label">Quốc gia</label>
        <select id="countryId" {...register('countryId')} className="form-select">
          <option value="">Chọn quốc gia</option>
          {countries.map(country => (
            <option key={country.id} value={country.id}>{country.title}</option>
          ))}
        </select>
        {errors.countryId && <p className="error-message">{errors.countryId.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="categoryId" className="form-group__label">Danh mục</label>
        <select id="categoryId" {...register('categoryId')} className="form-select">
          <option value="">Chọn danh mục</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>{category.title}</option>
          ))}
        </select>
        {errors.categoryId && <p className="error-message">{errors.categoryId.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="genres" className="form-group__label">Thể loại</label>
        <Controller
          name="genres"
          control={control}
          render={({ field }) => (
            <MultiSelect
              options={genres}
              value={selectedGenres}
              onChange={(selected) => {
                setSelectedGenres(selected);
                // RHF doesn't directly manage MultiSelect, so we update it manually
                // and rely on the parent's validation for selectedGenres length
              }}
              placeholder="Chọn thể loại..."
              label=""
            />
          )}
        />
        {errors.genres && <p className="error-message">{errors.genres.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="year" className="form-group__label">Năm sản xuất</label>
        <input
          type="number"
          id="year"
          {...register('year', { valueAsNumber: true })}
          placeholder="Ví dụ: 2023"
          className="form-control"
        />
        {errors.year && <p className="error-message">{errors.year.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="belongToCategory" className="form-group__label">Thuộc thể loại</label>
        <select id="belongToCategory" {...register('belongToCategory')} className="form-select">
          <option value="Phim lẻ">Phim lẻ</option>
          <option value="Phim bộ">Phim bộ</option>
        </select>
        {errors.belongToCategory && <p className="error-message">{errors.belongToCategory.message}</p>}
      </div>

      <div className="form-group admin-movie-form__tags-input">
        <label htmlFor="tags" className="form-group__label">Tags (cách nhau bởi dấu phẩy)</label>
        <input
          type="text"
          id="tags"
          value={formData.tags.join(', ')} // Display current tags
          onChange={handleTagsChange}
          placeholder="action, adventure, sci-fi"
          className="form-control"
        />
        {errors.tags && <p className="error-message">{errors.tags.message}</p>}
      </div>

      <div className="form-group admin-movie-form__tags-input">
        <label htmlFor="seoKeywords" className="form-group__label">
          SEO Keywords (cách nhau bởi dấu phẩy)
          <span className="form-group__helper-text">
            (Các từ khóa giúp phim dễ tìm thấy trên công cụ tìm kiếm)
          </span>
        </label>
        <input
          type="text"
          id="seoKeywords"
          value={formData.seoKeywords.join(', ')} // Display current keywords
          onChange={handleSeoKeywordsChange}
          placeholder="phim hay, xem phim online, phim hành động"
          className="form-control"
        />
        {errors.seoKeywords && <p className="error-message">{errors.seoKeywords.message}</p>}
      </div>
    </div>
  );
};

FormMovieBasicInfo.propTypes = {
  // Props are now consumed from context, so PropTypes are no longer needed here.
  // However, if you prefer to keep them for documentation, you can mark them as optional.
};

export default FormMovieBasicInfo;
