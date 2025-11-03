const path = require('path');
const fs = require('fs');

const express = require('express');

const rootDir = require('../util/path');

const products = require('./admin').products;

const shopController = require('../controllers/shop');
const slideController = require('../controllers/slide-controller');


const { sendOrderConfirmation } = require('../util/email');
const User = require('../models/user');
const isAuth = require('../middleware/is-auth');
const { getDb } = require('../util/database');

const router = express.Router();

// Route tạo và đăng nhập user mặc định
router.get('/create-default-user', async (req, res, next) => {
    try {
        // Kiểm tra xem user đã tồn tại chưa
        let user = await User.findByEmail('default@example.com');

        if (!user) {
            // Tạo user mới nếu chưa tồn tại
            const newUser = new User('Default User', 'default@example.com');
            newUser.role = 'admin'; // Set role là admin
            const result = await newUser.save();

            if (!result.insertedId) {
                throw new Error('Không thể tạo user mới - không có insertedId');
            }

            user = await User.findById(result.insertedId);
            if (!user) {
                throw new Error('Không thể tìm thấy user sau khi tạo');
            }

            console.log('Đã tạo user mới:', user);
        }

        // Lưu user vào session
        req.session.user = {
            _id: user._id.toString(),
            email: user.email,
            role: user.role || 'admin'
        };

        await req.session.save();
        console.log('Session user:', req.session.user);

        // Redirect về trang admin nếu user là admin, ngược lại về trang chủ
        if (user.role === 'admin') {
            return res.redirect('/admin/products');
        } else {
            return res.redirect('/');
        }
    } catch (err) {
        console.error('Lỗi khi tạo/đăng nhập user:', err);
        return res.status(500).json({
            error: 'Không thể tạo/đăng nhập user',
            details: err.message
        });
    }
});

// Route test quyền truy cập admin
router.get('/test-admin-access', (req, res) => {
    console.log('🔐 [TEST-ADMIN-ACCESS] Checking admin access...');
    console.log('🔐 [TEST-ADMIN-ACCESS] Session exists:', !!req.session);
    console.log('🔐 [TEST-ADMIN-ACCESS] Session user:', req.session?.user);
    console.log('🔐 [TEST-ADMIN-ACCESS] User role:', req.session?.user?.role);
    
    if (!req.session.user) {
        console.log('❌ [TEST-ADMIN-ACCESS] No user in session');
        return res.json({
            success: false,
            message: 'Chưa đăng nhập',
            hasUser: false,
            userRole: null
        });
    }
    
    if (req.session.user.role !== 'admin') {
        console.log('❌ [TEST-ADMIN-ACCESS] User role is not admin:', req.session.user.role);
        return res.json({
            success: false,
            message: 'Không có quyền admin',
            hasUser: true,
            userRole: req.session.user.role
        });
    }
    
    console.log('✅ [TEST-ADMIN-ACCESS] Admin access granted');
    res.json({
        success: true,
        message: 'Có quyền admin',
        hasUser: true,
        userRole: req.session.user.role,
        user: req.session.user
    });
});

// GET /test-session
router.get('/test-session', (req, res) => {
    console.log('🔍 [TEST-SESSION] Checking session...');
    console.log('🔍 [TEST-SESSION] Session exists:', !!req.session);
    console.log('🔍 [TEST-SESSION] Session user:', req.session?.user);
    console.log('🔍 [TEST-SESSION] User role:', req.session?.user?.role);
    
    res.json({
        success: true,
        message: 'Session test',
        hasSession: !!req.session,
        hasUser: !!req.session?.user,
        user: req.session?.user || null,
        userRole: req.session?.user?.role || null
    });
});

