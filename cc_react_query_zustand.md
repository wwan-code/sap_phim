Bạn là một **Senior Frontend Developer + UI/UX Designer**.  
Hãy tạo hệ thống giao diện **Comment UI** mới, hỗ trợ bình luận đa cấp với độ sâu tối đa 2 cấp (0: bình luận gốc, 1: trả lời bình luận gốc, 2: trả lời của trả lời) theo các yêu cầu sau:

---

## Công nghệ & Kiến trúc

- Frontend - Project: React + Vite (JS/JSX), React Query (server state), Zustand (client/UI state), SCSS (no Tailwind).
- Sử dụng cấu trúc semantic với `<ul>`, `<li>` cho comment + replies  
- SCSS: tuân theo BEM naming, sử dụng biến & mixin từ `_variables.scss` và `_mixins.scss`  
- API spec: @/COMMENT_API_DOCUMENTATION.md 
### Backend tham chiếu:
    @/backend/controllers/comment.controller.js
    @/backend/services/comment.service.js
    @/backend/routes/comment.routes.js
### Frontend tham chiếu:
    @/frontend/src/services/commentService.js
    @/frontend/src/utils/classNames.js
    @/frontend/src/utils/dateUtils.js
    @/frontend/src/assets/scss/_variables.scss
    @/frontend/src/assets/scss/_mixins.scss
    @/frontend/src/assets/scss/base.scss
    @/frontend/src/pages/MovieDetailPage.jsx
    @/frontend/src/pages/MovieWatchPage.jsx
    @/frontend/src/components/comments/CommentEmpty.jsx
    @/frontend/src/components/comments/CommentError.jsx
    @/frontend/src/components/comments/CommentSkeleton.jsx
    @/frontend/src/components/comments/CommentActions.jsx
### Project Structure

frontend/src/
├── components/comments/
│   ├── CommentSection.jsx
│   ├── CommentList.jsx
│   ├── CommentItem.jsx
│   ├── CommentForm.jsx
│   ├── CommentActions.jsx
│   ├── CommentEmpty.jsx
│   ├── CommentError.jsx
│   └── CommentSkeleton.jsx
├── stores/ (thay thế cho Redux store)
│   └── useCommentStore.js (Zustand store cho UI state)
├── services/commentService.js
└── assets/scss/
    ├── _variables.scss
    ├── _mixins.scss
    └── components/_comment.scss

---

## Nguyên tắc Prompt hóa để sinh mã chính xác

- Rõ mục tiêu: Mục tiêu là triển khai UI/UX Comment đầy đủ chức năng, kết nối API theo tài liệu, code chạy được ngay trong dự án hiện tại.
- Cung cấp ngữ cảnh: Nêu rõ tech stack (React Query, Zustand), kiến trúc, endpoints, state shape, realtime, style SCSS BEM.
- Yêu cầu đầu ra: Component, service, Zustand store, SCSS, và tích hợp vào `MovieDetailPage.jsx` và `MovieWatchPage.jsx` có ví dụ gọi API.
- Tiêu chí chấp nhận: Định nghĩa AC cụ thể ở phần dưới; build không lỗi, linter sạch, UI phản hồi tức thời.

---

## Mapping API (rút gọn — dùng đúng endpoints từ tài liệu)

- GET /api/comments/:parentId/replies?page=&limit=
- GET /api/comments/movie/:movieId/with-episodes
- GET /api/comments/:contentType/:contentId?page=&limit=&sort=
- POST /api/comments
- PUT /api/comments/:id
- DELETE /api/comments/:id
- POST /api/comments/:id/like
- POST /api/comments/:id/report
- Admin APIs: pin/hide/approve/delete by admin

---

## State & Data Management Contract (React Query + Zustand)

