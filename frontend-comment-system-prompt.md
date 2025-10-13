Bạn là một frontend developer chuyên nghiệp.
Hãy viết toàn bộ code ReactJS (Vite + Redux Toolkit + SCSS) cho **Comment System** dựa trên tài liệu backend đã có. Hệ thống hỗ trợ bình luận đa cấp (tối đa 2 cấp (0: bình luận gốc, 1: trả lời bình luận gốc, 2: trả lời của trả lời)), like/report, ghim, ẩn, và quản lý admin với giao diện hiện đại và responsive.

## Cấu trúc files cần tạo/chỉnh sửa:
- @/frontend/src/services/userService.js
- @/frontend/src/services/movieService.js
- @/frontend/src/services/commentService.js
- @/frontend/src/store/slices/authSlice.js
- @/frontend/src/store/slices/commentSlice.js
- @/frontend/src/store/slices/notificationSlice.js
- @/frontend/src/store/index.js
- @/frontend/src/utils/classNames.js
- @/frontend/src/utils/dateUtils.js
- @/frontend/src/hooks/useComments.js
- @/frontend/src/hooks/useCommentActions.js
- @/frontend/src/hooks/useDropdown.js
- @/frontend/src/components/comments/CommentSystem.jsx
- @/frontend/src/components/comments/CommentList.jsx
- @/frontend/src/components/comments/CommentItem.jsx
- @/frontend/src/components/comments/CommentForm.jsx
- @/frontend/src/components/comments/CommentReplies.jsx
- @/frontend/src/components/comments/CommentActions.jsx
- @/frontend/src/components/comments/CommentFilters.jsx
- @/frontend/src/components/comments/CommentModeration.jsx
- @/frontend/src/components/skeletons/CommentSkeleton.jsx
- @/frontend/src/assets/scss/_variables.scss
- @/frontend/src/assets/scss/_mixins.scss
- @/frontend/src/assets/scss/base.scss (import _comment-system.scss vào đây)
- @/frontend/src/assets/scss/components/comments/_comment-system.scss
- @/frontend/src/pages/MovieDetailPage.jsx
- @/frontend/src/pages/MovieWatchPage.jsx

## Yêu Cầu Kỹ Thuật

### 1. Dependencies Trong Dự Án

"dependencies": {
    "@hookform/resolvers": "^5.2.1",
    "@popperjs/core": "^2.11.8",
    "@reduxjs/toolkit": "^2.8.2",
    "axios": "^1.11.0",
    "compression": "^1.8.1",
    "firebase": "^12.2.1",
    "lodash": "^4.17.21",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "react-hook-form": "^7.62.0",
    "react-icons": "^5.5.0",
    "react-loading-skeleton": "^3.5.0",
    "react-redux": "^9.2.0",
    "react-router-dom": "^7.8.2",
    "react-toastify": "^10.0.5",
    "redux-persist": "^6.0.0",
    "sass-embedded": "^1.91.0",
    "sass-loader": "^16.0.5",
    "socket.io-client": "^4.7.5",
    "swiper": "^11.2.10",
    "yup": "^1.7.0"
},
"devDependencies": {
    "@eslint/js": "^9.33.0",
    "@types/react": "^19.1.10",
    "@types/react-dom": "^19.1.7",
    "@vitejs/plugin-react": "^5.0.0",
    "eslint": "^9.33.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^16.3.0",
    "prop-types": "^15.8.1",
    "vite": "^7.1.2"
}

### 2. Redux Store Structure

Tạo Redux store với commentSlice chứa:
- Comments state: byId, allIds, pagination, filters, loading, error
- UI state: showCommentForm, showReplies, showModeration, searchOpen, filtersOpen
- Async thunks cho tất cả API calls
- Reducers cho CRUD operations và UI state management

## Tính Năng Chi Tiết

### 1. CommentSystem Component

**Props:**
- contentType: 'movie' | 'episode'
- contentId: number
- movieId?: number (cho movie comments)
- currentUser: User
- showEpisodeFilter?: boolean (cho movie comments)
- allowAnonymous?: boolean
- moderationMode?: boolean

**Tính năng:**
- Hiển thị danh sách comments với pagination (Nút Load More)
- Toggle giữa movie comments và episode comments
- Search và filter comments
- Real-time updates
- Responsive design cho mobile/desktop

### 2. CommentItem Component

**Tính năng:**
- Hiển thị thông tin user (avatar, username, roles)
- Nội dung comment với markdown support
- Spoiler warning và toggle
- Like/Unlike với animation
- Report button
- Reply button (nếu chưa đạt max depth)
- Edit/Delete (nếu là owner hoặc admin)
- Timestamp với relative time
- Pinned indicator
- Hidden indicator (admin only)

