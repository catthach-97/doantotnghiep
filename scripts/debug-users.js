// Script debug để kiểm tra dữ liệu user
const mongoConnect = require('../util/database').mongoConnect;

async function debugUsers() {
    try {
        const db = mongoConnect();
        
        console.log('🔍 Đang kiểm tra dữ liệu user...');
        
        // Lấy tất cả user
        const users = await db.collection('users').find({}).toArray();
        
        console.log(`📊 Tổng số user: ${users.length}`);
        
        users.forEach((user, index) => {
            console.log(`\n👤 User ${index + 1}:`);
            console.log(`   - ID: ${user._id}`);
            console.log(`   - Name: ${user.name}`);
            console.log(`   - Email: ${user.email}`);
            console.log(`   - Role: ${user.role}`);
            console.log(`   - isActive: ${user.isActive}`);
            console.log(`   - isActive type: ${typeof user.isActive}`);
            console.log(`   - Created: ${user.createdAt}`);
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi debug user:', error);
    }
}

debugUsers();
