const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { sendPasswordChangeNotification } = require('../util/email');

// GET /login
router.get('/login', (req, res, next) => {
    // Nếu đã đăng nhập, redirect về trang trước đó hoặc trang chủ
    if (req.session.user) {
        const returnTo = req.session.returnTo || '/';
        delete req.session.returnTo;
        return res.redirect(returnTo);
    }
    
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Đăng nhập',
        error: null,
        isAuthenticated: req.session.user ? true : false,
        isAdmin: req.session.user && req.session.user.role === 'admin',
        user: req.session.user || null
    });
});

// POST /login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔍 [LOGIN DEBUG] Login attempt started');
        console.log('🔍 [LOGIN DEBUG] Email:', email);
        console.log('🔍 [LOGIN DEBUG] Password provided:', !!password);
        
        // Kiểm tra email và mật khẩu có được cung cấp
        if (!email || !password) {
            console.log('❌ [LOGIN DEBUG] Missing email or password');
            return res.render('auth/login', {
                path: '/login',
                pageTitle: 'Đăng nhập',
                error: 'Vui lòng nhập đầy đủ email và mật khẩu',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin',
                user: req.session.user || null
            });
        }

        // Tìm user theo email
        console.log('🔍 [LOGIN DEBUG] Looking up user by email...');
        const user = await User.findByEmail(email);
        if (!user) {
            console.log('❌ [LOGIN DEBUG] User not found in database');
            return res.render('auth/login', {
                path: '/login',
                pageTitle: 'Đăng nhập',
                error: 'Email không tồn tại',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin',
                user: req.session.user || null
            });
        }

        console.log('✅ [LOGIN DEBUG] User found, checking password...');
        
        // Kiểm tra mật khẩu
        const isPasswordValid = await User.comparePassword(email, password);
        if (!isPasswordValid) {
            console.log('❌ [LOGIN DEBUG] Password validation failed');
            return res.render('auth/login', {
                path: '/login',
                pageTitle: 'Đăng nhập',
                error: 'Mật khẩu không đúng',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin',
                user: req.session.user || null
            });
        }

        console.log('✅ [LOGIN DEBUG] Password validation successful');

        // Kiểm tra trạng thái tài khoản
        if (user.isActive === false) {
            console.log('❌ [LOGIN DEBUG] Account is locked');
            return res.render('auth/login', {
                path: '/login',
                pageTitle: 'Đăng nhập',
                error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin',
                user: req.session.user || null
            });
        }

        // Đảm bảo user có role
        if (!user.role) {
            user.role = 'user'; // Set role mặc định là user
        }

        req.session.user = user;
        await req.session.save();
        console.log('✅ [LOGIN DEBUG] User logged in successfully:', user.email);
        
        // Redirect về trang trước đó nếu có, ngược lại về trang chủ
        const returnTo = req.session.returnTo || '/';
        delete req.session.returnTo; // Xóa returnTo sau khi sử dụng
        
        if(user.role === 'admin') {
          console.log('🔄 [LOGIN DEBUG] Redirecting to admin dashboard');
          return res.redirect('/admin/dashboard');
        }
        console.log('🔄 [LOGIN DEBUG] Redirecting to:', returnTo);
        res.redirect(returnTo);
    } catch (err) {
        console.error('❌ [LOGIN DEBUG] Login error:', err);
        res.render('auth/login', {
            path: '/login',
            pageTitle: 'Đăng nhập',
            error: 'Có lỗi xảy ra khi đăng nhập',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null
        });
    }
});

// GET /logout
router.get('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Lỗi khi đăng xuất:', err);
        }
        res.redirect('/');
    });
});

// POST /logout
router.post('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Lỗi khi đăng xuất:', err);
        }
        res.redirect('/');
    });
});

