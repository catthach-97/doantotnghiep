const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Tạo thư mục uploads/brands nếu chưa tồn tại
const uploadDir = path.join(__dirname, '..', 'uploads', 'brands');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình storage cho Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Tạo tên file unique với timestamp và extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, 'brand-' + uniqueSuffix + extension);
    }
});

// Filter để chỉ cho phép upload hình ảnh
const fileFilter = (req, file, cb) => {
    // Kiểm tra loại file
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép upload file hình ảnh!'), false);
    }
};

// Cấu hình Multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
        files: 1 // Chỉ cho phép 1 file
    }
});

// Middleware để xử lý upload logo
const uploadBrandLogo = upload.single('logo');

// Middleware để xử lý lỗi upload
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File quá lớn! Kích thước tối đa là 5MB.'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ được upload 1 file logo!'
            });
        }
    }
    
    if (err.message === 'Chỉ cho phép upload file hình ảnh!') {
        return res.status(400).json({
            success: false,
            message: 'Chỉ cho phép upload file hình ảnh (JPG, PNG, GIF, WebP)!'
        });
    }
    
    next(err);
};

// Function để xóa file logo cũ
const deleteOldLogo = (logoPath) => {
    if (logoPath && logoPath !== '') {
        const fullPath = path.join(__dirname, '..', logoPath);
        if (fs.existsSync(fullPath)) {
            try {
                fs.unlinkSync(fullPath);
                console.log('Đã xóa logo cũ:', fullPath);
            } catch (error) {
                console.error('Lỗi khi xóa logo cũ:', error);
            }
        }
    }
};

module.exports = {
    uploadBrandLogo,
    handleUploadError,
    deleteOldLogo
};
