# BÁO CÁO PROJECT TỐT NGHIỆP

## HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ (E-COMMERCE)

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1. Tên dự án

**Hệ thống thương mại điện tử (E-commerce System)**

### 1.2. Mô tả tổng quan

Đây là một hệ thống thương mại điện tử hoàn chỉnh được xây dựng bằng Node.js, cho phép người dùng mua sắm trực tuyến các sản phẩm giày dép với đầy đủ các tính năng từ quản lý sản phẩm, giỏ hàng, thanh toán đến quản trị hệ thống.

### 1.3. Mục tiêu dự án

- Xây dựng một nền tảng thương mại điện tử hiện đại và dễ sử dụng
- Cung cấp trải nghiệm mua sắm mượt mà cho khách hàng
- Hỗ trợ quản lý hiệu quả cho admin
- Tích hợp các phương thức thanh toán đa dạng
- Đảm bảo tính bảo mật và hiệu suất cao

---

## 2. CÔNG NGHỆ SỬ DỤNG

### 2.1. Backend

- **Node.js**: Runtime environment chính
- **Express.js**: Web framework
- **MongoDB**: Cơ sở dữ liệu NoSQL
- **Mongoose**: ODM cho MongoDB
- **bcrypt**: Mã hóa mật khẩu
- **express-session**: Quản lý session
- **multer**: Upload file
- **nodemailer**: Gửi email
- **vn-payments**: Tích hợp thanh toán VNPay

### 2.2. Frontend

- **EJS**: Template engine
- **Tailwind CSS**: CSS framework
- **JavaScript (Vanilla)**: Xử lý tương tác client-side
- **HTML5/CSS3**: Cấu trúc và styling

### 2.3. Database

- **MongoDB Atlas**: Cloud database
- **MongoDB Compass**: Database management tool

### 2.4. Development Tools

- **Nodemon**: Auto-restart development server
- **PostCSS**: CSS processing
- **Concurrently**: Run multiple commands
- **dotenv**: Environment variables management

---

## 3. KIẾN TRÚC HỆ THỐNG

### 3.1. Kiến trúc tổng thể

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (EJS Views)   │◄──►│   (Node.js)     │◄──►│   (MongoDB)     │
│   Tailwind CSS  │    │   Express.js    │    │   Atlas         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 3.2. Cấu trúc thư mục

```
project/
├── app.js                 # Entry point
├── config/                # Cấu hình hệ thống
├── controllers/           # Business logic
├── middleware/            # Middleware functions
├── models/               # Data models
├── routes/               # API routes
├── views/                # EJS templates
├── public/               # Static assets
├── uploads/              # Uploaded files
└── util/                 # Utility functions
```

---

## 4. CÁC TÍNH NĂNG CHÍNH

### 4.1. Tính năng cho Khách hàng

#### 4.1.1. Quản lý tài khoản

- **Đăng ký/Đăng nhập**: Hệ thống xác thực an toàn với bcrypt
- **Quản lý profile**: Cập nhật thông tin cá nhân
- **Đổi mật khẩu**: Bảo mật tài khoản
- **Trạng thái tài khoản**: Khóa/mở khóa tài khoản

#### 4.1.2. Duyệt và tìm kiếm sản phẩm

- **Trang chủ**: Hiển thị sản phẩm nổi bật và banner
- **Danh sách sản phẩm**: Phân trang và lọc sản phẩm
- **Chi tiết sản phẩm**: Thông tin chi tiết, hình ảnh, đánh giá
- **Tìm kiếm**: Tìm kiếm sản phẩm theo tên, thương hiệu
- **Danh mục**: Lọc sản phẩm theo danh mục
- **Thương hiệu**: Lọc sản phẩm theo thương hiệu

#### 4.1.3. Giỏ hàng và thanh toán

- **Giỏ hàng**: Thêm/xóa/cập nhật số lượng sản phẩm
- **Thanh toán**: Nhiều phương thức thanh toán
  - COD (Cash on Delivery)
  - Chuyển khoản ngân hàng
  - VNPay
  - Ví điện tử
- **Quản lý đơn hàng**: Xem lịch sử, trạng thái đơn hàng
- **Hóa đơn**: Tải xuống hóa đơn PDF

#### 4.1.4. Tương tác sản phẩm

- **Yêu thích**: Thêm/xóa sản phẩm yêu thích
- **Đánh giá**: Đánh giá và bình luận sản phẩm
- **Sản phẩm liên quan**: Gợi ý sản phẩm tương tự

### 4.2. Tính năng cho Admin

#### 4.2.1. Quản lý sản phẩm

