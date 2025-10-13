// CommentEmpty.jsx - Empty state component
const CommentEmpty = ({ canComment, message }) => (
    <div className="comment-empty">
        <div className="comment-empty__icon">
            <i className="fas fa-comments" />
        </div>
        <h3 className="comment-empty__title">Chưa có bình luận</h3>
        <p className="comment-empty__description">{message}</p>
    </div>
);

export default CommentEmpty;