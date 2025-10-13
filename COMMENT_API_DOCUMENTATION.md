# Hệ Thống Comment API - Backend Documentation

## Tổng Quan Hệ Thống

Hệ thống comment được xây dựng với Node.js, Express.js và Sequelize ORM, hỗ trợ bình luận đa cấp với độ sâu tối đa 2 cấp (0: bình luận gốc, 1: trả lời bình luận gốc, 2: trả lời của trả lời). Hệ thống hỗ trợ bình luận cho cả phim và tập phim với các tính năng quản lý toàn diện.

### Kiến Trúc Hệ Thống
- **Database**: MySQL với Sequelize ORM
- **Authentication**: JWT Token với session management
- **Real-time**: Socket.IO cho thông báo real-time
- **Security**: Rate limiting, CORS, Helmet
- **Transaction**: Database transactions với retry logic

## Các Tính Năng Chính

### 1. Tính Năng Cơ Bản (User)
- ✅ Tạo bình luận mới (phim/tập)
- ✅ Trả lời bình luận (reply) với giới hạn độ sâu
- ✅ Chỉnh sửa bình luận của mình
- ✅ Xóa bình luận của mình
- ✅ Like/Unlike bình luận
- ✅ Report bình luận
- ✅ Xem danh sách bình luận với phân trang
- ✅ Xem bình luận theo phim + tập (merge)
- ✅ Tìm kiếm bình luận theo từ khóa
- ✅ Thông báo real-time khi có bình luận mới

### 2. Tính Năng Admin
- ✅ Duyệt/bỏ duyệt bình luận
- ✅ Ghim/bỏ ghim bình luận gốc
- ✅ Ẩn/hiện bình luận
- ✅ Xóa bình luận với quyền admin
- ✅ Xem thống kê bình luận
- ✅ Quản lý báo cáo bình luận

### 3. Tính Năng Nâng Cao
- ✅ Hệ thống thông báo tự động
- ✅ Transaction với retry logic
- ✅ Rate limiting
- ✅ Validation độ sâu bình luận
- ✅ Soft delete với cascade
- ✅ Pagination và sorting
- ✅ Search với highlight

## Chi Tiết API Endpoints

### Public APIs (Không cần đăng nhập)

#### 1. Lấy danh sách bình luận theo phim/tập
```http
GET /api/comments/:contentType/:contentId
```

**Parameters:**
- `contentType`: `movie` hoặc `episode`
- `contentId`: ID của phim hoặc tập
- `page` (query): Số trang (default: 1)
- `limit` (query): Số lượng per page (default: 10, max: 100)
- `sort` (query): `latest` hoặc `oldest` (default: latest)

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "123e4567-e89b-12d3-a456-426614174000",
      "userId": 1,
      "contentId": 1,
      "contentType": "movie",
      "parentId": null,
      "text": "Phim hay quá!",
      "likes": [2, 3, 4],
      "isSpoiler": false,
      "isPinned": false,
      "isEdited": false,
      "isApproved": true,
      "isHidden": false,
      "isLiked": true,
      "isReported": false,
      "hasReplies": true,
      "repliesCount": 3,
      "episodeNumber": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "user": {
        "id": 1,
        "uuid": "user-uuid",
        "username": "john_doe",
        "avatarUrl": "https://example.com/avatar.jpg",
        "sex": "male",
        "roles": [
          { "name": "user" }
        ]
      },
      "replies": [
        {
          "id": 2,
          "uuid": "reply-uuid",
          "userId": 2,
          "text": "Tôi cũng thích phim này!",
          "likes": [1, 3],
          "isLiked": false,
          "isReported": false,
          "hasReplies": true,
          "repliesCount": 1,
          "createdAt": "2024-01-15T11:00:00.000Z",
          "user": {
            "id": 2,
            "username": "jane_doe",
            "avatarUrl": "https://example.com/avatar2.jpg",
            "sex": "female",
            "roles": [{ "name": "user" }]
          },
          "replies": []
        }
      ]
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

#### 2. Lấy bình luận theo phim + tập (merge)
```http
GET /api/comments/movie/:movieId/with-episodes
```

