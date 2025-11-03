const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình storage cho category images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'categories');
        
        // Tạo thư mục nếu chưa tồn tại
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Tạo tên file unique với timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        const fileName = `category-${uniqueSuffix}${fileExtension}`;
        cb(null, fileName);
    }
});

// Filter file types
const fileFilter = (req, file, cb) => {
    // Chỉ cho phép các file hình ảnh
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép upload file hình ảnh!'), false);
    }
};

// Cấu hình multer
const uploadCategoryImage = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1 // Chỉ cho phép 1 file
    }
});

// Middleware xử lý lỗi upload
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
                message: 'Chỉ được upload 1 file hình ảnh!'
            });
        }
    }
    
    if (err.message === 'Chỉ cho phép upload file hình ảnh!') {
        return res.status(400).json({
            success: false,
            message: 'Chỉ cho phép upload file hình ảnh!'
        });
    }
    
    next(err);
};

// Hàm xóa hình ảnh cũ
const deleteOldCategoryImage = (imageUrl) => {
    if (imageUrl && imageUrl.includes('/uploads/categories/')) {
        const imagePath = path.join(__dirname, '..', imageUrl);
        
        if (fs.existsSync(imagePath)) {
            try {
                fs.unlinkSync(imagePath);
                console.log('Đã xóa hình ảnh cũ:', imagePath);
            } catch (error) {
                console.error('Lỗi khi xóa hình ảnh cũ:', error);
            }
        }
    }
};

module.exports = {
    uploadCategoryImage,
    handleUploadError,
    deleteOldCategoryImage
};
