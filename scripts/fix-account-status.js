// Script sửa lỗi trạng thái tài khoản
const mongoose = require('mongoose');

async function fixAccountStatus() {
    try {
        // Kết nối MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://ITCschool:8GZ4Vs2IufF9uwFY@cluster0.unzei.mongodb.net/Cshop?retryWrites=true&w=majority&appName=Cluster0');
        
        console.log('🔄 Đang cập nhật trạng thái tài khoản...');
        
        // Cập nhật tất cả user không có trường isActive
        const result = await mongoose.connection.db.collection('users').updateMany(
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
        const totalUsers = await mongoose.connection.db.collection('users').countDocuments();
        const activeUsers = await mongoose.connection.db.collection('users').countDocuments({ isActive: true });
        const lockedUsers = await mongoose.connection.db.collection('users').countDocuments({ isActive: false });
        
        console.log('📊 Thống kê tài khoản:');
        console.log(`   - Tổng: ${totalUsers}`);
        console.log(`   - Hoạt động: ${activeUsers}`);
        console.log(`   - Bị khóa: ${lockedUsers}`);
        
        // Hiển thị danh sách user để kiểm tra
        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        console.log('\n👥 Danh sách user:');
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.email}) - isActive: ${user.isActive}`);
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật trạng thái tài khoản:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixAccountStatus();