**Parameters:**
- `movieId`: ID của phim
- `page`, `limit`, `sort`: Tương tự như trên

**Response:** Tương tự như API trên nhưng bao gồm cả bình luận của các tập phim

#### 3. Lấy replies của một bình luận
```http
GET /api/comments/:parentId/replies
```

**Parameters:**
- `parentId`: ID của bình luận cha
- `page`, `limit`, `sort`: Tương tự như trên

**Response:** Tương tự như API lấy bình luận

### Private APIs (Cần đăng nhập)

#### 1. Tạo bình luận mới
```http
POST /api/comments
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "contentId": 1,
  "contentType": "movie",
  "parentId": null,
  "text": "Phim này thật tuyệt vời!",
  "isSpoiler": false
}
```

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "userId": 1,
    "contentId": 1,
    "contentType": "movie",
    "parentId": null,
    "text": "Phim này thật tuyệt vời!",
    "likes": [],
    "isSpoiler": false,
    "isPinned": false,
    "isEdited": false,
    "isApproved": true,
    "isHidden": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "user": {
      "id": 1,
      "username": "john_doe",
      "avatarUrl": "https://example.com/avatar.jpg",
      "sex": "male",
      "roles": [{ "name": "user" }]
    }
  },
  "message": "Bình luận đã được tạo thành công."
}
```

#### 2. Cập nhật bình luận
```http
PUT /api/comments/:id
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "text": "Nội dung đã chỉnh sửa",
  "isSpoiler": true
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "text": "Nội dung đã chỉnh sửa",
    "isSpoiler": true,
    "isEdited": true,
    "updatedAt": "2024-01-15T11:00:00.000Z",
    "user": {
      "id": 1,
      "username": "john_doe",
      "avatarUrl": "https://example.com/avatar.jpg"
    }
  },
  "message": "Bình luận đã được cập nhật thành công."
}
```

#### 3. Xóa bình luận
```http
DELETE /api/comments/:id
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Bình luận đã được xóa thành công."
}
```

#### 4. Like/Unlike bình luận
```http
POST /api/comments/:id/like
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "likes": [1, 2, 3],
    "isLiked": true,
    "user": {
      "id": 1,
      "username": "john_doe"
    }
  },
  "message": "Thao tác like/unlike thành công."
}
```

#### 5. Report bình luận
```http
POST /api/comments/:id/report
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "reports": [1, 2],
    "isReported": true,
    "user": {
      "id": 1,
      "username": "john_doe"
    }
  },
  "message": "Thao tác report thành công."
}
```

### Admin APIs (Cần quyền admin)

#### 1. Duyệt bình luận
```http
PUT /api/comments/:id/approve
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "isApproved": true
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "isApproved": true,
    "user": {
      "id": 1,
      "username": "john_doe"
    }
  },
  "message": "Bình luận đã được duyệt thành công."
}
```

#### 2. Ghim bình luận
```http
PUT /api/comments/:id/pin
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "isPinned": true
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "isPinned": true,
    "user": {
      "id": 1,
      "username": "john_doe"
    }
  },
  "message": "Bình luận đã được ghim thành công."
}
```

#### 3. Ẩn bình luận
```http
PUT /api/comments/:id/hide
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "isHidden": true
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "isHidden": true,
    "user": {
      "id": 1,
      "username": "john_doe"
    }
  },
  "message": "Bình luận đã được ẩn thành công."
}
```

#### 4. Xóa bình luận (Admin)
```http
DELETE /api/comments/:id/admin
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Bình luận đã được xóa bởi admin thành công."
}
```

## Middleware

### 1. enforceCommentDepth.middleware.js
**Mục đích:** Kiểm tra độ sâu bình luận trước khi tạo reply

**Logic:**
- Kiểm tra `parentId` trong request body
- Tính toán độ sâu hiện tại của bình luận cha
- Ngăn chặn tạo reply nếu vượt quá `MAX_DEPTH = 2`

**Response Error (400):**
```json
{
  "success": false,
  "message": "Không thể trả lời bình luận này. Độ sâu tối đa cho phép là 2."
}
```

### 2. verifyToken (Auth Middleware)
**Mục đích:** Xác thực JWT token

**Headers Required:**
```
Authorization: Bearer <jwt_token>
```

**Response Error (401):**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### 3. authorizeRoles (Role Middleware)
**Mục đích:** Kiểm tra quyền admin

**Response Error (403):**
```json
{
  "success": false,
  "message": "Access denied. Admin role required."
}
```

### 4. verifyTokenOptional
**Mục đích:** Xác thực token tùy chọn (cho public APIs)

## Cấu Trúc JSON Response

### Response Thành Công
```json
{
  "success": true,
  "data": <object_or_array>,
  "meta": <pagination_info>, // Chỉ có trong list APIs
  "message": <success_message>
}
```

### Response Lỗi
```json
{
  "success": false,
  "message": <error_message>,
  "error": <error_details> // Tùy chọn
}
```

### Cấu Trúc Comment Object
```json
{
  "id": 1,
  "uuid": "123e4567-e89b-12d3-a456-426614174000",
  "userId": 1,
  "contentId": 1,
  "contentType": "movie|episode",
  "parentId": null,
  "text": "Nội dung bình luận",
  "likes": [1, 2, 3],
  "reports": [4, 5], // Chỉ admin mới thấy
  "isSpoiler": false,
  "isPinned": false,
  "isEdited": false,
  "isApproved": true,
  "isHidden": false,
  "isLiked": true, // Chỉ có khi user đã đăng nhập
  "isReported": false, // Chỉ có khi user đã đăng nhập
  "hasReplies": true,
  "repliesCount": 3,
  "episodeNumber": 1, // Chỉ có khi contentType = "episode"
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "user": {
    "id": 1,
    "uuid": "user-uuid",
    "username": "john_doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "sex": "male",
    "roles": [
      { "name": "user" }
    ]
  },
  "replies": [
    // Array of nested comment objects
  ]
}
```

### Cấu Trúc Pagination Meta
```json
{
  "page": 1,
  "limit": 10,
  "total": 25,
  "totalPages": 3
}
```

## Các Lỗi Thường Gặp

### 400 Bad Request
```json
{
  "success": false,
  "message": "Vui lòng cung cấp đầy đủ contentId, contentType và nội dung bình luận."
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Bạn không có quyền chỉnh sửa bình luận này."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Bình luận không tồn tại."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Cấu Hình Database

### Comment Model Fields
- `id`: Primary key, auto increment
- `uuid`: Unique identifier
- `userId`: Foreign key to users table
- `contentId`: ID của nội dung được bình luận
- `contentType`: Loại nội dung ('movie' hoặc 'episode')
- `parentId`: Foreign key to Comments table (self-reference)
- `text`: Nội dung bình luận
- `likes`: JSON array chứa user IDs đã like
- `reports`: JSON array chứa user IDs đã report
- `isSpoiler`: Boolean flag
- `isPinned`: Boolean flag (chỉ cho comment gốc)
- `isEdited`: Boolean flag
- `isApproved`: Boolean flag
- `isHidden`: Boolean flag
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

### Indexes
- `content_type_id_index`: (contentType, contentId)
- `userId`: Foreign key index
- `parentId`: Foreign key index

## Rate Limiting
- **Window**: 15 phút
- **Max Requests**: 20 requests per IP
- **Message**: "Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút."

## Security Features
- JWT Authentication
- Role-based Authorization
- CORS Protection
- Helmet Security Headers
- Rate Limiting
- Input Validation
- SQL Injection Protection (Sequelize ORM)
- XSS Protection

## Notification System
- Tự động gửi thông báo khi có reply mới
- Thông báo khi có người like comment
- Thông báo report cho admin
- Real-time notifications qua Socket.IO

## Transaction Management
- Database transactions cho tất cả operations
- Retry logic cho deadlock/timeout errors
- Rollback tự động khi có lỗi
- Isolation level: READ_COMMITTED

---

*Tài liệu này được tạo tự động dựa trên code implementation. Để cập nhật, vui lòng chỉnh sửa code và tạo lại tài liệu.*
