module.exports = (req, res, next) => {
    console.log('🔐 [IS-ADMIN] Checking admin access...');
    console.log('🔐 [IS-ADMIN] Session exists:', !!req.session);
    console.log('🔐 [IS-ADMIN] Session user:', req.session?.user);
    console.log('🔐 [IS-ADMIN] User role:', req.session?.user?.role);
    
    if (!req.session.user) {
        console.log('❌ [IS-ADMIN] No user in session');
        return res.status(403).render('error', {
            pageTitle: 'Không có quyền truy cập',
            path: '/error',
            error: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để truy cập trang này.'
        });
    }
    
    if (req.session.user.role !== 'admin') {
        console.log('❌ [IS-ADMIN] User role is not admin:', req.session.user.role);
        return res.status(403).render('error', {
            pageTitle: 'Không có quyền truy cập',
            path: '/error',
            error: `Bạn không có quyền truy cập trang này. Vai trò hiện tại: ${req.session.user.role || 'không xác định'}`
        });
    }
    
    console.log('✅ [IS-ADMIN] Admin access granted');
    next();
}; 