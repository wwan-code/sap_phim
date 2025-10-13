import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { MovieFormContext } from '@/pages/admin/Movies/MovieForm';

const FormMovieStats = () => {
  const { register, errors } = useContext(MovieFormContext);

  return (
    <div className="admin-movie-form__section admin-movie-form__section--stats">
      <h2 className="admin-movie-form__section-header">Thống kê & Đánh giá</h2>

      <div className="form-group">
        <label htmlFor="imdb" className="form-group__label">IMDb ID/Rating</label>
        <input
          type="text"
          id="imdb"
          {...register('imdb')}
          placeholder="tt1234567 hoặc 7.8"
          className="form-control"
        />
        {errors.imdb && <p className="error-message">{errors.imdb.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="views" className="form-group__label">Lượt xem</label>
        <input
          type="number"
          id="views"
          {...register('views', { valueAsNumber: true })}
          min="0"
          className="form-control"
        />
        {errors.views && <p className="error-message">{errors.views.message}</p>}
      </div>
    </div>
  );
};

FormMovieStats.propTypes = {
  // Props are now consumed from context
};

export default FormMovieStats;
