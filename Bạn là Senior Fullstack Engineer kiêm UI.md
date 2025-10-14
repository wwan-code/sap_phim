Bạn là Senior Fullstack Engineer kiêm UI/UX Designer.
Hãy xây dựng toàn bộ hệ thống Reels/Short — một nền tảng chia sẻ video ngắn (giống Instagram Reels, TikTok, YouTube Shorts) — có hiệu năng cao, realtime, hỗ trợ upload video, xem liên tục dạng vertical feed, tương tác (like, comment, share, follow), cùng khả năng quản lý bằng AI và queue xử lý video (BullMQ).

## ⚙️ Công nghệ
- Backend: Node.js + Express + Sequelize + Socket.IO + Redis + BullMQ v5.
- Frontend: React + Vite + Zustand + React Query + SCSS + Socket.IO Client. Sử dụng react-icons cho icon.

## Tính năng chính
### **1. Upload & Xử lý video (Backend BullMQ)**  
* Upload video qua `uploadReel.middleware.js`.
* Job BullMQ xử lý video (compress, generate thumbnail, extract metadata).
* Trạng thái video: `pending → processing → completed → failed`.
* Khi xử lý xong, emit event realtime `reel:published` đến bạn bè/follower.

### **2. Reels Feed (Frontend)**
* Hiển thị feed dạng **vertical full-screen scroll (swiper)**.
* Lazy load video khi scroll xuống.
* Auto-play/pause khi chuyển reel.
* Preload reel tiếp theo (giống TikTok).

### **3. Tương tác realtime**
* Like / Unlike (realtime bằng Socket.IO).
* Comment và hiển thị ngay lập tức.
* Đếm view realtime.
* Notification: khi có comment hoặc like mới.

### **4. Reels AI Assistant**
* Tích hợp AI gợi ý caption và hashtags.
* Phân tích nội dung video (detect tags, mood, sound, etc).
* Đề xuất Reels tương tự (recommendation engine).

### **5. Trang quản lý Reels (Admin Dashboard)**
* CRUD reels (ẩn/xoá/báo cáo vi phạm).
* Thống kê views, likes, completion rate.
* Realtime chart (Socket.IO + Chart.js).

## Cấu trúc file cần chỉnh sửa/tạo mới 
### Backend (Node.js + Express + Sequelize + Socket.IO + Redis + BullMQ v5):
    @/backend/package.json
    @/backend/index.js
    @/backend/config/database.js
    @/backend/config/socket.js
    @/backend/config/redis.js
    @/backend/config/bullmq.js
    @/backend/models/User.js
    @/backend/models/Reel.js
    @/backend/models/ReelComment.js
    @/backend/models/ReelLike.js
    @/backend/models/FollowReel.js
    @/backend/models/index.js
    @/backend/models/associations.js
    @/backend/middlewares/auth.middleware.js
    @/backend/middlewares/uploadReel.middleware.js
    @/backend/middlewares/rateLimit.middleware.js
    @/backend/jobs/reelProcessor.job.js
    @/backend/jobs/reelMaintenance.cron.js
    @/backend/services/reel.service.js
    @/backend/services/ai.service.js
    @/backend/controllers/reel.controller.js
    @/backend/routes/reel.routes.js
    @/backend/utils/video.utils.js
    @/backend/utils/ai.utils.js
    @/backend/utils/logger.js

### Frontend (React + Vite + Zustand + React Query + SCSS)
    @/frontend/package.json
    @/frontend/src/main.jsx
    @/frontend/src/App.jsx
    @/frontend/src/pages/ReelsPage.jsx
    @/frontend/src/pages/admin/ReelsAdminPage.jsx
    @/frontend/src/hooks/useReelQueries.js
    @/frontend/src/hooks/useDropdown.js
    @/frontend/src/hooks/usePopperTooltip.js
    @/frontend/src/utils/dateUtils.js
    @/frontend/src/stores/useReelPlayerStore.js
    @/frontend/src/socket/socketManager.jsx
    @/frontend/src/services/reelService.js
    @/frontend/src/components/layout/Header.jsx (thêm icon Reels)
    @/frontend/src/components/common/UserAvatar.jsx
    @/frontend/src/components/common/LoadingSpinner.jsx
    @/frontend/src/components/common/ErrorMessage.jsx
    @/frontend/src/components/common/Modal.jsx
    @/frontend/src/components/reels/ReelCard.jsx
    @/frontend/src/components/reels/ReelFeed.jsx
    @/frontend/src/components/reels/ReelUploader.jsx
    @/frontend/src/components/reels/ReelSidebar.jsx
    @/frontend/src/components/skeletons/ReelCardSkeleton.jsx
    @/frontend/src/components/skeletons/ReelFeedSkeleton.jsx
    @/frontend/src/components/skeletons/ReelSidebarSkeleton.jsx
    @/frontend/src/components/reels/ReelPlayerControls.jsx
    @/frontend/src/components/reels/ReelCommentBox.jsx
    @/frontend/src/components/reels/ReelStatsBar.jsx
    @/frontend/src/assets/scss/pages/_reels-page.scss
    @/frontend/src/assets/scss/pages/admin/_reels-admin-page.scss
    @/frontend/src/assets/scss/components/reels/_reel-uploader.scss
    @/frontend/src/assets/scss/components/reels/_reel-feed.scss
    @/frontend/src/assets/scss/components/reels/_reel-card.scss
    @/frontend/src/assets/scss/components/reels/_reel-sidebar.scss
    @/frontend/src/assets/scss/components/reels/_reel-player-controls.scss
    @/frontend/src/assets/scss/components/reels/_reel-comment-box.scss
    @/frontend/src/assets/scss/components/reels/_reel-stats-bar.scss
    @/frontend/src/assets/scss/_variables.scss
    @/frontend/src/assets/scss/_mixins.scss

