// Script test chức năng toggle trạng thái tài khoản
const mongoConnect = require('../util/database').mongoConnect;
const User = require('../models/user');

async function testToggle() {
    try {
        const db = mongoConnect();
        
        console.log('🧪 Đang test chức năng toggle...');
        
        // Lấy user đầu tiên để test
        const users = await db.collection('users').find({}).limit(1).toArray();
        
        if (users.length === 0) {
            console.log('❌ Không có user nào để test');
            return;
        }
        
        const testUser = users[0];
        console.log(`👤 Test user: ${testUser.name} (${testUser.email})`);
        console.log(`🔍 Trạng thái hiện tại: ${testUser.isActive}`);
        
        // Test toggle
        console.log('🔄 Đang toggle trạng thái...');
        const result = await User.toggleAccountStatus(testUser._id.toString());
        
        if (result.modifiedCount > 0) {
            console.log('✅ Toggle thành công');
            
            // Kiểm tra trạng thái mới
            const updatedUser = await User.findById(testUser._id.toString());
            console.log(`🔍 Trạng thái mới: ${updatedUser.isActive}`);
            
            // Toggle lại để khôi phục
            console.log('🔄 Đang khôi phục trạng thái...');
            await User.toggleAccountStatus(testUser._id.toString());
            
            const restoredUser = await User.findById(testUser._id.toString());
            console.log(`🔍 Trạng thái sau khi khôi phục: ${restoredUser.isActive}`);
            
        } else {
            console.log('❌ Toggle thất bại');
        }
        
    } catch (error) {
        console.error('❌ Lỗi khi test toggle:', error);
    }
}

testToggle();
