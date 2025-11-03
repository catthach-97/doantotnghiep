const path = require('path');
const fs = require('fs');
const express = require('express');
const rootDir = require('../util/path');
const adminController = require('../controllers/admin');
const brandCategoryController = require('../controllers/brand-category-controllers');
const slideController = require('../controllers/slide-controller');
const adminReviewController = require('../controllers/admin-review-controller');
const { uploadBrandLogo, handleUploadError } = require('../middleware/brand-upload');
const { uploadCategoryImage, handleUploadError: handleCategoryUploadError } = require('../middleware/category-upload');
const { uploadSlideImage, handleUploadError: handleSlideUploadError } = require('../middleware/slide-upload');
const isAuth = require('../middleware/is-auth');
const isAdmin = require('../middleware/is-admin');

const router = express.Router();

// /admin/add-product => GET
router.get('/add-product', isAuth, isAdmin, adminController.getAddProduct);

// /admin/add-product => POST
router.post('/add-product', isAuth, isAdmin, adminController.postAddProduct);

// /admin/products => GET
router.get('/products', isAuth, isAdmin, adminController.getProducts);

// /admin/edit-product/:productId => GET
router.get('/edit-product/:productId', isAuth, isAdmin, adminController.getEditProduct);

// /admin/edit-product => POST
router.post('/edit-product', isAuth, isAdmin, adminController.postEditProduct);

// /admin/delete-product => POST
router.post('/delete-product', isAuth, isAdmin, adminController.postDeleteProduct);

// /admin/profile => GET
router.get('/profile', isAuth, isAdmin, adminController.getProfile);

// /admin/settings => GET
router.get('/settings', isAuth, isAdmin, adminController.getSettings);

// Route tải xuống hóa đơn PDF
router.get('/download-invoice/:orderId', isAuth, isAdmin, adminController.getDownloadInvoice);

// Route xuất PDF danh sách sản phẩm
router.get('/export-products-pdf', isAuth, isAdmin, adminController.getExportProductsPDF);

// Route xuất Excel danh sách sản phẩm
router.get('/export-products', isAuth, isAdmin, adminController.getExportProducts);

// Route tạo sản phẩm mẫu
router.post('/create-sample-products', isAuth, isAdmin, adminController.createSampleProducts);

// Routes quản lý đơn hàng
router.get('/orders', isAuth, isAdmin, adminController.getOrders);

// Route xem chi tiết đơn hàng
router.get('/orders/:orderId', isAuth, isAdmin, adminController.getOrderDetail);

// Route cập nhật trạng thái đơn hàng
router.post('/update-order-status', isAuth, isAdmin, adminController.postUpdateOrderStatus);

// Route cập nhật trạng thái thanh toán
router.post('/update-payment-status', isAuth, isAdmin, adminController.postUpdatePaymentStatus);

// Route tải hóa đơn
router.get('/orders/:orderId/invoice', isAuth, isAdmin, adminController.getDownloadInvoice);

// Route DELETE /admin/orders/:orderId/delete cho admin xoá đơn hàng.
router.delete('/orders/:orderId/delete', isAuth, isAdmin, adminController.deleteOrder);

// Route GET /admin/dashboard
router.get('/dashboard', isAuth, isAdmin, adminController.getDashboard);

// Route GET /accounts/create
router.get('/accounts/create', isAuth, isAdmin, adminController.getCreateUser);

// Route POST /accounts/create
router.post('/accounts/create', isAuth, isAdmin, adminController.postCreateUser);

// Route POST /accounts/delete (for modal form)
router.post('/accounts/delete', isAuth, isAdmin, adminController.postDeleteUser);

// Route POST /accounts/edit (for modal form)
router.post('/accounts/edit', isAuth, isAdmin, adminController.postEditUserModal);

// Route GET /accounts/:userId/edit
router.get('/accounts/:userId/edit', isAuth, isAdmin, adminController.getEditUser);

// Route POST /accounts/:userId/edit
router.post('/accounts/:userId/edit', isAuth, isAdmin, adminController.postEditUser);

// Route DELETE /accounts/:userId
router.delete('/accounts/:userId', isAuth, isAdmin, adminController.deleteUser);

// ===== ROUTES QUẢN LÝ TRẠNG THÁI TÀI KHOẢN =====

// Route toggle trạng thái tài khoản (khóa/mở khóa)
router.post('/accounts/toggle-status', isAuth, isAdmin, adminController.toggleAccountStatus);

// Route khóa tài khoản
router.post('/accounts/lock', isAuth, isAdmin, adminController.lockAccount);

// Route mở khóa tài khoản
router.post('/accounts/unlock', isAuth, isAdmin, adminController.unlockAccount);