- **CRUD sản phẩm**: Thêm/sửa/xóa sản phẩm
- **Quản lý tồn kho**: Theo dõi số lượng tồn kho
- **Upload hình ảnh**: Quản lý hình ảnh sản phẩm
- **Xuất dữ liệu**: Export sản phẩm ra PDF/Excel
- **Tạo sản phẩm mẫu**: Tạo dữ liệu test

#### 4.2.2. Quản lý đơn hàng

- **Xem đơn hàng**: Danh sách tất cả đơn hàng
- **Cập nhật trạng thái**: Xác nhận, giao hàng, hoàn thành
- **Quản lý thanh toán**: Cập nhật trạng thái thanh toán
- **Hóa đơn**: Tạo và tải xuống hóa đơn
- **Thống kê**: Dashboard với các chỉ số quan trọng

#### 4.2.3. Quản lý người dùng

- **Danh sách người dùng**: Xem tất cả tài khoản
- **Tạo tài khoản**: Tạo tài khoản mới
- **Chỉnh sửa thông tin**: Cập nhật thông tin người dùng
- **Quản lý trạng thái**: Khóa/mở khóa tài khoản
- **Thống kê**: Số lượng người dùng, trạng thái

#### 4.2.4. Quản lý danh mục và thương hiệu

- **Danh mục sản phẩm**: CRUD danh mục
- **Thương hiệu**: CRUD thương hiệu
- **Upload logo**: Quản lý logo thương hiệu
- **Trạng thái**: Bật/tắt danh mục, thương hiệu

#### 4.2.5. Quản lý đánh giá

- **Duyệt đánh giá**: Xem và duyệt đánh giá
- **Phản hồi**: Trả lời đánh giá của khách hàng
- **Thống kê**: Điểm đánh giá trung bình
- **Xóa đánh giá**: Xóa đánh giá không phù hợp

#### 4.2.6. Quản lý banner

- **Slide banner**: Tạo và quản lý banner trang chủ
- **Upload hình ảnh**: Quản lý hình ảnh banner
- **Trạng thái**: Bật/tắt banner
- **Thống kê**: Số lượt xem banner

---

## 5. CƠ SỞ DỮ LIỆU

### 5.1. Các Collection chính

#### 5.1.1. Users Collection

