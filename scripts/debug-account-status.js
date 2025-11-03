// Script debug để kiểm tra trạng thái tài khoản
const mongoose = require('mongoose');

async function debugAccountStatus() {
    try {
        // Kết nối MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://ITCschool:8GZ4Vs2IufF9uwFY@cluster0.unzei.mongodb.net/Cshop?retryWrites=true&w=majority&appName=Cluster0');
        
        console.log('🔍 Đang kiểm tra trạng thái tài khoản...');
        
        // Lấy tất cả user
        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        
        console.log(`📊 Tổng số user: ${users.length}`);
        console.log('\n👥 Chi tiết từng user:');
        
        users.forEach((user, index) => {
            console.log(`\n${index + 1}. ${user.name} (${user.email})`);
            console.log(`   - ID: ${user._id}`);
            console.log(`   - isActive: ${user.isActive}`);
            console.log(`   - isActive type: ${typeof user.isActive}`);
            console.log(`   - Logic check: ${user.isActive === undefined || user.isActive === true ? 'SHOW LOCK BUTTON' : 'SHOW UNLOCK BUTTON'}`);
            console.log(`   - Status: ${(user.isActive === undefined || user.isActive === true) ? 'Hoạt động' : 'Bị khóa'}`);
        });
        
        // Kiểm tra cụ thể user hongcat2
        const hongcat2 = users.find(u => u.name === 'hongcat2');
        if (hongcat2) {
            console.log('\n🔍 Chi tiết user hongcat2:');
            console.log(`   - isActive: ${hongcat2.isActive}`);
            console.log(`   - isActive === false: ${hongcat2.isActive === false}`);
            console.log(`   - isActive === true: ${hongcat2.isActive === true}`);
            console.log(`   - isActive === undefined: ${hongcat2.isActive === undefined}`);
            console.log(`   - Logic: ${(hongcat2.isActive === undefined || hongcat2.isActive === true) ? 'SHOW LOCK' : 'SHOW UNLOCK'}`);
        }
        
    } catch (error) {
        console.error('❌ Lỗi khi debug:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugAccountStatus();
