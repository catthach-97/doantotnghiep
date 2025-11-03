const nodemailer = require('nodemailer');
require('dotenv').config();

// Tạo transporter với cấu hình Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Kiểm tra kết nối mail
transporter.verify(function (error, success) {
    if (error) {
        console.log('Lỗi kết nối email:', error);
    } else {
        console.log('✅ Kết nối email thành công!');
    }
});

// Helper để hiển thị tên phương thức/thanh toán
function getPaymentMethodDisplay(method) {
    const methods = {
        'cod': 'Thanh toán khi nhận hàng (COD)',
        'bank': 'Chuyển khoản ngân hàng',
        'bank_transfer': 'Chuyển khoản QR Code',
        'ewallet': 'Ví điện tử',
        'credit': 'Thẻ tín dụng/ghi nợ',
        'vnpay': 'Thanh toán qua VNPay'
    };
    return methods[method] || 'Không xác định';
}

function getPaymentStatusDisplay(status) {
    const statuses = {
        'pending': 'Chờ thanh toán',
        'awaiting_payment': 'Chờ chuyển khoản',
        'processing': 'Đang xử lý',
        'completed': 'Đã thanh toán',
        'paid': 'Đã thanh toán',
        'failed': 'Thanh toán thất bại',
        'refunded': 'Đã hoàn tiền'
    };
    return statuses[status] || 'Không xác định';
}

// Hàm gửi email chung
const sendMail = async (to, subject, html) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email đã gửi:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Lỗi khi gửi email:', error);
    return false;
  }
};

// Gửi email xác nhận đơn hàng cho khách hàng
const sendOrderConfirmation = async (order, user) => {
    try {
        const customerEmail = order.shippingInfo?.email || user.email;
        const customerName = order.shippingInfo?.name || user.name;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: customerEmail,
            subject: 'Xác nhận đơn hàng - Shoe Store',
            html: `
                <h1>Xin chào ${customerName}!</h1>
                <p>Cảm ơn bạn đã đặt hàng tại Shoe Store.</p>
                <h2>Chi tiết đơn hàng:</h2>
                <p>Mã đơn hàng: ${order._id}</p>
                <p>Phí vận chuyển: ${(order.shippingFee || 0).toLocaleString('vi-VN')} VNĐ</p>
                <p>Tổng tiền: ${order.totalPrice.toLocaleString('vi-VN')} VNĐ</p>
                <h3>Thông tin giao hàng:</h3>
                <p>Họ tên: ${order.shippingInfo?.name}</p>
                <p>Điện thoại: ${order.shippingInfo?.phone}</p>
                <p>Email: ${order.shippingInfo?.email}</p>
                <p>Địa chỉ: ${order.shippingInfo?.address}</p>
                <h3>Thông tin thanh toán:</h3>
                <p>Phương thức: ${getPaymentMethodDisplay(order.paymentMethod)}</p>
                <p>Trạng thái thanh toán: ${getPaymentStatusDisplay(order.paymentStatus)}</p>
                ${order.paymentMethod === 'bank' && order.paymentStatus === 'awaiting' ? `
                    <div style="background-color: #f0f8ff; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;">
                        <h4>Thông tin chuyển khoản:</h4>
                        <p><strong>Ngân hàng:</strong> Vietcombank</p>
                        <p><strong>Số tài khoản:</strong> 1234567890</p>
                        <p><strong>Chủ tài khoản:</strong> Shoe Store</p>
                        <p><strong>Nội dung:</strong> DH${order._id}</p>
                        <p><strong>Số tiền:</strong> ${order.totalPrice.toLocaleString('vi-VN')} VNĐ</p>
                    </div>
                ` : ''}
                ${order.paymentMethod === 'ewallet' && order.paymentStatus === 'awaiting' ? `
                    <div style="background-color: #f0f8ff; padding: 15px; border-left: 4px solid #28a745; margin: 10px 0;">
                        <h4>Thông tin thanh toán ví điện tử:</h4>
        
                        <p><strong>Tên:</strong> Shoe Store</p>
                        <p><strong>Nội dung:</strong> DH${order._id}</p>
                        <p><strong>Số tiền:</strong> ${order.totalPrice.toLocaleString('vi-VN')} VNĐ</p>
                    </div>
                ` : ''}
                <h3>Danh sách sản phẩm:</h3>
                <ul>
                    ${order.items.map(item => `
                        <li>
                            ${item.title} - Số lượng: ${item.quantity} - 
                            Giá: ${item.price.toLocaleString('vi-VN')} VNĐ
                        </li>
                    `).join('')}
                </ul>
                <p>Trạng thái đơn hàng: Chờ xác nhận</p>
                <p>Thời gian đặt hàng: ${new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                <p>Trân trọng,<br>Shoe Store</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email xác nhận đơn hàng đã gửi:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Lỗi khi gửi email xác nhận:', error);
        return false;
    }
};

// Gửi email đặt lại mật khẩu
const sendPasswordReset = async (user, resetToken) => {
    try {
        const resetUrl = `${process.env.APP_URL}/reset-password/${resetToken}`;
        const mailOptions = {
            from: '"Shoe Store" <no-reply@shoestore.com>',
            to: user.email,
            subject: 'Đặt lại mật khẩu - Shoe Store',
            html: `
                <h1>Xin chào ${user.name}!</h1>
                <p>Bạn đã yêu cầu đặt lại mật khẩu tại Shoe Store.</p>
                <p>Vui lòng click vào link bên dưới để đặt lại mật khẩu:</p>
                <a href="${resetUrl}">Đặt lại mật khẩu</a>
                <p>Link này sẽ hết hạn sau 1 giờ.</p>
                <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
                <p>Trân trọng,<br>Shoe Store</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email đặt lại mật khẩu đã gửi:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Lỗi khi gửi email đặt lại mật khẩu:', error);
        return false;
    }
};

