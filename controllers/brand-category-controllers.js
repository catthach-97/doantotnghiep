const Product = require('../models/product-mongoose');
const Category = require('../models/category');
const Brand = require('../models/brand');
const { uploadBrandLogo, handleUploadError, deleteOldLogo } = require('../middleware/brand-upload');
const { uploadCategoryImage, handleUploadError: handleCategoryUploadError, deleteOldCategoryImage } = require('../middleware/category-upload');

// ===== QUẢN LÝ THƯƠNG HIỆU =====

// Hiển thị trang quản lý thương hiệu
exports.getBrands = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).render('error', {
                pageTitle: 'Không có quyền truy cập',
                path: '/error',
                error: 'Bạn không có quyền truy cập trang này',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: false
            });
        }

        const search = req.query.search || '';
        const status = req.query.status || '';
        const country = req.query.country || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // 5 thương hiệu mỗi trang
        const skip = (page - 1) * limit;

        // Build filter object
        let filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (status) {
            filter.isActive = status === 'active';
        }
        if (country) {
            filter.country = country;
        }

        // Get total brands count for pagination
        const totalBrands = await Brand.countDocuments(filter);
        const totalPages = Math.ceil(totalBrands / limit);

        // Get brands with filter and pagination
        let brands = await Brand.find(filter).sort({ sortOrder: 1, name: 1 }).skip(skip).limit(limit);

        // Đếm số sản phẩm cho mỗi thương hiệu
        for (let brand of brands) {
            const productCount = await Product.countDocuments({ brand: brand.name });
            brand.productCount = productCount;
            console.log(`Brand: ${brand.name}, Products: ${productCount}`);
        }

        // Calculate statistics - sử dụng tất cả thương hiệu, không chỉ trang hiện tại
        const allBrands = await Brand.find({});
        const activeBrands = allBrands.filter(b => b.isActive).length;
        const inactiveBrands = allBrands.filter(b => !b.isActive).length;
        const newBrandsThisMonth = allBrands.filter(b => {
            const brandDate = new Date(b.createdAt);
            const now = new Date();
            return brandDate.getMonth() === now.getMonth() && brandDate.getFullYear() === now.getFullYear();
        }).length;

        // Tính tổng số sản phẩm trong tất cả thương hiệu
        const totalProducts = await Product.countDocuments({});
        
        // Debug: Kiểm tra tất cả sản phẩm và brand của chúng
        const allProducts = await Product.find({}, 'title brand');
        console.log('All products with brands:');
        allProducts.forEach(product => {
            console.log(`Product: ${product.title}, Brand: "${product.brand}"`);
        });

        res.render('admin/brands-fixed', {
            pageTitle: 'Quản lý thương hiệu',
            path: '/admin/brands',
            brands: brands,
            user: req.session.user,
            search,
            status,
            country,
            totalBrands,
            activeBrands,
            inactiveBrands,
            newBrandsThisMonth,
            totalProducts: totalProducts, // Tổng số sản phẩm
            currentPage: page,
            totalPages: totalPages,
            hasBrands: brands.length > 0
        });
    } catch (err) {
        console.error('Lỗi khi lấy danh sách thương hiệu:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải danh sách thương hiệu',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null
        });
    }
};

