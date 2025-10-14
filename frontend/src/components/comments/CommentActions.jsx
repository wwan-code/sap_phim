// CommentActions.jsx
import classNames from '@/utils/classNames';
import PropTypes from 'prop-types';
import { useDropdown } from '@/hooks/useDropdown';

/**
 * Component CommentActions hiển thị các nút hành động cho một bình luận.
 * Bao gồm Like, Reply, Report, Edit, Delete và các hành động quản lý (Admin).
 */
const CommentActions = ({
    comment,
    canLike,
    canReply,
    canEdit,
    canDelete,
    isLikeAnimating,
    onLike,
    onReply,
    onEdit,
    onDelete,
    onReport,
    onShowReplies,
    isExpanded,
    currentUser,
    moderationMode,
    // Admin actions
    onApprove,
    onPin,
    onHide,
    onAdminDelete,
}) => {
    const { isOpen, toggle, close, getTriggerProps, getDropdownProps } = useDropdown();
    const dropdownId = `comment-actions-${comment.id}`;
    const isMoreActionsOpen = isOpen(dropdownId);
    const isAdmin = currentUser?.roles?.some(role => role.name === 'admin');
    const isModerator = currentUser?.roles?.some(role => role.name === 'moderator');
    const canModerate = isAdmin || isModerator;

    return (
        <div className="comment-item__actions">
            {/* Like Button */}
            {canLike && (
                <button
                    className={classNames('comment-item__like-button', {
                        'is-liked': comment.isLiked,
                        'is-animating': isLikeAnimating
                    })}
                    onClick={onLike}
                    disabled={isLikeAnimating}
                    aria-pressed={comment.isLiked}
                    aria-label={comment.isLiked ? 'Bỏ thích' : 'Thích'}
                >
                    <i className={`fas fa-heart ${comment.isLiked ? 'fas' : 'far'}`} aria-hidden="true" />
                    <span className="text">Thích</span>
                    {comment.likesCount > 0 && (
                        <span className="count">({comment.likesCount})</span>
                    )}
                </button>
            )}

            {/* Reply Button */}
            {canReply && (
                <button
                    className="comment-item__reply-button"
                    onClick={onReply}
                    aria-label="Trả lời bình luận"
                >
                    <i className="fas fa-reply" aria-hidden="true" />
                    <span className="text">Trả lời</span>
                </button>
            )}

            {/* Show Replies Button */}
            {comment.hasReplies && (
                <button
                    className="comment-item__replies-button"
                    onClick={onShowReplies}
                    aria-expanded={isExpanded}
                    aria-controls={`replies-for-${comment.id}`}
                    aria-label={isExpanded ? 'Ẩn phản hồi' : `Hiện ${comment.repliesCount} phản hồi`}
                >
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} aria-hidden="true" />
                    <span className="text">
                        {isExpanded ? 'Ẩn' : 'Hiện'} phản hồi ({comment.repliesCount})
                    </span>
                </button>
            )}
            {currentUser && (
                <div className="comment-item__more-actions">
                <button
                    className="comment-item__more-button"
                    {...getTriggerProps(dropdownId, { role: 'menu', ariaLabel: 'Thêm hành động' })}
                >
                    <i className="fas fa-ellipsis-h" aria-hidden="true" />
                </button>

                {isMoreActionsOpen && (
                    <div className="comment-item__more-actions-dropdown" {...getDropdownProps(dropdownId, { role: 'menu', ariaLabel: 'Menu hành động bình luận' })}>
                        {canEdit && (
                            <button role="menuitem" onClick={() => { onEdit(); close(dropdownId); }}>
                                <i className="fas fa-edit" aria-hidden="true" />
                                Chỉnh sửa
                            </button>
                        )}

                        {canDelete && (
                            <button role="menuitem" onClick={() => { onDelete(); close(dropdownId); }} className="is-danger">
                                <i className="fas fa-trash" aria-hidden="true" />
                                Xóa
                            </button>
                        )}

                        {currentUser && currentUser.id !== comment.userId && (
                            <button role="menuitem" onClick={() => { onReport(); close(dropdownId); }}>
                                <i className="fas fa-flag" aria-hidden="true" />
                                Báo cáo
                            </button>
                        )}

                        {moderationMode && canModerate && (
                            <>
                                {isAdmin && (
                                    <button role="menuitem" onClick={() => { onPin(); close(dropdownId); }}>
                                        <i className="fas fa-thumbtack" aria-hidden="true" />
                                        {comment.isPinned ? 'Bỏ ghim' : 'Ghim'}
                                    </button>
                                )}
                                <button role="menuitem" onClick={() => { onHide(); close(dropdownId); }}>
                                    <i className="fas fa-eye-slash" aria-hidden="true" />
                                    {comment.isHidden ? 'Hiển thị' : 'Ẩn'}
                                </button>
                                <button role="menuitem" onClick={() => { onApprove(); close(dropdownId); }}>
                                    <i className="fas fa-check-circle" aria-hidden="true" />
                                    {comment.isApproved ? 'Bỏ duyệt' : 'Duyệt'}
                                </button>
                                {isAdmin && (
                                    <button role="menuitem" onClick={() => { onAdminDelete(); close(dropdownId); }} className="is-danger">
                                        <i className="fas fa-user-slash" aria-hidden="true" />
                                        Xóa (Admin)
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
            )}
        </div>
    );
};

CommentActions.propTypes = {
    comment: PropTypes.object.isRequired,
    canLike: PropTypes.bool,
    canReply: PropTypes.bool,
    canEdit: PropTypes.bool,
    canDelete: PropTypes.bool,
    isLikeAnimating: PropTypes.bool,
    onLike: PropTypes.func.isRequired,
    onReply: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onReport: PropTypes.func.isRequired,
    onShowReplies: PropTypes.func.isRequired,
    isExpanded: PropTypes.bool,
    currentUser: PropTypes.object,
    moderationMode: PropTypes.bool,
    onApprove: PropTypes.func,
    onPin: PropTypes.func,
    onHide: PropTypes.func,
    onAdminDelete: PropTypes.func,
};

export default CommentActions;