```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String (hashed),
  phone: String,
  address: String,
  role: String, // 'user' hoặc 'admin'
  isActive: Boolean,
  favorites: [ObjectId], // Danh sách sản phẩm yêu thích
  cart: {
    items: [ObjectId],
    totalPrice: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### 5.1.2. Products Collection

```javascript
{
  _id: ObjectId,
  title: String,
  imageUrl: String,
  description: String,
  price: Number,
  stockQuantity: Number,
  category: String,
  brand: String,
  sku: String,
  stockStatus: String,
  reviews: [{
    userId: ObjectId,
    rating: Number,
    comment: String,
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### 5.1.3. Orders Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  items: [{
    productId: ObjectId,
    title: String,
    price: Number,
    quantity: Number,
    imageUrl: String
  }],
  totalPrice: Number,
  shippingInfo: {
    name: String,
    phone: String,
    email: String,
    address: String
  },
  paymentMethod: String,
  paymentStatus: String,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 5.2. Các Collection khác

- **Categories**: Quản lý danh mục sản phẩm
- **Brands**: Quản lý thương hiệu
- **Slides**: Quản lý banner trang chủ
- **Sessions**: Quản lý session người dùng

---

## 6. BẢO MẬT VÀ XÁC THỰC

### 6.1. Xác thực người dùng

- **Mã hóa mật khẩu**: Sử dụng bcrypt với salt rounds = 12
- **Session management**: Express-session với MongoDB store
- **CSRF Protection**: Sử dụng csurf middleware
- **Input validation**: Express-validator cho validation

### 6.2. Phân quyền

- **User role**: Người dùng thường
- **Admin role**: Quản trị viên
- **Middleware bảo vệ**: isAuth, isAdmin

### 6.3. Bảo mật dữ liệu

- **Environment variables**: Lưu trữ thông tin nhạy cảm
- **File upload security**: Kiểm tra loại file và kích thước
- **SQL Injection protection**: Sử dụng MongoDB với parameterized queries

---

## 7. TÍCH HỢP THANH TOÁN

### 7.1. VNPay Integration

- **Cấu hình**: Tích hợp VNPay sandbox và production
- **Tạo URL thanh toán**: Tự động tạo URL thanh toán
- **Callback handling**: Xử lý kết quả thanh toán
- **IPN (Instant Payment Notification)**: Xử lý thông báo thanh toán

### 7.2. Các phương thức thanh toán khác

- **COD**: Thanh toán khi nhận hàng
- **Bank Transfer**: Chuyển khoản ngân hàng
- **E-wallet**: Ví điện tử

---

## 8. GỬI EMAIL

### 8.1. Nodemailer Integration

- **Cấu hình SMTP**: Gmail SMTP
- **Email templates**: Template cho các loại email
- **Xác nhận đăng ký**: Email chào mừng
- **Xác nhận đơn hàng**: Email thông báo đơn hàng

### 8.2. Các loại email

- **Signup confirmation**: Xác nhận đăng ký
- **Order confirmation**: Xác nhận đơn hàng
- **Password reset**: Đặt lại mật khẩu (nếu có)

---

## 9. QUẢN LÝ FILE VÀ UPLOAD

### 9.1. Multer Configuration

- **File upload**: Hỗ trợ upload hình ảnh
- **File validation**: Kiểm tra loại file và kích thước
- **Storage**: Lưu trữ file trong thư mục uploads/
- **Multiple upload**: Upload nhiều file cùng lúc

### 9.2. Các loại file được upload

- **Product images**: Hình ảnh sản phẩm
- **Brand logos**: Logo thương hiệu
- **Category images**: Hình ảnh danh mục
- **Banner images**: Hình ảnh banner

---

## 10. LOGGING VÀ MONITORING

### 10.1. Logging System

- **Winston logger**: Hệ thống logging chuyên nghiệp
- **Log levels**: Debug, info, warn, error
- **File rotation**: Tự động xoay file log
- **Request logging**: Log tất cả request

### 10.2. Error Handling

- **Global error handler**: Xử lý lỗi toàn cục
- **Custom error classes**: ValidationError, DatabaseError, NotFoundError
- **Error logging**: Log chi tiết lỗi
- **User-friendly messages**: Thông báo lỗi thân thiện

---

## 11. PERFORMANCE VÀ OPTIMIZATION

### 11.1. Database Optimization

- **Indexing**: Tạo index cho các trường thường query
- **Connection pooling**: Quản lý kết nối database
- **Query optimization**: Tối ưu hóa query

### 11.2. Frontend Optimization

- **Tailwind CSS**: CSS framework tối ưu
- **Image optimization**: Tối ưu hóa hình ảnh
- **Static file serving**: Phục vụ file tĩnh hiệu quả

---

## 12. TESTING VÀ DEPLOYMENT

### 12.1. Development Environment

- **Nodemon**: Auto-restart khi code thay đổi
- **Environment variables**: Quản lý biến môi trường
- **Hot reload**: Tự động reload khi thay đổi

### 12.2. Production Considerations

- **Environment configuration**: Cấu hình production
- **Security headers**: Các header bảo mật
- **Rate limiting**: Giới hạn request
- **CORS configuration**: Cấu hình CORS

---

## 13. KẾT LUẬN

### 13.1. Thành tựu đạt được

- ✅ Xây dựng thành công hệ thống e-commerce hoàn chỉnh
- ✅ Tích hợp đầy đủ các tính năng cần thiết
- ✅ Bảo mật và hiệu suất cao
- ✅ Giao diện thân thiện, dễ sử dụng
- ✅ Hỗ trợ nhiều phương thức thanh toán
- ✅ Hệ thống quản trị mạnh mẽ

### 13.2. Tính năng nổi bật

- **Responsive Design**: Tương thích mọi thiết bị
- **Real-time Updates**: Cập nhật trạng thái real-time
- **Advanced Search**: Tìm kiếm thông minh
- **Order Management**: Quản lý đơn hàng chuyên nghiệp
- **Review System**: Hệ thống đánh giá hoàn chỉnh
- **Admin Dashboard**: Bảng điều khiển quản trị

### 13.3. Hướng phát triển

- **Mobile App**: Phát triển ứng dụng di động
- **API Integration**: Tích hợp API bên thứ 3
- **Analytics**: Thêm phân tích dữ liệu
- **Multi-language**: Hỗ trợ đa ngôn ngữ
- **Advanced Payment**: Tích hợp thêm cổng thanh toán

---

## 14. HƯỚNG DẪN SỬ DỤNG

### 14.1. Cài đặt và chạy dự án

```bash
# Cài đặt dependencies
npm install

# Cấu hình environment variables
cp .env.example .env

# Chạy development server
npm run dev

# Hoặc chạy production
npm run start-server
```

### 14.2. Cấu hình cần thiết

- **MongoDB URI**: Kết nối database
- **Session Secret**: Bảo mật session
- **Email Configuration**: Cấu hình gửi email
- **VNPay Configuration**: Cấu hình thanh toán

---

## 15. TÀI LIỆU THAM KHẢO

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Manual](https://docs.mongodb.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [VNPay Integration Guide](https://sandbox.vnpayment.vn/apis/)

---

**Ngày hoàn thành**: [Ngày hiện tại]  
**Phiên bản**: 1.0.0  
**Tác giả**: [Tên sinh viên]  
**Trường**: [Tên trường]  
**Khoa**: [Tên khoa]
