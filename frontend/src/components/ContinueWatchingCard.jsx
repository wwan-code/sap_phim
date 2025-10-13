import React from 'react';
import { Link } from 'react-router-dom';
import { FaPlay, FaTimes } from 'react-icons/fa';
import { formatDistanceToNow } from '@/utils/dateUtils';

const ContinueWatchingCard = ({ item, onDelete }) => {
    const posterUrl = item.movie?.image?.posterUrl
        ? `${import.meta.env.VITE_SERVER_URL}${item.movie.image.posterUrl}`
        : 'https://placehold.co/300x170?text=No+Image';

    const title = (item.movie?.titles || []).find(t => t.type === 'default')?.title || 'Untitled';
    const progressPercent = item.episode?.duration
        ? Math.min(100, Math.round((item.progress / parseTime(item.episode.duration)) * 100))
        : 0;

    const slug = item.movie?.slug;
    const episodeNumber = item.episode?.episodeNumber;
    const watchLink = slug ? `/watch/${slug}${episodeNumber ? `/episode/${episodeNumber}` : ''}` : '#';

    const handleDelete = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete(item.id);
    };

    return (
        <Link to={watchLink} className="continue-watch__card">
            <div className="continue-watch__poster">
                <img src={posterUrl} alt={title} className="continue-watch__image" loading="lazy" />
            </div>

            <div className="continue-watch__info">
                <h4 className="continue-watch__title">{title}</h4>
                <p className="continue-watch__meta">
                    {`Tập ${episodeNumber || '?'} • ${formatDistanceToNow(item.timestamp)}`}
                </p>
            </div>

            <div className="continue-watch__progress">
                <div className="continue-watch__progress-bar" style={{ width: `${progressPercent}%` }}></div>
            </div>

            <div className="continue-watch__play-btn">
                <FaPlay />
            </div>

            <button className="continue-watch__delete-btn" onClick={handleDelete} aria-label="Xóa khỏi lịch sử">
                <FaTimes />
            </button>
        </Link>
    );
};

function parseTime(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Number(timeStr) || 0;
}

export default ContinueWatchingCard;
