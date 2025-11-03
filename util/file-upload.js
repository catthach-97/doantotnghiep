const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình lưu trữ file trong memory (không tạo file ngay lập tức)
const memoryStorage = multer.memoryStorage();

// Cấu hình lưu trữ file trên disk (chỉ dùng khi cần)
const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images/products');
    },
    filename: (req, file, cb) => {
        // Tạo tên file duy nhất bằng timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Kiểm tra loại file
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file ảnh (JPEG, PNG, JPG)'), false);
    }
};

// Cấu hình multer với memory storage (không tạo file ngay lập tức)
const upload = multer({
    storage: memoryStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
    }
});

// Cấu hình multer với disk storage (chỉ dùng khi cần)
const uploadDisk = multer({
    storage: diskStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
    }
});

// Helper function để lưu file từ memory buffer
const saveFileFromBuffer = (buffer, filename) => {
    const filePath = path.join(__dirname, '..', 'public', 'images', 'products', filename);
    fs.writeFileSync(filePath, buffer);
    return filePath;
};

module.exports = {
    upload,
    uploadDisk,
    saveFileFromBuffer
}; 