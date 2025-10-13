import React from 'react';
import PropTypes from 'prop-types';
import CommentItem from './CommentItem';
import CommentSkeleton from './CommentSkeleton';
import CommentError from './CommentError';
import { useReplies } from '@/hooks/useCommentQueries';
import useCommentStore from '@/stores/useCommentStore';
import classNames from '@/utils/classNames';
/**
 * Component CommentList để hiển thị danh sách các bình luận hoặc replies.
 * Hỗ trợ hiển thị đa cấp, lazy load replies và pagination cho replies.
 */
const CommentList = ({
    comments,
    depth = 0,
    currentUser,
    queryKeyToInvalidate,
    moderationMode,
    contentType,
    contentId,
    movieId,
}) => {
    const { expandedReplies } = useCommentStore();

    return (
        <ul
            className={classNames('comment-list', { 'comment-list--replies': depth > 0 })}
            data-depth={depth}
            style={{ '--depth': depth }}
            role={depth === 0 ? 'tree' : 'group'}
            aria-label={depth === 0 ? 'Danh sách bình luận' : 'Phản hồi bình luận'}
        >
            {comments.map((comment) => (
                <li
                    key={comment.id}
                    id={`comment-${comment.id}`}
                    className="comment-list__item"
                    data-depth={depth}
                    role="treeitem"
                    aria-expanded={comment.hasReplies ? expandedReplies.has(comment.id) : undefined}
                    tabIndex={0}
                >
                    <CommentItem
                        comment={comment}
                        depth={depth}
                        currentUser={currentUser}
                        queryKeyToInvalidate={queryKeyToInvalidate}
                        moderationMode={moderationMode}
                        contentType={contentType}
                        contentId={contentId}
                        movieId={movieId}
                    />

                    {comment.hasReplies && expandedReplies.has(comment.id) && (
                        <RepliesLoader
                            parentId={comment.id}
                            depth={depth + 1}
                            currentUser={currentUser}
                            queryKeyToInvalidate={queryKeyToInvalidate}
                            moderationMode={moderationMode}
                            contentType={contentType}
                            contentId={contentId}
                            movieId={movieId}
                        />
                    )}
                </li>
            ))}
        </ul>
    );
};

CommentList.propTypes = {
    comments: PropTypes.array.isRequired,
    depth: PropTypes.number,
    currentUser: PropTypes.object,
    queryKeyToInvalidate: PropTypes.array.isRequired,
    moderationMode: PropTypes.bool,
    contentType: PropTypes.oneOf(['movie', 'episode']).isRequired,
    contentId: PropTypes.number.isRequired,
    movieId: PropTypes.number,
};

/**
 * Helper component để lazy load replies.
 */
const RepliesLoader = ({
    parentId,
    depth,
    currentUser,
    queryKeyToInvalidate,
    moderationMode,
    contentType,
    contentId,
    movieId,
}) => {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
        refetch,
    } = useReplies(parentId, 'latest'); // Replies always sorted by latest for now

    const allReplies = data?.pages.flatMap((page) => page.data) || [];

    if (isLoading) {
        return (
            <ul className="comment-list comment-list--replies" data-depth={depth} style={{ '--depth': depth }} role="group">
                <CommentSkeleton count={1} />
            </ul>
        );
    }

    if (isError) {
        return (
            <ul className="comment-list comment-list--replies" data-depth={depth} style={{ '--depth': depth }} role="group">
                <li className="comment-list__item" data-depth={depth}>
                    <CommentError error={error.message} onRetry={refetch} />
                </li>
            </ul>
        );
    }

    if (allReplies.length === 0) {
        return null;
    }

    return (
        <>
            <CommentList
                comments={allReplies}
                depth={depth}
                currentUser={currentUser}
                queryKeyToInvalidate={queryKeyToInvalidate}
                moderationMode={moderationMode}
                contentType={contentType}
                contentId={contentId}
                movieId={movieId}
            />
            {hasNextPage && (
                <div className="comment-list__load-more" data-depth={depth}>
                    <button
                        className="load-more-btn"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        aria-label="Tải thêm phản hồi"
                    >
                        {isFetchingNextPage ? 'Đang tải...' : `Hiện thêm ${data.pages[data.pages.length - 1].meta.total - allReplies.length} phản hồi`}
                    </button>
                </div>
            )}
        </>
    );
};

RepliesLoader.propTypes = {
    parentId: PropTypes.number.isRequired,
    depth: PropTypes.number.isRequired,
    currentUser: PropTypes.object,
    queryKeyToInvalidate: PropTypes.array.isRequired,
    moderationMode: PropTypes.bool,
    contentType: PropTypes.oneOf(['movie', 'episode']).isRequired,
    contentId: PropTypes.number.isRequired,
    movieId: PropTypes.number,
};

export default CommentList;
