import db from '../models/index.js';

const { Comment } = db;

const MAX_DEPTH = 2; // 0 for root, 1 for reply to root, 2 for reply to reply

const enforceCommentDepth = async (req, res, next) => {
    const { parentId } = req.body;

    if (parentId) {
        const parentComment = await Comment.findByPk(parentId);

        if (!parentComment) {
            return res.status(400).json({
                success: false,
                message: 'Bình luận cha không tồn tại.'
            });
        }

        let currentDepth = 0;
        let ancestor = parentComment;
        while (ancestor && ancestor.parentId) {
            ancestor = await Comment.findByPk(ancestor.parentId);
            if (ancestor) {
                currentDepth++;
            } else {
                break;
            }
        }

        const newCommentDepth = currentDepth + 1;

        if (newCommentDepth > MAX_DEPTH) {
            return res.status(400).json({
                success: false,
                message: `Không thể trả lời bình luận này. Độ sâu tối đa cho phép là ${MAX_DEPTH}.`
            });
        }
    }
    next();
};

export default enforceCommentDepth;
