const { upload } = require('../util/file-upload');
const fs = require('fs');
const path = require('path');

// Middleware xử lý upload file cho thêm sản phẩm
const handleAddProductUpload = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            return res.status(400).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: err.message,
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }
        next();
    });
};

// Middleware xử lý upload file cho sửa sản phẩm
const handleEditProductUpload = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            return res.status(400).render('error', {
                pageTitle: 'Lỗi',
                path: '/error',
                error: err.message,
                isAuthenticated: req.session.user ? true : false,
                isAdmin: req.session.user && req.session.user.role === 'admin'
            });
        }
        next();
    });
};

// Helper function để xóa file cũ
const deleteOldFile = (filePath) => {
    if (filePath) {
        const fullPath = path.join(__dirname, '..', 'public', filePath);
        try {
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log('✅ Đã xóa file cũ:', fullPath);
                return true;
            }
        } catch (error) {
            console.error('❌ Lỗi khi xóa file cũ:', error);
        }
    }
    return false;
};

module.exports = {
    handleAddProductUpload,
    handleEditProductUpload,
    deleteOldFile
};
