import React, { useEffect, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useSearchParams } from 'react-router-dom';
import { useComments, useCommentWithParents } from '@/hooks/useCommentQueries';
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
    movieId,
    currentUser,
    showEpisodeFilter = false,
    moderationMode = false,
}) => {
    const { activeSort, setActiveSort, composingForId, editingId, setComposingForId, setEditingId, expandedReplies, toggleExpandedReplies } = useCommentStore();
    const [searchParams] = useSearchParams();
    const commentIdFromUrl = searchParams.get('commentId');
    const scrollAttemptedRef = useRef(false);
    
    // Use React Query hook for caching
    const { data: parentChainData, isLoading: isLoadingParentChain } = useCommentWithParents(
        commentIdFromUrl && !scrollAttemptedRef.current ? parseInt(commentIdFromUrl) : null
    );

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

    // Helper function to find comment and its parent chain recursively
    const findCommentPath = (comments, targetId, path = []) => {
        for (const comment of comments) {
            const currentPath = [...path, comment.id];
            if (comment.id === parseInt(targetId)) {
                return currentPath;
            }
            if (comment.replies && comment.replies.length > 0) {
                const foundPath = findCommentPath(comment.replies, targetId, currentPath);
                if (foundPath) return foundPath;
            }
        }
        return null;
    };

    // Memoized scroll function
    const scrollToAndHighlight = useCallback((elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
            // Use requestAnimationFrame for smoother scrolling
            requestAnimationFrame(() => {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('comment-highlighted');
                setTimeout(() => {
                    element.classList.remove('comment-highlighted');
                }, 3000);
            });
            return true;
        }
        return false;
    }, []);

    // Optimized scroll to comment with React Query cache
    useEffect(() => {
        if (!commentIdFromUrl || isLoading || allComments.length === 0 || scrollAttemptedRef.current) {
            return;
        }

        const attemptScroll = () => {
            const elementId = `comment-${commentIdFromUrl}`;
            
            // Try direct scroll first
            if (scrollToAndHighlight(elementId)) {
                scrollAttemptedRef.current = true;
                return;
            }

            // If not found and we have parent chain data from React Query
            if (parentChainData?.parentChain && parentChainData.parentChain.length > 0) {
                // Expand parents using batch update
                const parentsToExpand = parentChainData.parentChain.filter(
                    parentId => !expandedReplies.has(parentId)
                );
                
                if (parentsToExpand.length > 0) {
                    // Batch expand to reduce re-renders
                    parentsToExpand.forEach(parentId => toggleExpandedReplies(parentId));
                    
                    // Wait for DOM update with requestAnimationFrame
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            if (scrollToAndHighlight(elementId)) {
                                scrollAttemptedRef.current = true;
                            }
                        }, 600); // Reduced from 800ms
                    });
                } else {
                    // Parents already expanded, just wait for render
                    setTimeout(() => {
                        if (scrollToAndHighlight(elementId)) {
                            scrollAttemptedRef.current = true;
                        }
                    }, 300);
                }
            } else {
                // Fallback: try local search
                const commentPath = findCommentPath(allComments, commentIdFromUrl);
                if (commentPath && commentPath.length > 1) {
                    const parentsToExpand = commentPath.slice(0, -1);
                    parentsToExpand.forEach(parentId => {
                        if (!expandedReplies.has(parentId)) {
                            toggleExpandedReplies(parentId);
                        }
                    });
                    setTimeout(() => {
                        if (scrollToAndHighlight(elementId)) {
                            scrollAttemptedRef.current = true;
                        }
                    }, 500);
                }
            }
        };

        const timer = setTimeout(attemptScroll, 300); // Reduced from 500ms
        return () => clearTimeout(timer);
    }, [commentIdFromUrl, isLoading, allComments, parentChainData, expandedReplies, toggleExpandedReplies, scrollToAndHighlight]);

    // Reset scroll attempt when navigating to different comment
    useEffect(() => {
        scrollAttemptedRef.current = false;
    }, [commentIdFromUrl]);

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
