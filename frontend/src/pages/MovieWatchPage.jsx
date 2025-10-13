import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import movieService from '@/services/movieService';
import '@/assets/scss/pages/_movie-watch-page.scss';

// Import new components
import PlayerContainer from '@/components/watch/PlayerContainer';
import MovieInfo from '@/components/watch/MovieInfo';
import Sidebar from '@/components/watch/Sidebar';
import WatchPageSkeleton from '@/components/skeletons/WatchPageSkeleton';
import MovieMeta from '@/components/watch/MovieMeta';
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

  const toggleCinemaMode = () => {
    setIsCinemaMode(prevMode => !prevMode);
  };

  useEffect(() => {
    if (isCinemaMode) {
      document.body.classList.add('cinema-mode');
    } else {
      document.body.classList.remove('cinema-mode');
    }

    // Cleanup function to remove the class when the component unmounts
    return () => {
      document.body.classList.remove('cinema-mode');
    };
  }, [isCinemaMode]);

  useEffect(() => {
    const fetchWatchPageData = async () => {
      try {
        setLoading(true);
        const movieResponse = await movieService.getMovieById(slug);
        if (movieResponse.success) {
          setMovie(movieResponse.data);

          const episodesResponse = await movieService.getMovieEpisodes(movieResponse.data.id);
          if (episodesResponse.success) {
            setEpisodes(episodesResponse.data);
            const episode = episodesResponse.data?.find(
              (ep) => ep.episodeNumber === parseInt(episodeNumber, 10)
            );
            if (episode) {
              setCurrentEpisode(episode);
            } else {
              setError('Tập phim không tồn tại.');
            }
          } else {
            setError('Không thể tải danh sách tập phim.');
          }

          const recommendedResponse = await movieService.getRecommendedMovies(movieResponse.data.id, { limit: 5 });
          if (recommendedResponse.success) {
            setRecommendedMovies(recommendedResponse.data);
          } else {
            console.warn('Không thể tải danh sách phim đề xuất.');
          }
        } else {
          setError('Phim không được tìm thấy.');
        }
      } catch (err) {
        setError(err.message || 'Lỗi khi tải dữ liệu phim.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWatchPageData();
  }, [slug, episodeNumber]);

  // Save progress periodically and on unmount
  useEffect(() => {
    if (!movie || !currentEpisode) return;
    let seconds = 0;
    const interval = setInterval(() => {
      seconds += 5;
      watchHistoryService.saveProgress({ movieId: movie.id, episodeId: currentEpisode.id, progress: seconds, timestamp: new Date().toISOString() }).catch(() => {});
    }, 5000);
    return () => {
      clearInterval(interval);
      if (seconds > 0) {
        watchHistoryService.saveProgress({ movieId: movie.id, episodeId: currentEpisode.id, progress: seconds, timestamp: new Date().toISOString() }).catch(() => {});
      }
    };
  }, [movie, currentEpisode]);

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
    const sortedEpisodes = episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    const currentEpisodeIndex = sortedEpisodes.findIndex(
      (ep) => ep.episodeNumber === currentEpisode.episodeNumber
    );
    return currentEpisodeIndex > -1 && currentEpisodeIndex < sortedEpisodes.length - 1;
  };

  if (loading) {
    return <WatchPageSkeleton />;
  }

  if (error) {
    return <div className="error-message-full-page">{error}</div>;
  }

  if (!movie || !currentEpisode) {
    return <div className="error-message-full-page">Không có dữ liệu để hiển thị.</div>;
  }

  const defaultTitle = movie.titles?.find((t) => t.type === 'default')?.title || 'Untitled';

  return (
    <div className="movie-watch-page">
      <div className="movie-watch-page__main-content">
        <PlayerContainer episode={currentEpisode} movieTitle={defaultTitle} />
        <MovieInfo
          movie={movie}
          currentEpisode={currentEpisode}
          onToggleCinemaMode={toggleCinemaMode}
          isCinemaMode={isCinemaMode}
          onNextEpisode={handleNextEpisode}
          hasNextEpisode={hasNextEpisode()}
        />
        <MovieMeta movie={movie} />
        <section id="comments" className="comments-section-placeholder">
          <CommentSection
            contentType="episode"
            contentId={currentEpisode.id}
            currentUser={currentUser}
            showEpisodeFilter={false} // For episode page, only show comments for this episode
            moderationMode={true}
          />
        </section>
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
