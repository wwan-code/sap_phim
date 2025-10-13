// CommentError.jsx - Error state component
const CommentError = ({ error, onRetry }) => (
    <div className="comment-error">
        <div className="comment-error__title">
            <i className="fas fa-exclamation-triangle" />
            Có lỗi xảy ra
        </div>
        <div className="comment-error__message">
            {error || 'Không thể tải bình luận. Vui lòng thử lại.'}
        </div>
        <div className="comment-error__actions">
            <button className="comment-error__retry" onClick={onRetry}>
                <i className="fas fa-redo" />
                Thử lại
            </button>
        </div>
    </div>
);
export default CommentError;