// Thêm/sửa thương hiệu
exports.postBrand = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }

        const { action, brandId, name, description, isActive } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Tên thương hiệu là bắt buộc'
            });
        }

        if (action === 'add') {
            // Tạo slug từ name
            const slug = name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim('-');

            // Kiểm tra slug đã tồn tại chưa
            const existingBrand = await Brand.findOne({ slug });
            if (existingBrand) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên thương hiệu đã tồn tại'
                });
            }

            // Xử lý logo nếu có
            let logoPath = '';
            if (req.file) {
                logoPath = '/uploads/brands/' + req.file.filename;
            }

            const brand = new Brand({
                name,
                slug,
                description,
                logo: logoPath,
                isActive: isActive === 'on' || isActive === true
            });

            await brand.save();

            res.redirect('/admin/brands?success=added');
        } else if (action === 'edit') {
            // Cập nhật thương hiệu
            const brand = await Brand.findById(brandId);
            if (!brand) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy thương hiệu'
                });
            }

            // Xử lý logo mới nếu có
            if (req.file) {
                // Xóa logo cũ nếu có
                if (brand.logo) {
                    deleteOldLogo(brand.logo);
                }
                // Cập nhật logo mới
                brand.logo = '/uploads/brands/' + req.file.filename;
            }

            brand.name = name;
            brand.description = description;
            brand.isActive = isActive === 'on' || isActive === true;

            await brand.save();

            res.redirect('/admin/brands?success=updated');
        } else {
            res.status(400).json({
                success: false,
                message: 'Hành động không hợp lệ'
            });
        }
    } catch (err) {
        console.error('Lỗi khi thêm/sửa thương hiệu:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thêm/sửa thương hiệu'
        });
    }
};

// Lấy thông tin thương hiệu theo ID
exports.getBrandById = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }

        const { brandId } = req.params;

        if (!brandId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ID thương hiệu'
            });
        }

        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thương hiệu'
            });
        }

        res.json({
            success: true,
            brand: brand
        });
    } catch (err) {
        console.error('Lỗi khi lấy thông tin thương hiệu:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin thương hiệu'
        });
    }
};

// Toggle trạng thái thương hiệu
exports.toggleBrandStatus = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }

        const { brandId } = req.body;

        if (!brandId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ID thương hiệu'
            });
        }

        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thương hiệu'
            });
        }

        // Toggle trạng thái
        brand.isActive = !brand.isActive;
        await brand.save();

        res.redirect('/admin/brands?success=toggled');
    } catch (err) {
        console.error('Lỗi khi toggle trạng thái thương hiệu:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thay đổi trạng thái thương hiệu'
        });
    }
};

// Xóa thương hiệu
exports.deleteBrand = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }

        const { brandId } = req.body;

        if (!brandId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ID thương hiệu'
            });
        }

        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thương hiệu'
            });
        }

        await Brand.findByIdAndDelete(brandId);

        res.redirect('/admin/brands?success=deleted');
    } catch (err) {
        console.error('Lỗi khi xóa thương hiệu:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa thương hiệu'
        });
    }
};

// ===== QUẢN LÝ DANH MỤC =====

// Hiển thị trang quản lý danh mục
exports.getCategories = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).render('error', {
                pageTitle: 'Không có quyền truy cập',
                path: '/error',
                error: 'Bạn không có quyền truy cập trang này',
                isAuthenticated: req.session.user ? true : false,
                isAdmin: false
            });
        }

        const search = req.query.search || '';
        const status = req.query.status || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // 5 danh mục mỗi trang
        const skip = (page - 1) * limit;

        // Build filter object
        let filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (status) {
            filter.isActive = status === 'active';
        }

        // Get total categories count for pagination
        const totalCategories = await Category.countDocuments(filter);
        const totalPages = Math.ceil(totalCategories / limit);

        // Get categories with filter and pagination - sắp xếp theo thứ tự mới nhất trước
        let categories = await Category.find(filter).sort({ createdAt: -1, sortOrder: 1, name: 1 }).skip(skip).limit(limit);

        // Đếm số sản phẩm cho mỗi danh mục
        for (let category of categories) {
            const productCount = await Product.countDocuments({ category: category.slug });
            category.productCount = productCount;
        }

        // Calculate statistics - sử dụng tất cả danh mục, không chỉ trang hiện tại
        const allCategories = await Category.find({});
        const activeCategories = allCategories.filter(c => c.isActive).length;
        const inactiveCategories = allCategories.filter(c => !c.isActive).length;
        const newCategoriesThisMonth = allCategories.filter(c => {
            const categoryDate = new Date(c.createdAt);
            const now = new Date();
            return categoryDate.getMonth() === now.getMonth() && categoryDate.getFullYear() === now.getFullYear();
        }).length;

        // Tính tổng số sản phẩm trong tất cả danh mục
        const totalProducts = await Product.countDocuments({});

        res.render('admin/categories-simple', {
            pageTitle: 'Quản lý danh mục',
            path: '/admin/categories',
            categories: categories,
            user: req.session.user,
            search,
            status,
            totalCategories,
            activeCategories,
            inactiveCategories,
            newCategoriesThisMonth,
            totalProducts: totalProducts, // Tổng số sản phẩm
            currentPage: page,
            totalPages: totalPages,
            hasCategories: categories.length > 0,
            success: req.query.success,
            error: req.query.error,
            message: req.query.message
        });
    } catch (err) {
        console.error('Lỗi khi lấy danh sách danh mục:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải danh sách danh mục',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null
        });
    }
};

