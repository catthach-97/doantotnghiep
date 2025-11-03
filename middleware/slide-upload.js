const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình lưu trữ cho Multer
const slideStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/slides');
        // Đảm bảo thư mục tồn tại
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Tạo tên file duy nhất: slide-timestamp-randomstring.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, 'slide-' + uniqueSuffix + fileExtension);
    }
});

// Filter file để chỉ cho phép hình ảnh
const slideFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép upload file hình ảnh!'), false);
    }
};

// Khởi tạo Multer upload middleware
const uploadSlideImage = multer({
    storage: slideStorage,
    fileFilter: slideFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Giới hạn 10MB
    }
}).single('image'); // 'image' là tên trường trong form input type="file"

// Middleware xử lý lỗi upload
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).redirect('/admin/slides?error=file_size_limit');
        }
        return res.status(400).redirect('/admin/slides?error=upload_failed');
    } else if (err) {
        return res.status(400).redirect('/admin/slides?error=' + encodeURIComponent(err.message));
    }
    next();
};

// Hàm xóa hình ảnh cũ
const deleteOldSlideImage = (imagePath) => {
    if (imagePath && imagePath.startsWith('/uploads/slides/')) {
        const filePath = path.join(__dirname, '..', imagePath);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('Đã xóa hình ảnh slide cũ:', filePath);
            }
        } catch (err) {
            console.error('Lỗi khi xóa hình ảnh slide cũ:', filePath, err);
        }
    }
};

module.exports = {
    uploadSlideImage,
    handleUploadError,
    deleteOldSlideImage
};
