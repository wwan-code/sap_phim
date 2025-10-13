import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { MovieFormContext } from '@/pages/admin/Movies/MovieForm';
import { Controller } from 'react-hook-form';

const FormMovieDetails = () => {
  const { formData, register, control, errors, setValue } = useContext(MovieFormContext);

  return (
    <div className="admin-movie-form__section admin-movie-form__section--details">
      <h2 className="admin-movie-form__section-header">Thông tin chi tiết</h2>

      <div className="form-group">
        <label htmlFor="duration" className="form-group__label">Thời lượng</label>
        <input
          type="text"
          id="duration"
          {...register('duration')}
          placeholder="Ví dụ: 1h 30m"
          className="form-control"
        />
        {errors.duration && <p className="error-message">{errors.duration.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="quality" className="form-group__label">Chất lượng</label>
        <input
          type="text"
          id="quality"
          {...register('quality')}
          placeholder="Ví dụ: HD, FHD, 4K"
          className="form-control"
        />
        {errors.quality && <p className="error-message">{errors.quality.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="subtitles" className="form-group__label">Phụ đề (cách nhau bởi dấu phẩy)</label>
        <input
          type="text"
          id="subtitles"
          value={formData.subtitles.join(', ')}
          onChange={(e) => setValue('subtitles', e.target.value.split(',').map(s => s.trim()).filter(s => s !== ''), { shouldValidate: true })}
          placeholder="Ví dụ: VietSub, EngSub, Thuyết minh"
          className="form-control"
        />
        {errors.subtitles && <p className="error-message">{errors.subtitles.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="releaseDate" className="form-group__label">Ngày phát hành</label>
        <input
          type="date"
          id="releaseDate"
          {...register('releaseDate')}
          className="form-control"
        />
        {errors.releaseDate && <p className="error-message">{errors.releaseDate.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="classification" className="form-group__label">Phân loại</label>
        <input
          type="text"
          id="classification"
          {...register('classification')}
          placeholder="Ví dụ: G, PG-13, R"
          className="form-control"
        />
        {errors.classification && <p className="error-message">{errors.classification.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="status" className="form-group__label">Trạng thái</label>
        <select id="status" {...register('status')} className="form-select">
          <option value="upcoming">Sắp chiếu</option>
          <option value="ongoing">Đang chiếu</option>
          <option value="completed">Hoàn thành</option>
        </select>
        {errors.status && <p className="error-message">{errors.status.message}</p>}
      </div>
    </div>
  );
};

FormMovieDetails.propTypes = {
  // Props are now consumed from context
};

export default FormMovieDetails;
