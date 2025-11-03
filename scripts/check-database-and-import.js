const mongoose = require('mongoose');
const Brand = require('../models/brand');
const Product = require('../models/product');
const fs = require('fs');
const path = require('path');

async function checkDatabaseAndImport() {
    try {
        console.log('🔄 Đang kiểm tra kết nối database...');
        
        // Thử kết nối database
        await mongoose.connect('mongodb://localhost:27017/shoe-store', {
            serverSelectionTimeoutMS: 5000, // Timeout sau 5 giây
        });
        
        console.log('✅ Đã kết nối MongoDB thành công!');
        
        // Kiểm tra dữ liệu hiện tại
        const existingBrands = await Brand.find({});
        const existingProducts = await Product.find({});
        
        console.log(`\n📊 Dữ liệu hiện tại trong database:`);
        console.log(`🏷️  Thương hiệu: ${existingBrands.length}`);
        console.log(`👟 Sản phẩm: ${existingProducts.length}`);
        
        if (existingBrands.length > 0) {
            console.log('\n📋 Danh sách thương hiệu hiện tại:');
            existingBrands.forEach(brand => {
                console.log(`- ${brand.name} (${brand.slug}) - ${brand.isActive ? 'Hoạt động' : 'Tạm dừng'}`);
            });
        }
        
        if (existingProducts.length > 0) {
            console.log('\n👟 Danh sách sản phẩm hiện tại:');
            existingProducts.forEach(product => {
                console.log(`- ${product.title} (${product.brand}) - ${product.price.toLocaleString('vi-VN')} ₫`);
            });
        }
        
        // Nếu không có dữ liệu, thử import
        if (existingBrands.length === 0 || existingProducts.length === 0) {
            console.log('\n🔄 Không tìm thấy dữ liệu, đang import...');
            
            // Import thương hiệu
            const brandsFilePath = path.join(__dirname, '../data/brands.json');
            if (fs.existsSync(brandsFilePath)) {
                const brandsData = JSON.parse(fs.readFileSync(brandsFilePath, 'utf8'));
                console.log(`📋 Tìm thấy ${brandsData.length} thương hiệu trong file backup`);
                
                for (const brandData of brandsData) {
                    try {
                        const brand = new Brand(brandData);
                        await brand.save();
                        console.log(`✅ Đã import thương hiệu: ${brandData.name}`);
                    } catch (error) {
                        console.error(`❌ Lỗi khi import thương hiệu ${brandData.name}:`, error.message);
                    }
                }
            }
            
            // Import sản phẩm
            const productsFilePath = path.join(__dirname, '../data/products.json');
            if (fs.existsSync(productsFilePath)) {
                const productsData = JSON.parse(fs.readFileSync(productsFilePath, 'utf8'));
                console.log(`📦 Tìm thấy ${productsData.length} sản phẩm trong file backup`);
                
                for (const productData of productsData) {
                    try {
                        const product = new Product(productData);
                        await product.save();
                        console.log(`✅ Đã import sản phẩm: ${productData.title}`);
                    } catch (error) {
                        console.error(`❌ Lỗi khi import sản phẩm ${productData.title}:`, error.message);
                    }
                }
            }
        }
        
        console.log('\n🎉 Hoàn thành kiểm tra và import dữ liệu!');
        
    } catch (error) {
        console.error('❌ Lỗi khi kết nối database:', error.message);
        console.log('\n💡 Hướng dẫn khắc phục:');
        console.log('1. Kiểm tra xem MongoDB đã được cài đặt chưa');
        console.log('2. Khởi động MongoDB service');
        console.log('3. Hoặc sử dụng MongoDB Compass để kết nối');
        console.log('4. Đảm bảo MongoDB đang chạy trên port 27017');
    } finally {
        if (mongoose.connection.readyState === 1) {
            mongoose.connection.close();
        }
    }
}

checkDatabaseAndImport();
