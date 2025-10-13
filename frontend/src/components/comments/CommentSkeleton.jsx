// CommentSkeleton.jsx - Loading skeleton
const CommentSkeleton = ({ count = 3 }) => (
    <>
        {Array.from({ length: count }, (_, index) => (
            <div key={index} className="comment-list__skeleton" aria-hidden="true">
                <div className="comment-skeleton__avatar"></div>
                <div className="comment-skeleton__content">
                    <div className="comment-skeleton__header"></div>
                    <div className="comment-skeleton__text"></div>
                    <div className="comment-skeleton__actions"></div>
                </div>
            </div>
        ))}
    </>
);

export default CommentSkeleton;