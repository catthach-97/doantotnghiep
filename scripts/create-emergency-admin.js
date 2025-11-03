// Script tạo tài khoản admin khẩn cấp
const mongoConnect = require('../util/database').mongoConnect;
const bcrypt = require('bcryptjs');

async function createEmergencyAdmin() {
    try {
        const db = mongoConnect();
        
        // Thông tin tài khoản admin khẩn cấp
        const adminData = {
            name: 'Emergency Admin',
            email: 'emergency@admin.com',
            password: await bcrypt.hash('admin123', 12), // Mật khẩu: admin123
            role: 'admin',
            isActive: true,
            createdAt: new Date(),
            cart: { items: [], totalPrice: 0 }
        };
        
        // Kiểm tra xem email đã tồn tại chưa
        const existingAdmin = await db.collection('users').findOne({ email: adminData.email });
        
        if (existingAdmin) {
            console.log('⚠️ Tài khoản admin khẩn cấp đã tồn tại');
            // Cập nhật để đảm bảo tài khoản hoạt động
            await db.collection('users').updateOne(
                { email: adminData.email },
                { $set: { isActive: true } }
            );
            console.log('✅ Đã kích hoạt tài khoản admin khẩn cấp');
        } else {
            // Tạo tài khoản mới
            await db.collection('users').insertOne(adminData);
            console.log('✅ Đã tạo tài khoản admin khẩn cấp');
        }
        
        console.log('📧 Email: emergency@admin.com');
        console.log('🔑 Mật khẩu: admin123');
        console.log('⚠️ Hãy đổi mật khẩu ngay sau khi đăng nhập!');
        
    } catch (error) {
        console.error('❌ Lỗi khi tạo tài khoản admin khẩn cấp:', error);
    }
}

createEmergencyAdmin();
