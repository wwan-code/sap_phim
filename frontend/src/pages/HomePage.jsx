import React, { useState, useEffect } from 'react';
import movieService from '@/services/movieService';
import MovieCardSkeleton from '@/components/skeletons/MovieCardSkeleton';
import MovieCard from '@/components/MovieCard';
import HeroMovie from '@/components/HeroMovie';
import ContinueWatching from '@/components/ContinueWatching';
import TopMoviesSection from '@/components/TopMoviesSection';
import '@/assets/scss/pages/_home-page.scss';
import MovieTheaterSection from '@/components/MovieTheaterSection';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHomePageData = async () => {
      try {
        setLoading(true);
        const latestResponse = await movieService.getLatestMovies({ limit: 12 });
        if (latestResponse.success && Array.isArray(latestResponse.data)) {
          setMovies(latestResponse.data);
        } else {
          setError('Could not fetch latest movies.');
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching movies.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomePageData();
  }, []);

  const renderSkeletonGrid = (count = 12) => {
    return Array.from({ length: count }).map((_, index) => <MovieCardSkeleton key={index} isHorizontal={true} />);
  };

  return (
    <div className="home-page">
      <HeroMovie />
      <ContinueWatching />
      <TopMoviesSection />
      <MovieTheaterSection />
      <section className="card-section">
        <div className="section-title">
          <h3 className="section-title__text">Phim mới cập nhật</h3>
          <Link to={'/phim-moi-cap-nhat'} className="btn-view-more">
            Xem thêm
          </Link>
        </div>
        <div className="section-list section-list__multi section-list--column">
          {loading ? renderSkeletonGrid() : movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} isHorizontal={true} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
