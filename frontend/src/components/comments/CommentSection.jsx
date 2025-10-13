import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useComments } from '@/hooks/useCommentQueries';
import useCommentStore from '@/stores/useCommentStore';
import CommentForm from './CommentForm';
import CommentList from './CommentList';
import CommentEmpty from './CommentEmpty';
import CommentError from './CommentError';
import CommentSkeleton from './CommentSkeleton';
import classNames from '@/utils/classNames';

/**
 * Component CommentSection là điểm vào chính cho hệ thống bình luận.
 * Quản lý việc fetch, hiển thị, tạo, và tương tác với các bình luận.
 */
const CommentSection = ({
    contentType,
    contentId,
    movieId, // Chỉ dùng khi contentType là 'movie' và cần merge comments
    currentUser,
    showEpisodeFilter = false, // Cho phép lọc theo episode (chỉ áp dụng cho movie comments)
    moderationMode = false, // Chế độ quản lý cho admin/mod
}) => {
    const { activeSort, setActiveSort, composingForId, editingId, setComposingForId, setEditingId } = useCommentStore();

    const isMovieWithEpisodes = contentType === 'movie' && movieId && !showEpisodeFilter;

    // Determine the query key for React Query
    const queryKey = isMovieWithEpisodes
        ? ['movieCommentsWithEpisodes', movieId, activeSort]
        : ['comments', contentType, contentId, activeSort];

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
        refetch,
    } = useComments(contentType, isMovieWithEpisodes ? movieId : contentId, activeSort, isMovieWithEpisodes);

    const allComments = data?.pages.flatMap((page) => page.data) || [];
    const totalComments = data?.pages[0]?.meta?.total || 0;

    // Reset composing/editing state when contentId or contentType changes
    useEffect(() => {
        setComposingForId(null);
        setEditingId(null);
    }, [contentId, contentType, setComposingForId, setEditingId]);

    const handleSortChange = (e) => {
        setActiveSort(e.target.value);
    };

    const canComment = !!currentUser;

    return (
        <section className="comment-section" role="region" aria-label="Comments">
            <header className="comment-section__header">
                <h2 className="comment-section__title">Bình luận ({totalComments})</h2>
                <div className="comment-section__controls">
                    <select
                        className="comment-sort"
                        aria-label="Sắp xếp bình luận"
                        value={activeSort}
                        onChange={handleSortChange}
                        disabled={isLoading || isError}
                    >
                        <option value="latest">Mới nhất</option>
                        <option value="oldest">Cũ nhất</option>
                        {/* <option value="popular">Phổ biến nhất</option> */}
                    </select>
                </div>
            </header>

            <div className="comment-section__form">
                {canComment ? (
                    <CommentForm
                        contentType={contentType}
                        contentId={contentId}
                        movieId={movieId}
                        queryKeyToInvalidate={queryKey}
                        currentUser={currentUser}
                        onSuccess={() => {
                            // Optionally scroll to the new comment or clear form
                        }}
                    />
                ) : (
                    <p className="comment-form__login-prompt">
                        Vui lòng đăng nhập để bình luận.
                    </p>
                )}
            </div>

            <div className="comment-section__list">
                {isLoading && <CommentSkeleton count={3} />}

                {isError && <CommentError error={error.message} onRetry={refetch} />}

                {!isLoading && !isError && allComments.length === 0 && (
                    <CommentEmpty message="Hãy là người đầu tiên bình luận!" />
                )}

                {!isLoading && !isError && allComments.length > 0 && (
                    <CommentList
                        comments={allComments}
                        depth={0}
                        currentUser={currentUser}
                        queryKeyToInvalidate={queryKey}
                        moderationMode={moderationMode}
                        contentType={contentType}
                        contentId={contentId}
                        movieId={movieId}
                    />
                )}

                {hasNextPage && (
                    <div className="comment-section__load-more">
                        <button
                            className="load-more-btn load-more-btn--primary"
                            onClick={() => fetchNextPage()}
                            disabled={isFetchingNextPage}
                            aria-label="Tải thêm bình luận"
                        >
                            {isFetchingNextPage ? 'Đang tải thêm...' : 'Tải thêm bình luận'}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

CommentSection.propTypes = {
    contentType: PropTypes.oneOf(['movie', 'episode']).isRequired,
    contentId: PropTypes.number.isRequired,
    movieId: PropTypes.number,
    currentUser: PropTypes.object,
    showEpisodeFilter: PropTypes.bool,
    allowAnonymous: PropTypes.bool,
    moderationMode: PropTypes.bool,
};

export default CommentSection;
