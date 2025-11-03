# BẢNG BIỂU CƠ SỞ DỮ LIỆU - HỆ THỐNG BÁN GIÀY

## 1. BẢNG USERS (Người dùng)

| **Trường**    | **Kiểu dữ liệu** | **Ràng buộc**                       | **Mô tả**                                |
| ------------- | ---------------- | ----------------------------------- | ---------------------------------------- |
| **\_id**      | ObjectId         | Primary Key, Auto                   | ID duy nhất của người dùng               |
| **name**      | String           | Required                            | Tên đầy đủ của người dùng                |
| **email**     | String           | Required, Unique                    | Email đăng nhập (duy nhất)               |
| **password**  | String           | Required                            | Mật khẩu đã mã hóa bằng bcrypt           |
| **phone**     | String           | Optional                            | Số điện thoại                            |
| **address**   | String           | Optional                            | Địa chỉ giao hàng                        |
| **role**      | String           | Default: 'user'                     | Vai trò: 'user' hoặc 'admin'             |
| **isActive**  | Boolean          | Default: true                       | Trạng thái tài khoản (hoạt động/bị khóa) |
| **favorites** | Array[ObjectId]  | Default: []                         | Danh sách sản phẩm yêu thích             |
| **cart**      | Object           | Default: {items: [], totalPrice: 0} | Giỏ hàng của người dùng                  |
| **createdAt** | Date             | Auto                                | Ngày tạo tài khoản                       |
| **updatedAt** | Date             | Auto                                | Ngày cập nhật cuối                       |

### **Chức năng chính:**

- Quản lý thông tin cá nhân
- Xác thực đăng nhập/đăng ký
- Quản lý giỏ hàng
- Quản lý danh sách yêu thích
- Phân quyền user/admin

---

## 2. BẢNG PRODUCTS (Sản phẩm)

| **Trường**        | **Kiểu dữ liệu** | **Ràng buộc**     | **Mô tả**                |
| ----------------- | ---------------- | ----------------- | ------------------------ |
| **\_id**          | ObjectId         | Primary Key, Auto | ID duy nhất của sản phẩm |
| **title**         | String           | Required          | Tên sản phẩm             |
| **imageUrl**      | String           | Required          | URL hình ảnh sản phẩm    |
| **description**   | String           | Optional          | Mô tả chi tiết sản phẩm  |
| **price**         | Number           | Required, > 0     | Giá bán sản phẩm         |
| **stockQuantity** | Number           | Default: 0        | Số lượng tồn kho         |
| **category**      | String           | Optional          | Danh mục sản phẩm        |
| **brand**         | String           | Optional          | Thương hiệu sản phẩm     |
| **reviews**       | Array[Object]    | Default: []       | Danh sách đánh giá       |
| **createdAt**     | Date             | Auto              | Ngày tạo sản phẩm        |
| **updatedAt**     | Date             | Auto              | Ngày cập nhật cuối       |

### **Chức năng chính:**

- Quản lý thông tin sản phẩm
- Quản lý tồn kho
- Quản lý đánh giá sản phẩm
- Tìm kiếm và lọc sản phẩm

---

## 3. BẢNG ORDERS (Đơn hàng)

| **Trường**        | **Kiểu dữ liệu** | **Ràng buộc**      | **Mô tả**                        |
| ----------------- | ---------------- | ------------------ | -------------------------------- |
| **\_id**          | ObjectId         | Primary Key, Auto  | ID duy nhất của đơn hàng         |
| **userId**        | ObjectId         | Required, FK       | ID người dùng đặt hàng           |
| **items**         | Array[Object]    | Required           | Chi tiết sản phẩm trong đơn hàng |
| **totalPrice**    | Number           | Required, > 0      | Tổng tiền đơn hàng               |
| **shippingInfo**  | Object           | Required           | Thông tin giao hàng              |
| **paymentMethod** | String           | Required           | Phương thức thanh toán           |
| **status**        | String           | Default: 'pending' | Trạng thái đơn hàng              |
| **paymentStatus** | String           | Required           | Trạng thái thanh toán            |
| **transactionId** | String           | Optional           | ID giao dịch thanh toán          |
| **paymentUrl**    | String           | Optional           | URL thanh toán VNPay             |
| **paidAt**        | Date             | Optional           | Thời gian thanh toán             |
| **failedAt**      | Date             | Optional           | Thời gian thanh toán thất bại    |
| **failureReason** | String           | Optional           | Lý do thanh toán thất bại        |
| **statusNote**    | String           | Optional           | Ghi chú trạng thái               |
| **createdAt**     | Date             | Auto               | Ngày tạo đơn hàng                |
| **updatedAt**     | Date             | Auto               | Ngày cập nhật cuối               |

### **Chi tiết trường items:**