// Route lấy thống kê trạng thái tài khoản
router.get('/accounts/status-stats', isAuth, isAdmin, adminController.getAccountStatusStats);

// Route GET /accounts (phải đặt cuối cùng để tránh conflict với /accounts/:userId)
router.get('/accounts', isAuth, isAdmin, adminController.getUsers);
router.get('/accounts-debug', isAuth, isAdmin, adminController.getUsersDebug);

// ===== ROUTES QUẢN LÝ THƯƠNG HIỆU =====

// Route hiển thị trang quản lý thương hiệu
router.get('/brands', isAuth, isAdmin, brandCategoryController.getBrands);

// Route lấy thông tin thương hiệu theo ID
router.get('/brands/:brandId', isAuth, isAdmin, brandCategoryController.getBrandById);

// Route thêm/sửa thương hiệu
router.post('/brands', isAuth, isAdmin, uploadBrandLogo, handleUploadError, brandCategoryController.postBrand);

// Route toggle trạng thái thương hiệu
router.post('/brands/toggle-status', isAuth, isAdmin, brandCategoryController.toggleBrandStatus);

// Route xóa thương hiệu
router.post('/brands/delete', isAuth, isAdmin, brandCategoryController.deleteBrand);

// ===== ROUTES QUẢN LÝ DANH MỤC =====

// Route hiển thị trang quản lý danh mục
router.get('/categories', isAuth, isAdmin, brandCategoryController.getCategories);

// Route lấy thông tin danh mục theo ID
router.get('/categories/:categoryId', isAuth, isAdmin, brandCategoryController.getCategoryById);

// Route thêm/sửa danh mục
router.post('/categories', isAuth, isAdmin, uploadCategoryImage.single('image'), handleCategoryUploadError, brandCategoryController.postCategory);

// Route xóa danh mục
router.post('/categories/delete', isAuth, isAdmin, brandCategoryController.deleteCategory);

// Route toggle trạng thái danh mục
router.post('/categories/toggle-status', isAuth, isAdmin, brandCategoryController.toggleCategoryStatus);

// Route test gửi email
router.get('/test-email', isAuth, isAdmin, async (req, res) => {
  try {
    const { sendSignupConfirmation } = require('../util/email');
    const testUser = {
      name: 'Test User',
      email: req.query.email || 'test@example.com'
    };
    
    const result = await sendSignupConfirmation(testUser);
    if (result) {
      res.json({ success: true, message: 'Email đã được gửi thành công!' });
    } else {
      res.json({ success: false, message: 'Không thể gửi email' });
    }
  } catch (error) {
    console.error('Lỗi test email:', error);
    res.json({ success: false, message: 'Lỗi: ' + error.message });
  }
});

// Route quản lý đánh giá (moved to review-controller.js)
// router.get('/reviews', isAuth, isAdmin, adminController.getReviews);

// Xóa đánh giá - đã chuyển sang adminReviewController

// Duyệt đánh giá
router.post('/reviews/approve', isAuth, isAdmin, adminController.postApproveReview);

// ===== ROUTES QUẢN LÝ SLIDE BANNER =====

// Route hiển thị trang quản lý slide
router.get('/slides', isAuth, isAdmin, slideController.getSlides);

// Route lấy thông tin slide theo ID
router.get('/slides/:slideId', isAuth, isAdmin, slideController.getSlideById);

// Route thêm/sửa slide
router.post('/slides', isAuth, isAdmin, uploadSlideImage, handleSlideUploadError, slideController.postSlide);

// Route toggle trạng thái slide
router.post('/slides/toggle-status', isAuth, isAdmin, slideController.toggleSlideStatus);

// Route xóa slide
router.post('/slides/delete', isAuth, isAdmin, slideController.deleteSlide);

// ===== REVIEW MANAGEMENT ROUTES =====
// Route quản lý đánh giá (sử dụng controller mới)
router.get('/reviews', isAuth, isAdmin, adminReviewController.getReviews);

// Route test đánh giá
router.get('/reviews-test', (req, res) => {
    res.json({ 
        message: 'Review system is working!', 
        timestamp: new Date().toISOString() 
    });
});

// Route test đơn giản cho reviews
router.get('/reviews-simple', (req, res) => {
    console.log('🔍 Testing reviews-simple route');
    res.render('admin/reviews-new', {
        reviews: [],
        pageTitle: 'Quản lý đánh giá | Admin',
        path: '/admin/reviews',
        currentPage: 1,
        totalPages: 1,
        totalReviews: 0,
        search: '',
        product: '',
        rating: '',
        status: '',
        pendingReviews: 0,
        approvedReviews: 0,
        averageRating: '0.0',
        isAuthenticated: req.session.user ? true : false,
        isAdmin: req.session.user && req.session.user.role === 'admin',
        user: req.session.user || null
    });
});

