import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import classNames from '@/utils/classNames';
import userService from '@/services/userService';
import { usePopperTooltip } from '@/hooks/usePopperTooltip';
import MentionTooltip from './MentionTooltip';
import { formatDistanceToNow } from '@/utils/dateUtils';
import CommentActions from './CommentActions';
import CommentForm from './CommentForm';
import useCommentStore from '@/stores/useCommentStore';
import {
    useToggleLike,
    useReportComment,
    useDeleteComment,
    useApproveComment,
    usePinComment,
    useHideComment,
    useAdminDeleteComment,
} from '@/hooks/useCommentQueries';
import { toast } from 'react-toastify';
import { getAvatarUrl } from '@/utils/getAvatarUrl';

// Component nội bộ để render mention link và quản lý tooltip
const MentionLink = ({ href, children }) => {
    const [hoveredUserUuid, setHoveredUserUuid] = useState(null);

    // Hook cho Popper Tooltip
    const {
        visible,
        reference,
        popper,
        styles,
        attributes,
        show,
        hide,
    } = usePopperTooltip({
        placement: 'top',
        trigger: 'hover',
        interactive: true,
        delay: { show: 300, hide: 150 },
    });

    // Lấy UUID từ href (ví dụ: /profile/uuid-12345)
    const uuidMatch = href.match(/\/profile\/([a-f0-9-]+)/);
    const userUuid = uuidMatch ? uuidMatch[1] : null;

    // Fetch dữ liệu người dùng cho tooltip khi hover
    const { data: hoveredUserData, isLoading } = useQuery({
        queryKey: ['userProfile', hoveredUserUuid],
        queryFn: () => userService.getUserByUuid(hoveredUserUuid),
        enabled: !!hoveredUserUuid, // Chỉ fetch khi có UUID và đang hover
        staleTime: 1000 * 60 * 10, // Cache 10 phút
        refetchOnWindowFocus: false,
    });

    const handleMouseEnter = () => {
        if (userUuid) {
            setHoveredUserUuid(userUuid);
            show();
        }
    };

    const handleMouseLeave = () => {
        hide();
        // Không reset hoveredUserUuid ngay để tooltip có thể lấy data
    };

    if (!userUuid) {
        return <span>{children}</span>;
    }

    return (
        <>
            <Link
                to={href}
                className="mention-link"
                ref={reference}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {children}
            </Link>
            <MentionTooltip
                user={hoveredUserData?.data}
                visible={visible && !isLoading}
                popperRef={popper}
                styles={styles}
                attributes={attributes}
            />
        </>
    );
};

MentionLink.propTypes = {
    href: PropTypes.string,
    children: PropTypes.node,
};


/**
 * Component CommentItem để hiển thị một bình luận đơn lẻ và các hành động liên quan.
 * Hỗ trợ hiển thị thông tin người dùng, nội dung markdown, spoiler, các nút hành động (like, reply, edit, delete, report),
 * và các trạng thái đặc biệt (pinned, hidden, edited).
 */
