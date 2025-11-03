// Script để cập nhật trạng thái tài khoản cho các user cũ
const mongoConnect = require('../util/database').mongoConnect;

async function updateUserStatus() {
    try {
        const db = mongoConnect();
        
        console.log('🔄 Đang cập nhật trạng thái tài khoản...');
        
        // Cập nhật tất cả user không có trường isActive
        const result = await db.collection('users').updateMany(
            { isActive: { $exists: false } },
            { 
                $set: { 
                    isActive: true,
                    updatedAt: new Date()
                } 
            }
        );
        
        console.log(`✅ Đã cập nhật ${result.modifiedCount} tài khoản`);
        
        // Kiểm tra kết quả
        const totalUsers = await db.collection('users').countDocuments();
        const activeUsers = await db.collection('users').countDocuments({ isActive: true });
        const lockedUsers = await db.collection('users').countDocuments({ isActive: false });
        
        console.log('📊 Thống kê tài khoản:');
        console.log(`   - Tổng: ${totalUsers}`);
        console.log(`   - Hoạt động: ${activeUsers}`);
        console.log(`   - Bị khóa: ${lockedUsers}`);
        
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật trạng thái tài khoản:', error);
    }
}

updateUserStatus();
