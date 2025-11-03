// Helper functions for EJS templates

function getStatusColor(status) {
    switch(status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'confirmed': return 'bg-blue-100 text-blue-800';
        case 'shipping': return 'bg-purple-100 text-purple-800';
        case 'completed': return 'bg-green-100 text-green-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getStatusText(status) {
    switch(status) {
        case 'pending': return 'Chờ xử lý';
        case 'confirmed': return 'Đã xác nhận';
        case 'shipping': return 'Đang giao hàng';
        case 'completed': return 'Đã hoàn thành';
        case 'cancelled': return 'Đã hủy';
        default: return 'Không xác định';
    }
}

function getPaymentStatusColor(status) {
    switch(status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'paid': return 'bg-green-100 text-green-800';
        case 'failed': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getPaymentStatusText(status) {
    switch(status) {
        case 'pending': return 'Chờ thanh toán';
        case 'paid': return 'Đã thanh toán';
        case 'failed': return 'Thanh toán thất bại';
        default: return 'Không xác định';
    }
}

function getPaymentMethodText(method) {
    switch(method) {
        case 'cod': return 'Thanh toán khi nhận hàng';
        case 'bank': return 'Chuyển khoản ngân hàng';
        case 'ewallet': return 'Ví điện tử';
        case 'vnpay': return 'VNPay';
        default: return 'Không xác định';
    }
}

module.exports = {
    getStatusColor,
    getStatusText,
    getPaymentStatusColor,
    getPaymentStatusText,
    getPaymentMethodText
};
