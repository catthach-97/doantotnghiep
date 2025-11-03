// Script để mở khóa tài khoản từ database
const mongoConnect = require('../util/database').mongoConnect;
const mongodb = require('mongodb');

async function unlockAccount(userEmail) {
    try {
        const db = mongoConnect();
        
        // Tìm user theo email
        const user = await db.collection('users').findOne({ email: userEmail });
        
        if (!user) {
            console.log('❌ Không tìm thấy tài khoản với email:', userEmail);
            return;
        }
        
        // Mở khóa tài khoản
        const result = await db.collection('users').updateOne(
            { _id: user._id },
            { 
                $set: { 
                    isActive: true,
                    updatedAt: new Date()
                } 
            }
        );
        
        if (result.modifiedCount > 0) {
            console.log('✅ Đã mở khóa tài khoản:', userEmail);
        } else {
            console.log('⚠️ Tài khoản đã được mở khóa hoặc không có thay đổi');
        }
        
    } catch (error) {
        console.error('❌ Lỗi khi mở khóa tài khoản:', error);
    }
}

// Sử dụng script này
// node scripts/unlock-account.js
// Thay đổi email bên dưới thành email tài khoản cần mở khóa
const emailToUnlock = 'admin@example.com'; // Thay đổi email này

unlockAccount(emailToUnlock);
