const { spawn } = require('child_process');
const mongoose = require('mongoose');

async function startAppAndCheck() {
    try {
        console.log('🔄 Đang khởi động ứng dụng web...');
        
        // Khởi động ứng dụng web
        const app = spawn('node', ['app.js'], {
            stdio: 'pipe',
            shell: true
        });
        
        console.log('⏳ Đang chờ ứng dụng khởi động...');
        
        // Chờ 5 giây để ứng dụng khởi động
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('🔄 Đang kiểm tra kết nối database...');
        
        // Thử kết nối database
        try {
            await mongoose.connect('mongodb://localhost:27017/shoe-store', {
                serverSelectionTimeoutMS: 5000,
            });
            
            console.log('✅ Kết nối database thành công!');
            
            // Kiểm tra dữ liệu
            const Brand = require('../models/brand');
            const Product = require('../models/product');
            
            const brands = await Brand.find({});
            const products = await Product.find({});
            
            console.log(`\n📊 Dữ liệu hiện tại:`);
            console.log(`🏷️  Thương hiệu: ${brands.length}`);
            console.log(`👟 Sản phẩm: ${products.length}`);
            
            if (brands.length > 0) {
                console.log('\n📋 Danh sách thương hiệu:');
                brands.forEach(brand => {
                    console.log(`- ${brand.name} (${brand.slug})`);
                });
            }
            
            if (products.length > 0) {
                console.log('\n👟 Danh sách sản phẩm:');
                products.forEach(product => {
                    console.log(`- ${product.title} (${product.brand})`);
                });
            }
            
        } catch (error) {
            console.error('❌ Lỗi kết nối database:', error.message);
            console.log('\n💡 Hướng dẫn khắc phục:');
            console.log('1. Khởi động MongoDB Compass');
            console.log('2. Hoặc cài đặt MongoDB và khởi động service');
            console.log('3. Đảm bảo MongoDB chạy trên port 27017');
        } finally {
            if (mongoose.connection.readyState === 1) {
                mongoose.connection.close();
            }
        }
        
        // Dừng ứng dụng
        app.kill();
        
    } catch (error) {
        console.error('❌ Lỗi khi khởi động ứng dụng:', error);
    }
}

startAppAndCheck();
