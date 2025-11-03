module.exports = (req, res, next) => {
    try {
        console.log('🔐 Checking auth for:', req.url);
        console.log('🔐 Session exists:', !!req.session);
        console.log('🔐 Session user:', !!req.session?.user);
        
        if (!req.session.user) {
            console.log('Chưa đăng nhập');
            // Kiểm tra nếu là API request
            if (req.xhr || req.headers.accept?.includes('application/json') || req.path.startsWith('/admin/')) {
                return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
            }
            // Lưu URL hiện tại để redirect sau khi đăng nhập
            req.session.returnTo = req.originalUrl;
            return res.redirect('/login');
        }

        if (!req.session.user._id) {
            console.log('User không có _id');
            // Kiểm tra nếu là API request
            if (req.xhr || req.headers.accept?.includes('application/json') || req.path.startsWith('/admin/')) {
                return res.status(401).json({ success: false, message: 'Session không hợp lệ' });
            }
            // Lưu URL hiện tại để redirect sau khi đăng nhập
            req.session.returnTo = req.originalUrl;
            return res.redirect('/login');
        }

        console.log('🔐 Auth passed for user:', req.session.user._id);
        next();
    } catch (error) {
        console.error('🚨 Error in is-auth middleware:', error);
        return res.status(500).json({ error: 'Authentication error' });
    }
};