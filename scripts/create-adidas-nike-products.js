const fs = require('fs');
const path = require('path');

// Dữ liệu sản phẩm mới cho Adidas và Nike
const newProducts = [
    // Nike Products
    {
        "_id": "nike_1",
        "title": "Nike Air Force 1 '07",
        "brand": "Nike",
        "category": "sneaker",
        "price": 2200000,
        "stockQuantity": 45,
        "sku": "NIK-AF1-001",
        "stockStatus": "in_stock",
        "description": "Giày sneaker Nike Air Force 1 '07 với thiết kế cổ điển và chất liệu da cao cấp",
        "imageUrl": "/images/products/nike/nike-air-force-1.jpg",
        "createdAt": new Date().toISOString(),
        "updatedAt": new Date().toISOString()
    },
    {
        "_id": "nike_2",
        "title": "Nike Dunk Low",
        "brand": "Nike",
        "category": "sneaker",
        "price": 2800000,
        "stockQuantity": 35,
        "sku": "NIK-DUNK-001",
        "stockStatus": "in_stock",
        "description": "Giày sneaker Nike Dunk Low với phong cách streetwear hiện đại",
        "imageUrl": "/images/products/nike/nike-dunk-low.jpg",
        "createdAt": new Date().toISOString(),
        "updatedAt": new Date().toISOString()
    },
    {
        "_id": "nike_3",
        "title": "Nike React Infinity Run Flyknit 3",
        "brand": "Nike",
        "category": "running",
        "price": 3500000,
        "stockQuantity": 25,
        "sku": "NIK-REACT-001",
        "stockStatus": "in_stock",
        "description": "Giày chạy bộ Nike React Infinity với công nghệ React foam tiên tiến",
        "imageUrl": "/images/products/nike/nike-react-infinity.jpg",
        "createdAt": new Date().toISOString(),
        "updatedAt": new Date().toISOString()
    },
    {
        "_id": "nike_4",
        "title": "Nike Blazer Mid '77",
        "brand": "Nike",
        "category": "sneaker",
        "price": 2400000,
        "stockQuantity": 40,
        "sku": "NIK-BLAZER-001",
        "stockStatus": "in_stock",
        "description": "Giày sneaker Nike Blazer Mid với thiết kế retro và chất liệu canvas",
        "imageUrl": "/images/products/nike/nike-blazer-mid.jpg",
        "createdAt": new Date().toISOString(),
        "updatedAt": new Date().toISOString()
    },
    {
        "_id": "nike_5",
        "title": "Nike Zoom Pegasus 39",
        "brand": "Nike",
        "category": "running",
        "price": 3200000,
        "stockQuantity": 30,
        "sku": "NIK-PEGASUS-001",
        "stockStatus": "in_stock",
        "description": "Giày chạy bộ Nike Zoom Pegasus 39 với Zoom Air technology",
        "imageUrl": "/images/products/nike/nike-zoom-pegasus.jpg",
        "createdAt": new Date().toISOString(),
        "updatedAt": new Date().toISOString()
    },
    
    // Adidas Products
    {
        "_id": "adidas_1",
        "title": "Adidas Stan Smith",
        "brand": "Adidas",
        "category": "sneaker",
        "price": 1800000,
        "stockQuantity": 50,
        "sku": "ADI-STAN-001",
        "stockStatus": "in_stock",
        "description": "Giày sneaker Adidas Stan Smith với thiết kế tối giản và chất liệu da cao cấp",
        "imageUrl": "/images/products/adidas/adidas-stan-smith.jpg",
        "createdAt": new Date().toISOString(),
        "updatedAt": new Date().toISOString()
    },
    {
        "_id": "adidas_2",
        "title": "Adidas NMD R1",
        "brand": "Adidas",
        "category": "sneaker",
        "price": 2900000,
        "stockQuantity": 35,
        "sku": "ADI-NMD-001",
        "stockStatus": "in_stock",
        "description": "Giày sneaker Adidas NMD R1 với công nghệ Boost và thiết kế futuristic",
        "imageUrl": "/images/products/adidas/adidas-nmd-r1.jpg",
        "createdAt": new Date().toISOString(),
        "updatedAt": new Date().toISOString()
    },
    {
        "_id": "adidas_3",
        "title": "Adidas Ultraboost 22",
        "brand": "Adidas",
        "category": "running",
        "price": 4200000,
        "stockQuantity": 20,
        "sku": "ADI-UB22-001",
        "stockStatus": "in_stock",
        "description": "Giày chạy bộ Adidas Ultraboost 22 với Boost technology và Primeknit upper",
        "imageUrl": "/images/products/adidas/adidas-ultraboost-22.jpg",
        "createdAt": new Date().toISOString(),
        "updatedAt": new Date().toISOString()
    },
    {
        "_id": "adidas_4",
        "title": "Adidas Gazelle",
        "brand": "Adidas",
        "category": "sneaker",
        "price": 2100000,
        "stockQuantity": 45,
        "sku": "ADI-GAZELLE-001",
        "stockStatus": "in_stock",
        "description": "Giày sneaker Adidas Gazelle với thiết kế retro và chất liệu suede",
        "imageUrl": "/images/products/adidas/adidas-gazelle.jpg",
        "createdAt": new Date().toISOString(),
        "updatedAt": new Date().toISOString()
    },
    {
        "_id": "adidas_5",
        "title": "Adidas Solarboost 5",
        "brand": "Adidas",
        "category": "running",
        "price": 3800000,
        "stockQuantity": 25,
        "sku": "ADI-SOLAR-001",
        "stockStatus": "in_stock",
        "description": "Giày chạy bộ Adidas Solarboost 5 với Solar Propulsion Rail technology",
        "imageUrl": "/images/products/adidas/adidas-solarboost-5.jpg",
        "createdAt": new Date().toISOString(),
        "updatedAt": new Date().toISOString()
    }
];