// Route debug cho reviews
router.get('/reviews-debug', (req, res) => {
    console.log('🔍 Reviews debug route called');
    console.log('🔍 Session:', req.session);
    console.log('🔍 User:', req.session.user);
    res.json({
        message: 'Reviews debug route working',
        session: !!req.session,
        user: !!req.session.user,
        userRole: req.session.user?.role,
        timestamp: new Date().toISOString()
    });
});

// Route test với dữ liệu mẫu
router.get('/reviews-sample', (req, res) => {
    console.log('🔍 Testing reviews-sample route');
    const sampleReviews = [
        {
            _id: '1',
            userName: 'Nguyễn Văn A',
            rating: 5,
            comment: 'Sản phẩm rất tốt, tôi rất hài lòng!',
            createdAt: new Date(),
            approved: true,
            productId: 'prod1',
            productTitle: 'Giày thể thao Nike',
            productImage: '/images/default-product.jpg',
            productBrand: 'Nike'
        },
        {
            _id: '2',
            userName: 'Trần Thị B',
            rating: 4,
            comment: 'Chất lượng tốt, giá hợp lý',
            createdAt: new Date(),
            approved: false,
            productId: 'prod2',
            productTitle: 'Giày chạy bộ Adidas',
            productImage: '/images/default-product.jpg',
            productBrand: 'Adidas'
        }
    ];
    
    res.render('admin/reviews-new', {
        reviews: sampleReviews,
        pageTitle: 'Quản lý đánh giá | Admin',
        path: '/admin/reviews',
        currentPage: 1,
        totalPages: 1,
        totalReviews: sampleReviews.length,
        search: '',
        product: '',
        rating: '',
        status: '',
        pendingReviews: sampleReviews.filter(r => !r.approved).length,
        approvedReviews: sampleReviews.filter(r => r.approved).length,
        averageRating: '4.5',
        isAuthenticated: req.session.user ? true : false,
        isAdmin: req.session.user && req.session.user.role === 'admin',
        user: req.session.user || null
    });
});

// Route cập nhật trạng thái đánh giá (sử dụng controller mới)
router.post('/reviews/update-status', isAuth, isAdmin, adminReviewController.updateReviewStatus);

// Route xóa đánh giá (sử dụng controller mới)
router.post('/reviews/delete', isAuth, isAdmin, adminReviewController.deleteReview);

// Route xem chi tiết đánh giá (sử dụng controller mới)
router.get('/reviews/detail/:reviewId', isAuth, isAdmin, adminReviewController.getReviewDetail);

// Route thêm phản hồi admin
router.post('/reviews/add-response', isAuth, isAdmin, adminReviewController.addAdminResponse);

// Route duyệt hàng loạt
router.post('/reviews/bulk-approve', isAuth, isAdmin, adminReviewController.bulkApprove);

// Route xóa hàng loạt
router.post('/reviews/bulk-delete', isAuth, isAdmin, adminReviewController.bulkDelete);

// Route lấy thống kê reviews
router.get('/reviews/stats', isAuth, isAdmin, adminReviewController.getReviewStats);

// ===== NEW REVIEW MANAGEMENT ROUTES (Collection riêng) =====

// Route quản lý đánh giá mới (collection riêng)
router.get('/reviews-new', isAuth, isAdmin, adminReviewController.getReviews);

// Route lấy chi tiết đánh giá mới
router.get('/reviews-new/detail/:reviewId', isAuth, isAdmin, adminReviewController.getReviewDetail);

// Route cập nhật trạng thái đánh giá mới
router.post('/reviews-new/update-status', isAuth, isAdmin, adminReviewController.updateReviewStatus);

// Route xóa đánh giá mới
router.post('/reviews-new/delete', isAuth, isAdmin, adminReviewController.deleteReview);

// Route thêm phản hồi admin
router.post('/reviews-new/add-response', isAuth, isAdmin, adminReviewController.addAdminResponse);

// Route duyệt hàng loạt
router.post('/reviews-new/bulk-approve', isAuth, isAdmin, adminReviewController.bulkApprove);

// Route xóa hàng loạt
router.post('/reviews-new/bulk-delete', isAuth, isAdmin, adminReviewController.bulkDelete);

// Route lấy thống kê reviews
router.get('/reviews-new/stats', isAuth, isAdmin, adminReviewController.getReviewStats);

// Route lấy reviews theo sản phẩm
router.get('/reviews-new/product/:productId', isAuth, isAdmin, adminReviewController.getReviewsByProduct);

// Route lấy reviews theo user
router.get('/reviews-new/user/:userId', isAuth, isAdmin, adminReviewController.getReviewsByUser);

module.exports = router;

