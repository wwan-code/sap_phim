import React, { useState, useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import movieService from '@/services/movieService';
import MovieTheaterCard from '@/components/MovieTheaterCard';
import MovieTheaterCardSkeleton from '@/components/skeletons/MovieTheaterCardSkeleton';
import 'swiper/css';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import classNames from '@/utils/classNames';
import { Link } from 'react-router-dom';

const MovieTheaterSection = () => {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigationPrevRef = useRef(null);
    const navigationNextRef = useRef(null);
    const [isBeginning, setIsBeginning] = useState(true);
    const [isEnd, setIsEnd] = useState(false);

    useEffect(() => {
        const fetchTopMovies = async () => {
            try {
                setLoading(true);
                const response = await movieService.getTheaterMovies();
                if (response.success && Array.isArray(response.data)) {
                    setMovies(response.data);
                } else {
                    setError('Could not fetch theater movies.');
                }
            } catch (err) {
                setError(err.message || 'An error occurred while fetching top movies.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchTopMovies();
    }, []);

    const handleSlideChange = (swiper) => {
        setIsBeginning(swiper.isBeginning);
        setIsEnd(swiper.isEnd);
    };

    const renderSkeletons = () => {
        return Array.from({ length: 6 }).map((_, index) => (
            <SwiperSlide key={index}>
                <MovieTheaterCardSkeleton />
            </SwiperSlide>
        ));
    };

    return (
        <section className="card-section">
            <div className="section-title">
                <h3 className="section-title__text">Phim chiếu rạp</h3>
                <Link to={'/phim-chieu-rap'} className="btn-view-more">
                    Xem thêm
                </Link>
            </div>
            <div className="section-slider">
                <Swiper
                    modules={[Navigation]}
                    spaceBetween={24}
                    slidesPerView={4}
                    navigation={{
                        prevEl: navigationPrevRef.current,
                        nextEl: navigationNextRef.current,
                    }}
                    onBeforeInit={(swiper) => {
                        swiper.params.navigation.prevEl = navigationPrevRef.current;
                        swiper.params.navigation.nextEl = navigationNextRef.current;
                    }}
                    onSlideChange={(swiper) => {
                        handleSlideChange(swiper);
                    }}
                    onUpdate={(swiper) => {
                        handleSlideChange(swiper);
                    }}

                    breakpoints={{
                        320: {
                            slidesPerView: 1,
                            spaceBetween: 16,
                        },
                        768: {
                            slidesPerView: 3,
                            spaceBetween: 20,
                        },
                        1200: {
                            slidesPerView: 4,
                            spaceBetween: 24,
                        }
                    }}
                >
                    {loading
                        ? renderSkeletons()
                        : movies.map((movie) => (
                            <SwiperSlide key={movie.uuid}>
                                <MovieTheaterCard movie={movie} />
                            </SwiperSlide>
                        ))}
                </Swiper>
                <button
                    className={classNames('swiper-button-custom swiper-button-prev-custom', { 'swiper-button-disabled': isBeginning })}
                    ref={navigationPrevRef}
                >
                    <FaChevronLeft />
                </button>
                <button
                    className={classNames('swiper-button-custom swiper-button-next-custom', { 'swiper-button-disabled': isEnd })}
                    ref={navigationNextRef}
                >
                    <FaChevronRight />
                </button>
            </div>
        </section>
    );
};

export default MovieTheaterSection;
