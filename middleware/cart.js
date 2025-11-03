const Product = require('../models/product-mongoose');

// Middleware để quản lý giỏ hàng session
const cartMiddleware = (req, res, next) => {
    // Khởi tạo giỏ hàng session nếu chưa có
    if (!req.session.cart) {
        req.session.cart = {
            items: [],
            totalPrice: 0
        };
    }

    // Thêm các phương thức tiện ích cho giỏ hàng
    req.cart = {
        // Lấy giỏ hàng hiện tại
        getCart: () => {
            return req.session.cart;
        },

        // Thêm sản phẩm vào giỏ hàng
        addToCart: async (productId, quantity = 1) => {
            try {
                const product = await Product.findById(productId);
                if (!product) {
                    throw new Error('Không tìm thấy sản phẩm');
                }

                if (product.stockQuantity < quantity) {
                    throw new Error('Số lượng vượt quá tồn kho');
                }

                const existingItemIndex = req.session.cart.items.findIndex(
                    item => item.productId.toString() === productId.toString()
                );

                if (existingItemIndex > -1) {
                    // Cập nhật số lượng nếu sản phẩm đã có
                    const newQuantity = req.session.cart.items[existingItemIndex].quantity + quantity;
                    if (newQuantity > product.stockQuantity) {
                        throw new Error('Số lượng vượt quá tồn kho');
                    }
                    req.session.cart.items[existingItemIndex].quantity = newQuantity;
                } else {
                    // Thêm sản phẩm mới
                    req.session.cart.items.push({
                        productId: product._id,
                        title: product.title,
                        price: product.price,
                        imageUrl: product.imageUrl,
                        quantity: quantity,
                        stockQuantity: product.stockQuantity
                    });
                }

                // Cập nhật tổng giá
                req.cart.updateTotalPrice();
                return req.session.cart;
            } catch (error) {
                throw error;
            }
        },

        // Xóa sản phẩm khỏi giỏ hàng
        removeFromCart: (productId) => {
            console.log('Removing product with ID:', productId);
            console.log('Current cart items:', req.session.cart.items.map(item => ({
                productId: item.productId.toString(),
                title: item.title
            })));
            
            req.session.cart.items = req.session.cart.items.filter(
                item => item.productId.toString() !== productId.toString()
            );
            
            console.log('Cart items after removal:', req.session.cart.items.length);
            req.cart.updateTotalPrice();
            return req.session.cart;
        },

        // Cập nhật số lượng sản phẩm
        updateQuantity: async (productId, quantity) => {
            try {
                const product = await Product.findById(productId);
                if (!product) {
                    throw new Error('Không tìm thấy sản phẩm');
                }

                if (quantity > product.stockQuantity) {
                    throw new Error('Số lượng vượt quá tồn kho');
                }

                const itemIndex = req.session.cart.items.findIndex(
                    item => item.productId.toString() === productId.toString()
                );

                if (itemIndex > -1) {
                    if (quantity <= 0) {
                        // Xóa sản phẩm nếu số lượng <= 0
                        req.session.cart.items.splice(itemIndex, 1);
                    } else {
                        req.session.cart.items[itemIndex].quantity = quantity;
                    }
                }

                req.cart.updateTotalPrice();
                return req.session.cart;
            } catch (error) {
                console.error('Lỗi trong updateQuantity:', error);
                throw error;
            }
        },

        // Cập nhật tổng giá
        updateTotalPrice: () => {
            req.session.cart.totalPrice = req.session.cart.items.reduce(
                (total, item) => total + (item.price * item.quantity), 0
            );
        },

        // Xóa toàn bộ giỏ hàng
        clearCart: () => {
            console.log('🧹 Clearing cart - Before:', {
                itemsCount: req.session.cart.items.length,
                totalPrice: req.session.cart.totalPrice
            });
            
            req.session.cart = {
                items: [],
                totalPrice: 0
            };
            
            console.log('🧹 Cart cleared - After:', {
                itemsCount: req.session.cart.items.length,
                totalPrice: req.session.cart.totalPrice
            });
        },

        // Lấy số lượng sản phẩm trong giỏ hàng
        getItemCount: () => {
            return req.session.cart.items.reduce((total, item) => total + item.quantity, 0);
        }
    };

    next();
};

module.exports = cartMiddleware; 