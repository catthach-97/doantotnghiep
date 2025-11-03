const mongoose = require('mongoose');
const Product = require('../models/product');
const fs = require('fs');
const path = require('path');

// Kết nối database
mongoose.connect('mongodb://localhost:27017/shoe-store');

async function importProductsToDatabase() {
    try {
        console.log('🔄 Đang import dữ liệu sản phẩm vào database...');
        
        // Đọc dữ liệu từ file products.json
        const productsFilePath = path.join(__dirname, '../data/products.json');
        
        if (!fs.existsSync(productsFilePath)) {
            console.error('❌ Không tìm thấy file products.json');
            return;
        }
        
        const productsData = JSON.parse(fs.readFileSync(productsFilePath, 'utf8'));
        
        console.log(`📋 Tìm thấy ${productsData.length} sản phẩm trong file backup`);
        
        // Xóa tất cả sản phẩm cũ (nếu có)
        await Product.deleteMany({});
        console.log('🗑️  Đã xóa dữ liệu sản phẩm cũ');
        
        // Import dữ liệu mới
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
        
        console.log(`\n📊 Kết quả import:`);
        console.log(`✅ Thành công: ${successCount} sản phẩm`);
        console.log(`❌ Lỗi: ${errorCount} sản phẩm`);
        
        // Hiển thị thống kê theo thương hiệu
        const allProducts = await Product.find({});
        const brandStats = {};
        
        allProducts.forEach(product => {
            if (!brandStats[product.brand]) {
                brandStats[product.brand] = 0;
            }
            brandStats[product.brand]++;
        });
        
        console.log('\n📈 Thống kê theo thương hiệu:');
        Object.keys(brandStats).forEach(brand => {
            console.log(`- ${brand}: ${brandStats[brand]} sản phẩm`);
        });
        
        console.log('\n🎉 Hoàn thành import dữ liệu sản phẩm vào database!');
        
    } catch (error) {
        console.error('❌ Lỗi khi import sản phẩm:', error);
    } finally {
        mongoose.connection.close();
    }
}

importProductsToDatabase();
