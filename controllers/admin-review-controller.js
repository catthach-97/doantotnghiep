const Review = require('../models/review');
const Product = require('../models/product');
const User = require('../models/user');

// Lấy danh sách tất cả reviews với filter và phân trang
exports.getReviews = async (req, res, next) => {
    try {
        console.log('📝 Starting getReviews controller');
        console.log('📝 Request URL:', req.url);
        console.log('📝 Request method:', req.method);
        console.log('📝 Session user:', req.session.user);

        const {
            search = '',
            product = '',
            rating = '',
            status = '',
            dateFrom = '',
            dateTo = '',
            page = 1,
            limit = 5
        } = req.query;

        // Tạo filters cho search
        const filters = {
            search,
            rating: rating || null,
            approved: status === 'approved' ? true : status === 'pending' ? false : null,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            page: parseInt(page),
            limit: parseInt(limit)
        };

        // Lấy reviews với filter
        const result = await Review.searchReviews(filters);

        // Lấy thống kê
        const stats = await Review.getReviewStats();

        console.log('📝 Reviews found:', result.reviews.length);

        res.render('admin/reviews-full-page', {
            reviews: result.reviews,
            pageTitle: 'Quản lý đánh giá | Admin',
            path: '/admin/reviews',
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            totalReviews: result.totalReviews,
            search: search,
            product: product,
            rating: rating,
            status: status,
            dateFrom: dateFrom,
            dateTo: dateTo,
            stats: stats,
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null
        });
    } catch (err) {
        console.error('🚨 Error in getReviews:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi | Admin',
            path: '/error',
            error: 'Không thể tải danh sách đánh giá',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

// Lấy chi tiết review
exports.getReviewDetail = async (req, res, next) => {
    try {
        console.log('📝 Starting getReviewDetail controller');
        console.log('📝 Request params:', req.params);
        const { reviewId } = req.params;

        console.log('📝 Looking for review:', reviewId);
        const review = await Review.findById(reviewId);
        console.log('📝 Found review:', review ? 'Yes' : 'No');

        if (!review) {
            console.log('📝 Review not found');
            return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
        }

        // Lấy thông tin sản phẩm
        const product = await Product.findById(review.productId);
        console.log('📝 Found product:', product ? 'Yes' : 'No');

        // Lấy thông tin user
        const user = await User.findById(review.userId);
        console.log('📝 Found user:', user ? 'Yes' : 'No');

        const responseData = {
            success: true,
            review: {
                ...review,
                productTitle: product ? product.title : 'N/A',
                productImage: product ? product.imageUrl : 'N/A',
                productBrand: product ? product.brand : 'N/A',
                userEmail: user ? user.email : review.userEmail || 'N/A',
                userPhone: user ? user.phone : 'N/A'
            }
        };
        console.log('📝 Sending response:', responseData);

        res.json(responseData);
    } catch (err) {
        console.error('🚨 Error in getReviewDetail:', err);
        console.error('🚨 Error stack:', err.stack);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết đánh giá: ' + err.message });
    }
};

// Cập nhật trạng thái duyệt review
exports.updateReviewStatus = async (req, res, next) => {
    try {
        console.log('📝 Starting updateReviewStatus controller');
        console.log('📝 Request body:', req.body);
        const { reviewId, approved } = req.body;

        console.log('📝 Validating input:');
        console.log('- Review ID:', reviewId);
        console.log('- Approved:', approved);

        if (!reviewId || approved === undefined) {
            console.log('📝 Missing required fields');
            return res.status(400).json({ success: false, message: 'Thiếu thông tin cần thiết' });
        }

        // Verify review exists first
        const review = await Review.findById(reviewId);
        console.log('📝 Review found:', review ? 'Yes' : 'No');

        if (!review) {
            console.log('📝 Review not found');
            return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
        }

        const result = await Review.updateApprovalStatus(reviewId, approved === 'true');
        console.log('📝 Update result:', result);

        if (result.modifiedCount > 0) {
            console.log('📝 Update successful');
            res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
        } else {
            console.log('📝 No changes made');
            res.json({ success: false, message: 'Không có thay đổi nào được thực hiện' });
        }
    } catch (err) {
        console.error('🚨 Error in updateReviewStatus:', err);
        console.error('🚨 Error stack:', err.stack);
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái: ' + err.message });
    }
};

// Xóa review
exports.deleteReview = async (req, res, next) => {
    try {
        console.log('📝 Starting deleteReview controller');
        console.log('📝 Request body:', req.body);
        const { reviewId } = req.body;

        console.log('📝 Validating input:');
        console.log('- Review ID:', reviewId);

        if (!reviewId) {
            console.log('📝 Missing required fields');
            return res.status(400).json({ success: false, message: 'Thiếu thông tin cần thiết' });
        }

        // Verify review exists first
        const review = await Review.findById(reviewId);
        console.log('📝 Review found:', review ? 'Yes' : 'No');

        if (!review) {
            console.log('📝 Review not found');
            return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
        }

        const result = await Review.deleteById(reviewId);
        console.log('📝 Delete result:', result);

        if (result && result.deletedCount > 0) {
            console.log('📝 Delete successful');
            res.json({ success: true, message: 'Xóa đánh giá thành công' });
        } else {
            console.log('📝 No changes made');
            res.json({ success: false, message: 'Không thể xóa đánh giá' });
        }
    } catch (err) {
        console.error('🚨 Error in deleteReview:', err);
        console.error('🚨 Error stack:', err.stack);
        res.status(500).json({ success: false, message: 'Lỗi khi xóa đánh giá: ' + err.message });
    }
};

// Thêm phản hồi admin
exports.addAdminResponse = async (req, res, next) => {
    try {
        console.log('📝 Starting addAdminResponse controller');
        console.log('📝 Request body:', req.body);
        const { reviewId, adminResponse } = req.body;

        console.log('📝 Validating input:');
        console.log('- Review ID:', reviewId);
        console.log('- Admin Response:', adminResponse);

        if (!reviewId || !adminResponse) {
            console.log('📝 Missing required fields');
            return res.status(400).json({ success: false, message: 'Thiếu thông tin cần thiết' });
        }

        // Verify review exists first
        const review = await Review.findById(reviewId);
        console.log('📝 Review found:', review ? 'Yes' : 'No');

        if (!review) {
            console.log('📝 Review not found');
            return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
        }

        const result = await Review.addAdminResponse(reviewId, adminResponse);
        console.log('📝 Add response result:', result);

        if (result.modifiedCount > 0) {
            console.log('📝 Add response successful');
            res.json({ success: true, message: 'Thêm phản hồi thành công' });
        } else {
            console.log('📝 No changes made');
            res.json({ success: false, message: 'Không thể thêm phản hồi' });
        }
    } catch (err) {
        console.error('🚨 Error in addAdminResponse:', err);
        console.error('🚨 Error stack:', err.stack);
        res.status(500).json({ success: false, message: 'Lỗi khi thêm phản hồi: ' + err.message });
    }
};

// Duyệt hàng loạt
exports.bulkApprove = async (req, res, next) => {
    try {
        console.log('📝 Starting bulkApprove controller');
        console.log('📝 Request body:', req.body);
        const { reviewIds, approved } = req.body;

        console.log('📝 Validating input:');
        console.log('- Review IDs:', reviewIds);
        console.log('- Approved:', approved);

        if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
            console.log('📝 Missing or invalid review IDs');
            return res.status(400).json({ success: false, message: 'Thiếu danh sách đánh giá' });
        }

        const results = [];
        for (const reviewId of reviewIds) {
            try {
                const result = await Review.updateApprovalStatus(reviewId, approved === 'true');
                results.push({ reviewId, success: result.modifiedCount > 0 });
            } catch (err) {
                console.error(`Error updating review ${reviewId}:`, err);
                results.push({ reviewId, success: false, error: err.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log('📝 Bulk update result:', { successCount, totalCount: reviewIds.length });

        res.json({
            success: true,
            message: `Đã cập nhật ${successCount}/${reviewIds.length} đánh giá`,
            results: results
        });
    } catch (err) {
        console.error('🚨 Error in bulkApprove:', err);
        console.error('🚨 Error stack:', err.stack);
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật hàng loạt: ' + err.message });
    }
};

// Xóa hàng loạt
exports.bulkDelete = async (req, res, next) => {
    try {
        console.log('📝 Starting bulkDelete controller');
        console.log('📝 Request body:', req.body);
        const { reviewIds } = req.body;

        console.log('📝 Validating input:');
        console.log('- Review IDs:', reviewIds);

        if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
            console.log('📝 Missing or invalid review IDs');
            return res.status(400).json({ success: false, message: 'Thiếu danh sách đánh giá' });
        }

        const results = [];
        for (const reviewId of reviewIds) {
            try {
                const result = await Review.deleteById(reviewId);
                results.push({ reviewId, success: result.deletedCount > 0 });
            } catch (err) {
                console.error(`Error deleting review ${reviewId}:`, err);
                results.push({ reviewId, success: false, error: err.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log('📝 Bulk delete result:', { successCount, totalCount: reviewIds.length });

        res.json({
            success: true,
            message: `Đã xóa ${successCount}/${reviewIds.length} đánh giá`,
            results: results
        });
    } catch (err) {
        console.error('🚨 Error in bulkDelete:', err);
        console.error('🚨 Error stack:', err.stack);
        res.status(500).json({ success: false, message: 'Lỗi khi xóa hàng loạt: ' + err.message });
    }
};

// Lấy thống kê reviews
exports.getReviewStats = async (req, res, next) => {
    try {
        console.log('📝 Starting getReviewStats controller');
        
        const stats = await Review.getReviewStats();
        console.log('📝 Stats:', stats);

        res.json({
            success: true,
            stats: stats
        });
    } catch (err) {
        console.error('🚨 Error in getReviewStats:', err);
        console.error('🚨 Error stack:', err.stack);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy thống kê: ' + err.message });
    }
};

// Lấy reviews theo sản phẩm
exports.getReviewsByProduct = async (req, res, next) => {
    try {
        console.log('📝 Starting getReviewsByProduct controller');
        console.log('📝 Request params:', req.params);
        const { productId } = req.params;

        console.log('📝 Product ID:', productId);
        const reviews = await Review.getReviewsByProduct(productId);
        console.log('📝 Reviews found:', reviews.length);

        res.json({
            success: true,
            reviews: reviews
        });
    } catch (err) {
        console.error('🚨 Error in getReviewsByProduct:', err);
        console.error('🚨 Error stack:', err.stack);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy đánh giá sản phẩm: ' + err.message });
    }
};

// Lấy reviews theo user
exports.getReviewsByUser = async (req, res, next) => {
    try {
        console.log('📝 Starting getReviewsByUser controller');
        console.log('📝 Request params:', req.params);
        const { userId } = req.params;

        console.log('📝 User ID:', userId);
        const reviews = await Review.getReviewsByUser(userId);
        console.log('📝 Reviews found:', reviews.length);

        res.json({
            success: true,
            reviews: reviews
        });
    } catch (err) {
        console.error('🚨 Error in getReviewsByUser:', err);
        console.error('🚨 Error stack:', err.stack);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy đánh giá user: ' + err.message });
    }
};
