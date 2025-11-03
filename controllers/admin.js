const Product = require('../models/product-mongoose');
const Order = require('../models/order');
const User = require('../models/user');
const fs = require('fs');
const path = require('path');
const { generateOrderPDF, generateProductsPDF, generateInventoryPDF } = require('../util/pdf');
const mongoose = require('mongoose');
const { upload, saveFileFromBuffer } = require('../util/file-upload');
const { handleAddProductUpload, handleEditProductUpload, deleteOldFile } = require('../middleware/upload-handler');
const Category = require('../models/category');
const Brand = require('../models/brand');
const getDb = require('../util/database').getDb;
const { ObjectId } = require('mongodb');
const { sendOrderConfirmation, sendOrderStatusUpdate, sendPaymentStatusUpdate } = require('../util/email');
const { getStatusColor, getStatusText, getPaymentStatusColor, getPaymentStatusText, getPaymentMethodText } = require('../util/helpers');
const mongodb = require('mongodb');

exports.getAddProduct = async (req, res, next) => {
    try {
        const categories = await Category.find();
        const brands = await Brand.find({ isActive: true }).sort({ name: 1 });
        res.render('admin/add-product-new', {
            pageTitle: 'Thêm sản phẩm',
            path: '/admin/add-product',
            editing: false,
            categories,
            brands,
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null
        });
    } catch (err) {
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải danh mục',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null
        });
    }
};