## Logic kỹ thuật
### **Backend**
* Sequelize Models: User, Reel, ReelComment, ReelLike, FollowReel.
* Redis caching cho reels trending.
* BullMQ queue để xử lý video async.
* Socket.IO events:
  reel:published
  reel:liked
  reel:commented
  reel:viewed
  reel:deleted
* Middleware: JWT Auth, Rate Limit, Upload Handler (multer + ffmpeg).

### **Frontend**
* Zustand/Redux: lưu `currentReel`, `isPlaying`, `volume`, `muted`.
* React Query: load reels, comments, likes, lazy pagination.
* Socket events lắng nghe realtime.
* Hook `useReelQueries` quản lý caching + mutation.

## THIẾT KẾ UI/UX

### **ReelsPage.jsx** — Trang chính hiển thị toàn bộ Reels Feed
**Mục tiêu UX:** Giao diện full-screen dọc, chỉ hiển thị một video tại một thời điểm, cảm giác “immersive” như TikTok.
**Thiết kế:**
* **Layout:**
  * Full viewport height (`100vh`), không thanh scroll browser.
  * Dùng `Swiper` hoặc custom scroll snap.
  * Mỗi slide = một `ReelCard`.
* **Behavior:**
  * Auto play reel khi nằm giữa viewport.
  * Auto pause reel khi rời khỏi khung nhìn.
  * Hiệu ứng chuyển reel mượt, có easing.
* **Mobile:** Swiping bằng gesture (touch).
* **Desktop:** Dùng scroll hoặc phím mũi tên.
* **Floating Buttons:** Nút `+` upload, `Back to Top`, `Mute/Unmute`.

### **ReelCard.jsx** — Component video chính trong feed
**Mục tiêu UX:** Trải nghiệm xem video hoàn hảo, tối giản, nhấn mạnh nội dung.
**Thiết kế:**
* **Bố cục:**
  * Container chiếm 100% chiều cao viewport.
  * Video full-size, `object-fit: cover`.
  * Overlay gradient phía dưới để hiển thị thông tin.
* **Elements:**
  * Avatar + username góc dưới trái.
  * Caption (3 dòng, có “Xem thêm”).
  * Hashtags có màu --w-cyan.
  * Sidebar phải: Like, Comment, Share.
  * Mỗi nút có animation hover (scale 1.1, shadow mềm).
* **State:**
  * Khi double tap → Like animation “burst” (heart pop).
  * Khi nhấn giữ → tạm dừng video.
  * Khi click avatar → điều hướng đến profile.

### **ReelCommentBox.jsx** — Hộp bình luận
**Mục tiêu UX:** Trải nghiệm comment realtime, nhanh, giống Instagram.
**Thiết kế:**
* **Layout:**
  * Overlay bottom modal khi nhấn vào comment.
  * Hiển thị danh sách comment + input ở dưới cùng.
* **Interaction:**
  * Khi gõ → mở keyboard (mobile) hoặc auto focus (desktop).
  * Có emoji picker + mention bạn bè.
  * Khi gửi → socket emit `reel:commented`.
  * Comment hiển thị ngay (optimistic update).
* **UI:**
  * Avatar + tên người dùng + thời gian + icon Like nhỏ.
  * Nút “Xem thêm bình luận” khi nhiều hơn 3.
* **Color scheme:**
  * Nền tối nhẹ, text trắng ngà, accent vàng #e8c26e.

