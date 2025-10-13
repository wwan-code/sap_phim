import React from 'react';
import PropTypes from 'prop-types';
import { FaPlay } from 'react-icons/fa';
import classNames from '../../src/utils/classNames'; // Assuming this utility exists
import { Link } from 'react-router-dom';

const MovieTheaterCard = ({ movie }) => {
    if (!movie) {
        return null;
    }

    const {
        image,
        titles,
        imdb,
        classification,
        year,
        duration,
        slug,
        tags,
    } = movie;

    const formatDuration = (minutes) => {
        if (!minutes) return '';
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours > 0 ? `${hours}h ` : ''}${remainingMinutes}m`;
    };

    const defaultTitle = titles?.find(t => t.type === 'default')?.title || 'No title';
    const originalTitle = titles?.find(t => t.type !== 'default')?.title || 'No title';
    const posterImage = `${import.meta.env.VITE_SERVER_URL}${image.posterUrl}` || '';
    const bannerImage = `${import.meta.env.VITE_SERVER_URL}${image.bannerUrl}` || '';
    return (
        <article className="movie-theater-card" aria-label={`Movie card for ${defaultTitle}`}>
            <div className="movie-theater-card__banner-wrapper">
                <img
                    src={bannerImage}
                    alt={`${defaultTitle} banner`}
                    className="movie-theater-card__banner-img"
                    loading="lazy"
                />
                <div className="movie-theater-card__tags">
                    {tags && tags.map((tag, index) => (
                        <span
                            key={index}
                            className={classNames('movie-theater-card__tag', {
                                [`movie-theater-card__tag--${tag.type}`]: tag.type,
                            })}
                        >
                            {tag.text}
                        </span>
                    ))}
                </div>
                <Link to={`/movie/${slug}`} className="movie-theater-card__play-button" aria-label={`Play ${defaultTitle}`}>
                    <FaPlay />
                </Link>
            </div>

            <div className="movie-theater-card__info">
                <div className="movie-theater-card__poster">
                    <Link to={`/movie/${slug}`} className="movie-theater-card__poster-link">
                        <img
                            src={posterImage}
                            alt={`${defaultTitle} poster`}
                            loading="lazy"
                        />
                    </Link>
                </div>
                <div className="movie-theater-card__details">
                    <h3 className="movie-theater-card__title line-count-1">
                        <Link to={`/movie/${slug}`}>
                            {defaultTitle}
                        </Link>
                    </h3>
                    <p className="movie-theater-card__original-title line-count-1">{originalTitle}</p>
                    <div className="movie-theater-card__metadata">
                        {classification && <span>{classification}</span>}
                        {year && <span>{year}</span>}
                        {duration && <span>{formatDuration(duration)}</span>}
                    </div>
                </div>
            </div>
        </article>
    );
};

export default MovieTheaterCard;
