const Slide = require('../models/slide');
const { uploadSlideImage, handleUploadError, deleteOldSlideImage } = require('../middleware/slide-upload');

// ===== QUẢN LÝ SLIDE BANNER =====

// Hiển thị trang quản lý slide
exports.getSlides = async (req, res, next) => {
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

        // Build filter object
        let filter = {};
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { subtitle: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (status) {
            filter.isActive = status === 'active';
        }

        // Get slides with filter
        let slides = await Slide.find(filter).sort({ sortOrder: 1, createdAt: -1 });

        // Calculate statistics
        const totalSlides = slides.length;
        const activeSlides = slides.filter(s => s.isActive).length;
        const inactiveSlides = slides.filter(s => !s.isActive).length;
        const currentSlides = slides.filter(s => s.isCurrentlyActive).length;

        res.render('admin/slides', {
            pageTitle: 'Quản lý slide banner',
            path: '/admin/slides',
            slides: slides,
            user: req.session.user,
            search,
            status,
            totalSlides,
            activeSlides,
            inactiveSlides,
            currentSlides
        });
    } catch (err) {
        console.error('Lỗi khi lấy danh sách slide:', err);
        res.status(500).render('error', {
            pageTitle: 'Lỗi',
            path: '/error',
            error: 'Không thể tải danh sách slide',
            isAuthenticated: req.session.user ? true : false,
            isAdmin: req.session.user && req.session.user.role === 'admin',
            user: req.session.user || null
        });
    }
};

// Thêm/sửa slide
exports.postSlide = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }

        const { 
            action, 
            slideId, 
            title, 
            subtitle, 
            description, 
            link, 
            buttonText, 
            isActive, 
            sortOrder,
            startDate,
            endDate,
            backgroundColor,
            textColor,
            position,
            animation
        } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Tiêu đề slide là bắt buộc'
            });
        }

        if (action === 'add') {
            // Xử lý hình ảnh nếu có
            let imagePath = '';
            if (req.file) {
                imagePath = '/uploads/slides/' + req.file.filename;
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Hình ảnh slide là bắt buộc'
                });
            }

            const slide = new Slide({
                title,
                subtitle,
                description,
                image: imagePath,
                link,
                buttonText: buttonText || 'Xem ngay',
                isActive: isActive === 'on' || isActive === true,
                sortOrder: parseInt(sortOrder) || 0,
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : null,
                backgroundColor: backgroundColor || '#ffffff',
                textColor: textColor || '#000000',
                position: position || 'center',
                animation: animation || 'fade'
            });

            await slide.save();

            res.redirect('/admin/slides?success=added');
        } else if (action === 'edit') {
            // Cập nhật slide
            const slide = await Slide.findById(slideId);
            if (!slide) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy slide'
                });
            }

            // Xử lý hình ảnh mới nếu có
            if (req.file) {
                // Xóa hình ảnh cũ nếu có
                if (slide.image) {
                    deleteOldSlideImage(slide.image);
                }
                // Cập nhật hình ảnh mới
                slide.image = '/uploads/slides/' + req.file.filename;
            }

            slide.title = title;
            slide.subtitle = subtitle;
            slide.description = description;
            slide.link = link;
            slide.buttonText = buttonText || 'Xem ngay';
            slide.isActive = isActive === 'on' || isActive === true;
            slide.sortOrder = parseInt(sortOrder) || 0;
            slide.startDate = startDate ? new Date(startDate) : slide.startDate;
            slide.endDate = endDate ? new Date(endDate) : null;
            slide.backgroundColor = backgroundColor || '#ffffff';
            slide.textColor = textColor || '#000000';
            slide.position = position || 'center';
            slide.animation = animation || 'fade';

            await slide.save();

            res.redirect('/admin/slides?success=updated');
        } else {
            res.status(400).json({
                success: false,
                message: 'Hành động không hợp lệ'
            });
        }
    } catch (err) {
        console.error('Lỗi khi thêm/sửa slide:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thêm/sửa slide'
        });
    }
};

// Lấy thông tin slide theo ID
exports.getSlideById = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }

        const { slideId } = req.params;

        if (!slideId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ID slide'
            });
        }

        const slide = await Slide.findById(slideId);
        if (!slide) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy slide'
            });
        }

        res.json({
            success: true,
            slide: slide
        });
    } catch (err) {
        console.error('Lỗi khi lấy thông tin slide:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin slide'
        });
    }
};

// Toggle trạng thái slide
exports.toggleSlideStatus = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }

        const { slideId } = req.body;

        if (!slideId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ID slide'
            });
        }

        const slide = await Slide.findById(slideId);
        if (!slide) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy slide'
            });
        }

        // Toggle trạng thái
        slide.isActive = !slide.isActive;
        await slide.save();

        res.json({
            success: true,
            message: `Slide đã được ${slide.isActive ? 'kích hoạt' : 'tạm dừng'}`,
            isActive: slide.isActive
        });
    } catch (err) {
        console.error('Lỗi khi toggle trạng thái slide:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thay đổi trạng thái slide'
        });
    }
};

// Xóa slide
exports.deleteSlide = async (req, res, next) => {
    try {
        // Kiểm tra quyền admin
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }

        const { slideId } = req.body;

        if (!slideId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ID slide'
            });
        }

        const slide = await Slide.findById(slideId);
        if (!slide) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy slide'
            });
        }

        // Xóa hình ảnh cũ nếu có
        if (slide.image) {
            deleteOldSlideImage(slide.image);
        }

        await Slide.findByIdAndDelete(slideId);

        res.json({
            success: true,
            message: 'Xóa slide thành công'
        });
    } catch (err) {
        console.error('Lỗi khi xóa slide:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa slide'
        });
    }
};

// Lấy slides cho trang chủ (public)
exports.getActiveSlides = async (req, res, next) => {
    try {
        const now = new Date();
        const slides = await Slide.find({
            isActive: true,
            startDate: { $lte: now },
            $or: [
                { endDate: { $gte: now } },
                { endDate: { $exists: false } }
            ]
        }).sort({ sortOrder: 1, createdAt: -1 });

        res.json({
            success: true,
            slides: slides
        });
    } catch (err) {
        console.error('Lỗi khi lấy slides cho trang chủ:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy slides'
        });
    }
};

// Tăng view count cho slide
exports.incrementSlideView = async (req, res, next) => {
    try {
        const { slideId } = req.params;
        
        if (!slideId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ID slide'
            });
        }

        const slide = await Slide.findById(slideId);
        if (!slide) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy slide'
            });
        }

        await slide.incrementViewCount();

        res.json({
            success: true,
            message: 'Đã tăng view count'
        });
    } catch (err) {
        console.error('Lỗi khi tăng view count slide:', err);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tăng view count'
        });
    }
};