### Server State (Quản lý bởi React Query)
- Dữ liệu comments, replies, thông tin phân trang sẽ được quản lý bởi React Query.
- Sử dụng `useQuery` cho các API GET (ví dụ: `useComments`, `useReplies`).
- Sử dụng `useMutation` cho các API POST, PUT, DELETE (ví dụ: `useCreateComment`, `useUpdateComment`, `useDeleteComment`, `useLikeComment`, `useReportComment`).
- React Query sẽ tự động xử lý caching, revalidation, background fetching, optimistic updates và error handling.
- Cấu trúc dữ liệu comments sẽ được chuẩn hóa trong cache của React Query nếu cần, hoặc xử lý trực tiếp từ response API.

### Client/UI State (Quản lý bởi Zustand)
- Tạo một Zustand store (`useCommentStore.js`) để quản lý các trạng thái UI cục bộ của Comment UI.
- Store này sẽ chứa:
    - `activeSort: 'latest' | 'oldest' | 'popular'`
    - `composingForId: string | null` (ID của comment đang được trả lời)
    - `editingId: string | null` (ID của comment đang được chỉnh sửa)
    - `expandedReplies: Set<string>` (Set các ID của comment có replies đang được mở rộng)
    - `loadingStates: { [id]: boolean }` (Trạng thái loading cục bộ cho các hành động UI cụ thể, nếu React Query không bao phủ)
    - `error: string | null` (Lỗi UI cục bộ, nếu React Query không bao phủ)
- Các actions trong Zustand store để cập nhật các trạng thái UI này.

---

## Tính Năng Chi Tiết

### 1. CommentSection Component

**Props:**
- contentType: 'movie' | 'episode'
- contentId: number
- movieId?: number (cho movie comments)
- currentUser: User
- showEpisodeFilter?: boolean (cho movie comments)
- allowAnonymous?: boolean
- moderationMode?: boolean

**Tính năng:**
- Hiển thị comments của movie + tất cả episodes (sử dụng `useComments` query từ React Query)
- Hiển thị comments riêng cho episode (sử dụng `useComments` query từ React Query)
- Pagination (Nút Load More) (quản lý bởi React Query `useInfiniteQuery`)
- Filter comments (sử dụng `activeSort` từ Zustand store và truyền vào query key của React Query)
- Real-time updates (kết hợp với React Query `queryClient.invalidateQueries` hoặc `queryClient.setQueryData` khi nhận sự kiện từ WebSocket)
- Responsive design cho mobile/desktop

### 2. CommentList.jsx

**Props:** comments, depth
- render `<ul>` (semantic), map CommentItem
- If comment.hasReplies => show “Show replies” button that triggers lazy load `useReplies` query từ React Query.

### 3. CommentItem Component

**Tính năng:**
- Hiển thị thông tin user (avatar, username, roles)
- Badge episodeNumber 
- Nội dung comment với markdown support
- Spoiler warning và toggle (quản lý UI state cục bộ hoặc từ Zustand store)
- Like/Unlike với animation (sử dụng `useLikeComment` mutation từ React Query với optimistic update)
- Report button (sử dụng `useReportComment` mutation từ React Query)
- Edit/Delete (nếu là owner hoặc admin) (sử dụng `useUpdateComment` và `useDeleteComment` mutations từ React Query với optimistic update)
- Timestamp với relative time
- Pinned indicator
- Hidden indicator (admin only)

### 4. CommentForm Component

**Tính năng:**
- Rich text editor với emoji picker (quản lý UI state cục bộ)
- spoiler toggle (quản lý UI state cục bộ hoặc từ Zustand store)
- Character counter (quản lý UI state cục bộ)
- Auto-resize textarea (quản lý UI state cục bộ)
- Preview mode (quản lý UI state cục bộ)
- Validation (min/max length) (quản lý UI state cục bộ)
- Cancel/Submit buttons
- Loading state (từ `useCreateComment` mutation của React Query)

### 5. CommentActions Component

**Tính năng:**
- Like/Unlike với count (sử dụng `useLikeComment` mutation từ React Query)
- Report với confirmation (sử dụng `useReportComment` mutation từ React Query)
- Edit (owner only) (cập nhật `editingId` trong Zustand store)
- Delete (owner/admin only) (sử dụng `useDeleteComment` mutation từ React Query)
- Reply button (nếu chưa đạt max depth) (cập nhật `composingForId` trong Zustand store)

