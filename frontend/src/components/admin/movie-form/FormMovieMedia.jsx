import React, { useState, useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import { FaImage, FaPlayCircle, FaTimes } from 'react-icons/fa';
import { MovieFormContext } from '@/pages/admin/Movies/MovieForm';

const FormMovieMedia = () => {
  const { formData, register, errors, handleImageChange, imagePreviews } = useContext(MovieFormContext);
  const [isDragging, setIsDragging] = useState(false);

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/;
    const match = url.match(regExp);
    return match && match[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const embedUrl = getYouTubeEmbedUrl(formData.trailerUrl);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Simulate event object for handleImageChange
      handleImageChange({ target: { files: [file] } }, type);
    }
  }, [handleImageChange]);

  const handleRemoveImage = useCallback((type) => {
    handleImageChange({ target: { files: [] } }, type); // Pass empty files array to clear
  }, [handleImageChange]);

  return (
    <div className="admin-movie-form__section admin-movie-form__section--media">
      <h2 className="admin-movie-form__section-header">Media</h2>

      <div className="form-group">
        <label htmlFor="trailerUrl" className="form-group__label">URL Trailer</label>
        <input
          type="url"
          id="trailerUrl"
          {...register('trailerUrl')}
          placeholder="https://youtube.com/watch?v=..."
          className="form-control"
        />
        {errors.trailerUrl && <p className="error-message">{errors.trailerUrl.message}</p>}
      </div>

      {embedUrl && (
        <div className="admin-movie-form__trailer-preview">
          <h3 className="admin-movie-form__sub-header">Preview Trailer</h3>
          <div className="admin-movie-form__video-container">
            <iframe
              src={embedUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      <h3 className="admin-movie-form__sub-header">Upload Hình ảnh</h3>
      <div className="admin-movie-form__uploads">
        {['poster', 'banner', 'cover'].map((type) => (
          <div
            key={type}
            className={`upload-item ${isDragging ? 'dragging' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, type)}
          >
            <label className="upload-item__label">
              <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, type)} />
              {imagePreviews[type] ? (
                <>
                  <img src={imagePreviews[type]} alt={`${type} Preview`} className="upload-item__image" />
                  <button type="button" className="upload-item__remove-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveImage(type); }}>
                    <FaTimes />
                  </button>
                </>
              ) : (
                <>
                  <FaImage size={40} color="var(--w-text-color-light)" />
                  <span className="upload-item__placeholder">Drag & Drop or Click to Upload {type.charAt(0).toUpperCase() + type.slice(1)}</span>
                </>
              )}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

FormMovieMedia.propTypes = {
  // Props are now consumed from context
};

export default FormMovieMedia;