| **Trường**    | **Kiểu dữ liệu** | **Mô tả**         |
| ------------- | ---------------- | ----------------- |
| **productId** | ObjectId         | ID sản phẩm       |
| **title**     | String           | Tên sản phẩm      |
| **price**     | Number           | Giá sản phẩm      |
| **quantity**  | Number           | Số lượng          |
| **imageUrl**  | String           | Hình ảnh sản phẩm |

### **Chi tiết trường shippingInfo:**

| **Trường**  | **Kiểu dữ liệu** | **Mô tả**         |
| ----------- | ---------------- | ----------------- |
| **name**    | String           | Tên người nhận    |
| **phone**   | String           | Số điện thoại     |
| **email**   | String           | Email người nhận  |
| **address** | String           | Địa chỉ giao hàng |

### **Trạng thái đơn hàng:**

- **pending**: Chờ xác nhận
- **confirmed**: Đã xác nhận
- **shipping**: Đang giao
- **delivered**: Đã giao
- **cancelled**: Đã hủy

### **Trạng thái thanh toán:**

- **pending**: Chờ thanh toán
- **awaiting_payment**: Chờ chuyển khoản
- **processing**: Đang xử lý
- **completed**: Đã thanh toán
- **failed**: Thanh toán thất bại
- **refunded**: Đã hoàn tiền

---

## 4. BẢNG BRANDS (Thương hiệu)

| **Trường**          | **Kiểu dữ liệu** | **Ràng buộc**     | **Mô tả**                   |
| ------------------- | ---------------- | ----------------- | --------------------------- |
| **\_id**            | ObjectId         | Primary Key, Auto | ID duy nhất của thương hiệu |
| **name**            | String           | Required, Unique  | Tên thương hiệu             |
| **slug**            | String           | Required, Unique  | URL slug thương hiệu        |
| **description**     | String           | Optional          | Mô tả thương hiệu           |
| **logo**            | String           | Optional          | Logo thương hiệu            |
| **website**         | String           | Optional          | Website thương hiệu         |
| **country**         | String           | Optional          | Quốc gia xuất xứ            |
| **isActive**        | Boolean          | Default: true     | Trạng thái hoạt động        |
| **sortOrder**       | Number           | Default: 0        | Thứ tự sắp xếp              |
| **metaTitle**       | String           | Optional          | Meta title SEO              |
| **metaDescription** | String           | Optional          | Meta description SEO        |
| **createdAt**       | Date             | Auto              | Ngày tạo                    |
| **updatedAt**       | Date             | Auto              | Ngày cập nhật               |

---

## 5. BẢNG CATEGORIES (Danh mục)

| **Trường**      | **Kiểu dữ liệu** | **Ràng buộc**     | **Mô tả**                |
| --------------- | ---------------- | ----------------- | ------------------------ |
| **\_id**        | ObjectId         | Primary Key, Auto | ID duy nhất của danh mục |
| **name**        | String           | Required          | Tên danh mục             |
| **slug**        | String           | Required, Unique  | URL slug danh mục        |
| **description** | String           | Optional          | Mô tả danh mục           |
| **icon**        | String           | Optional          | Icon danh mục            |
| **imageUrl**    | String           | Optional          | Hình ảnh danh mục        |
| **isActive**    | Boolean          | Default: true     | Trạng thái hoạt động     |
| **sortOrder**   | Number           | Default: 0        | Thứ tự sắp xếp           |
| **createdAt**   | Date             | Auto              | Ngày tạo                 |
| **updatedAt**   | Date             | Auto              | Ngày cập nhật            |

---

## 6. BẢNG SLIDES (Banner quảng cáo)

| **Trường**          | **Kiểu dữ liệu** | **Ràng buộc**                | **Mô tả**                |
| ------------------- | ---------------- | ---------------------------- | ------------------------ |
| **\_id**            | ObjectId         | Primary Key, Auto            | ID duy nhất của slide    |
| **title**           | String           | Required, Max: 100           | Tiêu đề slide            |
| **subtitle**        | String           | Optional, Max: 200           | Phụ đề slide             |
| **description**     | String           | Optional, Max: 500           | Mô tả slide              |
| **image**           | String           | Required                     | Đường dẫn hình ảnh       |
| **imageAlt**        | String           | Optional, Max: 100           | Alt text cho hình ảnh    |
| **link**            | String           | Optional                     | Link khi click vào slide |
| **buttonText**      | String           | Default: 'Xem ngay', Max: 50 | Text nút bấm             |
| **isActive**        | Boolean          | Default: true                | Trạng thái hoạt động     |
| **sortOrder**       | Number           | Default: 0                   | Thứ tự hiển thị          |
| **startDate**       | Date             | Default: now                 | Ngày bắt đầu hiển thị    |
| **endDate**         | Date             | Optional                     | Ngày kết thúc hiển thị   |
| **clickCount**      | Number           | Default: 0                   | Số lần click             |
| **viewCount**       | Number           | Default: 0                   | Số lần xem               |
| **backgroundColor** | String           | Default: '#ffffff'           | Màu nền                  |
| **textColor**       | String           | Default: '#000000'           | Màu chữ                  |
| **position**        | String           | Default: 'center'            | Vị trí text              |
| **animation**       | String           | Default: 'fade'              | Hiệu ứng chuyển đổi      |
| **createdAt**       | Date             | Auto                         | Ngày tạo                 |
| **updatedAt**       | Date             | Auto                         | Ngày cập nhật            |

