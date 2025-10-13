import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { MovieFormContext } from '@/pages/admin/Movies/MovieForm';

const FormMovieProduction = () => {
  const { formData, register, errors, handleCastChange, addCastField, removeCastField, setValue } = useContext(MovieFormContext);

  return (
    <div className="admin-movie-form__section admin-movie-form__section--production">
      <h2 className="admin-movie-form__section-header">Sản xuất & Diễn viên</h2>

      <div className="form-group">
        <label htmlFor="director" className="form-group__label">Đạo diễn</label>
        <input
          type="text"
          id="director"
          {...register('director')}
          placeholder="Tên đạo diễn"
          className="form-control"
        />
        {errors.director && <p className="error-message">{errors.director.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="studio" className="form-group__label">Studio</label>
        <input
          type="text"
          id="studio"
          {...register('studio')}
          placeholder="Tên studio sản xuất"
          className="form-control"
        />
        {errors.studio && <p className="error-message">{errors.studio.message}</p>}
      </div>

      <div className="form-group">
        <label className="form-group__label">
          Diễn viên & Vai diễn
          <span className="form-group__helper-text">
            (Thêm thông tin diễn viên và vai diễn của họ trong phim)
          </span>
        </label>
        <div className="admin-movie-form__dynamic-list">
          {formData.cast.map((castMember, index) => (
            <div className="admin-movie-form__dynamic-list__item" key={index}>
              <div className="form-group">
                <input
                  type="text"
                  {...register(`cast.${index}.actor`)}
                  onChange={(e) => handleCastChange(index, 'actor', e.target.value)}
                  placeholder="Tên diễn viên"
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  {...register(`cast.${index}.role`)}
                  onChange={(e) => handleCastChange(index, 'role', e.target.value)}
                  placeholder="Vai diễn"
                  className="form-control"
                />
              </div>
              <button type="button" className="admin-movie-form__dynamic-list__item__remove-btn" onClick={() => removeCastField(index)}>
                <FaTimes />
              </button>
            </div>
          ))}
          <button type="button" className="admin-movie-form__dynamic-list__add-btn" onClick={addCastField}>
            <FaPlus /> Thêm diễn viên
          </button>
        </div>
        {errors.cast && <p className="error-message">{errors.cast.message}</p>}
      </div>
    </div>
  );
};

FormMovieProduction.propTypes = {
  // Props are now consumed from context
};

export default FormMovieProduction;
