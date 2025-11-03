const Product = require('../models/product-mongoose');
const Order = require('../models/order-mongoose');
const User = require('../models/user-mongoose');
const Category = require('../models/category');
const Review = require('../models/review-mongoose');
const Slide = require('../models/slide');

const { sendOrderConfirmation, sendNewOrderNotification } = require('../util/email');
const mongodb = require('mongodb'); // 👈 Thêm dòng này vào đây
const fs = require('fs');
const { generateOrderPDF } = require('../util/pdf'); // Thêm import này
const mongoose = require('mongoose'); // Thêm import này
const nodemailer = require('nodemailer');


exports.getProducts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8; // Hiển thị 8 sản phẩm mỗi trang
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const brand = req.query.brand || '';
        const sort = req.query.sort || '';

        // Build filter object
        let filter = {};
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (category) {
            // Tìm danh mục khớp với category parameter
            const matchedCategory = await Category.findOne({
                $or: [
                    { slug: category },
                    { name: category },
                    { slug: category.toLowerCase() },
                    { name: category.toLowerCase() }
                ]
            });
            
            if (matchedCategory) {
                // Tìm sản phẩm khớp với danh mục (linh hoạt hơn)
                filter.$or = [
                    { category: matchedCategory.slug },
                    { category: matchedCategory.name },
                    { category: matchedCategory.slug.toLowerCase() },
                    { category: matchedCategory.name.toLowerCase() }
                ];
            } else {
                // Fallback: tìm trực tiếp theo category parameter
                filter.$or = [
                    { category: category },
                    { category: category.toLowerCase() }
                ];
            }
        }
        if (brand) {
            filter.brand = { $regex: new RegExp(brand, 'i') };
        }

        // Tạm thời sử dụng cách đơn giản để tránh lỗi
        let sortObj = {};
        switch (sort) {
            case 'price_asc':
                sortObj = { price: 1 };
                break;
            case 'price_desc':
                sortObj = { price: -1 };
                break;
            case 'name_asc':
                sortObj = { title: 1 };
                break;
            case 'name_desc':
                sortObj = { title: -1 };
                break;
            default:
                sortObj = { createdAt: -1 };
        }

        // Lấy sản phẩm với phân trang
        const products = await Product.find(filter)
            .sort(sortObj)
            .skip(skip)
            .limit(limit);
        
        // Lấy tổng số sản phẩm cho phân trang
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        // Tính đánh giá cho từng sản phẩm (tối ưu hơn)
        const productIds = products.map(p => p._id);
        const reviews = await Review.find({ 
            productId: { $in: productIds }, 
            approved: true 
        });
        
        // Nhóm reviews theo productId
        const reviewsByProduct = {};
        reviews.forEach(review => {
            if (!reviewsByProduct[review.productId]) {
                reviewsByProduct[review.productId] = [];
            }
            reviewsByProduct[review.productId].push(review);
        });

        // Thêm thông tin đánh giá vào sản phẩm
        products.forEach(product => {
            const productReviews = reviewsByProduct[product._id.toString()] || [];
            product.reviewCount = productReviews.length;
            if (productReviews.length > 0) {
                product.avgRating = Math.round((productReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / productReviews.length) * 10) / 10;
            } else {
                product.avgRating = 0;
            }
        });

        // Tối ưu: Chạy song song các query không phụ thuộc
        const [userData, categories] = await Promise.all([
            req.session.user && req.session.user._id ? User.findById(req.session.user._id) : null,
            Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 })
        ]);

        // Xử lý dữ liệu user
        let cartCount = 0;
        let favorites = [];
        if (userData) {
            if (userData.cart && Array.isArray(userData.cart.items)) {
                cartCount = userData.cart.items.reduce((sum, item) => sum + item.quantity, 0);
            }
            if (Array.isArray(userData.favorites)) {
                favorites = userData.favorites.map(id => id.toString());
            }
        }
        
        res.render('shop/product-list', {
            products: products,
            categories: categories,
            pageTitle: 'Sản phẩm - Shoe Store',
            path: '/products',
            currentPage: page,
            totalPages: totalPages,
            totalProducts: totalProducts,
            search: search,
            category: category,
            sort: sort,
            hasProducts: products.length > 0,
            activeShop: true,
            productCSS: true,
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null,
            cartCount,
            favorites, // truyền biến favorites
            request: req
        });
    } catch (err) {
        console.log(err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi | PetShop',
            path: '/error',
            error: 'Không thể tải danh sách sản phẩm',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.getProduct = async (req, res, next) => {
    try {
        console.log('🔍 Starting getProduct controller');
        const prodId = req.params.productId;
        console.log('🔍 Product ID:', prodId);
        
        const product = await Product.findById(prodId);
        console.log('🔍 Product found:', !!product);

        if (!product) {
            console.log('🔍 Product not found');
            return res.status(404).render('404', {
                pageTitle: 'Không tìm thấy sản phẩm | Shoe Store',
                path: '/404',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        // Lấy các sản phẩm liên quan (cùng loại, thương hiệu hoặc giá tương đương)
        console.log('🔍 Fetching related products...');
        const allProducts = await Product.find();
        
        // Lọc sản phẩm liên quan theo thứ tự ưu tiên
        let relatedProducts = allProducts.filter(p => p._id.toString() !== product._id.toString());
        
        // Ưu tiên 1: Cùng category và brand
        let sameCategoryBrand = relatedProducts.filter(p => 
            p.category === product.category && p.brand === product.brand
        );
        
        // Ưu tiên 2: Cùng category
        let sameCategory = relatedProducts.filter(p => 
            p.category === product.category && p.brand !== product.brand
        );
        
        // Ưu tiên 3: Cùng brand
        let sameBrand = relatedProducts.filter(p => 
            p.brand === product.brand && p.category !== product.category
        );
        
        // Ưu tiên 4: Giá tương đương (±20%)
        let similarPrice = relatedProducts.filter(p => {
            const priceDiff = Math.abs(p.price - product.price) / product.price;
            return priceDiff <= 0.2 && p.category !== product.category && p.brand !== product.brand;
        });
        
        // Kết hợp theo thứ tự ưu tiên
        relatedProducts = [
            ...sameCategoryBrand,
            ...sameCategory,
            ...sameBrand,
            ...similarPrice
        ].slice(0, 4);
        
        console.log('🔍 Related products found:', relatedProducts.length);
        console.log('🔍 Same category & brand:', sameCategoryBrand.length);
        console.log('🔍 Same category:', sameCategory.length);
        console.log('🔍 Same brand:', sameBrand.length);
        console.log('🔍 Similar price:', similarPrice.length);
        console.log('🔍 Current product category:', product.category);
        console.log('🔍 Current product brand:', product.brand);
        console.log('🔍 Current product price:', product.price);
        console.log('🔍 Total products in database:', allProducts.length);

        let favorites = [];
        if (req.session.user && req.session.user._id) {
            try {
                const userData = await User.findById(req.session.user._id);
                if (userData && Array.isArray(userData.favorites)) {
                    favorites = userData.favorites.map(id => id.toString());
                }
            } catch (userErr) {
                console.error('🔍 Error fetching user favorites:', userErr);
            }
        }
        
        // Lấy reviews từ collection mới
        console.log('🔍 Fetching reviews for product...');
        const reviews = await Review.find({ productId: prodId });
        console.log('🔍 Reviews found:', reviews.length);

        // Lấy categories cho footer
        let categories = [];
        try {
            categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
        } catch (catErr) {
            console.error('🔍 Error fetching categories:', catErr);
        }

        // Lấy cart count
        let cartCount = 0;
        if (req.session.user && req.session.user._id) {
            try {
                const userData = await User.findById(req.session.user._id);
                if (userData && userData.cart && Array.isArray(userData.cart.items)) {
                    cartCount = userData.cart.items.reduce((sum, item) => sum + item.quantity, 0);
                }
            } catch (cartErr) {
                console.error('🔍 Error fetching cart count:', cartErr);
            }
        }

        // Tính rating trung bình từ các review đã duyệt
        const approvedReviews = reviews.filter(r => r.approved === true);
        let avgRating = 0;
        if (approvedReviews.length > 0) {
            avgRating = approvedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / approvedReviews.length;
            avgRating = Math.round(avgRating * 10) / 10;
        }
        
        console.log('🔍 Rendering product detail...');
        res.render('shop/product-detail', {
            product: product,
            pageTitle: `${product.title} | Shoe Store`,
            path: '/product-detail', // Thay đổi path để không active "Sản phẩm"
            relatedProducts: relatedProducts,
            hasRelatedProducts: relatedProducts.length > 0,
            activeShop: true,
            productCSS: true,
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null,
            favorites, // truyền biến favorites
            reviews,
            avgRating,
            approvedReviews,
            categories,
            cartCount,
            request: req
        });
        console.log('🔍 Product detail rendered successfully');
    } catch (err) {
        console.error('🚨 Error in getProduct:', err);
        console.error('🚨 Error name:', err.name);
        console.error('🚨 Error message:', err.message);
        console.error('🚨 Error stack:', err.stack);
        res.status(500).render('error', {
            pageTitle: 'Lỗi | Shoe Store',
            path: '/error',
            error: 'Không thể tải thông tin sản phẩm',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.getIndex = async (req, res, next) => {
    try {
        console.log('🏠 Starting getIndex controller');
        
        // Get featured products (latest 4 products) - sắp xếp theo ngày tạo mới nhất
        console.log('🏠 Fetching featured products...');
        const allProducts = await Product.find();
        const featuredProducts = allProducts
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 4);
        console.log('🏠 Featured products found:', featuredProducts.length);

        // Lấy danh mục cho navigation (chỉ 4 danh mục đầu tiên)
        console.log('🏠 Fetching categories...');
        let categories = [];
        try {
            categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).limit(4);
            console.log('🏠 Categories found:', categories.length);
        } catch (categoryErr) {
            console.error('🏠 Error fetching categories:', categoryErr);
            // Tiếp tục với categories rỗng nếu có lỗi
            categories = [];
        }

        // Lấy slides cho banner
        console.log('🏠 Fetching slides...');
        let slides = [];
        try {
            const now = new Date();
            console.log('🏠 Current time:', now);
            
            // Lấy tất cả slides để debug
            const allSlides = await Slide.find({});
            console.log('🏠 All slides in database:', allSlides.length);
            allSlides.forEach((slide, index) => {
                console.log(`🏠 Slide ${index + 1}:`, {
                    id: slide._id,
                    title: slide.title,
                    isActive: slide.isActive,
                    startDate: slide.startDate,
                    endDate: slide.endDate,
                    image: slide.image
                });
            });
            
            slides = await Slide.find({
                isActive: true
                // Tạm thời bỏ qua điều kiện ngày để test
                // startDate: { $lte: now },
                // $or: [
                //     { endDate: { $gte: now } },
                //     { endDate: { $exists: false } }
                // ]
            }).sort({ sortOrder: 1, createdAt: -1 });
            console.log('🏠 Active slides found:', slides.length);
            slides.forEach((slide, index) => {
                console.log(`🏠 Active slide ${index + 1}:`, {
                    title: slide.title,
                    image: slide.image
                });
            });
        } catch (slideErr) {
            console.error('🏠 Error fetching slides:', slideErr);
            // Tiếp tục với slides rỗng nếu có lỗi
            slides = [];
        }

        let cartCount = 0;
        if (req.session.user && req.session.user._id) {
            try {
                const userData = await User.findById(req.session.user._id);
                if (userData && userData.cart && Array.isArray(userData.cart.items)) {
                    cartCount = userData.cart.items.reduce((sum, item) => sum + item.quantity, 0);
                }
            } catch (userErr) {
                console.error('🏠 Error fetching user data:', userErr);
                // Tiếp tục với cartCount = 0
            }
        }
        
        let signupSuccess = false;
        if (req.session.signupSuccess) {
            signupSuccess = true;
            delete req.session.signupSuccess;
        }
        
        let favorites = [];
        if (req.session.user && req.session.user._id) {
            try {
                const userData = await User.findById(req.session.user._id);
                if (userData && Array.isArray(userData.favorites)) {
                    favorites = userData.favorites.map(id => id.toString());
                }
            } catch (userErr) {
                console.error('🏠 Error fetching user favorites:', userErr);
                // Tiếp tục với favorites rỗng
            }
        }
        
        console.log('🏠 Rendering homepage...');
        
        // Fallback nếu không có sản phẩm
        if (!featuredProducts || featuredProducts.length === 0) {
            console.log('🏠 No products found, using fallback');
            return res.render('shop/index', {
                featuredProducts: [],
                categories: categories,
                pageTitle: 'Shoe Store - Cửa hàng giày dép',
                path: '/',
                hasProducts: false,
                activeShop: true,
                productCSS: true,
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin',
                user: req.session.user || null,
                cartCount,
                signupSuccess,
                favorites,
                request: req
            });
        }
        
        res.render('shop/index-new', {
            featuredProducts: featuredProducts,
            categories: categories,
            slides: slides,
            pageTitle: 'Shoe Store - Cửa hàng giày dép',
            path: '/',
            hasProducts: featuredProducts.length > 0,
            activeShop: true,
            productCSS: true,
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null,
            cartCount,
            signupSuccess,
            favorites, // truyền biến favorites
            request: req
        });
        console.log('🏠 Homepage rendered successfully');
    } catch (err) {
        console.error('🚨 Error in getIndex:', err);
        console.error('🚨 Error name:', err.name);
        console.error('🚨 Error message:', err.message);
        console.error('🚨 Error stack:', err.stack);
        
        // Fallback đơn giản nếu có lỗi
        try {
            res.render('shop/index', {
                featuredProducts: [],
                categories: [],
                pageTitle: 'Shoe Store - Cửa hàng giày dép',
                path: '/',
                hasProducts: false,
                activeShop: true,
                productCSS: true,
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin',
                user: req.session.user || null,
                cartCount: 0,
                signupSuccess: false,
                favorites: [],
                request: req
            });
        } catch (renderErr) {
            console.error('🚨 Error rendering fallback:', renderErr);
            res.status(500).json({
                error: 'Không thể tải trang chủ',
                message: err.message,
                timestamp: new Date().toISOString()
            });
        }
    }
};


exports.getCart = async (req, res, next) => {
    try {
        // Sử dụng giỏ hàng session cho tất cả người dùng
        const cart = req.cart.getCart();
        
        // Sử dụng dữ liệu từ session để tránh lỗi tính toán
        const updatedProducts = cart.items || [];
        
        // Debug: Log thông tin từng sản phẩm
        console.log('🔍 Cart items debug:');
        updatedProducts.forEach((item, index) => {
            console.log(`Item ${index + 1}:`, {
                productId: item.productId,
                title: item.title,
                price: item.price,
                quantity: item.quantity,
                subtotal: item.price * item.quantity
            });
        });

        // Tính lại tổng giá từ dữ liệu session để đảm bảo chính xác
        const calculatedSubtotal = updatedProducts.reduce((total, item) => {
            return total + (parseFloat(item.price) * parseInt(item.quantity));
        }, 0);
        
        // Sử dụng giá đã tính toán hoặc giá từ session
        const subtotal = calculatedSubtotal || cart.totalPrice || 0;
        const shippingFee = subtotal >= 500000 ? 0 : 30000;
        const totalAmount = subtotal + shippingFee;
        
        // Debug: Log tổng giá trị
        console.log('🔍 Cart debug:', {
            calculatedSubtotal: calculatedSubtotal,
            sessionTotalPrice: cart.totalPrice,
            subtotal: subtotal,
            shippingFee: shippingFee,
            totalAmount: totalAmount,
            itemsCount: updatedProducts.length
        });

        res.render('shop/cart', {
            path: '/cart',
            pageTitle: 'Giỏ hàng của bạn',
            products: updatedProducts,
            totalPrice: subtotal,
            shippingFee: shippingFee,
            totalAmount: totalAmount,
            activeCart: true,
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null
        });
    } catch (err) {
        console.error('Lỗi khi tải giỏ hàng:\n', err.stack || err);
        res.status(500).render('error', {
            pageTitle: 'Error',
            path: '/error',
            error: 'Không thể tải giỏ hàng',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.postCart = async (req, res, next) => {
    try {
        const prodId = req.body.productId;
        const quantity = parseInt(req.body.quantity) || 1;

        if (!prodId) {
            return res.status(400).render('error', {
                pageTitle: 'Error',
                path: '/error',
                error: 'Không có sản phẩm được chọn',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        try {
            // Sử dụng giỏ hàng session
            const cart = await req.cart.addToCart(prodId, quantity);
            
            // Check if this is an AJAX request
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    message: 'Đã thêm sản phẩm vào giỏ hàng',
                    cartCount: req.cart.getItemCount()
                });
            }
            
            res.redirect('/cart');
        } catch (err) {
            // Nếu lỗi liên quan đến số lượng tồn kho, hiển thị thông báo lỗi
            if (err.message.includes('Số lượng vượt quá tồn kho') || err.message.includes('Không tìm thấy sản phẩm')) {
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    return res.status(400).json({
                        success: false,
                        message: err.message
                    });
                }
                return res.status(400).render('error', {
                    pageTitle: 'Lỗi',
                    path: '/error',
                    error: err.message,
                    isAuthenticated: req.session.user ? true : false,
                    isAdmin: req.session.user && req.session.user.role === 'admin'
                });
            }
            throw err;
        }
    } catch (err) {
        console.error('Lỗi khi thêm vào giỏ hàng:\n', err.stack || err);
        res.status(500).render('error', {
            pageTitle: 'Error',
            path: '/error',
            error: 'Không thể thêm sản phẩm vào giỏ hàng',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.postCartDeleteProduct = async (req, res, next) => {
    try {
        console.log('🗑️ Starting postCartDeleteProduct');
        console.log('🗑️ Request body:', req.body);

        const prodId = req.body.productId;
        console.log('🗑️ Product ID to delete:', prodId);

        if (!prodId) {
            console.log('🗑️ No product ID provided');
            return res.status(400).render('error', {
                pageTitle: 'Error',
                path: '/error',
                error: 'Không có sản phẩm được chọn',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }
        
        // Sử dụng giỏ hàng session
        const result = req.cart.removeFromCart(prodId);
        console.log('🗑️ Cart after removal:', result);
        
        res.redirect('/cart');
    } catch (err) {
        console.error('🗑️ Error in postCartDeleteProduct:', err);
        res.status(500).render('error', {
            pageTitle: 'Error',
            path: '/error',
            error: 'Không thể xóa sản phẩm khỏi giỏ hàng',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.postCartUpdateQuantity = async (req, res, next) => {
    try {
        const prodId = req.body.productId;
        const quantity = parseInt(req.body.quantity) || 1;

        console.log('Cập nhật số lượng:', prodId, '->', quantity);

        if (!prodId) {
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(400).json({
                    success: false,
                    message: 'Không có sản phẩm được chọn'
                });
            }
            return res.status(400).render('error', {
                pageTitle: 'Error',
                path: '/error',
                error: 'Không có sản phẩm được chọn',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        try {
            // Sử dụng giỏ hàng session
            await req.cart.updateQuantity(prodId, quantity);
            
            // Cập nhật lại tổng giá sau khi thay đổi số lượng
            req.cart.updateTotalPrice();
            
            console.log('Cập nhật thành công');
            
            // Lưu session trước khi redirect
            await req.session.save();
            
            // Kiểm tra nếu là AJAX request
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    message: 'Cập nhật số lượng thành công',
                    cart: req.session.cart,
                    totalPrice: req.session.cart.totalPrice
                });
            }
            
            // Thêm timestamp để tránh cache
            const timestamp = Date.now();
            res.redirect(`/cart?t=${timestamp}`);
        } catch (err) {
            // Nếu lỗi liên quan đến số lượng tồn kho
            if (err.message.includes('Số lượng vượt quá tồn kho') || err.message.includes('Không tìm thấy sản phẩm')) {
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    return res.status(400).json({
                        success: false,
                        message: err.message
                    });
                }
                return res.status(400).render('error', {
                    pageTitle: 'Lỗi',
                    path: '/error',
                    error: err.message,
                    isAuthenticated: req.session.user ? true : false,
                    isAdmin: req.session.user && req.session.user.role === 'admin'
                });
            }
            throw err;
        }
    } catch (err) {
        console.error('Lỗi khi cập nhật số lượng:\n', err.stack || err);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                message: 'Không thể cập nhật số lượng sản phẩm'
            });
        }
        res.status(500).render('error', {
            pageTitle: 'Error',
            path: '/error',
            error: 'Không thể cập nhật số lượng sản phẩm',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

// Xóa tất cả sản phẩm khỏi giỏ hàng
exports.postCartClearAll = async (req, res, next) => {
    try {
        console.log('🧹 Clearing all items from cart');
        
        // Xóa tất cả sản phẩm khỏi session cart
        req.cart.clearCart();
        await req.session.save();
        
        console.log('✅ All items cleared from cart');
        
        // Kiểm tra nếu là AJAX request
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({
                success: true,
                message: 'Đã xóa tất cả sản phẩm khỏi giỏ hàng',
                cart: req.session.cart,
                totalPrice: 0
            });
        }
        
        // Redirect về trang giỏ hàng
        res.redirect('/cart');
    } catch (err) {
        console.error('Lỗi khi xóa tất cả sản phẩm:', err);
        
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                message: 'Không thể xóa tất cả sản phẩm khỏi giỏ hàng'
            });
        }
        
        res.status(500).render('error', {
            pageTitle: 'Error',
            path: '/error',
            error: 'Không thể xóa tất cả sản phẩm khỏi giỏ hàng',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.postOrder = async (req, res, next) => {
  try {
    console.log('🛒 Starting postOrder controller');
    console.log('🛒 Request body:', req.body);
    
    if (!req.session.user || !req.session.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để đặt hàng'
      });
    }

    const { paymentMethod, name, phone, email, address, note } = req.body;
    
    console.log('🛒 Shipping info:', { name, phone, email, address });
    
    // Validate payment method
    const validPaymentMethods = ['cod', 'vnpay'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán không hợp lệ'
      });
    }

    const userData = await User.findById(req.session.user._id);
    if (!userData) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }
    
    // Sử dụng userData trực tiếp vì đã là Mongoose document
    const user = userData;
    
    // Lấy giỏ hàng từ session (dùng cho cả user và guest)
    const cart = req.cart.getCart();
    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Giỏ hàng trống'
      });
    }
    const products = cart.items.map(item => {
      return {
        productId: item.productId,
        quantity: item.quantity,
        title: item.title,
        price: item.price,
        imageUrl: item.imageUrl
      };
    });
    // Calculate total
    const subtotal = products.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
    const shippingFee = subtotal >= 500000 ? 0 : 30000; // Phí vận chuyển động
    const totalAmount = subtotal + shippingFee;
    // Tạo order theo schema mới
    const order = new Order({
      userId: req.session.user._id,
      items: products.map(product => ({
        productId: product.productId,
        quantity: product.quantity,
        price: product.price
      })),
      totalPrice: subtotal,
      shippingInfo: {
        name: name,
        phone: phone,
        email: email || req.session.user.email,
        address: address,
        city: 'Hồ Chí Minh',
        district: 'Quận 1',
        ward: 'Phường Bến Nghé'
      },
      paymentMethod: paymentMethod,
      status: 'pending',
      paymentStatus: 'pending'
    });
    
    const savedOrder = await order.save();
    
    // Xóa giỏ hàng khỏi session và database
    await req.cart.clearCart();
    await req.session.save(); // Đảm bảo session được lưu
    
    console.log('🛒 Order created with shipping info:', order.shippingInfo);
    
    console.log('🛒 Order saved successfully:', savedOrder);
    console.log('🛒 Saved order ID:', savedOrder.insertedId || savedOrder._id);

    // Handle different payment methods
    if (paymentMethod === 'cod') {
      // COD - Cash on Delivery
      await Order.findByIdAndUpdate(savedOrder._id, { 
        status: 'confirmed',
        paymentStatus: 'pending'
      });
      
      // Gửi email xác nhận đơn hàng cho khách
      try {
        await sendOrderConfirmation({
          ...order,
          _id: savedOrder.insertedId || savedOrder._id
        }, user);
      } catch (err) {
        console.error('❌ Lỗi khi gửi email xác nhận đơn hàng COD:', err);
      }
      // KHÔNG trừ kho ở đây!
      return res.json({
        success: true,
        message: 'Đơn hàng đã được tạo thành công! Bạn sẽ thanh toán khi nhận hàng.',
        orderId: savedOrder._id
      });
    } else {
      // Invalid payment method
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán không hợp lệ'
      });
    }
  } catch (error) {
    console.error('🚨 Error creating order:', error);
    console.error('🚨 Error name:', error.name);
    console.error('🚨 Error message:', error.message);
    console.error('🚨 Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi tạo đơn hàng: ' + error.message
    });
  }
};

exports.getOrders = async (req, res, next) => {
    try {
        console.log('🛒 Starting getOrders controller');
        console.log('🛒 Session user:', req.session.user);
        
        if (!req.session.user || !req.session.user._id) {
            console.log('🛒 No session user, redirecting');
            return res.redirect('/create-default-user');
        }

        console.log('🛒 Finding user by ID:', req.session.user._id);
        const user = await User.findById(req.session.user._id);

        if (!user) {
            console.log('🛒 User not found, redirecting');
            return res.redirect('/create-default-user');
        }

        console.log('🔍 DEBUG - Getting orders for user._id:', user._id, 'Type:', typeof user._id);
        console.log('🔍 DEBUG - Session user._id:', req.session.user._id, 'Type:', typeof req.session.user._id);
        
        console.log('🛒 Finding orders for user');
        const orders = await Order.find({ userId: user._id })
            .populate({
                path: 'items.productId',
                model: 'Product',
                select: 'title sku imageUrl price'
            })
            .sort({ createdAt: -1 });
        console.log('🛒 Found orders:', orders.length);
        
        // Lấy thông tin sản phẩm cho từng đơn hàng (đã được populate)
        for (let order of orders) {
            if (order.items && Array.isArray(order.items)) {
                for (let item of order.items) {
                    console.log('🔍 Processing order item:', {
                        productId: item.productId,
                        title: item.title,
                        sku: item.sku,
                        imageUrl: item.imageUrl,
                        price: item.price,
                        quantity: item.quantity
                    });
                    
                    // Kiểm tra nếu productId đã được populate
                    if (item.productId && typeof item.productId === 'object') {
                        console.log('✅ Product already populated:', {
                            title: item.productId.title,
                            sku: item.productId.sku,
                            imageUrl: item.productId.imageUrl
                        });
                        // Sử dụng dữ liệu đã populate
                        item.title = item.productId.title || 'Sản phẩm không xác định';
                        item.sku = item.productId.sku || 'N/A';
                        item.imageUrl = item.productId.imageUrl || '/images/default-product.jpg';
                    } else if (item.productId) {
                        // Nếu productId là string, thử lấy từ database
                        try {
                            console.log('🔍 Looking for product with ID:', item.productId);
                            const product = await Product.findById(item.productId);
                            if (product) {
                                item.title = product.title;
                                item.sku = product.sku;
                                item.imageUrl = product.imageUrl;
                                console.log('✅ Product found:', {
                                    title: product.title,
                                    sku: product.sku,
                                    imageUrl: product.imageUrl
                                });
                            } else {
                                console.log('❌ Product not found for ID:', item.productId);
                                // Fallback values
                                item.title = item.title || 'Sản phẩm không xác định';
                                item.sku = item.sku || 'N/A';
                                item.imageUrl = item.imageUrl || '/images/default-product.jpg';
                            }
                        } catch (err) {
                            console.error('❌ Lỗi khi lấy thông tin sản phẩm:', err);
                            // Fallback values
                            item.title = item.title || 'Sản phẩm không xác định';
                            item.sku = item.sku || 'N/A';
                            item.imageUrl = item.imageUrl || '/images/default-product.jpg';
                        }
                    } else {
                        console.log('❌ No productId found for item:', item);
                        // Fallback values
                        item.title = item.title || 'Sản phẩm không xác định';
                        item.sku = item.sku || 'N/A';
                        item.imageUrl = item.imageUrl || '/images/default-product.jpg';
                    }
                }
            }
        }
        
        // Debug: Log first order structure if exists
        if (orders.length > 0) {
            console.log('🔍 DEBUG - First order structure:', JSON.stringify(orders[0], null, 2));
        }

        // Lấy categories cho footer
        let categories = [];
        try {
            categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
        } catch (catErr) {
            console.error('🔍 Error fetching categories:', catErr);
        }

        // Lấy cart count
        let cartCount = 0;
        if (req.session.user && req.session.user._id) {
            try {
                const userData = await User.findById(req.session.user._id);
                if (userData && userData.cart && Array.isArray(userData.cart.items)) {
                    cartCount = userData.cart.items.reduce((sum, item) => sum + item.quantity, 0);
                }
            } catch (cartErr) {
                console.error('🔍 Error fetching cart count:', cartErr);
            }
        }

        // ✅ Đảm bảo tất cả order đều có .items là array và totalPrice
        const cleanedOrders = orders.map(order => {
            // Calculate totalPrice if it's missing
            let totalPrice = order.totalPrice;
            if (!totalPrice && order.items && Array.isArray(order.items)) {
                totalPrice = order.items.reduce((sum, item) => {
                    return sum + (item.price * item.quantity);
                }, 0);
            }
            
            // Tính phí vận chuyển động
            const subtotal = totalPrice || 0;
            const shippingFee = subtotal >= 500000 ? 0 : 30000;
            const totalAmount = subtotal + shippingFee;
            
            // Xử lý items để có đầy đủ thông tin sản phẩm
            const processedItems = Array.isArray(order.items) ? order.items.map(item => {
                console.log('🔍 Processing item:', {
                    productId: item.productId,
                    title: item.title,
                    sku: item.sku,
                    imageUrl: item.imageUrl
                });
                
                // Nếu có productId đã populate
                if (item.productId && typeof item.productId === 'object') {
                    return {
                        ...item,
                        title: item.productId.title || 'Sản phẩm không xác định',
                        imageUrl: item.productId.imageUrl || '/images/default-product.jpg',
                        sku: item.productId.sku || 'N/A',
                        price: item.price || 0, // Sử dụng price từ order item
                        quantity: parseInt(item.quantity) || 0 // Đảm bảo quantity là số
                    };
                }
                // Nếu không có productId hoặc chưa populate
                return {
                    ...item,
                    title: item.title || 'Sản phẩm không xác định',
                    imageUrl: item.imageUrl || '/images/default-product.jpg',
                    sku: item.sku || 'N/A',
                    price: item.price || 0,
                    quantity: parseInt(item.quantity) || 0
                };
            }) : (Array.isArray(order.products) ? order.products : []);
            
            return {
                _id: order._id, // ✅ Đảm bảo _id được giữ lại
                id: order._id, // ✅ Thêm id field để fallback
                ...order,
                items: processedItems,
                totalPrice: subtotal,
                shippingFee: shippingFee,
                totalAmount: totalAmount,
                status: order.status || 'pending',
                paymentStatus: order.paymentStatus || 'pending',
                paymentMethod: order.paymentMethod || 'cod',
                shippingInfo: order.shippingInfo || {
                    name: 'N/A',
                    phone: 'N/A',
                    email: 'N/A',
                    address: 'N/A'
                },
                createdAt: order.createdAt || new Date(),
                updatedAt: order.updatedAt || new Date()
            };
        });

        console.log('🛒 Rendering orders page');
        res.render('shop/orders', {
            path: '/orders',
            pageTitle: 'Đơn hàng của bạn | Shoe Store',
            orders: cleanedOrders,
            activeOrders: true,
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            success: req.query.success === 'true' ? 'order_created' : req.query.success,
            error: null,
            categories,
            cartCount
        });
        console.log('🛒 Orders page rendered successfully');
    } catch (err) {
        console.error('🚨 Error in getOrders:', err);
        console.error('🚨 Error stack:', err.stack);
        res.status(500).render('error', {
            pageTitle: 'Lỗi | Shoe Store',
            path: '/error',
            error: 'Không thể tải danh sách đơn hàng',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

// Controller tải xuống hóa đơn cho người dùng
exports.getDownloadInvoice = async (req, res, next) => {
    try {
        const orderId = req.params.orderId;
        console.log('Bắt đầu tải xuống hóa đơn cho đơn hàng:', orderId);

        if (!req.session.user || !req.session.user._id) {
            return res.redirect('/login');
        }

        // Kiểm tra tính hợp lệ của orderId
        if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
            console.error('ID đơn hàng không hợp lệ:', orderId);
            return res.status(400).render('error', {
                pageTitle: 'Lỗi | Shoe Store',
                path: '/error',
                error: 'ID đơn hàng không hợp lệ',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        // Lấy thông tin đơn hàng
        const order = await Order.findById(orderId);
        if (!order) {
            console.error('Không tìm thấy đơn hàng với ID:', orderId);
            return res.status(404).render('error', {
                pageTitle: 'Không tìm thấy đơn hàng | Shoe Store',
                path: '/error',
                error: 'Không tìm thấy đơn hàng với ID: ' + orderId,
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }
        
        // Lấy thông tin sản phẩm cho từng item trong đơn hàng
        for (let item of order.items) {
            if (item.productId) {
                try {
                    const product = await Product.findById(item.productId);
                    if (product) {
                        item.title = product.title;
                        item.sku = product.sku;
                        item.imageUrl = product.imageUrl;
                        console.log('🔍 Product imageUrl:', product.imageUrl);
                    }
                } catch (err) {
                    console.error('Lỗi khi lấy thông tin sản phẩm:', err);
                }
            }
        }

        // Kiểm tra xem đơn hàng có thuộc về người dùng hiện tại không
        if (order.userId.toString() !== req.session.user._id.toString() && req.session.user.role !== 'admin') {
            console.error('Người dùng không có quyền truy cập đơn hàng này');
            return res.status(403).render('error', {
                pageTitle: 'Truy cập bị từ chối | Shoe Store',
                path: '/error',
                error: 'Bạn không có quyền truy cập đơn hàng này',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        // Lấy thông tin người dùng
        const user = await User.findById(order.userId);
        if (!user) {
            console.error('Không tìm thấy người dùng với ID:', order.userId);
            return res.status(404).render('error', {
                pageTitle: 'Không tìm thấy người dùng | Shoe Store',
                path: '/error',
                error: 'Không tìm thấy thông tin người dùng',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        // Tạo PDF
        console.log('Đang tạo PDF hóa đơn...');
        const pdfPath = await generateOrderPDF(order, user);
        console.log('Đã tạo PDF hóa đơn thành công tại:', pdfPath);

        // Kiểm tra file PDF có tồn tại không
        if (!fs.existsSync(pdfPath)) {
            console.error('File PDF không tồn tại sau khi tạo:', pdfPath);
            return res.status(500).render('error', {
                pageTitle: 'Lỗi | Shoe Store',
                path: '/error',
                error: 'Không thể tạo file PDF hóa đơn',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        // Gửi file PDF về client
        res.download(pdfPath, `invoice-${orderId}.pdf`, (err) => {
            if (err) {
                console.error('Lỗi khi tải file PDF:', err);
                return res.status(500).render('error', {
                    pageTitle: 'Lỗi | Shoe Store',
                    path: '/error',
                    error: 'Không thể tải xuống file PDF: ' + err.message,
                    isAuthenticated: req.session.user ? true : false,
                    isAdmin: req.session.user && req.session.user.role === 'admin'
                });
            }
            console.log('Đã gửi file PDF hóa đơn thành công');

            // Xóa file sau khi đã gửi
            fs.unlink(pdfPath, (err) => {
                if (err) {
                    console.error('Lỗi khi xóa file PDF:', err);
                } else {
                    console.log('Đã xóa file PDF hóa đơn tạm thời');
                }
            });
        });
    } catch (err) {
        console.error('Lỗi khi tải xuống hóa đơn:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi | Shoe Store',
            path: '/error',
            error: 'Không thể tải xuống hóa đơn: ' + err.message,
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};
exports.getCheckout = async (req, res, next) => {
    try {
        // Kiểm tra đăng nhập
        if (!req.session.user || !req.session.user._id) {
            // Lưu URL hiện tại để redirect sau khi đăng nhập
            req.session.returnTo = req.originalUrl;
            return res.redirect('/login');
        }

        const userData = await User.findById(req.session.user._id);
        if (!userData) {
            req.session.returnTo = req.originalUrl;
            return res.redirect('/login');
        }

        // Debug: Log user data
        console.log('🔍 DEBUG - User data for checkout:', {
            id: userData._id,
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            address: userData.address
        });

        // Nếu user chưa có phone và address, cập nhật thông tin mẫu
        if (!userData.phone || !userData.address) {
            console.log('🔧 Cập nhật thông tin mẫu cho user...');
            userData.phone = userData.phone || '0123456789';
            userData.address = userData.address || '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM';
            await userData.save();
            console.log('✅ Đã cập nhật thông tin user:', {
                phone: userData.phone,
                address: userData.address
            });
        }

        // Sử dụng giỏ hàng session thay vì giỏ hàng của user
        const cart = req.cart.getCart();

        // Kiểm tra xem giỏ hàng có sản phẩm không
        if (!cart.items || cart.items.length === 0) {
            return res.redirect('/cart');
        }

        // Tính phí vận chuyển
        const subtotal = cart.totalPrice || 0;
        const shippingFee = subtotal >= 500000 ? 0 : 30000;
        const totalAmount = subtotal + shippingFee;

        res.render('shop/checkout', {
            pageTitle: 'Xác nhận đơn hàng',
            path: '/checkout',
            products: cart.items || [],
            totalPrice: subtotal,
            shippingFee: shippingFee,
            totalAmount: totalAmount,
            user: userData, // Truyền thông tin user vào view
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    } catch (err) {
        console.error('Lỗi khi tải trang checkout:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải trang thanh toán',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.postCheckout = async (req, res, next) => {
    try {
        console.log('🛒 Starting postCheckout controller');
        console.log('🛒 Request body:', req.body);
        
        if (!req.session.user || !req.session.user._id) {
            return res.status(401).json({
                success: false,
                message: 'Vui lòng đăng nhập để đặt hàng'
            });
        }

        const { paymentMethod, name, phone, address, note } = req.body;
        // Email được lấy từ session user, không từ form
        const email = req.session.user.email;
        
        console.log('🛒 Shipping info:', { name, phone, email, address });
        
        // Validate payment method
        const validPaymentMethods = ['cod', 'vnpay'];
        if (!validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Phương thức thanh toán không hợp lệ'
            });
        }

        const userData = await User.findById(req.session.user._id);
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin người dùng'
            });
        }
        
        // Sử dụng userData trực tiếp vì đã là Mongoose document
        const user = userData;
        
        // Lấy giỏ hàng từ session (dùng cho cả user và guest)
        const cart = req.cart.getCart();
        if (!cart.items || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Giỏ hàng trống'
            });
        }
        const products = cart.items.map(item => {
            return {
                productId: item.productId,
                quantity: item.quantity,
                title: item.title,
                price: item.price,
                imageUrl: item.imageUrl
            };
        });
        // Calculate total
        const subtotal = products.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
        const shippingFee = subtotal >= 500000 ? 0 : 30000; // Phí vận chuyển động
        const totalAmount = subtotal + shippingFee;
        // Tạo order theo schema mới
        const order = new Order({
            userId: req.session.user._id,
            items: products.map(product => ({
                productId: product.productId,
                quantity: product.quantity,
                price: product.price
            })),
            totalPrice: subtotal,
            shippingInfo: {
                name: name,
                phone: phone,
                email: email,
                address: address,
                city: 'Hồ Chí Minh',
                district: 'Quận 1',
                ward: 'Phường Bến Nghé'
            },
            paymentMethod: paymentMethod,
            status: 'pending',
            paymentStatus: 'pending'
        });
        
        const savedOrder = await order.save();
        
        // Xóa giỏ hàng khỏi session và database
        await req.cart.clearCart();
        await req.session.save(); // Đảm bảo session được lưu
        
        console.log('🛒 Order created with shipping info:', order.shippingInfo);
        
        console.log('🛒 Order saved successfully:', savedOrder);
        console.log('🛒 Saved order ID:', savedOrder.insertedId || savedOrder._id);

        // Handle different payment methods
        if (paymentMethod === 'cod') {
            // COD - Cash on Delivery
            await Order.findByIdAndUpdate(savedOrder._id, { 
                status: 'confirmed',
                paymentStatus: 'pending'
            });
            
            // Gửi email xác nhận đơn hàng cho khách
            try {
                await sendOrderConfirmation({
                    ...order,
                    _id: savedOrder.insertedId || savedOrder._id
                }, user);
            } catch (err) {
                console.error('❌ Lỗi khi gửi email xác nhận đơn hàng COD:', err);
            }
            // KHÔNG trừ kho ở đây!
            return res.json({
                success: true,
                message: 'Đơn hàng đã được tạo thành công! Bạn sẽ thanh toán khi nhận hàng.',
                orderId: savedOrder._id
            });
        } else {
            // Invalid payment method
            return res.status(400).json({
                success: false,
                message: 'Phương thức thanh toán không hợp lệ'
            });
        }
    } catch (error) {
        console.error('🚨 Error creating order:', error);
        console.error('🚨 Error name:', error.name);
        console.error('🚨 Error message:', error.message);
        console.error('🚨 Error stack:', error.stack);
        
        return res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi tạo đơn hàng: ' + error.message
        });
    }
};

exports.deleteOrder = async (req, res, next) => {
    try {
        console.log('🗑️ Starting deleteOrder controller');
        const orderId = req.params.orderId;
        const userId = req.session.user && req.session.user._id;
        
        console.log('🗑️ Order ID:', orderId, 'User ID:', userId);
        
        if (!userId) {
            console.log('🗑️ No user session');
            return res.status(401).send('Bạn chưa đăng nhập');
        }
        
        const order = await Order.findById(orderId);
        console.log('🗑️ Found order:', order ? 'Yes' : 'No');
        
        if (!order) {
            console.log('🗑️ Order not found');
            return res.status(404).send('Không tìm thấy đơn hàng');
        }
        
        console.log('🗑️ Order userId:', order.userId, 'Session userId:', userId);
        
        if (order.userId.toString() !== userId.toString()) {
            console.log('🗑️ User not authorized to delete this order');
            return res.status(403).send('Bạn không có quyền xóa đơn hàng này');
        }
        
        // ✅ Sử dụng Mongoose deleteOne thay vì custom method
        const result = await Order.deleteOne({ _id: orderId });
        
        if (result.deletedCount === 0) {
            console.log('🗑️ Failed to delete order');
            return res.status(500).send('Không thể xóa đơn hàng');
        }
        
        console.log('🗑️ Order deleted successfully');
        res.redirect('/orders?success=deleted');
    } catch (err) {
        console.error('🚨 Lỗi xóa đơn hàng:', err);
        console.error('🚨 Error stack:', err.stack);
        res.status(500).send('Lỗi khi xóa đơn hàng');
    }
};

exports.deleteAllOrders = async (req, res, next) => {
    try {
        const userId = req.session.user && req.session.user._id;
        if (!userId) {
            return res.status(401).send('Bạn chưa đăng nhập');
        }
        await Order.deleteMany({ userId: userId });
        res.redirect('/orders');
    } catch (err) {
        console.error('Lỗi xóa tất cả đơn hàng:', err);
        res.status(500).send('Lỗi khi xóa tất cả đơn hàng');
    }
};

exports.getCategories = async (req, res, next) => {
  try {
    // Lấy tham số tìm kiếm
    const searchQuery = req.query.search || '';
    
    // Tạo query cho tìm kiếm
    let query = { isActive: true };
    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ];
    }
    
    // Lấy danh mục theo query
    const categories = await Category.find(query).sort({ sortOrder: 1, name: 1 });

    // Lấy slides cho banner
    console.log('📁 Fetching slides for categories page...');
    let slides = [];
    try {
        const now = new Date();
        slides = await Slide.find({
            isActive: true
            // Tạm thời bỏ qua điều kiện ngày để test
            // startDate: { $lte: now },
            // $or: [
            //     { endDate: { $gte: now } },
            //     { endDate: { $exists: false } }
            // ]
        }).sort({ sortOrder: 1, createdAt: -1 });
        console.log('📁 Slides found for categories:', slides.length);
    } catch (slideErr) {
        console.error('📁 Error fetching slides for categories:', slideErr);
        slides = [];
    }

    let cartCount = 0;
    if (req.session.user && req.session.user._id) {
      const userData = await User.findById(req.session.user._id);
      if (userData && userData.cart && Array.isArray(userData.cart.items)) {
        cartCount = userData.cart.items.reduce((sum, item) => sum + item.quantity, 0);
      }
    }

    let favorites = [];
    if (req.session.user && req.session.user._id) {
      const userData = await User.findById(req.session.user._id);
      if (userData && Array.isArray(userData.favorites)) {
        favorites = userData.favorites.map(id => id.toString());
      }
    }

    res.render('shop/categories', {
      categories: categories,
      slides: slides,
      pageTitle: 'Danh mục sản phẩm - Shoe Store',
      path: '/categories',
      hasCategories: categories.length > 0,
      activeShop: true,
      productCSS: true,
      isAuthenticated: req.session.user ? true : false,
      isAdmin: req.session.user && req.session.user.role === 'admin',
      user: req.session.user || null,
      cartCount,
      favorites,
      search: searchQuery,
      request: req
    });
  } catch (err) {
    console.log(err);
    res.status(500).render('error', {
      pageTitle: 'Lỗi | Shoe Store',
      path: '/error',
      error: 'Không thể tải danh mục sản phẩm',
      isAuthenticated: req.session.user ? true : false,
      isAdmin: req.session.user && req.session.user.role === 'admin'
    });
  }
};

exports.getAbout = async (req, res, next) => {
  try {
    // Lấy categories từ database
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    
    res.render('shop/about', {
      categories: categories,
      pageTitle: 'Giới thiệu',
      path: '/about',
      isAuthenticated: req.session.user ? true : false,
      isAdmin: req.session.user && req.session.user.role === 'admin',
      user: req.session.user || null
    });
  } catch (error) {
    console.error('Error fetching categories for about page:', error);
    res.render('shop/about', {
      categories: [],
      pageTitle: 'Giới thiệu',
      path: '/about',
      isAuthenticated: req.session.user ? true : false,
      isAdmin: req.session.user && req.session.user.role === 'admin',
      user: req.session.user || null
    });
  }
};

exports.getContact = async (req, res, next) => {
  try {
    // Lấy categories từ database
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    
    res.render('shop/contact', {
      categories: categories,
      pageTitle: 'Liên hệ',
      path: '/contact',
      isAuthenticated: req.session.user ? true : false,
      isAdmin: req.session.user && req.session.user.role === 'admin',
      user: req.session.user || null
    });
  } catch (error) {
    console.error('Error fetching categories for contact page:', error);
    res.render('shop/contact', {
      categories: [],
      pageTitle: 'Liên hệ',
      path: '/contact',
      isAuthenticated: req.session.user ? true : false,
      isAdmin: req.session.user && req.session.user.role === 'admin',
      user: req.session.user || null
    });
  }
};

exports.postContact = async (req, res, next) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).render('shop/contact', {
                pageTitle: 'Liên hệ với Shoe Store',
                path: '/contact',
                error: 'Vui lòng nhập đầy đủ thông tin!',
                success: null
            });
        }
        // Gửi email về shop
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        const mailOptions = {
            from: email,
            to: 'catthach97@gmail.com',
            subject: `Liên hệ mới từ ${name} - Shoe Store`,
            html: `<p><strong>Họ tên:</strong> ${name}</p>
                   <p><strong>Email:</strong> ${email}</p>
                   <p><strong>Nội dung:</strong></p>
                   <div style="background:#f8fafc;padding:12px;border-radius:8px;">${message.replace(/\n/g, '<br>')}</div>`
        };
        await transporter.sendMail(mailOptions);
        res.render('shop/contact', {
            pageTitle: 'Liên hệ với Pet Store',
            path: '/contact',
            success: 'Gửi liên hệ thành công! Chúng tôi sẽ phản hồi sớm nhất.',
            error: null
        });
    } catch (err) {
        console.error('Lỗi gửi liên hệ:', err);
        res.status(500).render('shop/contact', {
            pageTitle: 'Liên hệ với Pet Store',
            path: '/contact',
            error: 'Có lỗi xảy ra, vui lòng thử lại sau!',
            success: null
        });
    }
};

exports.getSearch = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    let products = [];
    if (q.trim()) {
      products = await Product.find({
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } }
        ]
      });
    }
    let favorites = [];
    if (req.session.user && req.session.user._id) {
      const userData = await User.findById(req.session.user._id);
      if (userData && Array.isArray(userData.favorites)) {
        favorites = userData.favorites.map(id => id.toString());
      }
    }
    res.render('shop/search', {
      products,
      searchQuery: q,
      pageTitle: 'Kết quả tìm kiếm',
      path: '/search',
      isAuthenticated: req.session.user ? true : false,
      isAdmin: req.session.user && req.session.user.role === 'admin',
      user: req.session.user || null,
      favorites,
      request: req
    });
  } catch (err) {
    console.error('Lỗi tìm kiếm sản phẩm:', err);
    res.status(500).render('error', {
      pageTitle: 'Lỗi',
      path: '/error',
      error: 'Không thể tìm kiếm sản phẩm',
      isAuthenticated: req.session.user ? true : false,
      isAdmin: req.session.user && req.session.user.role === 'admin',
      user: req.session.user || null
    });
  }
};

exports.cancelOrder = async (req, res, next) => {
    try {
        console.log('🚫 Starting cancelOrder controller');
        const orderId = req.params.orderId;
        const userId = req.session.user && req.session.user._id;
        
        console.log('🚫 Order ID:', orderId, 'User ID:', userId);
        
        if (!userId) {
            console.log('🚫 No user session');
            return res.status(401).send('Bạn chưa đăng nhập');
        }
        
        // ✅ Sử dụng Mongoose model thay vì MongoDB native driver
        const order = await Order.findById(orderId);
        console.log('🚫 Found order:', order ? 'Yes' : 'No');
        
        if (!order) {
            console.log('🚫 Order not found');
            return res.status(404).send('Không tìm thấy đơn hàng');
        }
        
        console.log('🚫 Order userId:', order.userId, 'Session userId:', userId);
        console.log('🚫 Order status:', order.status);
        
        if (order.userId.toString() !== userId.toString()) {
            console.log('🚫 User not authorized to cancel this order');
            return res.status(403).send('Bạn không có quyền hủy đơn hàng này');
        }
        
        if (order.status !== 'pending' && order.status !== 'processing' && order.status !== 'confirmed') {
            console.log('🚫 Order not in pending, processing, or confirmed status, cannot cancel');
            return res.status(400).send('Chỉ có thể hủy đơn hàng ở trạng thái Chờ xác nhận, Đang xử lý hoặc Đã xác nhận!');
        }
        
        // ✅ Sử dụng Mongoose update thay vì custom method
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId, 
            { status: 'cancelled' }, 
            { new: true }
        );
        
        if (!updatedOrder) {
            console.log('🚫 Failed to update order status');
            return res.status(500).send('Không thể cập nhật trạng thái đơn hàng');
        }
        
        // ✅ Hoàn lại tồn kho cho các sản phẩm trong đơn hàng bị hủy
        try {
            const Product = require('../models/product-mongoose');
            if (updatedOrder.items && Array.isArray(updatedOrder.items)) {
                console.log('🔄 Restoring stock for cancelled order items...');
                for (const item of updatedOrder.items) {
                    if (item.productId && item.quantity) {
                        await Product.findByIdAndUpdate(
                            item.productId,
                            { $inc: { stock: item.quantity } },
                            { new: true }
                        );
                        console.log(`✅ Restored ${item.quantity} units for product ${item.productId}`);
                    }
                }
            }
        } catch (stockErr) {
            console.error('⚠️ Error restoring stock:', stockErr);
            // Không dừng quá trình hủy đơn hàng nếu có lỗi hoàn lại tồn kho
        }
        
        console.log('🚫 Order cancelled successfully');
        res.redirect('/orders?success=cancelled');
    } catch (err) {
        console.error('🚨 Lỗi hủy đơn hàng:', err);
        console.error('🚨 Error stack:', err.stack);
        res.status(500).send('Lỗi khi hủy đơn hàng');
    }
};

// Thêm sản phẩm vào danh sách yêu thích
exports.addFavorite = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const productId = req.params.productId;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
        
        // Thêm productId vào favorites nếu chưa có
        if (!user.favorites.includes(productId)) {
            user.favorites.push(productId);
            await user.save();
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi khi thêm vào yêu thích' });
    }
};

// Xóa sản phẩm khỏi danh sách yêu thích
exports.removeFavorite = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const productId = req.params.productId;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
        
        // Xóa productId khỏi favorites
        user.favorites = user.favorites.filter(fav => fav.toString() !== productId);
        await user.save();
        
        // Luôn trả về JSON cho DELETE request
        return res.json({ success: true, message: 'Đã xóa khỏi yêu thích' });
    } catch (err) {
        console.error('Lỗi khi xóa khỏi yêu thích:', err);
        return res.status(500).json({ success: false, message: 'Lỗi khi xóa khỏi yêu thích' });
    }
};

// Lấy danh sách sản phẩm yêu thích
exports.getFavorites = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const userData = await User.findById(userId);
        if (!userData) return res.render('shop/favorites', { products: [], pageTitle: 'Sản phẩm yêu thích', path: '/favorites' });
        const favorites = userData.favorites || [];
        console.log('favorites:', favorites);
        try {
            const objectIds = favorites.map(id => new mongoose.Types.ObjectId(id));
            console.log('objectIds:', objectIds);
            const products = objectIds.length > 0 ? await Product.find({ _id: { $in: objectIds } }) : [];
            console.log('products:', products);
            res.render('shop/favorites', { products, pageTitle: 'Sản phẩm yêu thích', path: '/favorites' });
        } catch (err) {
            console.error('Lỗi chuyển ObjectId:', err);
            res.render('shop/favorites', { products: [], pageTitle: 'Sản phẩm yêu thích', path: '/favorites' });
        }
    } catch (err) {
        res.render('shop/favorites', { products: [], pageTitle: 'Sản phẩm yêu thích', path: '/favorites' });
    }
};

exports.postReview = async (req, res, next) => {
    try {
        console.log('🔍 Starting postReview controller');
        console.log('🔍 Request params:', req.params);
        console.log('🔍 Request body:', req.body);
        console.log('🔍 Session user:', req.session.user);
        
        if (!req.session.user || !req.session.user._id) {
            console.log('🔍 No session user found');
            return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập để đánh giá.' });
        }
        
        const prodId = req.params.productId;
        const { rating, comment } = req.body;
        
        console.log('🔍 Product ID:', prodId);
        console.log('🔍 Rating:', rating);
        console.log('🔍 Comment:', comment);
        
        if (!rating || rating < 1 || rating > 5) {
            console.log('🔍 Invalid rating:', rating);
            return res.status(400).json({ success: false, message: 'Điểm đánh giá không hợp lệ.' });
        }
        
        // Kiểm tra user đã đánh giá sản phẩm này chưa
        console.log('🔍 Checking if user already reviewed this product');
        const existingReview = await Review.checkUserReview(prodId, req.session.user._id);
        console.log('🔍 Existing review found:', !!existingReview);
        
        if (existingReview) {
            console.log('🔍 User already reviewed this product');
            return res.status(400).json({ success: false, message: 'Bạn chỉ được đánh giá 1 lần cho mỗi sản phẩm.' });
        }
        
        // Tạo review mới với Review model (Mongoose)
        const review = new Review({
            productId: prodId,
            userId: req.session.user._id,
            userName: req.session.user.name || 'Người dùng',
            userEmail: req.session.user.email || '',
            rating: parseInt(rating),
            comment: comment || '',
            approved: false // chờ admin duyệt trước khi hiển thị
        });
        
        console.log('🔍 Review object:', review);
        console.log('🔍 Adding review to database...');
        
        await review.save();
        
        console.log('🔍 Review added successfully');
        res.json({ success: true, message: 'Đánh giá của bạn đã được gửi và đang chờ duyệt. Cảm ơn bạn!' });
    } catch (err) {
        console.error('🚨 Error in postReview:', err);
        console.error('🚨 Error name:', err.name);
        console.error('🚨 Error message:', err.message);
        console.error('🚨 Error stack:', err.stack);
        res.status(500).json({ success: false, message: 'Lỗi khi gửi đánh giá.' });
    }
};
// Trang thương hiệu
exports.getBrands = async (req, res, next) => {
    try {
        // Lấy thông tin user nếu đã đăng nhập
        let user = null;
        let favorites = [];
        let cartCount = 0;

        if (req.session.isLoggedIn) {
            user = await User.findById(req.session.userId);
            if (user) {
                favorites = user.favorites || [];
                cartCount = user.cart ? user.cart.items.length : 0;
            }
        }

        // Lấy tham số tìm kiếm và bộ lọc
        const search = req.query.search || '';
        const sortBy = req.query.sort || 'name';
        const sortOrder = req.query.order || 'asc';
        
        // Tạo query filter
        let filter = { isActive: true };
        
        // Thêm điều kiện tìm kiếm
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Tạo sort object
        let sortObj = {};
        if (sortBy === 'name') {
            sortObj.name = sortOrder === 'desc' ? -1 : 1;
        } else if (sortBy === 'createdAt') {
            sortObj.createdAt = sortOrder === 'desc' ? -1 : 1;
        } else {
            sortObj.sortOrder = 1;
            sortObj.name = 1;
        }
        
        // Lấy danh sách thương hiệu từ bảng Brand
        const Brand = require('../models/brand');
        const brands = await Brand.find(filter).sort(sortObj);
        
        // Lấy sản phẩm để đếm số lượng theo thương hiệu
        const products = await Product.find({});
        
        // Đếm số sản phẩm theo thương hiệu
        const brandCounts = {};
        products.forEach(product => {
            if (product.brand) {
                brandCounts[product.brand] = (brandCounts[product.brand] || 0) + 1;
            }
        });
        
        // Thống kê
        const totalBrands = await Brand.countDocuments({ isActive: true });
        const brandsWithLogo = await Brand.countDocuments({ isActive: true, logo: { $ne: '' } });
        const brandsWithoutLogo = totalBrands - brandsWithLogo;

        // Render trang thương hiệu
        res.render('shop/brands-new', {
            pageTitle: 'Thương hiệu - Shoe Store',
            path: '/brands',
            user: user,
            isAdmin: user ? user.role === 'admin' : false,
            isAuthenticated: req.session.isLoggedIn,
            favorites: favorites,
            cartCount: cartCount,
            brands: brands,
            brandCounts: brandCounts,
            search: search,
            sortBy: sortBy,
            sortOrder: sortOrder,
            totalBrands: totalBrands,
            brandsWithLogo: brandsWithLogo,
            brandsWithoutLogo: brandsWithoutLogo
        });
    } catch (err) {
        console.error('Error in getBrands:', err);
        res.status(500).render('error/500', {
            pageTitle: 'Lỗi Server',
            path: '/brands',
            error: err
        });
    }
};