// Thêm/sửa danh mục
exports.postCategory = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }

        const { action, categoryId, name, description, isActive } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Tên danh mục là bắt buộc'
            });
        }

        // Tự động tạo slug từ tên
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');

        if (action === 'add') {
            // Kiểm tra slug đã tồn tại chưa
            const existingCategory = await Category.findOne({ slug });
            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Slug danh mục đã tồn tại'
                });
            }

            const category = new Category({
                name,
                slug,
                description,
                imageUrl: req.file ? `/uploads/categories/${req.file.filename}` : null,
                isActive: isActive === 'on' || isActive === true
            });

            await category.save();

            res.redirect('/admin/categories?success=added');
        } else if (action === 'edit') {
            // Cập nhật danh mục
            const category = await Category.findById(categoryId);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy danh mục'
                });
            }

            // Kiểm tra slug mới có trùng với danh mục khác không
            if (slug !== category.slug) {
                const existingCategory = await Category.findOne({ slug, _id: { $ne: categoryId } });
                if (existingCategory) {
                    return res.status(400).json({
                        success: false,
                        message: 'Slug danh mục đã tồn tại'
                    });
                }
            }

            // Xóa hình ảnh cũ nếu có hình ảnh mới
            if (req.file && category.imageUrl) {
                deleteOldCategoryImage(category.imageUrl);
            }

            category.name = name;
            category.slug = slug;
            category.description = description;
            category.imageUrl = req.file ? `/uploads/categories/${req.file.filename}` : category.imageUrl;
            category.isActive = isActive === 'on' || isActive === true;

            await category.save();

            res.redirect('/admin/categories?success=updated');
        } else {
            res.status(400).json({
                success: false,
                message: 'Hành động không hợp lệ'
            });
        }
    } catch (err) {
        console.error('Lỗi khi thêm/sửa danh mục:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thêm/sửa danh mục'
        });
    }
};

// Lấy thông tin danh mục theo ID
exports.getCategoryById = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }

        const { categoryId } = req.params;

        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ID danh mục'
            });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục'
            });
        }

        res.json({
            success: true,
            category: category
        });
    } catch (err) {
        console.error('Lỗi khi lấy thông tin danh mục:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin danh mục'
        });
    }
};

// Toggle trạng thái danh mục
exports.toggleCategoryStatus = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }

        const { categoryId } = req.body;

        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ID danh mục'
            });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục'
            });
        }

        // Toggle trạng thái
        category.isActive = !category.isActive;
        await category.save();

        res.redirect('/admin/categories?success=toggled');
    } catch (err) {
        console.error('Lỗi khi toggle trạng thái danh mục:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thay đổi trạng thái danh mục'
        });
    }
};

// Xóa danh mục
exports.deleteCategory = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }

        const { categoryId } = req.body;

        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ID danh mục'
            });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục'
            });
        }

        // Kiểm tra xem có sản phẩm nào thuộc danh mục này không
        const productCount = await Product.countDocuments({ category: category.slug });
        if (productCount > 0) {
            return res.redirect('/admin/categories?error=cannot_delete&message=' + encodeURIComponent(`Không thể xóa danh mục vì còn ${productCount} sản phẩm thuộc danh mục này`));
        }

        await Category.findByIdAndDelete(categoryId);

        res.redirect('/admin/categories?success=deleted');
    } catch (err) {
        console.error('Lỗi khi xóa danh mục:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa danh mục'
        });
    }
};
