# Hệ Thống Comment - Tài Liệu Tổng Hợp

## Tổng Quan

Hệ thống comment được thiết kế để hỗ trợ bình luận phân cấp với độ sâu tối đa 2 cấp, áp dụng cho cả phim và tập phim. Hệ thống bao gồm các tính năng cơ bản như tạo, sửa, xóa, like, report và các tính năng quản trị như duyệt, ghim, ẩn comment.

## Cấu Trúc Database

### Model Comment

```javascript
{
  id: INTEGER (Primary Key, Auto Increment),
  uuid: UUID (Unique),
  userId: INTEGER (Foreign Key -> users.id),
  contentId: INTEGER (ID của nội dung được bình luận),
  contentType: STRING ('movie' | 'episode'),
  parentId: INTEGER (Foreign Key -> Comments.id, nullable),
  text: TEXT (Nội dung bình luận),
  likes: JSON (Array of user IDs),
  reports: JSON (Array of user IDs),
  isSpoiler: BOOLEAN (default: false),
  isPinned: BOOLEAN (default: false),
  isEdited: BOOLEAN (default: false),
  isApproved: BOOLEAN (default: true),
  isHidden: BOOLEAN (default: false),
  createdAt: DATETIME,
  updatedAt: DATETIME
}
```

###   

```javascript
// User - Comment (1-n)
User.hasMany(Comment, { foreignKey: 'userId', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Comment - Comment (self-relation for replies)
Comment.hasMany(Comment, { as: 'replies', foreignKey: 'parentId', onDelete: 'CASCADE' });
Comment.belongsTo(Comment, { as: 'parent', foreignKey: 'parentId' });
```

## Các Tính Năng Chính

### 1. Tính Năng Cơ Bản
- ✅ Tạo bình luận mới
- ✅ Lấy danh sách bình luận theo phim/tập
- ✅ Lấy bình luận trả lời (replies)
- ✅ Lấy bình luận theo phim + tập (merge)
- ✅ Cập nhật bình luận
- ✅ Xóa bình luận
- ✅ Like/Unlike bình luận
- ✅ Report bình luận

### 2. Tính Năng Quản Trị
- ✅ Duyệt bình luận (Admin)
- ✅ Ghim bình luận (Admin)
- ✅ Ẩn bình luận (Admin)
- ✅ Xóa bình luận với quyền admin

### 3. Tính Năng Hỗ Trợ
- ✅ Kiểm tra độ sâu comment (tối đa 2 cấp)
- ✅ Thống kê comment
- ✅ Tìm kiếm comment
- ✅ Gửi thông báo tự động
- ✅ Transaction và retry logic

## API Endpoints

### Public Endpoints

#### 1. Lấy bình luận trả lời
```
GET /api/comments/:parentId/replies
```

**Query Parameters:**
- `page` (number): Số trang (default: 1)
- `limit` (number): Số lượng per page (default: 10, max: 100)
- `sort` (string): 'latest' | 'oldest' (default: 'latest')

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "uuid-string",
      "userId": 1,
      "contentId": 1,
      "contentType": "movie",
      "parentId": 1,
      "text": "Nội dung bình luận",
      "likes": [1, 2, 3],
      "isSpoiler": false,
      "isPinned": false,
      "isEdited": false,
      "isApproved": true,
      "isHidden": false,
      "isLiked": true,
      "isReported": false,
      "hasReplies": true,
      "repliesCount": 5,
      "replies": [...],
      "user": {
        "id": 1,
        "uuid": "user-uuid",
        "username": "username",
        "avatarUrl": "avatar-url",
        "sex": "male",
        "roles": [{"name": "user"}]
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

#### 2. Lấy bình luận theo phim/tập
```
GET /api/comments/:contentType/:contentId
```

**Path Parameters:**
- `contentType`: 'movie' | 'episode'
- `contentId`: ID của phim hoặc tập

**Query Parameters:** (giống như trên)

**Response:** (giống như trên)

#### 3. Lấy bình luận theo phim + tập (merge)
```
GET /api/comments/movie/:movieId/with-episodes
```

**Path Parameters:**
- `movieId`: ID của phim

**Query Parameters:** (giống như trên)

**Response:** (giống như trên, nhưng có thêm `episodeNumber` cho comment của tập)

### Private Endpoints (Yêu cầu đăng nhập)

#### 4. Tạo bình luận mới
```
POST /api/comments
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "contentId": 1,
  "contentType": "movie",
  "parentId": null,
  "text": "Nội dung bình luận",
  "isSpoiler": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "uuid-string",
    "userId": 1,
    "contentId": 1,
    "contentType": "movie",
    "parentId": null,
    "text": "Nội dung bình luận",
    "likes": [],
    "isSpoiler": false,
    "isPinned": false,
    "isEdited": false,
    "isApproved": true,
    "isHidden": false,
    "user": {
      "id": 1,
      "uuid": "user-uuid",
      "username": "username",
      "avatarUrl": "avatar-url",
      "sex": "male",
      "roles": [{"name": "user"}]
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Bình luận đã được tạo thành công."
}
```

#### 5. Cập nhật bình luận
```
PUT /api/comments/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "text": "Nội dung bình luận đã sửa",
  "isSpoiler": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // Comment object đã cập nhật
  },
  "message": "Bình luận đã được cập nhật thành công."
}
```

#### 6. Xóa bình luận
```
DELETE /api/comments/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Bình luận đã được xóa thành công."
}
```

#### 7. Like/Unlike bình luận
```
POST /api/comments/:id/like
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    // Comment object đã cập nhật likes
  },
  "message": "Thao tác like/unlike thành công."
}
```

#### 8. Report bình luận
```
POST /api/comments/:id/report
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    // Comment object đã cập nhật reports
  },
  "message": "Thao tác report thành công."
}
```

### Admin Endpoints (Yêu cầu quyền admin)

#### 9. Duyệt bình luận
```
PUT /api/comments/:id/approve
```

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "isApproved": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // Comment object đã cập nhật
  },
  "message": "Bình luận đã được duyệt thành công."
}
```

#### 10. Ghim bình luận
```
PUT /api/comments/:id/pin
```

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "isPinned": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // Comment object đã cập nhật
  },
  "message": "Bình luận đã được ghim thành công."
}
```