exports.postAddProduct = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'Bạn không có quyền thực hiện thao tác này',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        // Xử lý upload file
        handleAddProductUpload(req, res, async () => {
            const { title, price, description, stockQuantity, category, brand } = req.body;
            
            if (!req.file) {
                return res.status(400).render('error', {
                    pageTitle: 'Lỗi',
                    path: '/error',
                    error: 'Vui lòng tải lên hình ảnh sản phẩm',
                    isAuthenticated: req.session.user ? true : false,
                    isAdmin: req.session.user && req.session.user.role === 'admin'
                });
            }

            try {
                // Chuyển đổi file thành base64
                const base64Image = req.file.buffer.toString('base64');
                const imageDataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

                const product = new Product({
                    title: title,
                    imageUrl: imageDataUrl, // Lưu base64 thay vì đường dẫn file
                    description: description,
                    price: parseFloat(price),
                    stockQuantity: parseInt(stockQuantity),
                    category: category,
                    brand: brand || ''
                    // SKU sẽ được sinh tự động trong pre-save hook
                });

                // Lưu sản phẩm vào database
                await product.save();
                
                res.redirect('/admin/products');
            } catch (error) {
                console.error('Lỗi khi tạo sản phẩm:', error);
                res.status(500).render('error', {
                    pageTitle: 'Lỗi',
                    path: '/error',
                    error: 'Có lỗi xảy ra khi tạo sản phẩm',
                    isAuthenticated: req.session.user ? true : false,
                    isAdmin: req.session.user && req.session.user.role === 'admin'
                });
            }
        });
    } catch (err) {
        console.error('Lỗi khi thêm sản phẩm:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể thêm sản phẩm mới',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.getProducts = async (req, res, next) => {
    try {
        console.log('=== getProducts called ===');
        console.log('URL:', req.url);
        console.log('Method:', req.method);
        console.log('Query params:', req.query);
        console.log('Session user:', req.session.user);
        
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            console.log('User not admin, redirecting to error page');
            return res.status(403).render('error', {
                pageTitle: 'Không có quyền truy cập',
                path: '/error',
                error: 'Bạn không có quyền truy cập trang này',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: false
            });
        }

        const search = req.query.search || '';
        const category = req.query.category || '';
        const brand = req.query.brand || '';
        const sort = req.query.sort || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // 5 sản phẩm mỗi trang
        
        console.log('Filter params:', { search, category, brand, sort, page, limit });

        // Build filter object
        let filter = {};
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } }
            ];
        }
        if (category) {
            filter.category = category;
        }
        if (brand) {
            filter.brand = brand;
        }

        // Get products with filter, sorted by creation date (newest first)
        let products = await Product.find(filter).sort({ createdAt: -1 });
        console.log('Products:', products);

        // Cập nhật SKU và stockStatus cho các sản phẩm chưa có SKU
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            let needsUpdate = false;
            
            // Cập nhật SKU nếu chưa có
            if (!product.sku || product.sku.trim() === '') {
                try {
                    const newSku = await Product.generateSKU(product.brand, product.category);
                    product.sku = newSku;
                    needsUpdate = true;
                    console.log(`✅ Đã tạo SKU cho sản phẩm: ${product.title} → ${product.sku}`);
                } catch (error) {
                    console.error(`❌ Lỗi khi tạo SKU cho sản phẩm "${product.title}":`, error.message);
                }
            }
            
            // Cập nhật stockStatus dựa trên stockQuantity
            const oldStatus = product.stockStatus;
            const stockQuantity = product.stockQuantity;
            
            if (stockQuantity === 0) {
                product.stockStatus = 'out_of_stock';
            } else if (stockQuantity >= 1 && stockQuantity <= 4) {
                product.stockStatus = 'low_stock';
            } else if (stockQuantity >= 5 && stockQuantity <= 10) {
                product.stockStatus = 'medium_stock';
            } else {
                product.stockStatus = 'in_stock';
            }
            
            // Chỉ lưu nếu có thay đổi
            if (needsUpdate || oldStatus !== product.stockStatus) {
                try {
                    await product.save();
                    if (oldStatus !== product.stockStatus) {
                        console.log(`✅ Đã cập nhật trạng thái cho sản phẩm: ${product.title} (${stockQuantity} sản phẩm) → ${product.stockStatus}`);
                    }
                } catch (error) {
                    console.error(`❌ Lỗi khi lưu sản phẩm "${product.title}":`, error.message);
                }
            }
        }

        // Sort products
        if (sort) {
            switch (sort) {
                case 'name_asc':
                    products.sort((a, b) => a.title.localeCompare(b.title));
                    break;
                case 'name_desc':
                    products.sort((a, b) => b.title.localeCompare(a.title));
                    break;
                case 'price_asc':
                    products.sort((a, b) => a.price - b.price);
                    break;
                case 'price_desc':
                    products.sort((a, b) => b.price - a.price);
                    break;
                case 'stock_asc':
                    products.sort((a, b) => a.stockQuantity - b.stockQuantity);
                    break;
                case 'stock_desc':
                    products.sort((a, b) => b.stockQuantity - a.stockQuantity);
                    break;
                default:
                    // Default sort by createdAt desc
                    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }
        }

        // Pagination logic
        const totalProducts = products.length;
        const totalPages = Math.ceil(totalProducts / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        // Get products for current page
        const paginatedProducts = products.slice(startIndex, endIndex);
        
        // Calculate pagination info
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        const nextPage = hasNextPage ? page + 1 : null;
        const prevPage = hasPrevPage ? page - 1 : null;
        
        // Generate page numbers for pagination
        const pageNumbers = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }
        
        // Get categories and brands for filter dropdown from database
        const categories = await Category.find();
        const brands = await Brand.find({ isActive: true }).sort({ name: 1 });

        console.log('Rendering admin/products with data:', {
            productsCount: paginatedProducts ? paginatedProducts.length : 0,
            totalProducts,
            totalPages,
            currentPage: page,
            categoriesCount: categories ? categories.length : 0,
            search,
            category,
            sort
        });
        
        res.render('admin/products-new', {
            products: paginatedProducts || [],
            allProducts: products || [], // Thêm tất cả sản phẩm để tính thống kê chính xác
            categories,
            brands,
            search,
            category,
            brand,
            sort,
            // Pagination data
            pagination: {
                currentPage: page,
                totalPages,
                totalProducts,
                hasNextPage,
                hasPrevPage,
                nextPage,
                prevPage,
                pageNumbers,
                limit
            },
            query: { search, category, sort, limit },
            pageTitle: 'Quản lý sản phẩm',
            path: '/admin/products',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null
        });
        
        console.log('=== getProducts completed successfully ===');
    } catch (err) {
        console.error('Lỗi khi lấy danh sách sản phẩm:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải danh sách sản phẩm',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.getEditProduct = async (req, res, next) => {
    const editMode = req.query.edit;
    if (!editMode) {
        return res.redirect('/');
    }

    const prodId = req.params.productId;
    try {
        const product = await Product.findById(prodId);
        if (!product) {
            return res.redirect('/');
        }

        // Lấy danh mục và thương hiệu từ database
        const categories = await Category.find();
        const brands = await Brand.find({ isActive: true }).sort({ name: 1 });

        res.render('admin/edit-product-new', {
            pageTitle: 'Chỉnh sửa sản phẩm',
            path: '/admin/edit-product',
            editing: editMode,
            product: product,
            categories: categories,
            brands: brands
        });
    } catch (err) {
        console.error('Lỗi khi lấy thông tin sản phẩm:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải thông tin sản phẩm'
        });
    }
};

exports.postEditProduct = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'Bạn không có quyền thực hiện thao tác này',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }

        // Xử lý upload file
        handleEditProductUpload(req, res, async () => {
            const prodId = req.body.productId;
            const updatedTitle = req.body.title;
            const updatedPrice = parseFloat(req.body.price);
            const updatedDesc = req.body.description;
            const updatedStockQuantity = parseInt(req.body.stockQuantity);
            const updatedCategory = req.body.category;
            const updatedBrand = req.body.brand;
            const updatedSku = req.body.sku;

            // Lấy sản phẩm hiện tại để giữ lại imageUrl nếu không upload file mới
            const currentProduct = await Product.findById(prodId);
            if (!currentProduct) {
                return res.status(404).render('error', {
                    pageTitle: 'Lỗi',
                    path: '/error',
                    error: 'Không tìm thấy sản phẩm',
                    isAuthenticated: req.session.user ? true : false,
                    isAdmin: req.session.user && req.session.user.role === 'admin'
                });
            }

            // Xử lý file mới nếu có
            let updatedImageUrl = currentProduct.imageUrl;
            
            if (req.file) {
                // Chuyển đổi file thành base64
                const base64Image = req.file.buffer.toString('base64');
                updatedImageUrl = `data:${req.file.mimetype};base64,${base64Image}`;
            }

            // Cập nhật sản phẩm hiện có thay vì tạo mới
            const updateData = {
                title: updatedTitle,
                imageUrl: updatedImageUrl,
                description: updatedDesc,
                price: updatedPrice,
                stockQuantity: updatedStockQuantity,
                category: updatedCategory,
                brand: updatedBrand || '',
                sku: updatedSku
            };

            // Cập nhật trạng thái tồn kho dựa trên số lượng
            if (updatedStockQuantity === 0) {
                updateData.stockStatus = 'out_of_stock';
            } else if (updatedStockQuantity >= 1 && updatedStockQuantity <= 4) {
                updateData.stockStatus = 'low_stock';
            } else if (updatedStockQuantity >= 5 && updatedStockQuantity <= 10) {
                updateData.stockStatus = 'medium_stock';
            } else {
                updateData.stockStatus = 'in_stock';
            }

            const result = await Product.findByIdAndUpdate(prodId, updateData, { new: true });
            
            if (!result) {
                return res.status(404).render('error', {
                    pageTitle: 'Lỗi',
                    path: '/error',
                    error: 'Không tìm thấy sản phẩm để cập nhật',
                    isAuthenticated: req.session.user ? true : false,
                    isAdmin: req.session.user && req.session.user.role === 'admin'
                });
            }
            
            // Không cần xử lý file vì đã lưu base64 trong database
            
            res.redirect('/admin/products');
        });
    } catch (err) {
        console.error('Lỗi khi cập nhật sản phẩm:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể cập nhật sản phẩm',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

exports.postDeleteProduct = async (req, res, next) => {
    try {
        const prodId = req.body.productId;
        console.log('Deleting product with ID:', prodId);
        
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
        }

        // Xóa sản phẩm bằng Mongoose (không cần xóa file vì lưu base64 trong database)
        const result = await Product.findByIdAndDelete(prodId);
        if (!result) {
            console.log('Product not found with ID:', prodId);
            return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        }
        
        console.log('Product deleted successfully:', result.title);
        res.redirect('/admin/products');
    } catch (err) {
        console.error('Lỗi khi xóa sản phẩm:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể xóa sản phẩm',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

// Controller tải xuống hóa đơn
exports.getDownloadInvoice = async (req, res, next) => {
    try {
        const orderId = req.params.orderId;
        console.log('Bắt đầu tải xuống hóa đơn cho đơn hàng:', orderId);

        // Kiểm tra tính hợp lệ của orderId
        if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
            console.error('ID đơn hàng không hợp lệ:', orderId);
            return res.status(400).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'ID đơn hàng không hợp lệ'
            });
        }

        // Lấy thông tin đơn hàng
        const order = await Order.findById(orderId);
        if (!order) {
            console.error('Không tìm thấy đơn hàng với ID:', orderId);
            return res.status(404).render('error', {
                pageTitle: 'Không tìm thấy đơn hàng',
                path: '/error',
                error: 'Không tìm thấy đơn hàng với ID: ' + orderId
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
                    }
                } catch (err) {
                    console.error('Lỗi khi lấy thông tin sản phẩm:', err);
                }
            }
        }

        // Lấy thông tin người dùng
        const user = await User.findById(order.userId);
        if (!user) {
            console.error('Không tìm thấy người dùng với ID:', order.userId);
            return res.status(404).render('error', {
                pageTitle: 'Không tìm thấy người dùng',
                path: '/error',
                error: 'Không tìm thấy người dùng với ID: ' + order.userId
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
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'Không thể tạo file PDF hóa đơn'
            });
        }

        // Gửi file PDF về client
        res.download(pdfPath, `invoice-${orderId}.pdf`, (err) => {
            if (err) {
                console.error('Lỗi khi tải file PDF:', err);
                return res.status(500).render('error', {
                    pageTitle: 'Lỗi',
                    path: '/error',
                    error: 'Không thể tải xuống file PDF: ' + err.message
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
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải xuống hóa đơn: ' + err.message
        });
    }
};

// Controller xuất PDF danh sách sản phẩm
exports.getExportProductsPDF = async (req, res, next) => {
    try {
        console.log('Bắt đầu xuất PDF danh sách sản phẩm');

        // Lấy danh sách sản phẩm với điều kiện lọc
        const { category, minPrice, maxPrice, sortBy } = req.query;
        let products = await Product.fetchAll();

        if (!products) {
            console.error('Không thể lấy danh sách sản phẩm');
            return res.status(500).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'Không thể lấy danh sách sản phẩm'
            });
        }

        // Áp dụng bộ lọc nếu có
        if (category) {
            products = products.filter(p => p.category === category);
        }
        if (minPrice) {
            products = products.filter(p => p.price >= parseFloat(minPrice));
        }
        if (maxPrice) {
            products = products.filter(p => p.price <= parseFloat(maxPrice));
        }

        // Sắp xếp sản phẩm
        if (sortBy) {
            switch (sortBy) {
                case 'price-asc':
                    products.sort((a, b) => (a.price || 0) - (b.price || 0));
                    break;
                case 'price-desc':
                    products.sort((a, b) => (b.price || 0) - (a.price || 0));
                    break;
                case 'name-asc':
                    products.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                    break;
                case 'name-desc':
                    products.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
                    break;
            }
        }

        console.log(`Đã lấy được ${products.length} sản phẩm`);

        if (products.length === 0) {
            console.log('Không có sản phẩm nào để xuất PDF');
            return res.status(404).render('error', {
                pageTitle: 'Không có sản phẩm',
                path: '/error',
                error: 'Không có sản phẩm nào phù hợp với tiêu chí tìm kiếm'
            });
        }

        // Tạo PDF
        console.log('Đang tạo PDF...');
        const pdfPath = await generateProductsPDF(products);
        console.log('Đã tạo PDF thành công tại:', pdfPath);

        // Kiểm tra file có tồn tại không
        if (!fs.existsSync(pdfPath)) {
            console.error('File PDF không tồn tại sau khi tạo:', pdfPath);
            return res.status(500).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'Không thể tạo file PDF'
            });
        }

        // Gửi file PDF về client
        console.log('Đang gửi file PDF về client...');
        const fileName = `products-list-${new Date().toISOString().slice(0, 10)}.pdf`;
        res.download(pdfPath, fileName, (err) => {
            if (err) {
                console.error('Lỗi khi tải file PDF:', err);
                return res.status(500).render('error', {
                    pageTitle: 'Lỗi',
                    path: '/error',
                    error: 'Không thể tải xuống file PDF: ' + err.message
                });
            }
            console.log('Đã gửi file PDF thành công');

            // Xóa file sau khi đã gửi
            try {
                fs.unlink(pdfPath, (err) => {
                    if (err) {
                        console.error('Lỗi khi xóa file PDF:', err);
                    } else {
                        console.log('Đã xóa file PDF tạm thời');
                    }
                });
            } catch (unlinkErr) {
                console.error('Lỗi khi xóa file PDF:', unlinkErr);
            }
        });
    } catch (err) {
        console.error('Lỗi khi xuất PDF danh sách sản phẩm:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể xuất PDF danh sách sản phẩm: ' + err.message
        });
    }
};

