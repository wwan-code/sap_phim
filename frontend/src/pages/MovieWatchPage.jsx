import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import movieService from '@/services/movieService';
import '@/assets/scss/pages/_movie-watch-page.scss';

import PlayerContainer from '@/components/watch/PlayerContainer';
import MovieInfo from '@/components/watch/MovieInfo';
import Sidebar from '@/components/watch/Sidebar';
import MovieMeta from '@/components/watch/MovieMeta';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorMessage from '@/components/common/ErrorMessage';
import watchHistoryService from '@/services/watchHistoryService';
import { useSelector } from 'react-redux';
import CommentSection from '@/components/comments/CommentSection';

const MovieWatchPage = () => {
  const { slug, episodeNumber } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useSelector((state) => state.auth);
  const [movie, setMovie] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [autoNext, setAutoNext] = useState(true);
  const watchProgressRef = useRef(0); // Use ref to store progress for interval

  const toggleCinemaMode = () => {
    setIsCinemaMode(prevMode => !prevMode);
  };

  useEffect(() => {
    if (isCinemaMode) {
      document.body.classList.add('cinema-mode');
    } else {
      document.body.classList.remove('cinema-mode');
    }

    return () => {
      document.body.classList.remove('cinema-mode');
    };
  }, [isCinemaMode]);

  useEffect(() => {
    const fetchWatchPageData = async () => {
      try {
        setLoading(true);
        const response = await movieService.getMovieWatchDataBySlug(slug, episodeNumber);
        if (response.success) {
          const { movie, currentEpisode, episodes, recommendedMovies, watchProgress } = response.data;
          setMovie(movie);
          setEpisodes(episodes);
          setCurrentEpisode(currentEpisode);
          setRecommendedMovies(recommendedMovies);
          watchProgressRef.current = watchProgress; 
        } else {
          setError('Phim hoặc tập phim không được tìm thấy.');
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Lỗi khi tải dữ liệu phim.');
      } finally {
        setLoading(false);
      }
    };

    fetchWatchPageData();
  }, [slug, episodeNumber, currentUser]);

  useEffect(() => {
    if (!movie || !currentEpisode || !currentUser) return;

    const interval = setInterval(() => {
      watchProgressRef.current += 5;
      watchHistoryService.saveProgress({ 
        movieId: movie.id, 
        episodeId: currentEpisode.id, 
        progress: watchProgressRef.current, 
        timestamp: new Date().toISOString() 
      }).catch((e) => console.error("Error saving watch history:", e));
    }, 5000);

    return () => {
      clearInterval(interval);
      // Save final progress when component unmounts or dependencies change
      if (watchProgressRef.current > 0) {
        watchHistoryService.saveProgress({ 
          movieId: movie.id, 
          episodeId: currentEpisode.id, 
          progress: watchProgressRef.current, 
          timestamp: new Date().toISOString() 
        }).catch((e) => console.error("Error saving final watch history:", e));
      }
    };
  }, [movie, currentEpisode, currentUser]);

  const handleEpisodeChange = (newEpisodeNumber) => {
    navigate(`/watch/${slug}/episode/${newEpisodeNumber}`);
  };

  const handleNextEpisode = () => {
    const sortedEpisodes = episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    const currentEpisodeIndex = sortedEpisodes.findIndex(
      (ep) => ep.episodeNumber === currentEpisode.episodeNumber
    );

    if (currentEpisodeIndex > -1 && currentEpisodeIndex < sortedEpisodes.length - 1) {
      const nextEpisode = sortedEpisodes[currentEpisodeIndex + 1];
      handleEpisodeChange(nextEpisode.episodeNumber);
    }
  };

  const hasNextEpisode = () => {
    if (!currentEpisode || !episodes || episodes.length === 0) return false;
    const sortedEpisodes = episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    const currentEpisodeIndex = sortedEpisodes.findIndex(
      (ep) => ep.episodeNumber === currentEpisode.episodeNumber
    );
    return currentEpisodeIndex > -1 && currentEpisodeIndex < sortedEpisodes.length - 1;
  };

  if (loading) {
    return <LoadingSpinner fullscreen label="Đang tải phim..." />;
  }

  if (error) {
    return (
      <div className="container-fluid page-container">
        <ErrorMessage
          variant="card"
          title="Lỗi tải phim"
          message={error}
          onRetry={() => window.location.reload()} // Simple retry by reloading
        />
      </div>
    );
  }

  if (!movie || !currentEpisode) {
    return (
      <div className="container-fluid page-container">
        <ErrorMessage
          variant="card"
          title="Không tìm thấy dữ liệu"
          message="Không có dữ liệu phim hoặc tập phim để hiển thị."
        />
      </div>
    );
  }

  const defaultTitle = movie.titles?.find((t) => t.type === 'default')?.title || 'Untitled';

  return (
    <div className="movie-watch-page">
      <div className="movie-watch-page__main-content">
        <PlayerContainer episode={currentEpisode} movieTitle={defaultTitle} initialProgress={watchProgressRef.current} />
        <MovieInfo
          movie={movie}
          currentEpisode={currentEpisode}
          onToggleCinemaMode={toggleCinemaMode}
          isCinemaMode={isCinemaMode}
          onNextEpisode={handleNextEpisode}
          hasNextEpisode={hasNextEpisode()}
        />
        <MovieMeta movie={movie} />
        <CommentSection
          contentType="episode"
          contentId={currentEpisode.id}
          currentUser={currentUser}
          showEpisodeFilter={false}
          moderationMode={true}
        />
      </div>

      <Sidebar
        episodes={episodes}
        currentEpisode={currentEpisode}
        recommendedMovies={recommendedMovies}
        onEpisodeChange={handleEpisodeChange}
        autoNext={autoNext}
        onAutoNextChange={setAutoNext}
      />
    </div>
  );
};

export default MovieWatchPage;