// Route tạo user admin và đăng nhập
router.get('/create-admin-login', async (req, res) => {
    try {
        console.log('🔧 [CREATE-ADMIN-LOGIN] Starting...');
        
        // Kiểm tra xem user admin đã tồn tại chưa
        let user = await User.findByEmail('admin@example.com');
        
        if (!user) {
            console.log('🔧 [CREATE-ADMIN-LOGIN] Creating new admin user...');
            // Tạo user admin mới
            const newUser = new User('Admin User', 'admin@example.com', 'admin');
            const result = await newUser.save();
            
            if (!result.insertedId) {
                throw new Error('Không thể tạo user mới - không có insertedId');
            }
            
            user = await User.findById(result.insertedId);
            if (!user) {
                throw new Error('Không thể tìm thấy user sau khi tạo');
            }
            
            console.log('✅ [CREATE-ADMIN-LOGIN] Created new admin user:', user);
        } else {
            console.log('✅ [CREATE-ADMIN-LOGIN] Admin user already exists:', user);
        }
        
        // Đảm bảo user có role admin
        if (user.role !== 'admin') {
            console.log('🔧 [CREATE-ADMIN-LOGIN] Updating user role to admin...');
            user.role = 'admin';
            // Cập nhật role trong database
            const { getDb } = require('../util/database');
            const db = getDb();
            await db.collection('users').updateOne(
                { _id: user._id },
                { $set: { role: 'admin' } }
            );
        }
        
        // Lưu user vào session
        req.session.user = {
            _id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: 'admin'
        };
        
        await req.session.save();
        console.log('✅ [CREATE-ADMIN-LOGIN] Session saved:', req.session.user);
        
        res.json({
            success: true,
            message: 'Đã tạo và đăng nhập user admin',
            user: req.session.user
        });
    } catch (err) {
        console.error('❌ [CREATE-ADMIN-LOGIN] Error:', err);
        res.status(500).json({
            error: 'Không thể tạo/đăng nhập user admin',
            details: err.message
        });
    }
});

// Trang chủ
router.get('/', shopController.getIndex);

// Route test đơn giản
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Server is working!', 
        timestamp: new Date().toISOString(),
        session: req.session ? 'Session exists' : 'No session'
    });
});

// Danh sách sản phẩm
router.get('/products', shopController.getProducts);

// Chi tiết sản phẩm
router.get('/products/:productId', shopController.getProduct);

// Giỏ hàng - không cần đăng nhập
router.get('/cart', shopController.getCart);
router.post('/cart', shopController.postCart);
router.post('/cart/add', shopController.postCart); // AJAX endpoint
router.post('/cart-delete-item', shopController.postCartDeleteProduct);
router.post('/cart-update-quantity', shopController.postCartUpdateQuantity);
router.post('/cart-clear-all', shopController.postCartClearAll);

// Đơn hàng - cần đăng nhập
router.post('/orders', isAuth, shopController.postOrder);
router.get('/orders', isAuth, shopController.getOrders);
router.post('/orders/:orderId/delete', shopController.deleteOrder);
router.post('/orders/delete-all', shopController.deleteAllOrders);
router.post('/orders/:orderId/cancel', isAuth, shopController.cancelOrder);

// Route tải xuống hóa đơn cho người dùng
router.get('/download-invoice/:orderId', isAuth, shopController.getDownloadInvoice);

router.get('/checkout', isAuth, shopController.getCheckout);
router.post('/checkout', isAuth, shopController.postCheckout);

// Route test gửi email
router.get('/test-email', async (req, res) => {
  const fakeOrder = {
    _id: 'TEST123',
    totalPrice: 100000,
    shippingInfo: {
      name: 'Test User',
      phone: '0123456789',
      email: 'findsomethingfromu@gmail.com', // ← Email thật của bạn
      address: 'Test Address'
    },
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    items: [
      { title: 'Sản phẩm A', quantity: 1, price: 50000 },
      { title: 'Sản phẩm B', quantity: 2, price: 25000 }
    ],
    createdAt: new Date()
  };
  const fakeUser = { name: 'Test User', email: 'findsomethingfromu@gmail.com' }; // ← Email thật của bạn
  const result = await sendOrderConfirmation(fakeOrder, fakeUser);
  res.send(result ? 'Gửi email thành công!' : 'Gửi email thất bại!');
});

router.get('/search', shopController.getSearch);

router.get('/categories', shopController.getCategories);

router.get('/about', shopController.getAbout);
router.get('/contact', shopController.getContact);
router.post('/contact', shopController.postContact);

// Route GET /services
router.get('/services', (req, res) => {
    res.render('shop/services', {
        pageTitle: 'Dịch vụ tại Pet Store',
        path: '/services',
        isAuthenticated: req.session.user ? true : false,
        isAdmin: req.session.user && req.session.user.role === 'admin',
        user: req.session.user || null
    });
});

// Yêu thích sản phẩm
router.post('/favorites/:productId', isAuth, shopController.addFavorite);
router.delete('/favorites/:productId', isAuth, shopController.removeFavorite);
router.get('/favorites', isAuth, shopController.getFavorites);

router.post('/products/:productId/review', isAuth, shopController.postReview);
// Trang thương hiệu
router.get('/brands', shopController.getBrands);

// ===== ROUTES SLIDE BANNER (PUBLIC) =====

// API lấy slides cho trang chủ
router.get('/api/slides', slideController.getActiveSlides);

// API tăng view count cho slide
router.post('/api/slides/:slideId/view', slideController.incrementSlideView);

module.exports = router;