// Quản lý đơn hàng
exports.getOrders = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'Bạn không có quyền truy cập trang này',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: false
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const paymentStatus = req.query.paymentStatus || '';

        let orders = await Order.findAll();
        
        // Tự động xóa các đơn hàng lỗi
        const errorOrders = orders.filter(o => !o.shippingInfo || !o.items || !Array.isArray(o.items) || o.items.length === 0 || typeof o.totalPrice !== 'number');
        for (const errOrder of errorOrders) {
            try {
                await Order.deleteById(errOrder._id);
                console.log('Đã tự động xoá đơn hàng lỗi:', errOrder._id);
            } catch (e) {
                console.error('Lỗi khi xoá đơn hàng lỗi:', errOrder._id, e);
            }
        }
        // Lọc lại danh sách chỉ lấy đơn hợp lệ
        orders = orders.filter(o => !errorOrders.includes(o));

        // Áp dụng bộ lọc
        let filteredOrders = orders;
        
        // Lọc theo tìm kiếm
        if (search) {
            const searchLower = search.toLowerCase();
            filteredOrders = filteredOrders.filter(order => {
                const orderId = order._id.toString().toLowerCase();
                const customerName = (order.shippingInfo && order.shippingInfo.name) ? order.shippingInfo.name.toLowerCase() : '';
                const customerEmail = (order.shippingInfo && order.shippingInfo.email) ? order.shippingInfo.email.toLowerCase() : '';
                return orderId.includes(searchLower) || 
                       customerName.includes(searchLower) || 
                       customerEmail.includes(searchLower);
            });
        }
        
        // Lọc theo trạng thái
        if (status) {
            filteredOrders = filteredOrders.filter(order => order.status === status);
        }
        
        // Lọc theo trạng thái thanh toán
        if (paymentStatus) {
            filteredOrders = filteredOrders.filter(order => order.paymentStatus === paymentStatus);
        }

        // Sắp xếp theo ngày tạo (mới nhất trước)
        filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Thống kê trạng thái đơn hàng (từ tất cả đơn hàng, không phải đã lọc)
        const statusStats = {
            pending: 0,
            processing: 0,
            shipped: 0,
            completed: 0,
            cancelled: 0
        };
        let totalRevenue = 0;
        console.log('📊 Debug - Total orders found:', orders.length);
        orders.forEach(o => {
            console.log('📊 Debug - Order status:', o.status, 'Payment status:', o.paymentStatus);
            // Đếm theo trạng thái đơn hàng
            if (o.status && statusStats.hasOwnProperty(o.status)) {
                statusStats[o.status]++;
            }
            // Tính doanh thu từ các đơn hàng đã thanh toán
            if (o.paymentStatus === 'paid' || o.paymentStatus === 'completed') {
                console.log('📊 Debug - Adding revenue from order:', o._id, 'Amount:', o.totalPrice, 'Payment status:', o.paymentStatus);
                totalRevenue += o.totalPrice || 0;
            }
        });
        console.log('📊 Debug - Final statusStats:', statusStats);
        console.log('📊 Debug - Total Revenue calculated:', totalRevenue);

        const totalOrders = filteredOrders.length;
        const totalPages = Math.ceil(totalOrders / limit);
        const paginatedOrders = filteredOrders.slice(skip, skip + limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        const nextPage = hasNextPage ? page + 1 : null;
        const prevPage = hasPrevPage ? page - 1 : null;
        const pageNumbers = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        res.render('admin/orders-new', {
            pageTitle: 'Quản lý đơn hàng',
            path: '/admin/orders',
            orders: paginatedOrders,
            isAuthenticated: true,
            isAdmin: true,
            user: req.session.user,
            currentPage: page,
            totalPages,
            totalOrders,
            hasNextPage,
            hasPrevPage,
            nextPage,
            prevPage,
            pageNumbers,
            limit,
            statusStats,
            totalRevenue,
            pendingOrders: statusStats.pending || 0,
            completedOrders: statusStats.completed || 0,
            search: search,
            status: status,
            paymentStatus: paymentStatus,
            // Helper functions
            getStatusColor,
            getStatusText,
            getPaymentStatusColor,
            getPaymentStatusText
        });
    } catch (err) {
        console.error('Lỗi khi lấy danh sách đơn hàng:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải danh sách đơn hàng',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

// Cập nhật trạng thái đơn hàng
exports.postUpdateOrderStatus = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Không có quyền thực hiện thao tác này' });
        }

        const { orderId, status } = req.body;
        
        if (!orderId || !status) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin cần thiết' });
        }

        // Lấy thông tin đơn hàng hiện tại để kiểm tra trạng thái cũ
        const currentOrder = await Order.findById(orderId);
        if (!currentOrder) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        const oldStatus = currentOrder.status;
        console.log(`🔍 Debug: Thay đổi trạng thái từ "${oldStatus}" sang "${status}"`);
        
        // Chặn completed -> cancelled
        if (oldStatus === 'completed' && status === 'cancelled') {
            console.log('❌ Chặn: Không thể hủy đơn hàng đã được giao');
            return res.status(400).json({ success: false, message: 'Không thể hủy đơn hàng đã được giao.' });
        }
        let result;
        try {
            result = await Order.updateStatus(orderId, status);
        } catch (error) {
            console.error('❌ Lỗi khi cập nhật trạng thái trong database:', error);
            return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái đơn hàng' });
        }
        
        if (result.modifiedCount > 0) {
            // Nếu đơn hàng được xác nhận từ pending sang processing, cập nhật tồn kho
            if (oldStatus === 'pending' && status === 'processing') {
                try {
                    const orderItems = Array.isArray(currentOrder.items) && currentOrder.items.length > 0
                        ? currentOrder.items
                        : (Array.isArray(currentOrder.products) ? currentOrder.products : []);
                    
                    if (orderItems && orderItems.length > 0) {
                        await Product.updateStockForOrder(orderItems);
                        console.log('✅ Admin đã xác nhận đơn hàng và cập nhật tồn kho:', orderId);
                    } else {
                        console.warn('⚠️ Không có sản phẩm nào để cập nhật tồn kho cho đơn hàng admin:', orderId);
                    }
                } catch (err) {
                    console.error('❌ Lỗi khi cập nhật tồn kho cho đơn hàng admin:', err);
                    // Không trả về lỗi cho user, chỉ log
                }
            }
            
            // Nếu đơn hàng bị hủy từ processing sang cancelled, hoàn lại tồn kho
            if (oldStatus === 'processing' && status === 'cancelled') {
                try {
                    const orderItems = Array.isArray(currentOrder.items) && currentOrder.items.length > 0
                        ? currentOrder.items
                        : (Array.isArray(currentOrder.products) ? currentOrder.products : []);
                    
                    if (orderItems && orderItems.length > 0) {
                        await Product.restoreStockForOrder(orderItems);
                        console.log('✅ Admin đã hủy đơn hàng và hoàn lại tồn kho:', orderId);
                    } else {
                        console.warn('⚠️ Không có sản phẩm nào để hoàn lại tồn kho cho đơn hàng admin:', orderId);
                    }
                } catch (err) {
                    console.error('❌ Lỗi khi hoàn lại tồn kho cho đơn hàng bị hủy:', err);
                    // Không trả về lỗi cho user, chỉ log
                }
            }
            
            // Gửi email thông báo thay đổi trạng thái đơn hàng
            try {
                const user = await User.findById(currentOrder.userId);
                if (user) {
                    await sendOrderStatusUpdate(currentOrder, user, oldStatus, status);
                }
            } catch (emailErr) {
                console.error('❌ Lỗi khi gửi email thông báo thay đổi trạng thái:', emailErr);
                // Không trả về lỗi cho user, chỉ log
            }
            
            res.redirect(`/admin/orders/${orderId}?success=status_updated`);
        } else {
            res.redirect(`/admin/orders/${orderId}?error=order_not_found`);
        }
    } catch (err) {
        console.error('Lỗi khi cập nhật trạng thái đơn hàng:', err);
        res.redirect(`/admin/orders/${req.body.orderId}?error=server_error`);
    }
};

