const mongoose = require('mongoose');
const Brand = require('../models/brand');
const fs = require('fs');
const path = require('path');

// Sử dụng cùng connection string như trong app.js
const MONGODB_URI = 'mongodb+srv://ITCschool:8GZ4Vs2IufF9uwFY@cluster0.unzei.mongodb.net/Cshop?retryWrites=true&w=majority&appName=Cluster0';

async function importBrandsOnly() {
    try {
        console.log('🔄 Đang kết nối đến MongoDB Atlas...');
        
        // Kết nối database
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Đã kết nối MongoDB Atlas thành công!');
        
        // Import thương hiệu
        console.log('\n📋 Đang import thương hiệu...');
        const brandsFilePath = path.join(__dirname, '../data/brands.json');
        
        if (fs.existsSync(brandsFilePath)) {
            const brandsData = JSON.parse(fs.readFileSync(brandsFilePath, 'utf8'));
            console.log(`📋 Tìm thấy ${brandsData.length} thương hiệu trong file backup`);
            
            // Xóa thương hiệu cũ
            await Brand.deleteMany({});
            console.log('🗑️  Đã xóa dữ liệu thương hiệu cũ');
            
            // Import thương hiệu mới (không sử dụng _id từ file)
            for (const brandData of brandsData) {
                try {
                    // Tạo object mới không có _id
                    const { _id, ...brandDataWithoutId } = brandData;
                    const brand = new Brand(brandDataWithoutId);
                    await brand.save();
                    console.log(`✅ Đã import thương hiệu: ${brandData.name}`);
                } catch (error) {
                    console.error(`❌ Lỗi khi import thương hiệu ${brandData.name}:`, error.message);
                }
            }
        } else {
            console.log('⚠️  Không tìm thấy file brands.json');
        }
        
        // Hiển thị thống kê cuối cùng
        console.log('\n📈 Thống kê cuối cùng:');
        
        const allBrands = await Brand.find({});
        console.log(`🏷️  Tổng số thương hiệu: ${allBrands.length}`);
        allBrands.forEach(brand => {
            console.log(`   - ${brand.name} (${brand.slug})`);
        });
        
        console.log('\n🎉 Hoàn thành import thương hiệu vào MongoDB Atlas!');
        console.log('💡 Bây giờ bạn có thể vào trang quản lý thương hiệu để xem Nike và Adidas');
        
    } catch (error) {
        console.error('❌ Lỗi khi import thương hiệu:', error);
    } finally {
        if (mongoose.connection.readyState === 1) {
            mongoose.connection.close();
        }
    }
}

importBrandsOnly();
