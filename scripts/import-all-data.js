const mongoose = require('mongoose');
const Brand = require('../models/brand');
const Product = require('../models/product');
const fs = require('fs');
const path = require('path');

// Kết nối database
mongoose.connect('mongodb://localhost:27017/shoe-store');

async function importAllData() {
    try {
        console.log('🔄 Đang import tất cả dữ liệu vào database...');
        
        // Import thương hiệu
        console.log('\n📋 Đang import thương hiệu...');
        const brandsFilePath = path.join(__dirname, '../data/brands.json');
        
        if (fs.existsSync(brandsFilePath)) {
            const brandsData = JSON.parse(fs.readFileSync(brandsFilePath, 'utf8'));
            
            // Xóa thương hiệu cũ
            await Brand.deleteMany({});
            console.log('🗑️  Đã xóa dữ liệu thương hiệu cũ');
            
            // Import thương hiệu mới
            for (const brandData of brandsData) {
                try {
                    const brand = new Brand(brandData);
                    await brand.save();
                    console.log(`✅ Đã import thương hiệu: ${brandData.name}`);
                } catch (error) {
                    console.error(`❌ Lỗi khi import thương hiệu ${brandData.name}:`, error.message);
                }
            }
        } else {
            console.log('⚠️  Không tìm thấy file brands.json');
        }
        
        // Import sản phẩm
        console.log('\n📦 Đang import sản phẩm...');
        const productsFilePath = path.join(__dirname, '../data/products.json');
        
        if (fs.existsSync(productsFilePath)) {
            const productsData = JSON.parse(fs.readFileSync(productsFilePath, 'utf8'));
            
            // Xóa sản phẩm cũ
            await Product.deleteMany({});
            console.log('🗑️  Đã xóa dữ liệu sản phẩm cũ');
            
            // Import sản phẩm mới
            let successCount = 0;
            let errorCount = 0;
            
            for (const productData of productsData) {
                try {
                    const product = new Product(productData);
                    await product.save();
                    console.log(`✅ Đã import sản phẩm: ${productData.title}`);
                    successCount++;
                } catch (error) {
                    console.error(`❌ Lỗi khi import sản phẩm ${productData.title}:`, error.message);
                    errorCount++;
                }
            }
            
            console.log(`\n📊 Kết quả import sản phẩm:`);
            console.log(`✅ Thành công: ${successCount} sản phẩm`);
            console.log(`❌ Lỗi: ${errorCount} sản phẩm`);
        } else {
            console.log('⚠️  Không tìm thấy file products.json');
        }
        
        // Hiển thị thống kê cuối cùng
        console.log('\n📈 Thống kê cuối cùng:');
        
        const allBrands = await Brand.find({});
        console.log(`🏷️  Tổng số thương hiệu: ${allBrands.length}`);
        allBrands.forEach(brand => {
            console.log(`   - ${brand.name} (${brand.slug})`);
        });
        
        const allProducts = await Product.find({});
        console.log(`\n👟 Tổng số sản phẩm: ${allProducts.length}`);
        
        // Thống kê theo thương hiệu
        const brandStats = {};
        allProducts.forEach(product => {
            if (!brandStats[product.brand]) {
                brandStats[product.brand] = 0;
            }
            brandStats[product.brand]++;
        });
        
        console.log('\n📊 Thống kê sản phẩm theo thương hiệu:');
        Object.keys(brandStats).forEach(brand => {
            console.log(`   - ${brand}: ${brandStats[brand]} sản phẩm`);
        });
        
        console.log('\n🎉 Hoàn thành import tất cả dữ liệu vào database!');
        
    } catch (error) {
        console.error('❌ Lỗi khi import dữ liệu:', error);
    } finally {
        mongoose.connection.close();
    }
}

importAllData();
