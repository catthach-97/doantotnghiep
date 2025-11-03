const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    imageUrl: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    price: { 
        type: Number, 
        required: true,
        min: 0
    },
    stockQuantity: { 
        type: Number, 
        default: 0,
        min: 0
    },
    category: { 
        type: String,
        required: true
    },
    brand: {
        type: String,
        default: ''
    },
    sku: {
        type: String,
        unique: true,
        sparse: true, // Cho phép null values
        trim: true
    },
    stockStatus: {
        type: String,
        enum: ['out_of_stock', 'low_stock', 'medium_stock', 'in_stock'],
        default: 'in_stock'
    },
    reviews: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Function tự động sinh SKU
productSchema.statics.generateSKU = async function(brand = '', category = '') {
    try {
        // Tạo prefix từ brand hoặc category
        let prefix = 'SP'; // Mặc định
        
        if (brand) {
            // Ưu tiên brand trước
            prefix = brand.substring(0, 3).toUpperCase();
        } else if (category) {
            // Nếu không có brand thì dùng category
            prefix = category.substring(0, 3).toUpperCase();
        }
        
        // Lấy số thứ tự tiếp theo cho prefix này
        const existingProducts = await this.find({ 
            sku: { $regex: `^${prefix}-` } 
        }).sort({ sku: -1 }).limit(1);
        
        let nextNumber = 1;
        if (existingProducts.length > 0) {
            // Lấy số cuối cùng và tăng lên 1
            const lastSku = existingProducts[0].sku;
            const lastNumber = parseInt(lastSku.split('-')[1]) || 0;
            nextNumber = lastNumber + 1;
        }
        
        // Tạo SKU với format: PREFIX-XXXX
        let sku = `${prefix}-${String(nextNumber).padStart(4, '0')}`;
        
        // Kiểm tra SKU có trùng lặp không và tạo SKU duy nhất
        let counter = 0;
        while (await this.findOne({ sku: sku })) {
            counter++;
            sku = `${prefix}-${String(nextNumber).padStart(4, '0')}-${counter}`;
            if (counter > 100) {
                // Fallback nếu vẫn trùng
                const timestamp = Date.now().toString().slice(-6);
                sku = `${prefix}-${timestamp}`;
                break;
            }
        }
        
        return sku;
    } catch (error) {
        console.error('Lỗi khi sinh SKU:', error);
        // Fallback: sử dụng timestamp
        const timestamp = Date.now();
        return `SP-${timestamp}`;
    }
};

// Cập nhật updatedAt và stockStatus trước khi lưu
productSchema.pre('save', async function(next) {
    this.updatedAt = new Date();
    
    // Tự động sinh SKU nếu chưa có
    if (!this.sku) {
        this.sku = await this.constructor.generateSKU(this.brand, this.category);
    }
    
    // Tự động cập nhật stockStatus dựa trên stockQuantity
    if (this.stockQuantity === 0) {
        this.stockStatus = 'out_of_stock';
    } else if (this.stockQuantity >= 1 && this.stockQuantity <= 4) {
        this.stockStatus = 'low_stock';
    } else if (this.stockQuantity >= 5 && this.stockQuantity <= 10) {
        this.stockStatus = 'medium_stock';
    } else {
        this.stockStatus = 'in_stock';
    }
    
    next();
});

// Static method để cập nhật tồn kho
productSchema.statics.updateStock = async function(productId, quantity) {
    try {
        if (!productId) {
            throw new Error('Product ID là bắt buộc');
        }
        if (!quantity || quantity <= 0) {
            throw new Error('Số lượng phải lớn hơn 0');
        }
        
        console.log(`🔄 Cập nhật tồn kho: Sản phẩm ${productId}, giảm ${quantity}`);
        
        // Lấy sản phẩm hiện tại để tính stockStatus mới
        const product = await this.findById(productId);
        if (!product) {
            throw new Error(`Không tìm thấy sản phẩm với ID: ${productId}`);
        }
        
        const newStockQuantity = product.stockQuantity - quantity;
        let newStockStatus = 'in_stock';
        if (newStockQuantity === 0) {
            newStockStatus = 'out_of_stock';
        } else if (newStockQuantity >= 1 && newStockQuantity <= 4) {
            newStockStatus = 'low_stock';
        } else if (newStockQuantity >= 5 && newStockQuantity <= 10) {
            newStockStatus = 'medium_stock';
        }

        const result = await this.updateOne(
            { _id: productId },
            { 
                $inc: { stockQuantity: -quantity },
                $set: { 
                    updatedAt: new Date(),
                    stockStatus: newStockStatus
                }
            }
        );
        
        if (result.matchedCount === 0) {
            throw new Error(`Không tìm thấy sản phẩm với ID: ${productId}`);
        }
        
        console.log(`✅ Đã cập nhật tồn kho sản phẩm ${productId}: giảm ${quantity}`);
        return result;
    } catch (err) {
        console.error('❌ Lỗi khi cập nhật tồn kho:', err);
        throw err;
    }
};

