import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { useCreateComment, useUpdateComment } from '@/hooks/useCommentQueries';
import useCommentStore from '@/stores/useCommentStore';
import { useDebounce } from '@/hooks/useDebounce';
import classNames from '@/utils/classNames';
import userService from '@/services/userService';
import Picker from 'emoji-picker-react';
import MentionSuggestion from './MentionSuggestion';

const MAX_COMMENT_LENGTH = 1000;
const MIN_COMMENT_LENGTH = 5;

/**
 * Component CommentForm để tạo hoặc chỉnh sửa bình luận.
 * Hỗ trợ rich text (markdown), spoiler, đếm ký tự, auto-resize textarea.
 */
const CommentForm = ({
    contentType,
    contentId,
    movieId, // Chỉ dùng khi contentType là 'movie' và cần merge comments
    parentId = null,
    initialText = '',
    initialIsSpoiler = false,
    commentToEdit = null, // Nếu đang chỉnh sửa comment
    onCancel = () => {},
    onSuccess = () => {},
    queryKeyToInvalidate,
    currentUser,
}) => {
    const [commentText, setCommentText] = useState(initialText);
    const [isSpoiler, setIsSpoiler] = useState(initialIsSpoiler);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const textareaRef = useRef(null);
    const mentionMapRef = useRef(new Map()); // Lưu trữ các mention đã chọn: username -> uuid

    // Sử dụng hook useDebounce để trì hoãn việc gọi API
    const debouncedMentionQuery = useDebounce(mentionQuery, 300);

    // React Query để fetch danh sách bạn bè cho mention
    const { data: mentionResults = [], isLoading: isMentionLoading } = useQuery({
        queryKey: ['searchFriends', debouncedMentionQuery],
        queryFn: () => userService.searchFriends(debouncedMentionQuery, 8).then(res => res.data || []),
        enabled: debouncedMentionQuery.length > 0 && showSuggestions, // Chỉ fetch khi có query và suggestion box đang mở
        staleTime: 1000 * 60 * 5, // Cache kết quả trong 5 phút
        keepPreviousData: true,
    });

    const { composingForId, editingId, setComposingForId, setEditingId } = useCommentStore();

    const isEditing = !!commentToEdit;
    const mutation = isEditing ? useUpdateComment(queryKeyToInvalidate) : useCreateComment(queryKeyToInvalidate);
    const { mutate, isPending, error } = mutation;

    // Helper: strip markdown profile links to @username for editor display
    const stripMentionLinks = (text) => {
        if (!text) return '';
        return text.replace(/\[@([A-Za-z0-9._-]+)\]\(\/profile\/[a-f0-9-]+\)/gi, '@$1');
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [commentText]);

    // If editing, display plain @username instead of markdown links
    useEffect(() => {
        if (isEditing && initialText) {
            setCommentText(stripMentionLinks(initialText));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reset form khi hủy hoặc submit thành công
    useEffect(() => {
        if (!isPending && !error && (composingForId === null && editingId === null)) {
            setCommentText('');
            setIsSpoiler(false);
            mentionMapRef.current = new Map();
        }
    }, [composingForId, editingId, isPending, error]);

    const handleTextChange = (e) => {
        const value = e.target.value;
        setCommentText(value);

        // Logic phát hiện trigger mention (@)
        const selectionStart = e.target.selectionStart;
        const textUntilCursor = value.slice(0, selectionStart);
        
        // Regex tìm kiếm @mention ngay trước con trỏ
        const mentionMatch = textUntilCursor.match(/(^|\s)@([\w._-]{0,20})$/);

        if (mentionMatch) {
            const query = mentionMatch[2] || '';
            setMentionQuery(query);
            setShowSuggestions(true);
            setActiveIndex(0); // Reset active index khi query thay đổi
        } else {
            setShowSuggestions(false);
            setMentionQuery('');
        }
    };

    const insertAtCursor = (textToInsert) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = commentText.substring(0, start);
        const after = commentText.substring(end);
        const newText = before + textToInsert + after;
        setCommentText(newText);
        // Move cursor
        requestAnimationFrame(() => {
            const pos = start + textToInsert.length;
            textarea.focus();
            textarea.setSelectionRange(pos, pos);
        });
    };

    const handlePickEmoji = (emoji) => {
        insertAtCursor(emoji);
        setShowEmojiPicker(false);
    };

    const handleSelectMention = useCallback((user) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const currentText = textarea.value;
        const selectionStart = textarea.selectionStart;
        const textUntilCursor = currentText.slice(0, selectionStart);

        // Tìm vị trí bắt đầu của @mention
        const mentionMatch = textUntilCursor.match(/(^|\s)@([\w._-]{0,20})$/);
        if (!mentionMatch) return;

        const startIndex = mentionMatch.index + mentionMatch[1].length;
        
        // Tạo nội dung mới với mention đã được chọn
        const before = currentText.substring(0, startIndex);
        const after = currentText.substring(selectionStart);
        const mentionText = `@${user.username} `;
        const newText = before + mentionText + after;

        setCommentText(newText);

        // Lưu trữ UUID của người dùng được mention để chuyển đổi khi submit
        mentionMapRef.current.set(user.username, user.uuid);

        // Reset trạng thái mention
        setShowSuggestions(false);
        setMentionQuery('');
        
        // Di chuyển con trỏ đến cuối mention
        requestAnimationFrame(() => {
            const newCursorPosition = before.length + mentionText.length;
            textarea.focus();
            textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        });
    }, []);

    const handleKeyDown = useCallback((e) => {
        if (showSuggestions && mentionResults.length > 0) {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setActiveIndex((prev) => (prev + 1) % mentionResults.length);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setActiveIndex((prev) => (prev - 1 + mentionResults.length) % mentionResults.length);
                    break;
                case 'Enter':
                    e.preventDefault();
                    handleSelectMention(mentionResults[activeIndex]);
                    break;
                case 'Escape':
                    e.preventDefault();
                    setShowSuggestions(false);
                    break;
                default:
                    break;
            }
        }
    }, [showSuggestions, mentionResults, activeIndex, handleSelectMention]);

    const handleSpoilerToggle = () => {
        setIsSpoiler((prev) => !prev);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const trimmedText = commentText.trim();
        if (trimmedText.length < MIN_COMMENT_LENGTH || trimmedText.length > MAX_COMMENT_LENGTH) {
            // Validation handled by UI, but also good to have here
            return;
        }

        // Convert selected mentions to markdown links before submit
        let processedText = trimmedText;
        if (mentionMapRef.current.size > 0) {
            mentionMapRef.current.forEach((uuid, username) => {
                // Escape special regex characters in username
                const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Sử dụng regex cải tiến để hỗ trợ tên có dấu cách và ký tự đặc biệt
                const regex = new RegExp(`(^|\\s)@${escapedUsername}(?=\\s|$)`, 'g');
                processedText = processedText.replace(regex, (match, prefix) => `${prefix}[@${username}](/profile/${uuid})`);
            });
        }

        const commentData = {
            contentId: contentType === 'movie' && movieId ? movieId : contentId,
            contentType,
            parentId: parentId,
            text: processedText,
            isSpoiler,
        };

        if (isEditing) {
            mutate({ id: commentToEdit.id, commentData }, {
                onSuccess: () => {
                    onSuccess();
                    setEditingId(null); // Clear editing state
                },
            });
        } else {
            mutate(commentData, {
                onSuccess: () => {
                    onSuccess();
                    setComposingForId(null); // Clear composing state
                },
            });
        }
    };

    const handleCancel = () => {
        setCommentText(stripMentionLinks(initialText));
        setIsSpoiler(initialIsSpoiler);
        mentionMapRef.current = new Map();
        if (isEditing) {
            setEditingId(null);
        } else {
            setComposingForId(null);
        }
        onCancel();
    };
    
    const trimmedText = commentText.trim();
    const charCount = commentText.length;
    const isInvalid = charCount < MIN_COMMENT_LENGTH || charCount > MAX_COMMENT_LENGTH || trimmedText.length === 0;

    return (
        <div className="comment-form">
            <div className="comment-form__header">
                {isEditing ? 'Chỉnh sửa bình luận' : (parentId ? 'Trả lời bình luận' : 'Viết bình luận')}
            </div>
            <form onSubmit={handleSubmit}>
                <div className="comment-form__textarea-wrapper">
                    <textarea
                        ref={textareaRef}
                        className="comment-form__textarea"
                        value={commentText}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        placeholder={isEditing ? 'Chỉnh sửa bình luận của bạn...' : (parentId ? 'Viết câu trả lời của bạn...' : 'Viết bình luận của bạn...')}
                        disabled={isPending}
                        aria-label={isEditing ? 'Chỉnh sửa bình luận' : (parentId ? 'Viết câu trả lời' : 'Viết bình luận')}
                        minLength={MIN_COMMENT_LENGTH}
                        maxLength={MAX_COMMENT_LENGTH}
                        aria-autocomplete="list"
                        aria-controls="mention-suggestions"
                    />
                    {showSuggestions && (
                        <div id="mention-suggestions" className="comment-form__mention-container">
                            <MentionSuggestion
                                users={mentionResults}
                                onSelect={handleSelectMention}
                                activeIndex={activeIndex}
                                setActiveIndex={setActiveIndex}
                                isLoading={isMentionLoading}
                            />
                        </div>
                    )}
                    <span className={classNames('comment-form__char-counter', { 'is-error': charCount > MAX_COMMENT_LENGTH || charCount < MIN_COMMENT_LENGTH })}>
                        {charCount}/{MAX_COMMENT_LENGTH}
                    </span>
                </div>

                {error && <p className="comment-form__error">{error.response?.data?.message || 'Có lỗi xảy ra khi gửi bình luận.'}</p>}

                <div className="comment-form__controls">
                    <div className="comment-form__options">
                        <div className="option-toggle">
                            <button type="button" onClick={() => setShowEmojiPicker(v => !v)} aria-label="Chèn emoji" disabled={isPending}>
                                <i className="far fa-smile" /> Emoji
                            </button>
                            {showEmojiPicker && (
                                <div className="comment-form__emoji-picker" role="dialog" aria-label="Emoji picker">
                                    <Picker
                                        lazyLoadEmojis
                                        emojiStyle="native"
                                        searchDisabled={false}
                                        skinTonesDisabled={false}
                                        onEmojiClick={(data) => handlePickEmoji(data.emoji)}
                                    />
                                </div>
                            )}
                        </div>
                        <label className="option-toggle">
                            <input
                                type="checkbox"
                                checked={isSpoiler}
                                onChange={handleSpoilerToggle}
                                disabled={isPending}
                            />
                            Đánh dấu là Spoiler
                        </label>
                    </div>
                    <div className="comment-form__buttons">
                        <button
                            type="button"
                            className="btn btn-secondary btn-cancel"
                            onClick={handleCancel}
                            disabled={isPending}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary btn-submit"
                            disabled={isPending || isInvalid}
                        >
                            {isPending ? 'Đang gửi...' : (isEditing ? 'Cập nhật' : 'Gửi')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

CommentForm.propTypes = {
    contentType: PropTypes.oneOf(['movie', 'episode']).isRequired,
    contentId: PropTypes.number.isRequired,
    movieId: PropTypes.number,
    parentId: PropTypes.number,
    initialText: PropTypes.string,
    initialIsSpoiler: PropTypes.bool,
    commentToEdit: PropTypes.object,
    onCancel: PropTypes.func,
    onSuccess: PropTypes.func,
    queryKeyToInvalidate: PropTypes.array.isRequired,
    currentUser: PropTypes.object,
};

export default CommentForm;