### **ReelStatsBar.jsx** — Thanh thống kê & tương tác
**Mục tiêu UX:** Giúp người dùng tương tác nhanh mà không rời video.
**Thiết kế:**
* **Hiển thị:**
  * Likes · Comments · Views 
  * Transition count bằng animation (odometer style).
* **Realtime:**
  * Khi có event `reel:liked` → cập nhật ngay.
  * Khi có comment → tăng counter realtime.
* **Mobile:** Thanh này nằm dưới caption.
* **Desktop:** Có thể hover để xem ai đã like/comment.

### **ReelPlayerControls.jsx** — Điều khiển video
**Mục tiêu UX:** Cung cấp trải nghiệm playback mượt mà và trực quan.
**Thiết kế:**
* **Nút điều khiển:** Play/Pause, Volume, Mute/Unmute, Progress bar.
* **Progress bar:**
  * Gradient từ vàng champagne → trắng.
  * Có animation progress bằng CSS transition.
  * Khi hover → hiển thị thời gian.
* **Keyboard shortcut:**
  * Space = Play/Pause
  * M = Mute
  * Arrow Up/Down = Volume

### **ReelUploader.jsx** — Component upload video

**Mục tiêu UX:** Trải nghiệm upload nhanh, preview tức thời, có AI hỗ trợ caption.
**Thiết kế:**
* **Steps:**
  1 Upload video (drag-drop hoặc file input).
  2 Chỉnh sửa video (cắt, ghép, lọc màu).
  3 Xem preview + chọn thumbnail.
  4 Nhập caption, hashtags, chọn quyền riêng tư.
  5 Gợi ý caption & tag bằng AI (nút “Gợi ý AI”).
* **UI:**
  * Progress bar upload (realtime).
  * Preview thumbnail (poster).
  * Tag bạn bè (multi-select).
  * Button “Đăng ngay”.
* **Backend:**
  * Gọi API upload → enqueue BullMQ job.
  * Khi xử lý xong → Socket emit `reel:published`.

### **ReelsAdminPage.jsx** — Trang quản trị Reels
**Mục tiêu UX:** Giúp admin quản lý & theo dõi hoạt động của người dùng.
**Thiết kế:**
* **Layout:**
  * Sidebar trái (filter: User, Category, Status).
  * Bảng chính hiển thị danh sách Reels (thumbnail, user, status, views, likes).
  * Biểu đồ realtime (Chart.js): Views, Likes, Retention.
* **Actions:**
  * CRUD Reels: Ẩn, xoá, ban user.
  * Filter theo ngày / user / report flag.
* **Realtime update:**
  * Socket emit `reel:deleted`, `reel:reported` cập nhật ngay.

### **AI Caption & Hashtag Assistant**
**Mục tiêu UX:** Giúp người dùng viết caption hấp dẫn và đúng xu hướng.
**Thiết kế:**
* **UI:**
  * Popup nhỏ trong `ReelUploader`.
  * Nút “Gợi ý AI”.
  * Khi click → hiển thị caption mẫu và hashtags.
  * Cho phép chọn hoặc chỉnh sửa.
* **UX:**
  * Loading animation khi AI đang xử lý.
  * Hiển thị confidence score.
  * Có nút “Tạo lại” (Regenerate).

### **ReelSidebar.jsx** — Sidebar hiển thị user & controls
**Mục tiêu UX:** Giúp người xem dễ truy cập profile, like/comment/share.
**Thiết kế:**
* **Bố cục:**
  * Nằm dọc bên phải reel (desktop), hoặc overlay nổi (mobile).
  * Các nút icon có tooltip & animation bounce nhẹ khi hover.
  * Thứ tự: Avatar (link profile) → Like → Comment → Share → Save.
* **Trạng thái:**
  * Khi đã like → đổi màu --w-cyan.
  * Khi hover → hiển thị số lượt tương tác.

## Yêu cầu kỹ thuật
- Clean Architecture, module hoá rõ ràng (controller/service/job/utils).
- RESTful API chuẩn, realtime Socket.IO.
- Video xử lý async qua BullMQ.
- AI caption/hashtag suggestion backend.
- SCSS chuẩn BEM, dùng `_variables.scss` và `_mixins.scss`.
- Animation mượt, responsive.
- Code có comment tiếng Việt ở các logic phức tạp.

## Output
Sinh toàn bộ **code backend + frontend**, production-ready, với giao diện giống Reels thật:
- Smooth scroll vertical feed.
- Auto-play, comment, like realtime.
- AI caption generator.
- Admin realtime dashboard.
- Code sạch, có tổ chức, tối ưu hiệu năng.