// Static method để hoàn lại tồn kho
productSchema.statics.restoreStock = async function(productId, quantity) {
    try {
        if (!productId) {
            throw new Error('Product ID là bắt buộc');
        }
        if (!quantity || quantity <= 0) {
            throw new Error('Số lượng phải lớn hơn 0');
        }
        
        console.log(`🔄 Hoàn lại tồn kho: Sản phẩm ${productId}, tăng ${quantity}`);
        
        // Lấy sản phẩm hiện tại để tính stockStatus mới
        const product = await this.findById(productId);
        if (!product) {
            throw new Error(`Không tìm thấy sản phẩm với ID: ${productId}`);
        }
        
        const newStockQuantity = product.stockQuantity + quantity;
        let newStockStatus = 'in_stock';
        if (newStockQuantity === 0) {
            newStockStatus = 'out_of_stock';
        } else if (newStockQuantity >= 1 && newStockQuantity <= 4) {
            newStockStatus = 'low_stock';
        } else if (newStockQuantity >= 5 && newStockQuantity <= 10) {
            newStockStatus = 'medium_stock';
        }

        const result = await this.updateOne(
            { _id: productId },
            { 
                $inc: { stockQuantity: quantity },
                $set: { 
                    updatedAt: new Date(),
                    stockStatus: newStockStatus
                }
            }
        );
        
        if (result.matchedCount === 0) {
            throw new Error(`Không tìm thấy sản phẩm với ID: ${productId}`);
        }
        
        console.log(`✅ Đã hoàn lại tồn kho sản phẩm ${productId}: tăng ${quantity}`);
        return result;
    } catch (err) {
        console.error('❌ Lỗi khi hoàn lại tồn kho:', err);
        throw err;
    }
};

// Static method để cập nhật tồn kho cho nhiều sản phẩm
productSchema.statics.updateStockForOrder = async function(orderItems) {
    try {
        if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
            console.warn('⚠️ updateStockForOrder: orderItems rỗng hoặc không hợp lệ');
            return;
        }
        
        console.log('🔄 Bắt đầu cập nhật tồn kho cho đơn hàng:', orderItems);
        
        const updatePromises = orderItems.map(item => {
            if (!item.productId || !item.quantity) {
                console.warn('⚠️ updateStockForOrder: item không hợp lệ:', item);
                return Promise.resolve();
            }
            return this.updateStock(item.productId, item.quantity);
        });
        
        await Promise.all(updatePromises);
        console.log('✅ Đã cập nhật tồn kho cho tất cả sản phẩm trong đơn hàng');
    } catch (err) {
        console.error('❌ Lỗi khi cập nhật tồn kho cho đơn hàng:', err);
        throw err;
    }
};

// Static method để hoàn lại tồn kho cho nhiều sản phẩm
productSchema.statics.restoreStockForOrder = async function(orderItems) {
    try {
        if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
            console.warn('⚠️ restoreStockForOrder: orderItems rỗng hoặc không hợp lệ');
            return;
        }
        
        console.log('🔄 Bắt đầu hoàn lại tồn kho cho đơn hàng bị hủy:', orderItems);
        
        const restorePromises = orderItems.map(item => {
            if (!item.productId || !item.quantity) {
                console.warn('⚠️ restoreStockForOrder: item không hợp lệ:', item);
                return Promise.resolve();
            }
            return this.restoreStock(item.productId, item.quantity);
        });
        
        await Promise.all(restorePromises);
        console.log('✅ Đã hoàn lại tồn kho cho tất cả sản phẩm trong đơn hàng bị hủy');
    } catch (err) {
        console.error('❌ Lỗi khi hoàn lại tồn kho cho đơn hàng:', err);
        throw err;
    }
};

// Thêm indexes để cải thiện hiệu suất query
productSchema.index({ title: 'text', description: 'text' }); // Text search
productSchema.index({ category: 1 }); // Category filter
productSchema.index({ brand: 1 }); // Brand filter
productSchema.index({ price: 1 }); // Price sorting
productSchema.index({ createdAt: -1 }); // Date sorting
productSchema.index({ category: 1, price: 1 }); // Compound index for category + price
productSchema.index({ brand: 1, category: 1 }); // Compound index for brand + category

module.exports = mongoose.model('Product', productSchema);