// Cập nhật trạng thái thanh toán
exports.postUpdatePaymentStatus = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Không có quyền thực hiện thao tác này' });
        }

        const { orderId, paymentStatus } = req.body;
        
        if (!orderId || !paymentStatus) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin cần thiết' });
        }

        // Lấy thông tin đơn hàng hiện tại để kiểm tra trạng thái thanh toán cũ
        const currentOrder = await Order.findById(orderId);
        if (!currentOrder) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        const oldPaymentStatus = currentOrder.paymentStatus;
        const result = await Order.updatePaymentStatus(orderId, paymentStatus);
        
        if (result.modifiedCount > 0) {
            // Nếu thanh toán được xác nhận từ pending sang paid, cập nhật tồn kho
            if ((oldPaymentStatus === 'pending' || oldPaymentStatus === 'awaiting' || oldPaymentStatus === 'awaiting_payment') && (paymentStatus === 'paid' || paymentStatus === 'completed')) {
                try {
                    const orderItems = Array.isArray(currentOrder.items) && currentOrder.items.length > 0
                        ? currentOrder.items
                        : (Array.isArray(currentOrder.products) ? currentOrder.products : []);
                    
                    if (orderItems && orderItems.length > 0) {
                        await Product.updateStockForOrder(orderItems);
                        console.log('✅ Admin đã xác nhận thanh toán và cập nhật tồn kho:', orderId);
                    } else {
                        console.warn('⚠️ Không có sản phẩm nào để cập nhật tồn kho cho thanh toán admin:', orderId);
                    }
                } catch (err) {
                    console.error('❌ Lỗi khi cập nhật tồn kho cho thanh toán admin:', err);
                    // Không trả về lỗi cho user, chỉ log
                }
            }
            
            // Nếu thanh toán thất bại từ paid sang failed, hoàn lại tồn kho
            if ((oldPaymentStatus === 'paid' || oldPaymentStatus === 'completed') && paymentStatus === 'failed') {
                try {
                    const orderItems = Array.isArray(currentOrder.items) && currentOrder.items.length > 0
                        ? currentOrder.items
                        : (Array.isArray(currentOrder.products) ? currentOrder.products : []);
                    
                    if (orderItems && orderItems.length > 0) {
                        await Product.restoreStockForOrder(orderItems);
                        console.log('✅ Admin đã xác nhận thanh toán thất bại và hoàn lại tồn kho:', orderId);
                    } else {
                        console.warn('⚠️ Không có sản phẩm nào để hoàn lại tồn kho cho thanh toán thất bại:', orderId);
                    }
                } catch (err) {
                    console.error('❌ Lỗi khi hoàn lại tồn kho cho thanh toán thất bại:', err);
                    // Không trả về lỗi cho user, chỉ log
                }
            }
            
            // Gửi email thông báo thay đổi trạng thái thanh toán
            try {
                const user = await User.findById(currentOrder.userId);
                if (user) {
                    await sendPaymentStatusUpdate(currentOrder, user, oldPaymentStatus, paymentStatus);
                }
            } catch (emailErr) {
                console.error('❌ Lỗi khi gửi email thông báo thay đổi trạng thái thanh toán:', emailErr);
                // Không trả về lỗi cho user, chỉ log
            }
            
            res.redirect(`/admin/orders/${orderId}?success=payment_updated`);
        } else {
            res.redirect(`/admin/orders/${orderId}?error=order_not_found`);
        }
    } catch (err) {
        console.error('Lỗi khi cập nhật trạng thái thanh toán:', err);
        res.redirect(`/admin/orders/${req.body.orderId}?error=server_error`);
    }
};

// Xem chi tiết đơn hàng
exports.getOrderDetail = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'Bạn không có quyền truy cập trang này',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: false
            });
        }

        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).render('error', {
                pageTitle: 'Không tìm thấy',
                path: '/error',
                error: 'Không tìm thấy đơn hàng',
                isAuthenticated: true,
                isAdmin: true
            });
        }

        // Lấy thông tin sản phẩm đầy đủ cho từng item trong đơn hàng
        if (order.items && order.items.length > 0) {
            const Product = require('../models/product-mongoose');
            for (let i = 0; i < order.items.length; i++) {
                const item = order.items[i];
                if (item.productId) {
                    try {
                        const product = await Product.findById(item.productId);
                        if (product) {
                            // Cập nhật thông tin sản phẩm với dữ liệu mới nhất từ database
                            order.items[i].product = {
                                _id: product._id,
                                title: product.title,
                                imageUrl: product.imageUrl,
                                sku: product.sku,
                                price: product.price
                            };
                        }
                    } catch (err) {
                        console.error(`Lỗi khi lấy thông tin sản phẩm ${item.productId}:`, err);
                    }
                }
            }
        }
        
        if (!order.shippingInfo || !order.items || !Array.isArray(order.items) || order.items.length === 0 || typeof order.totalPrice !== 'number') {
            return res.status(400).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'Đơn hàng này thiếu thông tin cần thiết (khách, sản phẩm hoặc tổng tiền), không thể xem chi tiết.',
                isAuthenticated: true,
                isAdmin: true
            });
        }

        // Xử lý thông báo từ query parameters
        const success = req.query.success;
        const error = req.query.error;
        let message = null;
        let messageType = null;

        if (success === 'status_updated') {
            message = 'Cập nhật trạng thái đơn hàng thành công!';
            messageType = 'success';
        } else if (success === 'payment_updated') {
            message = 'Cập nhật trạng thái thanh toán thành công!';
            messageType = 'success';
        } else if (error === 'order_not_found') {
            message = 'Không tìm thấy đơn hàng!';
            messageType = 'error';
        } else if (error === 'server_error') {
            message = 'Có lỗi xảy ra khi cập nhật. Vui lòng thử lại!';
            messageType = 'error';
        }

        res.render('admin/order-detail', {
            pageTitle: `Chi tiết đơn hàng ${order._id}`,
            path: '/admin/orders',
            order: order,
            isAuthenticated: true,
            isAdmin: true,
            message: message,
            messageType: messageType,
            // Helper functions
            getStatusColor,
            getStatusText,
            getPaymentStatusColor,
            getPaymentStatusText,
            getPaymentMethodText
        });
    } catch (err) {
        console.error('Lỗi khi lấy chi tiết đơn hàng:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải chi tiết đơn hàng',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin'
        });
    }
};