---

## Layout & Depth

- Depth levels hỗ trợ ít nhất **0, 1, 2** (reply tối đa 2 cấp).  
- Dùng CSS grid + subgrid hoặc padding-left để indent các độ sâu.  
- Avatar giảm kích thước khi depth tăng.  
- Dùng CSS variable `--depth` hoặc `data-depth` trên `<ul>` để xác định cấp độ.  
- Dùng CSS variable `--nested` trên `<li>` để xác định lồng nhau.  

---

## HTML Structure Standard
Semantic Comment Tree
```html
<section class="comment-section" role="region" aria-label="Comments">
  <header class="comment-section__header">
    <h2 class="comment-section__title">Comments (247)</h2>
    <div class="comment-section__controls">
      <select class="comment-sort" aria-label="Sort comments">
        <option value="latest">Newest First</option>
        <option value="popular">Most Popular</option>
      </select>
    </div>
  </header>

  <div class="comment-section__form">
    <!-- CommentForm component -->
  </div>

  <div class="comment-section__list">
    <ul class="comment-list" 
        data-depth="0" 
        style="--depth: 0" 
        role="tree" 
        aria-live="polite">
      
      <li class="comment-list__item" 
          id="comment-123" 
          role="treeitem"
          aria-expanded="true"
          tabindex="0">
        
        <article class="comment-item" data-depth="0">
          <div class="comment-item__layout">
            <div class="comment-item__avatar">
              <img src="..." alt="User avatar" loading="lazy">
            </div>
            
            <div class="comment-item__content">
              <header class="comment-item__header">
                <div class="comment-item__meta">
                  <span class="comment-item__username">Username</span>
                  <span class="comment-item__badges">
                    <span class="badge badge--admin">Admin</span>
                  </span>
                  <time class="comment-item__timestamp" 
                        datetime="2025-01-15T10:30:00Z">
                    2 hours ago
                  </time>
                </div>
              </header>
              
              <div class="comment-item__body">
                <div class="comment-item__text">
                  <p>Comment content here...</p>
                </div>
                
                <div class="comment-item__spoiler" data-spoiler="true">
                  <div class="spoiler-warning">
                    <span>Spoiler Alert</span>
                    <button type="button" class="spoiler-toggle">Show</button>
                  </div>
                  <div class="spoiler-content" hidden>
                    Hidden spoiler content
                  </div>
                </div>
              </div>
              
              <footer class="comment-item__actions">
                <button class="comment-action comment-action--like" 
                        aria-pressed="false">
                  <span class="comment-action__icon">👍</span>
                  <span class="comment-action__text">Like</span>
                  <span class="comment-action__count">15</span>
                </button>
                
                <button class="comment-action comment-action--reply">
                  <span class="comment-action__text">Reply</span>
                </button>
                
                <div class="comment-action comment-action--more">
                  <button class="comment-action__trigger" aria-haspopup="menu">
                    <span class="sr-only">More actions</span>
                  </button>
                  <div class="comment-action__menu" role="menu">
                    <button role="menuitem">Report</button>
                    <button role="menuitem">Edit</button>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </article>

        <!-- Nested replies -->
        <ul class="comment-list comment-list--replies" 
            data-depth="1" 
            style="--depth: 1"
            role="group"
            aria-label="Replies to comment">
          
          <li class="comment-list__item" id="comment-124" role="treeitem">
            <!-- Reply structure same as above -->
          </li>
          
          <li class="comment-list__load-more">
            <button class="load-more-btn" 
                    data-parent-id="123"
                    aria-label="Load more replies">
              <span>Show 3 more replies</span>
            </button>
          </li>
        </ul>
      </li>
    </ul>
    
    <!-- Load more button -->
    <div class="comment-section__load-more">
      <button class="load-more-btn load-more-btn--primary">
        Load More Comments
      </button>
    </div>
  </div>
</section>
```