const CommentItem = ({
    comment,
    depth = 0,
    currentUser,
    queryKeyToInvalidate,
    moderationMode = false,
    maxDepth = 2,
    contentType,
    contentId,
    movieId,
}) => {
    const [isSpoilerRevealed, setIsSpoilerRevealed] = useState(false);
    const {
        composingForId,
        editingId,
        setComposingForId,
        setEditingId,
        expandedReplies,
        toggleExpandedReplies,
    } = useCommentStore();

    const isOwner = currentUser && currentUser.uuid === comment.user.uuid;
    const isAdmin = currentUser?.roles?.some(role => role.name === 'admin');
    const isModerator = currentUser?.roles?.some(role => role.name === 'moderator');
    const canModerate = isAdmin || isModerator;

    const isComposingReply = composingForId === comment.id;
    const isEditing = editingId === comment.id;
    const isRepliesExpanded = expandedReplies.has(comment.id);

    // React Query Mutations
    const toggleLikeMutation = useToggleLike(queryKeyToInvalidate, currentUser?.id);
    const reportCommentMutation = useReportComment(queryKeyToInvalidate, currentUser?.id);
    const deleteCommentMutation = useDeleteComment(queryKeyToInvalidate);
    const adminDeleteCommentMutation = useAdminDeleteComment(queryKeyToInvalidate);
    const approveCommentMutation = useApproveComment(queryKeyToInvalidate);
    const pinCommentMutation = usePinComment(queryKeyToInvalidate);
    const hideCommentMutation = useHideComment(queryKeyToInvalidate);

    const handleToggleSpoiler = () => {
        setIsSpoilerRevealed((prev) => !prev);
    };

    const handleLike = () => {
        if (!currentUser) {
            toast.error('Vui lòng đăng nhập để thích bình luận.');
            return;
        }
        toggleLikeMutation.mutate(comment.id);
    };

    const handleReport = () => {
        if (!currentUser) {
            toast.error('Vui lòng đăng nhập để báo cáo bình luận.');
            return;
        }
        if (window.confirm('Bạn có chắc chắn muốn báo cáo bình luận này?')) {
            reportCommentMutation.mutate(comment.id);
        }
    };

    const handleDelete = () => {
        if (window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) {
            deleteCommentMutation.mutate(comment.id);
        }
    };

    const handleAdminDelete = () => {
        if (window.confirm('Bạn có chắc chắn muốn xóa bình luận này với quyền admin?')) {
            adminDeleteCommentMutation.mutate(comment.id);
        }
    };

    const handleApprove = (isApproved) => {
        approveCommentMutation.mutate({ id: comment.id, isApproved });
    };

    const handlePin = (isPinned) => {
        pinCommentMutation.mutate({ id: comment.id, isPinned });
    };

    const handleHide = (isHidden) => {
        hideCommentMutation.mutate({ id: comment.id, isHidden });
    };

    const sanitizedMarkdown = DOMPurify.sanitize(comment.text);

    return (
        <article className={classNames("comment-item", {"comment-item--nested": comment.hasReplies})} id={comment.id} data-nested={comment.hasReplies} data-depth={depth}>
            <div className="comment-item__layout">
                <div className="comment-item__avatar" data-depth={depth}>
                    <img src={getAvatarUrl(comment.user)} alt={`${comment.user?.username} avatar`} loading="lazy" />
                </div>

                <div className="comment-item__content">
                    <header className="comment-item__header">
                        <div className="comment-item__meta">
                            <span className="comment-item__username">{comment.user?.username || 'Người dùng ẩn danh'}</span>
                            <span className="comment-item__badges">
                                {comment.isPinned && <span className="badge badge--pinned"><i className="fa-solid fa-thumbtack"></i></span>}
                                {comment.isHidden && canModerate && <span className="badge badge--hidden">Ẩn</span>}
                                {comment.user?.roles?.some(role => role.name === 'admin') && <span className="badge badge--admin">Admin</span>}
                                {comment.user?.roles?.some(role => role.name === 'moderator') && <span className="badge badge--mod">Mod</span>}
                                {comment.episodeNumber && <span className="badge badge--episode">Tập {comment.episodeNumber}</span>}
                                {comment.isEdited && <span className="badge badge--edited">Đã sửa</span>}
                            </span>
                            <time className="comment-item__timestamp" dateTime={comment.createdAt}>
                                {formatDistanceToNow(comment.createdAt)}
                            </time>
                        </div>
                    </header>

                    <div className="comment-item__body">
                        {comment.isSpoiler ? (
                            <div className="comment-item__spoiler" data-spoiler={comment.isSpoiler}>
                                <div className="spoiler-warning">
                                    <span>Cảnh báo Spoiler</span>
                                    <button
                                        type="button"
                                        className="spoiler-toggle"
                                        onClick={handleToggleSpoiler}
                                        aria-expanded={isSpoilerRevealed}
                                    >
                                        {isSpoilerRevealed ? 'Ẩn' : 'Hiện'}
                                    </button>
                                </div>
                                <div className="spoiler-content" data-revealed={isSpoilerRevealed} hidden={!isSpoilerRevealed}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{ a: MentionLink }}
                                    >
                                        {sanitizedMarkdown}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ) : (
                            <div className="comment-item__text">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{ a: MentionLink }}
                                >
                                    {sanitizedMarkdown}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>

                    <CommentActions
                        comment={comment}
                        currentUser={currentUser}
                        moderationMode={moderationMode}
                        canLike={!!currentUser}
                        canReply={depth < maxDepth && !!currentUser}
                        canEdit={isOwner}
                        canDelete={isOwner}
                        isLikeAnimating={toggleLikeMutation.isPending}
                        onLike={handleLike}
                        onReply={() => setComposingForId(isComposingReply ? null : comment.id)}
                        onEdit={() => setEditingId(isEditing ? null : comment.id)}
                        onDelete={handleDelete}
                        onReport={handleReport}
                        onShowReplies={() => toggleExpandedReplies(comment.id)}
                        isExpanded={isRepliesExpanded}
                        // Admin actions
                        onApprove={() => handleApprove(!comment.isApproved)}
                        onPin={() => handlePin(!comment.isPinned)}
                        onHide={() => handleHide(!comment.isHidden)}
                        onAdminDelete={handleAdminDelete}
                    />

                    {isComposingReply && (
                        <div className="comment-item__reply-form">
                            <CommentForm
                                contentType={contentType}
                                contentId={contentId}
                                movieId={movieId}
                                parentId={comment.id}
                                onCancel={() => setComposingForId(null)}
                                onSuccess={() => setComposingForId(null)}
                                queryKeyToInvalidate={queryKeyToInvalidate}
                                currentUser={currentUser}
                            />
                        </div>
                    )}

                    {isEditing && (
                        <div className="comment-item__edit-form">
                            <CommentForm
                                contentType={contentType}
                                contentId={contentId}
                                movieId={movieId}
                                parentId={comment.parentId} // Keep original parentId for editing
                                initialText={comment.text}
                                initialIsSpoiler={comment.isSpoiler}
                                commentToEdit={comment}
                                onCancel={() => setEditingId(null)}
                                onSuccess={() => setEditingId(null)}
                                queryKeyToInvalidate={queryKeyToInvalidate}
                                currentUser={currentUser}
                            />
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
};

CommentItem.propTypes = {
    comment: PropTypes.object.isRequired,
    depth: PropTypes.number,
    currentUser: PropTypes.object,
    queryKeyToInvalidate: PropTypes.array.isRequired,
    moderationMode: PropTypes.bool,
    maxDepth: PropTypes.number,
    contentType: PropTypes.oneOf(['movie', 'episode']).isRequired,
    contentId: PropTypes.number.isRequired,
    movieId: PropTypes.number,
};

export default CommentItem;