#### 11. Ẩn bình luận
```
PUT /api/comments/:id/hide
```

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "isHidden": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // Comment object đã cập nhật
  },
  "message": "Bình luận đã được ẩn thành công."
}
```

#### 12. Xóa bình luận (Admin)
```
DELETE /api/comments/:id/admin
```

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Bình luận đã được xóa bởi admin thành công."
}
```

## Cấu Hình Hệ Thống

### Constants

```javascript
const MAX_COMMENT_DEPTH = 2; // Độ sâu tối đa cho comment
const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  sort: 'latest'
};
const SORT_TYPES = {
  LATEST: 'latest',
  OLDEST: 'oldest'
};
const CONTENT_TYPES = {
  MOVIE: 'movie',
  EPISODE: 'episode'
};
```

### Middleware

#### enforceCommentDepth.middleware.js
- Kiểm tra độ sâu comment trước khi tạo
- Ngăn chặn tạo comment vượt quá độ sâu tối đa (2 cấp)

### Transaction & Error Handling

- Sử dụng transaction cho tất cả operations
- Retry logic cho các lỗi có thể retry (deadlock, timeout)
- Rollback tự động khi có lỗi
- Logging chi tiết cho debugging

## Tính Năng Nâng Cao

### 1. Thông Báo Tự Động
- Thông báo khi có reply mới
- Thông báo khi có like
- Thông báo khi có report (gửi cho admin)

### 2. Tìm Kiếm Comment
```javascript
// Utility function có sẵn trong service
const searchComments = async (params) => {
  // Tìm kiếm theo keyword
  // Hỗ trợ filter theo content type và content ID
  // Highlight keyword trong kết quả
}
```

### 3. Thống Kê Comment
```javascript
// Utility function có sẵn trong service
const getCommentStats = async (contentType, contentId) => {
  // Trả về:
  // - Tổng số comments
  // - Số comments gốc
  // - Số replies
  // - Comment mới nhất
}
```

### 4. Kiểm Tra Quyền Reply
```javascript
// Utility function có sẵn trong service
const canReplyToComment = async (commentId) => {
  // Kiểm tra:
  // - Comment có tồn tại
  // - Comment đã được duyệt
  // - Comment không bị ẩn
  // - Chưa đạt độ sâu tối đa
}
```

## Cấu Trúc Response Chuẩn

### Success Response
```json
{
  "success": true,
  "data": {}, // Dữ liệu trả về
  "message": "Thông báo thành công", // Optional
  "meta": {} // Thông tin phân trang (nếu có)
}
```

### Error Response
```json
{
  "success": false,
  "message": "Thông báo lỗi",
  "error": "Chi tiết lỗi" // Optional
}
```

## Bảo Mật

### 1. Authentication
- Tất cả private endpoints yêu cầu JWT token
- Admin endpoints yêu cầu role 'admin'

### 2. Authorization
- User chỉ có thể sửa/xóa comment của chính mình
- Admin có quyền thực hiện tất cả operations

### 3. Validation
- Validate input data
- Kiểm tra độ sâu comment
- Kiểm tra quyền truy cập

### 4. Rate Limiting
- Áp dụng rate limiting cho tất cả endpoints
- Giới hạn 20 requests/15 phút per IP

## Performance

### 1. Database Optimization
- Indexes cho các trường thường query
- Pagination để giảm tải
- Lazy loading cho replies

### 2. Caching
- Có thể implement Redis cache cho comments phổ biến
- Cache thống kê comment

### 3. Transaction Management
- Sử dụng transaction để đảm bảo data consistency
- Retry logic cho các lỗi transient

## Monitoring & Logging

### 1. Error Logging
- Log chi tiết tất cả errors
- Track transaction failures
- Monitor retry attempts

### 2. Performance Monitoring
- Track response times
- Monitor database query performance
- Alert khi có vấn đề

## Kết Luận

Hệ thống comment đã được thiết kế và implement hoàn chỉnh với:

- ✅ Cấu trúc database tối ưu
- ✅ API endpoints đầy đủ
- ✅ Bảo mật và validation
- ✅ Error handling và transaction
- ✅ Tính năng nâng cao (notifications, search, stats)
- ✅ Performance optimization
- ✅ Admin features
- ✅ Documentation chi tiết

Hệ thống sẵn sàng để deploy và sử dụng trong production.
