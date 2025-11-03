const User = require('../models/user');

// Middleware kiểm tra trạng thái tài khoản
const checkAccountStatus = async (req, res, next) => {
    try {
        // Chỉ kiểm tra nếu user đã đăng nhập
        if (req.session.user && req.session.user._id) {
            const isActive = await User.isAccountActive(req.session.user._id);
            
            if (!isActive) {
                // Tài khoản bị khóa, đăng xuất user
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Lỗi khi destroy session:', err);
                    }
                });
                
                return res.status(403).render('error', {
                    pageTitle: 'Tài khoản bị khóa',
                    path: '/error',
                    error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
                    isAuthenticated: false,
                    isAdmin: false,
                    user: null
                });
            }
        }
        
        next();
    } catch (err) {
        console.error('Lỗi khi kiểm tra trạng thái tài khoản:', err);
        // Nếu có lỗi, cho phép tiếp tục để tránh block user
        next();
    }
};

module.exports = checkAccountStatus;