---

## 7. BẢNG REVIEWS (Đánh giá sản phẩm)

| **Trường**        | **Kiểu dữ liệu** | **Ràng buộc**     | **Mô tả**                 |
| ----------------- | ---------------- | ----------------- | ------------------------- |
| **\_id**          | ObjectId         | Primary Key, Auto | ID duy nhất của review    |
| **productId**     | ObjectId         | Required, FK      | ID sản phẩm được đánh giá |
| **userId**        | ObjectId         | Required, FK      | ID người dùng đánh giá    |
| **userName**      | String           | Required          | Tên người đánh giá        |
| **userEmail**     | String           | Required          | Email người đánh giá      |
| **rating**        | Number           | Required, 1-5     | Điểm đánh giá (1-5 sao)   |
| **comment**       | String           | Optional          | Nội dung đánh giá         |
| **approved**      | Boolean          | Default: false    | Trạng thái duyệt          |
| **adminResponse** | String           | Optional          | Phản hồi của admin        |
| **createdAt**     | Date             | Auto              | Ngày tạo review           |
| **updatedAt**     | Date             | Auto              | Ngày cập nhật cuối        |

---

## 8. QUAN HỆ GIỮA CÁC BẢNG

### **8.1. Quan hệ chính:**

- **Users** → **Orders** (1:N): Một user có thể có nhiều đơn hàng
- **Products** → **Orders** (N:M): Một sản phẩm có thể có trong nhiều đơn hàng
- **Users** → **Reviews** (1:N): Một user có thể viết nhiều review
- **Products** → **Reviews** (1:N): Một sản phẩm có thể có nhiều review
- **Brands** → **Products** (1:N): Một thương hiệu có nhiều sản phẩm
- **Categories** → **Products** (1:N): Một danh mục có nhiều sản phẩm

### **8.2. Quan hệ phụ:**

- **Users** → **Products** (N:M): Quan hệ yêu thích (favorites)
- **Users** → **Products** (N:M): Quan hệ giỏ hàng (cart)

---

## 9. INDEX VÀ TỐI ƯU HÓA

### **9.1. Index chính:**

- **users**: email (unique), isActive, createdAt
- **products**: title, price, stockQuantity, category, brand
- **orders**: userId, status, paymentStatus, createdAt
- **reviews**: productId, userId, approved, createdAt
- **brands**: name (unique), slug (unique), isActive
- **categories**: name, slug (unique), isActive
- **slides**: isActive, sortOrder, startDate, endDate

### **9.2. Index phức hợp:**

- **orders**: {userId: 1, createdAt: -1}
- **reviews**: {productId: 1, approved: 1, createdAt: -1}
- **slides**: {isActive: 1, sortOrder: 1}

---

## 10. RÀNG BUỘC VÀ VALIDATION

### **10.1. Ràng buộc dữ liệu:**

- Email phải unique trong bảng users
- Password phải được hash bằng bcrypt
- Giá sản phẩm phải > 0
- Số lượng tồn kho phải >= 0
- Rating phải từ 1-5
- Slug phải unique trong brands và categories

### **10.2. Validation business logic:**

- Không thể xóa user có đơn hàng
- Không thể xóa sản phẩm có trong đơn hàng
- Không thể đặt hàng khi hết tồn kho
- Không thể đánh giá sản phẩm chưa mua

---

## 11. TỔNG KẾT

### **11.1. Số lượng bảng:** 7 bảng chính

### **11.2. Tổng số trường:** 50+ trường dữ liệu

### **11.3. Quan hệ:** 6 quan hệ chính + 2 quan hệ phụ

### **11.4. Index:** 15+ index để tối ưu hiệu suất

### **11.5. Tính năng nổi bật:**

- Hệ thống phân quyền user/admin
- Quản lý tồn kho tự động
- Hệ thống thanh toán đa dạng
- Quản lý đánh giá sản phẩm
- Hệ thống banner quảng cáo
- Tìm kiếm và lọc nâng cao
- Báo cáo thống kê chi tiết

### **11.6. Công nghệ sử dụng:**

- **Database**: MongoDB (NoSQL)
- **ORM**: Mongoose + Native MongoDB Driver
- **Validation**: Custom validation + Mongoose validation
- **Security**: bcrypt password hashing
- **Performance**: Index optimization + Aggregation pipeline