async function createNewProducts() {
    try {
        console.log('🔄 Đang tạo dữ liệu sản phẩm mới cho Adidas và Nike...');
        
        // Đọc dữ liệu sản phẩm hiện tại
        const productsFilePath = path.join(__dirname, '../data/products.json');
        let existingProducts = [];
        
        if (fs.existsSync(productsFilePath)) {
            const fileContent = fs.readFileSync(productsFilePath, 'utf8');
            existingProducts = JSON.parse(fileContent);
            console.log(`📋 Tìm thấy ${existingProducts.length} sản phẩm hiện tại`);
        }
        
        // Kiểm tra xem sản phẩm đã tồn tại chưa
        const existingIds = existingProducts.map(p => p._id);
        const newProductsToAdd = newProducts.filter(p => !existingIds.includes(p._id));
        
        if (newProductsToAdd.length === 0) {
            console.log('⚠️  Tất cả sản phẩm đã tồn tại trong database');
            return;
        }
        
        // Thêm sản phẩm mới vào danh sách
        const updatedProducts = [...existingProducts, ...newProductsToAdd];
        
        // Ghi lại file products.json
        fs.writeFileSync(productsFilePath, JSON.stringify(updatedProducts, null, 2));
        
        console.log(`✅ Đã thêm ${newProductsToAdd.length} sản phẩm mới:`);
        
        // Hiển thị danh sách sản phẩm Nike
        const nikeProducts = newProductsToAdd.filter(p => p.brand === 'Nike');
        console.log('\n👟 Sản phẩm Nike:');
        nikeProducts.forEach((product, index) => {
            console.log(`${index + 1}. ${product.title} - ${product.price.toLocaleString('vi-VN')} ₫`);
        });
        
        // Hiển thị danh sách sản phẩm Adidas
        const adidasProducts = newProductsToAdd.filter(p => p.brand === 'Adidas');
        console.log('\n👟 Sản phẩm Adidas:');
        adidasProducts.forEach((product, index) => {
            console.log(`${index + 1}. ${product.title} - ${product.price.toLocaleString('vi-VN')} ₫`);
        });
        
        console.log(`\n📊 Tổng cộng: ${updatedProducts.length} sản phẩm trong database`);
        console.log('🎉 Hoàn thành tạo dữ liệu sản phẩm mới!');
        
    } catch (error) {
        console.error('❌ Lỗi khi tạo sản phẩm mới:', error);
    }
}

createNewProducts();