// Controller xuất Excel danh sách sản phẩm
exports.getExportProducts = async (req, res, next) => {
    try {
        console.log('Bắt đầu xuất Excel danh sách sản phẩm');

        // Lấy danh sách sản phẩm với điều kiện lọc
        const { search, category, sort } = req.query;
        let filter = {};
        
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (category) {
            filter.category = category;
        }

        let products = await Product.find(filter);

        if (!products) {
            console.error('Không thể lấy danh sách sản phẩm');
            return res.status(500).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: 'Không thể lấy danh sách sản phẩm'
            });
        }

        // Sắp xếp sản phẩm
        if (sort) {
            switch (sort) {
                case 'name_asc':
                    products.sort((a, b) => a.title.localeCompare(b.title));
                    break;
                case 'name_desc':
                    products.sort((a, b) => b.title.localeCompare(a.title));
                    break;
                case 'price_asc':
                    products.sort((a, b) => a.price - b.price);
                    break;
                case 'price_desc':
                    products.sort((a, b) => b.price - a.price);
                    break;
                case 'stock_asc':
                    products.sort((a, b) => a.stockQuantity - b.stockQuantity);
                    break;
                case 'stock_desc':
                    products.sort((a, b) => b.stockQuantity - a.stockQuantity);
                    break;
                default:
                    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }
        }

        // Lấy danh mục từ database
        const categoriesData = await Category.find();
        const categories = {};
        categoriesData.forEach(cat => {
            categories[cat.slug] = cat.name;
        });

        let csvContent = 'Tên sản phẩm,Danh mục,Giá (VNĐ),Mô tả,Tồn kho,Ngày tạo\n';
        
        products.forEach(product => {
            const categoryName = categories[product.category] || product.category || 'Chưa phân loại';
            const price = (product.price || 0).toLocaleString('vi-VN');
            const description = (product.description || '').replace(/"/g, '""'); // Escape quotes
            const stock = product.stockQuantity || 0;
            const createdAt = new Date(product.createdAt).toLocaleDateString('vi-VN');
            
            csvContent += `"${product.title}","${categoryName}","${price}","${description}","${stock}","${createdAt}"\n`;
        });

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="products-${Date.now()}.csv"`);
        
        // Send CSV content
        res.send(csvContent);
        
        console.log('Đã xuất Excel danh sách sản phẩm thành công');
    } catch (err) {
        console.error('Lỗi khi xuất Excel danh sách sản phẩm:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể xuất Excel danh sách sản phẩm: ' + err.message
        });
    }
};

exports.getUsers = async (req, res, next) => {
    try {
        const db = getDb();
        // Lấy query filter
        const search = req.query.search || '';
        const role = req.query.role || '';
        const status = req.query.status || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // 5 tài khoản mỗi trang
        const skip = (page - 1) * limit;

        console.log('Filter params:', { search, role, status, page, limit, skip });

        // Tạo filter cho MongoDB
        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (role) {
            filter.role = role;
        }
        if (status) {
            if (status === 'active') {
                filter.isActive = { $ne: false };
            } else if (status === 'locked') {
                filter.isActive = false;
            }
        }

        console.log('MongoDB filter:', filter);

        // Get total users count for pagination
        const totalUsers = await db.collection('users').countDocuments(filter);
        const totalPages = Math.ceil(totalUsers / limit);

        // Get users with filter and pagination, sorted by creation date (newest first)
        const users = await db.collection('users').find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
        console.log('Found users:', users.length, 'Total users:', totalUsers, 'Total pages:', totalPages);

        // Tính toán thống kê (dựa trên tất cả users, không filter)
        const allUsers = await db.collection('users').find({}).sort({ createdAt: -1 }).toArray();
        const totalUsersCount = allUsers.length;
        const adminUsers = allUsers.filter(u => u.role === 'admin').length;
        const regularUsers = allUsers.filter(u => u.role === 'user').length;
        const activeUsers = allUsers.filter(u => u.isActive === undefined || u.isActive === true).length;
        const lockedUsers = allUsers.filter(u => u.isActive === false).length;
        const newUsersThisMonth = allUsers.filter(u => {
            const userDate = new Date(u.createdAt);
            const now = new Date();
            return userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
        }).length;

        res.render('admin/accounts-new', {
            pageTitle: 'Quản lý tài khoản',
            path: '/admin/accounts',
            users: users,
            user: req.session.user,
            search,
            role,
            status,
            totalUsers: totalUsersCount,
            adminUsers,
            regularUsers,
            activeUsers,
            lockedUsers,
            newUsersThisMonth,
            currentPage: page,
            totalPages: totalPages,
            hasUsers: users.length > 0
        });
    } catch (err) {
        console.error('Lỗi khi lấy danh sách users:', err);
        next(err);
    }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const db = getDb();
    await db.collection('users').deleteOne({ _id: new ObjectId(req.params.userId) });
    res.redirect('/admin/accounts');
  } catch (err) {
    next(err);
  }
};

// Controller cho modal delete (AJAX)
exports.postDeleteUser = async (req, res, next) => {
  try {
    const db = getDb();
    const { userId } = req.body;
    
    console.log('Xóa user ID:', userId);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin user ID'
      });
    }
    
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản để xóa'
      });
    }
    
    console.log('Đã xóa user thành công');
    res.json({
      success: true,
      message: 'Xóa tài khoản thành công'
    });
  } catch (err) {
    console.error('Lỗi xóa user:', err);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xóa tài khoản: ' + err.message
    });
  }
};

exports.getCreateUser = (req, res) => {
  res.render('admin/user-create', {
    pageTitle: 'Thêm user mới',
    path: '/admin/accounts/create',
    error: null,
    oldInput: { name: '', email: '', role: 'user' }
  });
};

exports.postCreateUser = async (req, res, next) => {
  try {
    const db = getDb();
    const { name, email, password, role } = req.body;
    console.log('Received data:', { name, email, password, role });
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    if (!name || !email || !password) {
      // Kiểm tra nếu là AJAX request
      if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ thông tin'
        });
      }
      return res.render('admin/user-create', {
        pageTitle: 'Thêm user mới',
        path: '/admin/accounts/create',
        error: 'Vui lòng nhập đầy đủ thông tin',
        oldInput: { name, email, role }
      });
    }
    // Kiểm tra email đã tồn tại
    const existing = await db.collection('users').findOne({ email });
    if (existing) {
      // Kiểm tra nếu là AJAX request
      if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.status(400).json({
          success: false,
          message: 'Email đã tồn tại'
        });
      }
      return res.render('admin/user-create', {
        pageTitle: 'Thêm user mới',
        path: '/admin/accounts/create',
        error: 'Email đã tồn tại',
        oldInput: { name, email, role }
      });
    }
    // Mã hóa password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Tạo user mới
    const newUser = {
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
      createdAt: new Date(),
      cart: { items: [], totalPrice: 0 }
    };
    console.log('Tạo user mới:', newUser);
    await db.collection('users').insertOne(newUser);
    console.log('Đã lưu user vào database');
    
    // Gửi email xác nhận đăng ký cho user mới
    try {
      const { sendSignupConfirmation } = require('../util/email');
      await sendSignupConfirmation(newUser);
      console.log('Đã gửi email xác nhận');
    } catch (e) {
      console.error('Không gửi được email xác nhận:', e);
    }
    
    console.log('Kiểm tra AJAX request:', req.xhr, req.headers.accept);
    // Kiểm tra nếu là AJAX request
    if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      console.log('Trả về JSON response');
      return res.json({
        success: true,
        message: 'Tạo tài khoản thành công',
        userId: newUser._id.toString()
      });
    }
    console.log('Redirect về trang accounts');
    res.redirect('/admin/accounts');
  } catch (err) {
    console.error('Lỗi tạo tài khoản:', err);
    console.error('Error stack:', err.stack);
    // Kiểm tra nếu là AJAX request
    if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tạo tài khoản: ' + err.message
      });
    }
    next(err);
  }
};

exports.getEditUser = async (req, res, next) => {
  try {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.userId) });
    if (!user) {
      return res.redirect('/admin/accounts');
    }
    res.render('admin/user-edit', {
      pageTitle: 'Sửa user',
      path: '/admin/accounts',
      error: null,
      user
    });
  } catch (err) {
    next(err);
  }
};

exports.postEditUser = async (req, res, next) => {
  try {
    const db = getDb();
    const { name, email, role } = req.body;
    if (!name || !email) {
      const user = { _id: req.params.userId, name, email, role };
      return res.render('admin/user-edit', {
        pageTitle: 'Sửa user',
        path: '/admin/accounts',
        error: 'Vui lòng nhập đầy đủ thông tin',
        user
      });
    }
    await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.userId) },
      { $set: { name, email, role } }
    );
    res.redirect('/admin/accounts');
  } catch (err) {
    next(err);
  }
};

exports.postEditUserModal = async (req, res, next) => {
  try {
    const db = getDb();
    const { userId, name, email, role } = req.body;
    console.log('Edit user received data:', { userId, name, email, role });
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
    if (!name || !email) {
      console.log('Missing required fields:', { name, email });
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { name, email, role } }
    );
    res.json({
      success: true,
      message: 'Cập nhật tài khoản thành công'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi cập nhật tài khoản'
    });
  }
};

// ===== QUẢN LÝ TRẠNG THÁI TÀI KHOẢN =====

// Debug route để test hiển thị tài khoản
exports.getUsersDebug = async (req, res, next) => {
  try {
    const db = getDb();
    
    // Lấy tất cả users
    const users = await db.collection('users').find({}).toArray();
    
    console.log('Debug users:', users.map(u => ({
      name: u.name,
      email: u.email,
      isActive: u.isActive,
      _id: u._id
    })));
    
    res.render('admin/accounts-debug', {
      pageTitle: 'Debug Quản lý tài khoản',
      path: '/admin/accounts',
      users: users,
      user: req.session.user
    });
  } catch (err) {
    console.error('Lỗi khi lấy danh sách users debug:', err);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy danh sách users: ' + err.message
    });
  }
};

// Toggle trạng thái tài khoản (khóa/mở khóa)
exports.toggleAccountStatus = async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin user ID'
      });
    }

    // Kiểm tra quyền admin
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }

    // Không cho phép khóa chính mình
    if (userId === req.session.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể khóa tài khoản của chính mình'
      });
    }

    const result = await User.toggleAccountStatus(userId);
    
    if (result.modifiedCount > 0) {
      // Lấy thông tin user để trả về trạng thái mới
      const user = await User.findById(userId);
      const newStatus = user.isActive ? 'hoạt động' : 'bị khóa';
      
      res.json({
        success: true,
        message: `Tài khoản đã được chuyển sang trạng thái ${newStatus}`,
        isActive: user.isActive
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản hoặc không có thay đổi nào'
      });
    }
  } catch (err) {
    console.error('Lỗi khi toggle trạng thái tài khoản:', err);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi thay đổi trạng thái tài khoản: ' + err.message
    });
  }
};

// Khóa tài khoản
exports.lockAccount = async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin user ID'
      });
    }

    // Kiểm tra quyền admin
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }

    // Không cho phép khóa chính mình
    if (userId === req.session.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể khóa tài khoản của chính mình'
      });
    }

    const result = await User.lockAccount(userId);
    
    if (result.modifiedCount > 0) {
      res.json({
        success: true,
        message: 'Tài khoản đã được khóa thành công'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản hoặc tài khoản đã bị khóa'
      });
    }
  } catch (err) {
    console.error('Lỗi khi khóa tài khoản:', err);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi khóa tài khoản: ' + err.message
    });
  }
};

// Mở khóa tài khoản
exports.unlockAccount = async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin user ID'
      });
    }

    // Kiểm tra quyền admin
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }

    const result = await User.unlockAccount(userId);
    
    if (result.modifiedCount > 0) {
      res.json({
        success: true,
        message: 'Tài khoản đã được mở khóa thành công'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản hoặc tài khoản đã hoạt động'
      });
    }
  } catch (err) {
    console.error('Lỗi khi mở khóa tài khoản:', err);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi mở khóa tài khoản: ' + err.message
    });
  }
};

// Lấy thống kê trạng thái tài khoản
exports.getAccountStatusStats = async (req, res, next) => {
  try {
    const stats = await User.getAccountStatusStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Lỗi khi lấy thống kê trạng thái tài khoản:', err);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy thống kê: ' + err.message
    });
  }
};

// Xoá đơn hàng (chỉ cho phép nếu trạng thái là 'pending')
exports.deleteOrder = async (req, res, next) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Không có quyền thực hiện thao tác này' });
        }
        const orderId = req.params.orderId;
        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Thiếu mã đơn hàng' });
        }
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }
        if (order.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Chỉ có thể xoá đơn hàng ở trạng thái Chờ xác nhận!' });
        }
        await Order.deleteById(orderId);
        res.json({ success: true });
    } catch (err) {
        console.error('Lỗi khi xoá đơn hàng:', err);
        res.status(500).json({ success: false, message: 'Lỗi server khi xoá đơn hàng' });
    }
};

// ===== QUẢN LÝ KHO SẢN PHẨM =====

// Hiển thị trang quản lý kho

// Cập nhật số lượng tồn kho
exports.updateStockQuantity = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }

        const { productId, quantity, action } = req.body;

        if (!productId || quantity === undefined || quantity < 0) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ'
            });
        }

        const db = getDb();
        const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        let newQuantity;
        switch (action) {
            case 'set':
                newQuantity = parseInt(quantity);
                break;
            case 'add':
                newQuantity = product.stockQuantity + parseInt(quantity);
                break;
            case 'subtract':
                newQuantity = Math.max(0, product.stockQuantity - parseInt(quantity));
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Hành động không hợp lệ'
                });
        }

        // Cập nhật số lượng tồn kho
        await db.collection('products').updateOne(
            { _id: new ObjectId(productId) },
            { 
                $set: { 
                    stockQuantity: newQuantity,
                    updatedAt: new Date()
                } 
            }
        );

        // Lấy thông tin sản phẩm đã cập nhật
        const updatedProduct = await db.collection('products').findOne({ _id: new ObjectId(productId) });

        res.json({
            success: true,
            message: 'Cập nhật số lượng tồn kho thành công',
            product: {
                _id: updatedProduct._id,
                title: updatedProduct.title,
                stockQuantity: updatedProduct.stockQuantity,
                price: updatedProduct.price
            }
        });

    } catch (err) {
        console.error('Lỗi khi cập nhật số lượng tồn kho:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật số lượng tồn kho'
        });
    }
};

// Cập nhật hàng loạt số lượng tồn kho
exports.bulkUpdateStock = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }

        const { updates } = req.body;

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ'
            });
        }

        const db = getDb();
        const results = [];

        for (const update of updates) {
            const { productId, quantity, action } = update;

            if (!productId || quantity === undefined || quantity < 0) {
                results.push({
                    productId,
                    success: false,
                    message: 'Dữ liệu không hợp lệ'
                });
                continue;
            }

            try {
                const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });

                if (!product) {
                    results.push({
                        productId,
                        success: false,
                        message: 'Không tìm thấy sản phẩm'
                    });
                    continue;
                }

                let newQuantity;
                switch (action) {
                    case 'set':
                        newQuantity = parseInt(quantity);
                        break;
                    case 'add':
                        newQuantity = product.stockQuantity + parseInt(quantity);
                        break;
                    case 'subtract':
                        newQuantity = Math.max(0, product.stockQuantity - parseInt(quantity));
                        break;
                    default:
                        results.push({
                            productId,
                            success: false,
                            message: 'Hành động không hợp lệ'
                        });
                        continue;
                }

                await db.collection('products').updateOne(
                    { _id: new ObjectId(productId) },
                    { 
                        $set: { 
                            stockQuantity: newQuantity,
                            updatedAt: new Date()
                        } 
                    }
                );

                results.push({
                    productId,
                    success: true,
                    message: 'Cập nhật thành công',
                    oldQuantity: product.stockQuantity,
                    newQuantity: newQuantity
                });

            } catch (err) {
                results.push({
                    productId,
                    success: false,
                    message: 'Lỗi khi cập nhật sản phẩm'
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;

        res.json({
            success: true,
            message: `Cập nhật ${successCount} sản phẩm thành công, ${failCount} sản phẩm thất bại`,
            results: results
        });

    } catch (err) {
        console.error('Lỗi khi cập nhật hàng loạt số lượng tồn kho:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật hàng loạt số lượng tồn kho'
        });
    }
};


exports.getDashboard = async (req, res) => {
  try {
    const [products, orders, users] = await Promise.all([
      Product.find({}),
      Order.findAll(),
      (async () => { const db = getDb(); return db.collection('users').find({}).toArray(); })()
    ]);

    const totalProducts = products.length;
    const totalOrders = orders.length;
    const totalUsers = users.length;
    const totalRevenue = orders.filter(o => o.paymentStatus === 'paid' || o.paymentStatus === 'completed').reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    console.log('📊 Dashboard Debug - Total Revenue:', totalRevenue);

    // Lấy đơn hàng gần đây (5 đơn hàng mới nhất)
    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Lấy sản phẩm bán chạy (5 sản phẩm có số lượng bán cao nhất)
    const topProducts = products
      .sort((a, b) => (b.soldQuantity || 0) - (a.soldQuantity || 0))
      .slice(0, 5);

    // Tính doanh thu theo tháng (6 tháng gần nhất)
    const monthlyRevenue = [];
    const monthlyOrders = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
      
      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= monthDate && orderDate < nextMonthDate;
      });
      
      const monthRevenue = monthOrders
        .filter(o => o.paymentStatus === 'paid' || o.paymentStatus === 'completed')
        .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      
      monthlyRevenue.push(monthRevenue);
      monthlyOrders.push(monthOrders.length);
    }

    // Thống kê bổ sung
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const newUsersThisMonth = users.filter(u => {
      const userDate = new Date(u.createdAt);
      const now = new Date();
      return userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
    }).length;

    res.render('admin/dashboard-new', {
      path: '/admin/dashboard',
      pageTitle: 'Dashboard',
      isAuthenticated: true,
      isAdmin: true,
      user: req.session.user,
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue,
      recentOrders,
      topProducts,
      monthlyRevenue,
      monthlyOrders,
      pendingOrders,
      completedOrders,
      newUsersThisMonth
    });
  } catch (err) {
    console.error('Lỗi khi lấy thống kê dashboard:', err);
    res.status(500).render('error', {
      pageTitle: 'Lỗi',
      path: '/error',
      error: 'Không thể tải dữ liệu thống kê',
      isAuthenticated: req.session.user ? true : false,
      isAdmin: req.session.user && req.session.user.role === 'admin',
      user: req.session.user || null
    });
  }
};

// Trang quản lý đánh giá cho admin (có trạng thái duyệt, tìm kiếm, lọc, phân trang)
exports.getReviews = async (req, res, next) => {
    try {
        const Product = require('../models/product-mongoose');
        const products = await Product.find();
        let allReviews = [];
        products.forEach(product => {
            if (product.reviews && product.reviews.length > 0) {
                product.reviews.forEach(review => {
                    allReviews.push({
                        productId: product._id,
                        productTitle: product.title,
                        ...review
                    });
                });
            }
        });
        // Lọc theo query
        const search = req.query.search ? req.query.search.trim().toLowerCase() : '';
        const status = req.query.status || '';
        const productId = req.query.product || '';
        let filtered = allReviews;
        if (search) {
            filtered = filtered.filter(r =>
                (r.userName && r.userName.toLowerCase().includes(search)) ||
                (r.comment && r.comment.toLowerCase().includes(search)) ||
                (r.productTitle && r.productTitle.toLowerCase().includes(search))
            );
        }
        if (status === 'approved') filtered = filtered.filter(r => r.approved === true);
        if (status === 'pending') filtered = filtered.filter(r => !r.approved);
        if (productId) filtered = filtered.filter(r => r.productId.toString() === productId);
        const star = req.query.star || '';
        const sortTime = req.query.sortTime || 'desc';
        // Sắp xếp: mới nhất lên đầu, ưu tiên chưa duyệt, cho phép đảo chiều theo sortTime
        filtered.sort((a, b) => {
            if (a.approved !== b.approved) return a.approved ? 1 : -1;
            const cmp = new Date(b.createdAt) - new Date(a.createdAt);
            return sortTime === 'asc' ? -cmp : cmp;
        });
        if (star) filtered = filtered.filter(r => Number(r.rating) === Number(star));
        // Phân trang
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const totalReviews = filtered.length;
        const totalPages = Math.ceil(totalReviews / limit) || 1;
        const start = (page - 1) * limit;
        const reviewsPage = filtered.slice(start, start + limit);
        // Danh sách sản phẩm cho filter
        const productOptions = products.map(p => ({ _id: p._id, title: p.title }));
        // Tính toán thống kê
        const pendingReviews = filtered.filter(r => !r.approved).length;
        const approvedReviews = filtered.filter(r => r.approved === true).length;
        const averageRating = filtered.length > 0 ? 
            (filtered.reduce((sum, r) => sum + r.rating, 0) / filtered.length).toFixed(1) : '0.0';

        res.render('admin/reviews-new', {
            pageTitle: 'Quản lý đánh giá',
            path: '/admin/reviews',
            reviews: reviewsPage,
            totalPages,
            currentPage: page,
            totalReviews,
            search,
            status,
            productId,
            productOptions,
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null,
            star,
            sortTime,
            pendingReviews,
            approvedReviews,
            averageRating,
            rating: req.query.rating || ''
        });
    } catch (err) {
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải danh sách đánh giá',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null
        });
    }
};

// Xóa đánh giá khỏi sản phẩm
exports.postDeleteReview = async (req, res, next) => {
    try {
        const { productId, createdAt } = req.body;
        const db = require('../util/database').getDb();
        await db.collection('products').updateOne(
            { _id: new ObjectId(productId) },
            { $pull: { reviews: { createdAt: new Date(createdAt) } } }
        );
        res.redirect('/admin/reviews');
    } catch (err) {
        console.error('Lỗi xóa đánh giá:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể xóa đánh giá',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null
        });
    }
};

// GET /admin/profile
exports.getProfile = (req, res, next) => {
    res.render('admin/profile', {
        pageTitle: 'Thông tin cá nhân',
        path: '/admin/profile',
        isAuthenticated: req.session.user ? true : false,
        isAdmin: req.session.user && req.session.user.role === 'admin',
        user: req.session.user || null
    });
};

// GET /admin/settings
exports.getSettings = (req, res, next) => {
    res.render('admin/settings', {
        pageTitle: 'Cài đặt',
        path: '/admin/settings',
        isAuthenticated: req.session.user ? true : false,
        isAdmin: req.session.user && req.session.user.role === 'admin',
        user: req.session.user || null
    });
};

// Duyệt đánh giá (set approved=true)
exports.postApproveReview = async (req, res, next) => {
    try {
        const { productId, createdAt } = req.body;
        const db = require('../util/database').getDb();
        const result = await db.collection('products').updateOne(
            { _id: new ObjectId(productId) },
            { $set: { "reviews.$[elem].approved": true } },
            { arrayFilters: [
                { "elem.createdAt": new Date(createdAt) }
            ]}
        );
        res.redirect('/admin/reviews');
    } catch (err) {
        console.error('Lỗi duyệt đánh giá:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể duyệt đánh giá',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null
        });
    }
};

// Tạo sản phẩm mẫu
exports.createSampleProducts = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }

        // Sample shoe products data
        const sampleProducts = [
            // Nike Products
            {
                title: 'Nike Air Max 270',
                description: 'Giày thể thao Nike Air Max 270 với công nghệ Air Max đỉnh cao, thiết kế hiện đại và thoải mái tối đa.',
                price: 3200000,
                stockQuantity: 50,
                category: 'Sneaker',
                brand: 'Nike',
                imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Nike Air Force 1',
                description: 'Giày sneaker Nike Air Force 1 cổ điển với thiết kế đơn giản nhưng thời trang, phù hợp mọi phong cách.',
                price: 2800000,
                stockQuantity: 45,
                category: 'Sneaker',
                brand: 'Nike',
                imageUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Nike React Element 55',
                description: 'Giày chạy bộ Nike React với công nghệ React foam, đệm êm ái và phản hồi nhanh.',
                price: 3500000,
                stockQuantity: 30,
                category: 'Running',
                brand: 'Nike',
                imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Nike Dunk Low',
                description: 'Giày skate Nike Dunk Low với thiết kế retro, chất liệu da cao cấp và độ bền cao.',
                price: 2500000,
                stockQuantity: 40,
                category: 'Skate',
                brand: 'Nike',
                imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },

            // Adidas Products
            {
                title: 'Adidas Ultraboost 22',
                description: 'Giày chạy bộ Adidas Ultraboost 22 với công nghệ Boost, đệm năng lượng và độ bền cao.',
                price: 4200000,
                stockQuantity: 35,
                category: 'Running',
                brand: 'Adidas',
                imageUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Adidas Stan Smith',
                description: 'Giày tennis Adidas Stan Smith cổ điển với thiết kế đơn giản, chất liệu da cao cấp.',
                price: 2200000,
                stockQuantity: 60,
                category: 'Tennis',
                brand: 'Adidas',
                imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Adidas NMD R1',
                description: 'Giày lifestyle Adidas NMD R1 với thiết kế hiện đại, công nghệ Boost và phong cách street.',
                price: 3800000,
                stockQuantity: 25,
                category: 'Lifestyle',
                brand: 'Adidas',
                imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Adidas Yeezy Boost 350',
                description: 'Giày sneaker Adidas Yeezy Boost 350 với thiết kế độc đáo, công nghệ Boost và phong cách hype.',
                price: 8500000,
                stockQuantity: 15,
                category: 'Sneaker',
                brand: 'Adidas',
                imageUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },

            // Jordan Products
            {
                title: 'Air Jordan 1 Retro High',
                description: 'Giày basketball Air Jordan 1 Retro High với thiết kế cổ điển, chất liệu da cao cấp.',
                price: 4500000,
                stockQuantity: 20,
                category: 'Basketball',
                brand: 'Jordan',
                imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Air Jordan 4 Retro',
                description: 'Giày basketball Air Jordan 4 Retro với thiết kế iconic, công nghệ Air và độ bền cao.',
                price: 5200000,
                stockQuantity: 18,
                category: 'Basketball',
                brand: 'Jordan',
                imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Air Jordan 11 Retro',
                description: 'Giày basketball Air Jordan 11 Retro với thiết kế sang trọng, chất liệu patent leather.',
                price: 6800000,
                stockQuantity: 12,
                category: 'Basketball',
                brand: 'Jordan',
                imageUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Air Jordan 13 Retro',
                description: 'Giày basketball Air Jordan 13 Retro với thiết kế động vật, công nghệ Zoom Air.',
                price: 4800000,
                stockQuantity: 22,
                category: 'Basketball',
                brand: 'Jordan',
                imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },

            // Puma Products
            {
                title: 'Puma RS-X Reinvention',
                description: 'Giày lifestyle Puma RS-X Reinvention với thiết kế futuristic, công nghệ RS và phong cách street.',
                price: 2800000,
                stockQuantity: 40,
                category: 'Lifestyle',
                brand: 'Puma',
                imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Puma Suede Classic',
                description: 'Giày sneaker Puma Suede Classic với thiết kế đơn giản, chất liệu suede mềm mại.',
                price: 1800000,
                stockQuantity: 55,
                category: 'Sneaker',
                brand: 'Puma',
                imageUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Puma Future Rider',
                description: 'Giày chạy bộ Puma Future Rider với thiết kế retro-futuristic, đệm êm ái.',
                price: 2200000,
                stockQuantity: 35,
                category: 'Running',
                brand: 'Puma',
                imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Puma Thunder Spectra',
                description: 'Giày lifestyle Puma Thunder Spectra với thiết kế chunky, phong cách dad shoe.',
                price: 3200000,
                stockQuantity: 28,
                category: 'Lifestyle',
                brand: 'Puma',
                imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },

            // Converse Products
            {
                title: 'Converse Chuck Taylor All Star',
                description: 'Giày sneaker Converse Chuck Taylor All Star cổ điển với thiết kế đơn giản, canvas cao cấp.',
                price: 1200000,
                stockQuantity: 80,
                category: 'Sneaker',
                brand: 'Converse',
                imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Converse One Star',
                description: 'Giày sneaker Converse One Star với thiết kế vintage, chất liệu suede và phong cách retro.',
                price: 1500000,
                stockQuantity: 45,
                category: 'Sneaker',
                brand: 'Converse',
                imageUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Converse Chuck 70',
                description: 'Giày sneaker Converse Chuck 70 với thiết kế premium, chất liệu canvas dày và đế cao su.',
                price: 2000000,
                stockQuantity: 38,
                category: 'Sneaker',
                brand: 'Converse',
                imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Converse Pro Leather',
                description: 'Giày basketball Converse Pro Leather với thiết kế cổ điển, chất liệu da cao cấp.',
                price: 1800000,
                stockQuantity: 32,
                category: 'Basketball',
                brand: 'Converse',
                imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },

            // Vans Products
            {
                title: 'Vans Old Skool',
                description: 'Giày skate Vans Old Skool với thiết kế iconic, chất liệu canvas và phong cách street.',
                price: 1600000,
                stockQuantity: 65,
                category: 'Skate',
                brand: 'Vans',
                imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Vans Authentic',
                description: 'Giày skate Vans Authentic với thiết kế đơn giản, chất liệu canvas và phong cách minimalist.',
                price: 1400000,
                stockQuantity: 70,
                category: 'Skate',
                brand: 'Vans',
                imageUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Vans Sk8-Hi',
                description: 'Giày skate Vans Sk8-Hi với thiết kế high-top, chất liệu canvas và phong cách street.',
                price: 1800000,
                stockQuantity: 50,
                category: 'Skate',
                brand: 'Vans',
                imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Vans Slip-On',
                description: 'Giày skate Vans Slip-On với thiết kế slip-on, chất liệu canvas và phong cách casual.',
                price: 1500000,
                stockQuantity: 60,
                category: 'Skate',
                brand: 'Vans',
                imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },

            // Timberland Products
            {
                title: 'Timberland 6-Inch Premium Boot',
                description: 'Giày boot Timberland 6-Inch Premium với thiết kế work boot, chất liệu da cao cấp.',
                price: 4500000,
                stockQuantity: 25,
                category: 'Boot',
                brand: 'Timberland',
                imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Timberland Chukka Boot',
                description: 'Giày boot Timberland Chukka với thiết kế chukka, chất liệu suede và phong cách casual.',
                price: 3200000,
                stockQuantity: 30,
                category: 'Boot',
                brand: 'Timberland',
                imageUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Timberland Euro Hiker',
                description: 'Giày hiking Timberland Euro Hiker với thiết kế hiking, chất liệu da và đế chống trượt.',
                price: 3800000,
                stockQuantity: 20,
                category: 'Hiking',
                brand: 'Timberland',
                imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            },
            {
                title: 'Timberland Field Boot',
                description: 'Giày boot Timberland Field Boot với thiết kế field boot, chất liệu da và phong cách outdoor.',
                price: 4200000,
                stockQuantity: 18,
                category: 'Boot',
                brand: 'Timberland',
                imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
            }
        ];

        // Insert products one by one to handle SKU generation properly
        const createdProducts = [];
        for (const productData of sampleProducts) {
            try {
                // Generate SKU for each product
                const sku = await Product.generateSKU(productData.brand, productData.category);
                productData.sku = sku;
                
                const product = new Product(productData);
                await product.save();
                createdProducts.push(product);
                console.log(`✅ Created product: ${product.title} (SKU: ${sku})`);
            } catch (error) {
                console.error(`❌ Error creating product ${productData.title}:`, error);
                // Continue with other products even if one fails
            }
        }
        
        console.log(`✅ Created ${createdProducts.length} sample shoe products`);

        res.json({
            success: true,
            message: `Đã tạo thành công ${createdProducts.length} sản phẩm mẫu`,
            count: createdProducts.length
        });

    } catch (error) {
        console.error('❌ Error creating sample products:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo sản phẩm mẫu: ' + error.message
        });
    }
};