// GET /profile
router.get('/profile', async (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    try {
        const User = require('../models/user');
        const Order = require('../models/order');
        const Product = require('../models/product-mongoose');
        
        // Lấy thông tin user đầy đủ từ database
        const userData = await User.findById(req.session.user._id);
        if (!userData) {
            return res.redirect('/login');
        }
        
        // Lấy thống kê đơn hàng
        const orders = await Order.findByUserId(req.session.user._id);
        const totalOrders = orders.length;
        
        // Lấy thống kê sản phẩm yêu thích
        const favorites = userData.favorites || [];
        const totalFavorites = favorites.length;
        
        // Lấy thống kê đánh giá (tạm thời = 0, có thể implement sau)
        const totalReviews = 0;
        
        // Lấy thông tin đơn hàng gần đây (5 đơn hàng mới nhất)
        const recentOrders = orders
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
        
        res.render('profile', {
            path: '/profile',
            pageTitle: 'Thông tin cá nhân',
            user: {
                ...req.session.user,
                ...userData,
                phone: userData.phone || null,
                address: userData.address || null
            },
            isAuthenticated: true,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            stats: {
                totalOrders,
                totalFavorites,
                totalReviews
            },
            recentOrders
        });
    } catch (err) {
        console.error('Lỗi khi tải trang profile:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải thông tin cá nhân',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
});

// GET /profile/edit
router.get('/profile/edit', (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('profile-edit', {
        path: '/profile/edit',
        pageTitle: 'Chỉnh sửa thông tin cá nhân',
        user: req.session.user,
        isAuthenticated: true,
        isAdmin: req.session.user && req.session.user.role === 'admin',
        error: null,
        success: null
    });
});

// POST /profile/edit
router.post('/profile/edit', async (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try {
        const { name, phone, address, email } = req.body;
        const User = require('../models/user');
        await User.updateProfile(req.session.user._id, { name, phone, address, email });
        req.session.user.name = name;
        req.session.user.phone = phone;
        req.session.user.address = address;
        if (email) req.session.user.email = email;
        await req.session.save();
        
        // Check if this is an AJAX request (JSON)
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
            return res.json({
                success: true,
                message: 'Cập nhật thành công!'
            });
        }
        
        res.render('profile-edit', {
            path: '/profile/edit',
            pageTitle: 'Chỉnh sửa thông tin cá nhân',
            user: req.session.user,
            isAuthenticated: true,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            error: null,
            success: 'Cập nhật thành công!'
        });
    } catch (err) {
        // Check if this is an AJAX request (JSON)
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật'
            });
        }
        
        res.render('profile-edit', {
            path: '/profile/edit',
            pageTitle: 'Chỉnh sửa thông tin cá nhân',
            user: req.session.user,
            isAuthenticated: true,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            error: 'Có lỗi xảy ra khi cập nhật',
            success: null
        });
    }
});

// GET /profile/change-password
router.get('/profile/change-password', (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('profile-change-password', {
        path: '/profile/change-password',
        pageTitle: 'Đổi mật khẩu',
        user: req.session.user,
        isAuthenticated: true,
        isAdmin: req.session.user && req.session.user.role === 'admin',
        error: null,
        success: null
    });
});

