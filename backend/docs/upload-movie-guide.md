# Hướng dẫn Upload Ảnh Phim

## Tổng quan
Middleware upload ảnh phim được nâng cấp với các tính năng:
- Resize tự động theo tỷ lệ chuẩn
- Nén ảnh với chất lượng cao
- Chuyển đổi sang WebP để tối ưu
- Tạo thumbnail cho poster
- Xử lý lỗi chi tiết

## Cài đặt Dependencies

```bash
cd backend
npm install sharp@^0.33.5
```

## Cấu hình Ảnh

### Kích thước và Tỷ lệ
- **Poster**: 300x450px (2:3) + Thumbnail 150x225px
- **Banner**: 1280x720px (16:9)
- **Cover**: 2160x1080px (18:9)

### Định dạng hỗ trợ
- Input: JPG, JPEG, PNG, WebP
- Output: WebP (tự động chuyển đổi)

## Sử dụng trong Routes

```javascript
import { uploadMovieImages, handleUploadError } from '../middlewares/uploadMovie.middleware.js';

// Route tạo phim
router.post(
  '/movies',
  verifyToken,
  authorizeRoles('admin'),
  uploadMovieImages,      // Middleware upload
  handleUploadError,      // Middleware xử lý lỗi
  movieController.createMovie
);
```

## Cấu trúc Request

### Form Data Fields
```javascript
{
  titles: JSON.stringify([
    { type: 'default', title: 'Tên phim' }
  ]),
  poster: File,    // Ảnh poster
  banner: File,    // Ảnh banner  
  cover: File      // Ảnh cover
}
```

### Response Structure
```javascript
// Thành công
{
  success: true,
  data: {
    movie: { ... },
    files: {
      poster: '/uploads/movies/slug/poster-timestamp.webp',
      poster_thumbnail: '/uploads/movies/slug/poster-timestamp-thumb.webp',
      banner: '/uploads/movies/slug/banner-timestamp.webp',
      cover: '/uploads/movies/slug/cover-timestamp.webp'
    }
  }
}

// Lỗi
{
  success: false,
  message: 'Chỉ chấp nhận file ảnh định dạng: jpg, jpeg, png, webp'
}
```

## Xử lý Lỗi

### Các loại lỗi được xử lý:
1. **Định dạng file không hợp lệ**
2. **Kích thước file quá lớn (>15MB)**
3. **Lỗi resize ảnh**
4. **Lỗi tạo thumbnail**

### Error Codes
- `400`: Bad Request (định dạng file, kích thước)
- `500`: Internal Server Error (lỗi xử lý ảnh)

## Tính năng nâng cao

### 1. Tự động tạo Thumbnail
- Chỉ áp dụng cho poster
- Kích thước: 150x225px
- Chất lượng: 85%

### 2. Tối ưu WebP
- Chất lượng: 90%
- Effort level: 6 (cân bằng tốc độ/chất lượng)

### 3. Resize thông minh
- Sử dụng `fit: 'cover'` để giữ tỷ lệ
- Position: 'center' để crop từ giữa

## Cấu trúc Thư mục

```
uploads/movies/
├── ten-phim-slug/
│   ├── poster-timestamp.webp
│   ├── poster-timestamp-thumb.webp
│   ├── banner-timestamp.webp
│   └── cover-timestamp.webp
```

## Lưu ý

1. **Slug tự động**: Tên thư mục được tạo từ tiêu đề phim
2. **File gốc bị xóa**: Sau khi xử lý, file gốc sẽ bị xóa
3. **Tên file unique**: Sử dụng timestamp + random để tránh trùng lặp
4. **Cleanup tự động**: Nếu có lỗi, tất cả file sẽ được dọn dẹp

## Troubleshooting

### Lỗi thường gặp:
1. **"Không thể resize ảnh"**: Kiểm tra định dạng file đầu vào
2. **"File quá lớn"**: Giảm kích thước file hoặc tăng limit
3. **"Thư mục không tồn tại"**: Kiểm tra quyền ghi file

### Debug:
- Kiểm tra console log để xem chi tiết lỗi
- Đảm bảo thư mục uploads có quyền ghi
- Test với file ảnh nhỏ trước