// Gửi email thông báo đơn hàng mới cho admin
const sendNewOrderNotification = async (order, user) => {
    try {
        const customerName = order.shippingInfo?.name || user.name;
        const customerEmail = order.shippingInfo?.email || user.email;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL,
            subject: `🔔 Đơn hàng mới từ ${customerName}`,
            html: `
                <h1>Thông báo đơn hàng mới</h1>
                <p>Khách hàng: ${customerName} (${customerEmail})</p>
                <p>Mã đơn hàng: ${order._id}</p>
                <p>Phí vận chuyển: ${(order.shippingFee || 0).toLocaleString('vi-VN')} VNĐ</p>
                <p>Tổng tiền: ${order.totalPrice.toLocaleString('vi-VN')} VNĐ</p>
                <p>Thời gian: ${new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                <h3>Thông tin giao hàng:</h3>
                <p>Họ tên: ${order.shippingInfo?.name}</p>
                <p>Điện thoại: ${order.shippingInfo?.phone}</p>
                <p>Email: ${order.shippingInfo?.email}</p>
                <p>Địa chỉ: ${order.shippingInfo?.address}</p>
                <h3>Thông tin thanh toán:</h3>
                <p>Phương thức: ${getPaymentMethodDisplay(order.paymentMethod)}</p>
                <p>Trạng thái thanh toán: ${getPaymentStatusDisplay(order.paymentStatus)}</p>
                <h3>Chi tiết sản phẩm:</h3>
                <ul>
                    ${order.items.map(item => `
                        <li>${item.title} - SL: ${item.quantity} - 
                        Giá: ${item.price.toLocaleString('vi-VN')} VNĐ</li>
                    `).join('')}
                </ul>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email thông báo đơn hàng admin đã gửi:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Lỗi khi gửi email admin:', error);
        return false;
    }
};

// Gửi email thông báo đổi mật khẩu
const sendPasswordChangeNotification = async (user) => {
    try {
        const mailOptionsUser = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Thông báo đổi mật khẩu - Shoe Store',
            html: `
                <p>Xin chào <b>${user.name || 'bạn'}</b>,</p>
                <p>Mật khẩu tài khoản của bạn trên <b>Shoe Store</b> đã được thay đổi vào lúc ${new Date().toLocaleTimeString('vi-VN')} ngày ${new Date().toLocaleDateString('vi-VN')}.</p>
                <p>Nếu bạn không thực hiện hành động này, vui lòng liên hệ ngay với bộ phận hỗ trợ của chúng tôi hoặc đổi lại mật khẩu để đảm bảo an toàn.</p>
                <p>Trân trọng,<br>Đội ngũ Shoe Store</p>
            `
        };
        const mailOptionsAdmin = {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL,
            subject: ` Thông báo từ Shoe Store: Người dùng ${user.email} vừa đổi mật khẩu`,
            html: `
                <h1>Thông báo đổi mật khẩu</h1>
                <p>Người dùng <strong>${user.name || user.email}</strong> (${user.email}) vừa thay đổi mật khẩu vào lúc ${new Date().toLocaleString('vi-VN')}.</p>
                <p>Nếu đây không phải là bạn, vui lòng kiểm tra lại hệ thống.</p>
            `
        };
        await transporter.sendMail(mailOptionsUser);
        await transporter.sendMail(mailOptionsAdmin);
        return true;
    } catch (error) {
        console.error('❌ Lỗi khi gửi email thông báo đổi mật khẩu:', error);
        return false;
    }
};

// Gửi email xác nhận đăng ký
const sendSignupConfirmation = async function(user) {
    const subject = 'Xác nhận đăng ký tài khoản Shoe Store';
    const html = `<p>Xin chào <b>${user.name}</b>,</p>
        <p>Bạn đã đăng ký tài khoản thành công tại Shoe Store với email: <b>${user.email}</b>.</p>
        <p>Chúc bạn có trải nghiệm tuyệt vời tại cửa hàng của chúng tôi!</p>`;
    return sendMail(user.email, subject, html);
};

// Gửi email thông báo thay đổi trạng thái đơn hàng
const sendOrderStatusUpdate = async (order, user, oldStatus, newStatus) => {
    try {
        const customerEmail = order.shippingInfo?.email || user.email;
        const customerName = order.shippingInfo?.name || user.name;
        
        // Xác định nội dung email dựa trên thay đổi trạng thái
        let subject = '';
        let message = '';
        
        switch (newStatus) {
            case 'processing':
                if (oldStatus === 'pending') {
                    subject = 'Đơn hàng của bạn đang được xử lý - Shoe Store';
                    message = 'Đơn hàng của bạn đang được xử lý.';
                }
                break;
            case 'shipped':
                if (oldStatus === 'processing') {
                    subject = 'Đơn hàng của bạn đang được giao - Shoe Store';
                    message = 'Đơn hàng của bạn đang được giao.';
                }
                break;
            case 'completed':
                if (oldStatus === 'shipped') {
                    subject = 'Đơn hàng của bạn đã được giao thành công - Shoe Store';
                    message = 'Đơn hàng của bạn đã được giao thành công.';
                }
                break;
            case 'cancelled':
                subject = 'Đơn hàng của bạn đã bị hủy - Shoe Store';
                message = 'Đơn hàng của bạn đã bị hủy.';
                break;
            default:
                return false; // Không gửi email cho các trạng thái khác
        }
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: customerEmail,
            subject: subject,
            html: `
                <h1>Xin chào ${customerName}!</h1>
                <p>${message}</p>
                <h2>Thông tin đơn hàng:</h2>
                <p>Mã đơn hàng: ${order._id}</p>
                <p>Trạng thái mới: ${getOrderStatusDisplay(newStatus)}</p>
                <p>Thời gian cập nhật: ${new Date().toLocaleString('vi-VN')}</p>
                <h3>Chi tiết đơn hàng:</h3>
                <ul>
                    ${order.items.map(item => `
                        <li>
                            ${item.title} - Số lượng: ${item.quantity} - 
                            Giá: ${item.price.toLocaleString('vi-VN')} VNĐ
                        </li>
                    `).join('')}
                </ul>
                <p>Tổng tiền: ${order.totalPrice.toLocaleString('vi-VN')} VNĐ</p>
                <p>Trân trọng,<br>Shoe Store</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email thông báo thay đổi trạng thái đơn hàng đã gửi: ${oldStatus} → ${newStatus}`, info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Lỗi khi gửi email thông báo thay đổi trạng thái:', error);
        return false;
    }
};

// Gửi email thông báo thay đổi trạng thái thanh toán
const sendPaymentStatusUpdate = async (order, user, oldPaymentStatus, newPaymentStatus) => {
    try {
        const customerEmail = order.shippingInfo?.email || user.email;
        const customerName = order.shippingInfo?.name || user.name;
        
        // Xác định nội dung email dựa trên thay đổi trạng thái thanh toán
        let subject = '';
        let message = '';
        
        switch (newPaymentStatus) {
            case 'paid':
                if (oldPaymentStatus === 'pending' || oldPaymentStatus === 'awaiting') {
                    subject = 'Bạn đã thanh toán thành công - Shoe Store';
                    message = 'Bạn đã thanh toán thành công.';
                }
                break;
            case 'failed':
                subject = 'Thanh toán không thành công - Shoe Store';
                message = 'Thanh toán không thành công. Vui lòng thử lại.';
                break;
            default:
                return false; // Không gửi email cho các trạng thái khác
        }
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: customerEmail,
            subject: subject,
            html: `
                <h1>Xin chào ${customerName}!</h1>
                <p>${message}</p>
                <h2>Thông tin đơn hàng:</h2>
                <p>Mã đơn hàng: ${order._id}</p>
                <p>Trạng thái thanh toán mới: ${getPaymentStatusDisplay(newPaymentStatus)}</p>
                <p>Thời gian cập nhật: ${new Date().toLocaleString('vi-VN')}</p>
                <h3>Chi tiết đơn hàng:</h3>
                <ul>
                    ${order.items.map(item => `
                        <li>
                            ${item.title} - Số lượng: ${item.quantity} - 
                            Giá: ${item.price.toLocaleString('vi-VN')} VNĐ
                        </li>
                    `).join('')}
                </ul>
                <p>Tổng tiền: ${order.totalPrice.toLocaleString('vi-VN')} VNĐ</p>
                <p>Trân trọng,<br>Shoe Store</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email thông báo thay đổi trạng thái thanh toán đã gửi: ${oldPaymentStatus} → ${newPaymentStatus}`, info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Lỗi khi gửi email thông báo thay đổi trạng thái thanh toán:', error);
        return false;
    }
};

// Helper để hiển thị trạng thái đơn hàng
function getOrderStatusDisplay(status) {
    const statuses = {
        'pending': 'Chờ xử lý',
        'processing': 'Đang xử lý',
        'shipped': 'Đang giao',
        'completed': 'Đã giao',
        'cancelled': 'Đã hủy'
    };
    return statuses[status] || 'Không xác định';
}

// Xuất module
module.exports = {
    sendOrderConfirmation,
    sendPasswordReset,
    sendNewOrderNotification,
    sendPasswordChangeNotification,
    sendSignupConfirmation,
    sendOrderStatusUpdate,
    sendPaymentStatusUpdate
};
