import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaHeart, FaInfoCircle, FaPlay } from 'react-icons/fa';
import favoriteService from '@/services/favoriteService';
import CustomOverlayTrigger from './CustomTooltip/CustomOverlayTrigger';
import classNames from '../utils/classNames';
import { toast } from 'react-toastify';

const MovieHoverTooltip = ({ movie, position, onMouseEnter, onMouseLeave }) => {
    const { user: currentUser } = useSelector((state) => state.auth);
    const [isFavorite, setIsFavorite] = useState(false);
    const [loadingFavorite, setLoadingFavorite] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            if (!movie || !currentUser || !movie.id) {
                setLoadingFavorite(false);
                return;
            }

            setLoadingFavorite(true);

            try {
                const response = await favoriteService.check(movie.id);
                setIsFavorite(response.data.isFavorite);
            } catch (error) {
                console.error('Error checking favorite:', error);
            } finally {
                setLoadingFavorite(false);
            }
        };
        fetchStatus();
    }, [movie, currentUser]);

    const handleFavoriteClick = async () => {
        if (!currentUser) {
            toast.error("Vui lòng đăng nhập để thực hiện thao tác này.");
            return;
        }
        const originalIsFavorite = isFavorite;
        setIsFavorite(!originalIsFavorite);

        try {
            let response;
            if (originalIsFavorite) {
                response = await favoriteService.remove(movie.id);
            } else {
                response = await favoriteService.add(movie.id);
            }
            toast.success(response.data.message);
        } catch (error) {
            setIsFavorite(originalIsFavorite);
        }
    };

    if (!movie) return null;
    const defaultTitle = movie.titles?.find(t => t.type === 'default')?.title || 'No title';
    const originalTitle = movie.titles?.find(t => t.type !== 'default')?.title || '';

    return (
        <div
            className="movie-hover-tooltip"
            style={{ top: position.top, left: position.left }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="movie-hover-tooltip__media">
                <picture>
                    <source srcSet={`${import.meta.env.VITE_SERVER_URL}${movie.image.bannerUrl}`} type="image/webp" />
                    <img
                        src={`${import.meta.env.VITE_SERVER_URL}${movie.image.bannerUrl}`}
                        alt={defaultTitle}
                        loading="lazy"
                    />
                </picture>
                <div className="movie-hover-tooltip__gradient" />
            </div>

            <div className="movie-hover-tooltip__body">
                <div className="movie-hover-tooltip__header">
                    <h4 className="movie-hover-tooltip__title line-count-2">{defaultTitle}</h4>
                    {originalTitle && (
                        <div className="movie-hover-tooltip__subtitle line-count-1">{originalTitle}</div>
                    )}
                </div>

                <div className="movie-hover-tooltip__actions">
                    <Link to={`/watch/${movie.slug}`} className="btn btn-primary movie-hover-tooltip__watch">
                        <FaPlay />
                        <span>Xem ngay</span>
                    </Link>
                    <CustomOverlayTrigger
                        placement="top"
                        tooltipId={`favorite-tooltip-${movie.id}`}
                        tooltip={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                    >
                        <button className={classNames('btn btn-secondary', { 'active': isFavorite, 'disabled': !currentUser })} onClick={handleFavoriteClick} aria-label={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'} disabled={!currentUser || loadingFavorite}>
                            {loadingFavorite
                                ? <i className="fas fa-spinner fa-spin"></i>
                                : <i className={`fas ${isFavorite ? 'fa-heart-broken' : 'fa-heart'}`}></i>
                            }
                        </button>
                    </CustomOverlayTrigger>
                    <Link to={`/movie/${movie.slug}`} className="btn btn-secondary">
                        <FaInfoCircle />
                        Chi tiết
                    </Link>
                </div>

                <div className="movie-hover-tooltip__meta">
                    {movie.imdb && (
                        <span className="movie-hover-tooltip__badge movie-hover-tooltip__badge--imdb">{movie.imdb}</span>
                    )}
                    {movie.year && (
                        <span className="movie-hover-tooltip__badge">{movie.year}</span>
                    )}
                    {movie.season && (
                        <span className="movie-hover-tooltip__badge">{movie.season}</span>
                    )}
                    {movie.duration && (
                        <span className="movie-hover-tooltip__badge">{movie.duration}</span>
                    )}
                </div>

                {movie.genres?.length > 0 && (
                    <div className="movie-hover-tooltip__tags">
                        {movie.genres.slice(0, 4).map((g) => g.title).join(', ')}
                    </div>
                )}
            </div>
        </div>
    );
};

MovieHoverTooltip.propTypes = {
    movie: PropTypes.object.isRequired,
    position: PropTypes.shape({ top: PropTypes.number, left: PropTypes.number }).isRequired,
    onMouseEnter: PropTypes.func,
    onMouseLeave: PropTypes.func,
};

export default MovieHoverTooltip;
