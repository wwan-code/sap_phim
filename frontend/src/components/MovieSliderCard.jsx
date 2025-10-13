import React, { useState, useRef, useEffect, memo, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FaPlay } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import MovieHoverTooltip from './MovieHoverTooltip';
import { useDeviceType } from '@/hooks/useDeviceType';

// Global tooltip state management
class TooltipManager {
    constructor() {
        this.activeTooltip = null;
        this.showTimeout = null;
    }

    setActive(setterFn) {
        if (this.activeTooltip && this.activeTooltip !== setterFn) {
            this.activeTooltip(false);
        }
        this.activeTooltip = setterFn;
    }

    clearActive(setterFn) {
        if (this.activeTooltip === setterFn) {
            this.activeTooltip = null;
        }
    }

    clearTimeout() {
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
    }

    setTimeout(callback, delay) {
        this.clearTimeout();
        this.showTimeout = setTimeout(callback, delay);
    }
}

const tooltipManager = new TooltipManager();

// Custom hooks
const useReducedMotion = () => {
    return useMemo(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return false;
        try {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch {
            return false;
        }
    }, []);
};

const useIntersectionObserver = (ref, priority, rootMargin = '200px') => {
    const [isVisible, setIsVisible] = useState(priority);

    useEffect(() => {
        if (priority) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin }
        );

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [ref, priority, rootMargin]);

    return isVisible;
};

const useTooltipPosition = (cardRef, device) => {
    const computePosition = useCallback(() => {
        if (!cardRef.current) return { top: 0, left: 0 };
        
        const rect = cardRef.current.getBoundingClientRect();
        const tooltipWidth = device === 'mobile' ? Math.min(window.innerWidth - 24, 420) : 420;
        const tooltipHeight = 360;
        const margin = 10;
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        // Center tooltip relative to card
        let top = rect.top + scrollY + (rect.height - tooltipHeight) / 2;
        let left = rect.left + scrollX + (rect.width - tooltipWidth) / 2;

        // Horizontal boundary checks
        if (left < scrollX + margin) {
            left = scrollX + margin;
        } else if (left + tooltipWidth > window.innerWidth + scrollX - margin) {
            left = window.innerWidth + scrollX - tooltipWidth - margin;
        }

        // Vertical boundary checks
        if (top < scrollY + margin) {
            top = scrollY + margin;
        } else if (top + tooltipHeight > window.innerHeight + scrollY - margin) {
            top = window.innerHeight + scrollY - tooltipHeight - margin;
        }

        return { top, left };
    }, [cardRef, device]);

    return computePosition;
};