### 3. CommentForm Component

**Tính năng:**
- Rich text editor với emoji picker
- poilSer toggle
- Character counter
- Auto-resize textarea
- Preview mode
- Validation (min/max length)
- Cancel/Submit buttons
- Loading state

### 4. CommentReplies Component

**Tính năng:**
- Lazy loading replies
- Nested reply structure
- Show/Hide replies toggle
- Load more replies
- Reply to specific comment
- Depth indicator

### 5. CommentActions Component

**Tính năng:**
- Like/Unlike với count
- Report với confirmation
- Share comment
- Edit (owner only)
- Delete (owner/admin only)
- Pin/Unpin (admin only)
- Hide/Show (admin only)

### 6. CommentFilters Component

**Tính năng:**
- Sort by: latest, oldest, most liked
- Filter by: all, spoilers, non-spoilers
- Search by content
- Episode filter (cho movie comments)
- Date range filter
- User filter (admin only)

### 7. CommentModeration Component (Admin)

**Tính năng:**
- Bulk actions
- Approve/Reject comments
- Pin/Unpin comments
- Hide/Show comments
- Delete comments
- User management
- Report management

## API Integration

### 1. commentService.js (giống với movieService.js)

Tạo service với các methods:
- Đẩy đủ các API comment đã triển khai phía backend
- Utility APIs: canReplyToComment, getCommentStats, searchComments

### 2. Redux Actions

Tạo commentSlice với:
- Reducers cho Comment CRUD, UI State, Filters & Search, Pagination, Toggle UI
- Async thunks cho tất cả API operations
- Error handling và loading states

## Styling Requirements

**SCSS**
    - Bắt buộc dùng biến & mixin từ:
        - @/frontend/src/assets/scss/_variables.scss
        - @/frontend/src/assets/scss/_mixins.scss
    - `_comment.scss`: style threads, reply indent, spoiler overlay, like button animation
    - Viết class theo chuẩn BEM.
    - Responsive cho mobile, tablet, desktop.
    - Hover effects và transitions
    - State-based styling (pinned, hidden, active)
    
## Tính Năng Mở Rộng

### 1. Advanced Features
- Comment threading với visual indicators
- Comment reactions (like, love, laugh, etc.)
- Comment mentions (@username)
- Comment hashtags (#topic)
- Comment attachments (images, links)
- Comment translation
- Comment export/import

### 2. Moderation Tools
- Auto-moderation với AI
- Comment flagging system
- User reputation system
- Comment quality scoring
- Bulk moderation actions

### 3. Analytics & Insights
- Comment engagement metrics
- User activity tracking
- Content performance analysis
- Moderation statistics

### 4. Accessibility
- Screen reader support
- Keyboard navigation
- High contrast mode
- Font size adjustment
- Focus management

## Integration Requirements

### 1. MovieDetailPage.jsx
- Hiển thị comments của movie + tất cả episodes
- Toggle giữa movie comments và episode comments
- Episode filter dropdown

### 2. MovieWatchPage.jsx
- Hiển thị comments riêng cho episode
- Real-time updates khi có comment mới
- Sticky comment form

## Yêu Cầu Performance

1. **Lazy Loading**: Comments được load theo demand
2. **Virtual Scrolling**: Cho danh sách comments lớn
3. **Memoization**: React.memo cho components
4. **Debouncing**: Search và filter inputs
5. **Caching**: Redux state persistence
6. **Code Splitting**: Dynamic imports cho components

## Yêu Cầu Testing

1. **Unit Tests**: Components và utilities
2. **Integration Tests**: Redux actions và API calls
3. **E2E Tests**: User workflows
4. **Accessibility Tests**: Screen reader compatibility
5. **Performance Tests**: Load testing

## Yêu Cầu Documentation

1. **Component Documentation**: JSDoc comments
2. **API Documentation**: Service methods
3. **Style Guide**: SCSS organization
4. **User Guide**: Feature explanations
5. **Developer Guide**: Setup và deployment

---
**Đảm bảo**: UI cập nhật ngay lập tức khi gửi/chỉnh sửa comment.
**Lưu ý**: Tạo code với JavaScript support, error boundaries, loading states, và error handling đầy đủ. Đảm bảo responsive design và accessibility compliance.
=> Viết code chi tiết cho toàn bộ các file ở trên, đảm bảo chạy được ngay trong dự án React + Vite + Redux Toolkit + SCSS.