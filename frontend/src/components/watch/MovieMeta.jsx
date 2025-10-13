import React from 'react';

const MovieMeta = ({ movie }) => {
  if (!movie) return null;

  // Assuming genres are fetched and passed within the movie object, e.g., movie.genres
  const genres = movie.genres || [];

  return (
    <div className="movie-meta">
      <div className="meta-tags">
        {movie.quality && <span className="meta-tag quality">{movie.quality}</span>}
        {movie.year && <span className="meta-tag year">{movie.year}</span>}
        {genres.map(genre => (
          <span key={genre.id} className="meta-tag genre">{genre.title}</span>
        ))}
        {movie.tags?.map(tag => (
          <span key={tag} className="meta-tag">{tag}</span>
        ))}
      </div>
      <p className="meta-description">{movie.description || 'Chưa có mô tả.'}</p>
      <div className="meta-details">
        {movie.duration && <p><strong>Thời lượng:</strong> {movie.duration}</p>}
        {movie.subtitles?.length > 0 && (
          <p><strong>Phụ đề:</strong> {movie.subtitles.join(', ')}</p>
        )}
      </div>
    </div>
  );
};

export default MovieMeta;