const MovieSliderCard = ({ movie, priority = false, className = '' }) => {
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    
    const cardRef = useRef(null);
    const hideTimeoutRef = useRef(null);
    const rafRef = useRef(null);
    const touchDataRef = useRef({
        startTime: null,
        startPos: null,
        hasMoved: false
    });

    const device = useDeviceType() || 'desktop';
    const prefersReducedMotion = useReducedMotion();
    const isVisible = useIntersectionObserver(cardRef, priority);
    const computeTooltipPosition = useTooltipPosition(cardRef, device);

    // Memoized movie data
    const movieData = useMemo(() => {
        const safePoster = movie?.image?.posterUrl || '';
        const defaultTitle = movie.titles?.find(t => t.type === 'default')?.title || 'Tên phim không có sẵn';
        const episodeInfo = movie.belongToCategory !== "Phim lẻ" && movie.episodes?.length > 0
            ? `Tập ${movie.episodes[0].episodeNumber}`
            : null;
        
        return {
            safePoster,
            defaultTitle,
            episodeInfo,
            posterSrc: safePoster ? `${import.meta.env.VITE_SERVER_URL}${safePoster}` : null
        };
    }, [movie]);

    // Tooltip show/hide handlers
    const showTooltip = useCallback(() => {
        if (device === 'mobile') return;

        tooltipManager.setActive(setTooltipVisible);
        
        const delay = prefersReducedMotion ? 100 : 800;
        tooltipManager.setTimeout(() => {
            const position = computeTooltipPosition();
            setTooltipPosition(position);
            setTooltipVisible(true);
        }, delay);
    }, [device, prefersReducedMotion, computeTooltipPosition]);

    const hideTooltip = useCallback((delay = 120) => {
        tooltipManager.clearTimeout();
        
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        
        hideTimeoutRef.current = setTimeout(() => {
            setTooltipVisible(false);
            tooltipManager.clearActive(setTooltipVisible);
        }, delay);
    }, []);

    // Mouse event handlers
    const handleMouseEnter = useCallback(() => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        showTooltip();
    }, [showTooltip]);

    const handleMouseLeave = useCallback(() => {
        hideTooltip();
    }, [hideTooltip]);

    // Touch event handlers
    const handleTouchStart = useCallback((e) => {
        if (device !== 'mobile') return;
        
        const touch = e.touches[0];
        touchDataRef.current = {
            startTime: Date.now(),
            startPos: { x: touch.clientX, y: touch.clientY },
            hasMoved: false
        };

        tooltipManager.setTimeout(() => {
            if (!touchDataRef.current.hasMoved) {
                const position = computeTooltipPosition();
                setTooltipPosition(position);
                setTooltipVisible(true);
            }
        }, 500);
    }, [device, computeTooltipPosition]);

    const handleTouchMove = useCallback((e) => {
        if (device !== 'mobile' || !touchDataRef.current.startPos) return;
        
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchDataRef.current.startPos.x);
        const dy = Math.abs(touch.clientY - touchDataRef.current.startPos.y);
        
        if (dx > 10 || dy > 10) {
            touchDataRef.current.hasMoved = true;
            tooltipManager.clearTimeout();
        }
    }, [device]);

    const handleTouchEnd = useCallback(() => {
        if (device !== 'mobile') return;
        
        tooltipManager.clearTimeout();
        
        const touchDuration = Date.now() - (touchDataRef.current.startTime || 0);
        if (touchDuration < 500 && !touchDataRef.current.hasMoved) {
            hideTooltip(0);
        }
    }, [device, hideTooltip]);

    // Effects
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTooltipVisible(false);
                tooltipManager.clearTimeout();
                if (hideTimeoutRef.current) {
                    clearTimeout(hideTimeoutRef.current);
                }
            }
        };

        const handleEscKey = (e) => {
            if (e.key === 'Escape' && tooltipVisible) {
                hideTooltip(0);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('keydown', handleEscKey);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [tooltipVisible, hideTooltip]);

    useEffect(() => {
        if (!tooltipVisible) return;

        const handleScrollResize = () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
            
            rafRef.current = requestAnimationFrame(() => {
                setTooltipPosition(computeTooltipPosition());
            });
        };

        window.addEventListener('scroll', handleScrollResize, { passive: true });
        window.addEventListener('resize', handleScrollResize, { passive: true });

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
            window.removeEventListener('scroll', handleScrollResize);
            window.removeEventListener('resize', handleScrollResize);
        };
    }, [tooltipVisible, computeTooltipPosition]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            tooltipManager.clearTimeout();
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    // Render placeholder if not visible
    if (!isVisible) {
        return (
            <div 
                className={`movie-slider-card-placeholder ${className}`.trim()} 
                ref={cardRef}
                aria-hidden="true"
            />
        );
    }

    return (
        <div
            className={`movie-slider-card ${className}`.trim()}
            ref={cardRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            role="button"
            tabIndex={0}
            aria-haspopup="true"
            aria-expanded={tooltipVisible}
            aria-label={`Thông tin chi tiết cho ${movieData.defaultTitle}`}
        >
            <Link 
                to={`/movie/${movie.slug}`} 
                className="movie-slider-card__link" 
                aria-label={`Xem ${movieData.defaultTitle}`}
            >
                <div className="movie-slider-card__image-wrapper">
                    <picture className="movie-slider-card__picture">
                        {movieData.posterSrc && (
                            <>
                                <source srcSet={movieData.posterSrc} type="image/jpeg" />
                                <img
                                    src={movieData.posterSrc}
                                    alt={movieData.defaultTitle}
                                    className="movie-slider-card__image"
                                    loading={priority ? 'eager' : 'lazy'}
                                    decoding="async"
                                />
                            </>
                        )}
                        {!movieData.posterSrc && (
                            <div 
                                className="movie-slider-card__image movie-slider-card__image--placeholder"
                                role="img"
                                aria-label={`Poster không có sẵn cho ${movieData.defaultTitle}`}
                            />
                        )}
                    </picture>
                    <div className="movie-slider-card__overlay" aria-hidden="true">
                        <FaPlay />
                    </div>
                </div>
                
                {device !== "desktop" && (
                    <div className="movie-slider-card__content">
                        <h3 className="movie-slider-card__title">{movieData.defaultTitle}</h3>
                        {movieData.episodeInfo && (
                            <div className="movie-slider-card__stats">
                                <span className="movie-slider-card__stat">
                                    {movieData.episodeInfo}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </Link>
            
            {tooltipVisible && createPortal(
                <MovieHoverTooltip
                    movie={movie}
                    position={tooltipPosition}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                />, 
                document.body
            )}
        </div>
    );
};

MovieSliderCard.propTypes = {
    movie: PropTypes.shape({
        slug: PropTypes.string.isRequired,
        image: PropTypes.shape({
            posterUrl: PropTypes.string,
        }),
        titles: PropTypes.arrayOf(PropTypes.shape({
            type: PropTypes.string,
            title: PropTypes.string,
        })).isRequired,
        belongToCategory: PropTypes.string,
        episodes: PropTypes.arrayOf(PropTypes.object),
    }).isRequired,
    priority: PropTypes.bool,
    className: PropTypes.string,
};

export default memo(MovieSliderCard);