---

## Kết nối về visual / đường nối

- Nếu một comment có replies, hiển thị đường kết nối từ avatar comment cha xuống comment con(s), dùng pseudo-elements (`:before`, `:after`).  
- Đường thẳng + cong (line + curved) như ảnh mẫu.  
- Màu đường nối nhạt hơn hoặc tint từ champagne gold tùy theme; opacity thấp.  

---

## Style tổng thể

- Base card comment: no border, bo góc mềm (ví dụ `border-radius: 8px`), shadow nhẹ  
- Avatar: tròn, shadow nhẹ, size thay đổi khi depth tăng  
- Username + badge (admin/mod)  
- Timestamp tương đối (“x phút trước”, “4d”, “2 ngày trước”, etc.)  
- Nội dung hỗ trợ multi-line, line-clamp đối với text rất dài + nút “Xem thêm”  
- Action buttons: Like, Reply, Report, với icon + text, hover có hiệu ứng nhẹ  
- Input box cho reply/comment mới: textarea auto-resize, nút submit nổi bật màu champagne gold  

---

## SCSS

- Bắt buộc dùng biến & mixin từ:
   - @/frontend/src/assets/scss/_variables.scss
   - @/frontend/src/assets/scss/_mixins.scss
- _comment.scss: style threads, reply indent, spoiler overlay, like button animation
- Viết class theo chuẩn BEM.
- Responsive cho mobile, tablet, desktop.
- Hover effects và transitions
- State-based styling (pinned, hidden, active)

---

## Responsive behavior

Desktop (≥ 1024px)
- Avatar: kích thước 40–48px.
- Layout: hiển thị dạng list dọc, mỗi item sắp xếp ngang (flex row) gồm avatar – nội dung – action. Nội dung giới hạn max-width khoảng 70% để tránh tràn màn hình.
- Nút action: hiển thị đầy đủ (Like, Reply, Report, Edit, Delete). Tooltip hiển thị khi hover.
- Text: font size 16–18px, line-height thoáng, indent rõ ràng cho các reply.

Tablet (768px – 1023px)
- Avatar: kích thước 36px.
- Layout: co gọn hơn desktop, vẫn theo dạng flex row nhưng spacing nhỏ lại. Các reply có indent vừa phải.
- Nút action: các action phụ gom vào menu icon (3 chấm). Action chính (Like/Reply) vẫn hiển thị trực tiếp.
- Text: font size 15–16px, indent trung bình, tránh chiếm nhiều không gian.

Mobile (≤ 767px)
- Avatar: kích thước 28–32px.
- Layout: chuyển hoàn toàn sang dạng stacked dọc. Avatar hiển thị bên trái, tên người dùng + thời gian đăng trên 1 dòng, nội dung hiển thị bên dưới. Reply hiển thị dạng thread dọc.
- Nút action: thu gọn thành icon nhỏ (Like, Reply). Các action khác (Report, Edit, Delete) ẩn trong menu phụ.
- Text: font size 13–14px, line-height thoáng. Indent nhỏ để tiết kiệm không gian. Chỉ hiển thị mặc định tối đa 2 cấp reply, các cấp sâu hơn sẽ collapse với nút “Xem thêm phản hồi”.

---

## Integration Requirements

### 1. MovieDetailPage.jsx:
- Hiển thị comments của movie + tất cả episodes
- use provided <CommentSection contentType="movie" contentId={movieId} movieId={movieId} currentUser={user} />

### 2. MovieWatchPage.jsx:
- Hiển thị comments riêng cho episode
- Real-time updates khi có comment mới
- use <CommentSection contentType="episode" contentId={episodeId} currentUser={user} />

---

## Xử lý lỗi & UX states