// POST /profile/change-password
router.post('/profile/change-password', async (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;
        
        // Validation
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.render('profile-change-password', {
                path: '/profile/change-password',
                pageTitle: 'Đổi mật khẩu',
                user: req.session.user,
                isAuthenticated: true,
                isAdmin: req.session.user && req.session.user.role === 'admin',
                error: 'Vui lòng nhập đầy đủ thông tin',
                success: null
            });
        }
        
        if (newPassword !== confirmPassword) {
            return res.render('profile-change-password', {
                path: '/profile/change-password',
                pageTitle: 'Đổi mật khẩu',
                user: req.session.user,
                isAuthenticated: true,
                isAdmin: req.session.user && req.session.user.role === 'admin',
                error: 'Mật khẩu mới và xác nhận mật khẩu không khớp',
                success: null
            });
        }
        
        if (newPassword.length < 6) {
            return res.render('profile-change-password', {
                path: '/profile/change-password',
                pageTitle: 'Đổi mật khẩu',
                user: req.session.user,
                isAuthenticated: true,
                isAdmin: req.session.user && req.session.user.role === 'admin',
                error: 'Mật khẩu mới phải có ít nhất 6 ký tự',
                success: null
            });
        }
        const User = require('../models/user');
        const user = await User.findById(req.session.user._id);
        if (!user) {
            throw new Error('Không tìm thấy user');
        }
        // Kiểm tra mật khẩu cũ bằng bcrypt
        const bcrypt = require('bcryptjs');
        const isOldPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordCorrect) {
            return res.render('profile-change-password', {
                path: '/profile/change-password',
                pageTitle: 'Đổi mật khẩu',
                user: req.session.user,
                isAuthenticated: true,
                isAdmin: req.session.user && req.session.user.role === 'admin',
                error: 'Mật khẩu cũ không đúng',
                success: null
            });
        }
        await User.updatePassword(req.session.user._id, newPassword);
        // Gửi email thông báo đổi mật khẩu
        await sendPasswordChangeNotification(user);
        res.render('profile-change-password', {
            path: '/profile/change-password',
            pageTitle: 'Đổi mật khẩu',
            user: req.session.user,
            isAuthenticated: true,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            error: null,
            success: 'Đổi mật khẩu thành công! Email xác nhận đã được gửi.'
        });
    } catch (err) {
        res.render('profile-change-password', {
            path: '/profile/change-password',
            pageTitle: 'Đổi mật khẩu',
            user: req.session.user,
            isAuthenticated: true,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            error: 'Có lỗi xảy ra khi đổi mật khẩu',
            success: null
        });
    }
});

// GET /signup
router.get('/signup', (req, res, next) => {
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Đăng ký',
        error: null,
        isAuthenticated: req.session.user ? true : false,
        isAdmin: req.session.user && req.session.user.role === 'admin',
        user: req.session.user || null
    });
});

// POST /signup
router.post('/signup', async (req, res, next) => {
    try {
        const { name, email, password, confirmPassword, phone, address } = req.body;
        if (!name || !email || !password || !confirmPassword) {
            return res.render('auth/signup', {
                path: '/signup',
                pageTitle: 'Đăng ký',
                error: 'Vui lòng nhập đầy đủ thông tin',
                isAuthenticated: false,
                isAdmin: false,
                user: null
            });
        }
        if (password !== confirmPassword) {
            return res.render('auth/signup', {
                path: '/signup',
                pageTitle: 'Đăng ký',
                error: 'Mật khẩu nhập lại không khớp',
                isAuthenticated: false,
                isAdmin: false,
                user: null
            });
        }
        if (phone && !/^\d{10,11}$/.test(phone)) {
            return res.render('auth/signup', {
                path: '/signup',
                pageTitle: 'Đăng ký',
                error: 'Số điện thoại không hợp lệ',
                isAuthenticated: false,
                isAdmin: false,
                user: null
            });
        }
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.render('auth/signup', {
                path: '/signup',
                pageTitle: 'Đăng ký',
                error: 'Email đã được sử dụng',
                isAuthenticated: false,
                isAdmin: false,
                user: null
            });
        }
        // Lưu user mới
        const newUser = await User.create({ name, email, password, phone, address, role: 'user' });
        // Gửi email xác nhận
        const { sendSignupConfirmation } = require('../util/email');
        try {
            await sendSignupConfirmation(newUser);
        } catch (e) { console.error('Không gửi được email xác nhận:', e); }
        // Tự động đăng nhập
        req.session.user = newUser;
        await req.session.save();
        // Hiển thị popup thông báo trên trang chủ
        req.session.signupSuccess = true;
        res.redirect('/');
    } catch (err) {
        res.render('auth/signup', {
            path: '/signup',
            pageTitle: 'Đăng ký',
            error: 'Có lỗi xảy ra khi đăng ký',
            isAuthenticated: false,
            isAdmin: false,
            user: null
        });
    }
});

module.exports = router; 