- Map lỗi API theo response chuẩn: `{ success: false, message, error }`.
- Hiển thị các trạng thái: empty state (chưa có bình luận), skeleton khi loading (từ React Query `isLoading`), inline error với nút retry (từ React Query `isError`, `refetch`), disabled submit khi invalid.
- Validation client: độ dài min/max, không cho chỉ chứa khoảng trắng, giới hạn spam submit (debounce 500ms).
- Rate limit UX: khi nhận 429, hiển thị thông báo và tắt nút trong thời gian còn lại.
- A11y: role/aria cho list, button, label, thông báo; focus management sau submit/edit.

---

## Tính Năng Mở Rộng

### 1. Advanced Features
- Comment threading với visual indicators
- Comment reactions (like, love, laugh, etc.)
- Comment mentions (@username)
- Comment hashtags (#topic)
- Comment attachments (images, links)

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

---

## Yêu Cầu Performance

1. **Lazy Loading**: Comments được load theo demand (React Query `useInfiniteQuery`)
2. **Virtual Scrolling**: Cho danh sách comments lớn
3. **Memoization**: React.memo cho components
4. **Debouncing**: Filter inputs
5. **Caching**: React Query sẽ tự động quản lý caching cho server state. Zustand sẽ quản lý client state.
6. **Code Splitting**: Dynamic imports cho components

---

## Output mong muốn

- React components: `CommentSection.jsx`, `CommentList.jsx`, `CommentItem.jsx`, `CommentForm.jsx`, `CommentInput.jsx`, `CommentActions.jsx`
- Zustand store: `stores/useCommentStore.js`
- SCSS module ví dụ: `components/_comment.scss` có BEM + responsive + line connector  
- Ví dụ HTML structure sử dụng `<ul>` / `<li>` với `data-depth` hoặc `data-nested`  
- Code clean, có comment tiếng Việt để giải thích những phần dùng depth, line nối, responsive  
- Kết quả giao diện nhìn giống ảnh mẫu: có depth, connector, spacing đều, nhìn chuyên nghiệp  

---
**Đảm bảo**: UI cập nhật ngay lập tức khi gửi/chỉnh sửa comment (sử dụng optimistic updates của React Query). Viết đầy đủ các tính năng.
**Lưu ý**: Tạo code với JavaScript support, error boundaries, loading states, và error handling đầy đủ. Đảm bảo responsive design và accessibility compliance.

---

## Tiêu chí chấp nhận (Acceptance Criteria)

- Build thành công `frontend` không lỗi; ESLint không báo lỗi mới.
- `CommentSection` render danh sách theo `contentType` và `contentId`, hỗ trợ `movieId` khi cần merge.
- Nút "Tải thêm" hoạt động theo `meta.page`/`meta.totalPages` cho cả root và replies (quản lý bởi React Query `useInfiniteQuery`).
- Tạo/sửa/xóa/like/report hoạt động với optimistic update và rollback khi thất bại (sử dụng React Query `useMutation`).
- Realtime nhận sự kiện và cập nhật UI không flicker, không nhân đôi item (sử dụng `queryClient.invalidateQueries` hoặc `queryClient.setQueryData` của React Query).
- Spoiler có overlay, có toggle để xem nội dung; markdown được render an toàn (sanitize).
- A11y: có thể điều hướng bằng bàn phím, focus vào phần tử hợp lý sau thao tác.
- Responsive đạt bảng thông số ở phần Responsive behavior.

---

## Gợi ý tối ưu mã

- Dùng React Query `select` option hoặc các custom hook để biến đổi dữ liệu khi cần.
- Tách nhỏ component, dùng `React.memo` cho `CommentItem` và `CommentActions`.
- Batch updates khi nhận chùm sự kiện realtime (React Query tự động batch updates).
- Sanitize markdown (DOMPurify) và giới hạn độ dài để tránh tốn thời gian render.
- Chuẩn hóa ảnh avatar bằng `loading="lazy"` và kích thước cố định để tránh layout shift.

=> Viết code chi tiết cho toàn bộ các yêu cầu ở trên và tạo đầy đủ các files yêu cầu, đảm bảo chạy được ngay trong dự án React + Vite + React Query + Zustand + SCSS.