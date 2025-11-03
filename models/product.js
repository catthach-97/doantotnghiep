const mongodb = require('mongodb');
const getDb = require('../util/database').getDb;

module.exports = class Product {
    constructor(id, title, imageUrl, description, price, stockQuantity = 0, category = null, reviews = []) {
        this._id = id ? new mongodb.ObjectId(id) : null;
        this.title = title;
        this.imageUrl = imageUrl;
        this.description = description;
        this.price = parseFloat(price);
        this.stockQuantity = parseInt(stockQuantity);
        this.category = category;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.reviews = reviews || [];
    }

    async save() {
        try {
            const db = getDb();
            let result;

            if (this._id) {
                // Cập nhật sản phẩm
                this.updatedAt = new Date();
                result = await db.collection('products').updateOne(
                    { _id: this._id },
                    {
                        $set: {
                            title: this.title,
                            imageUrl: this.imageUrl,
                            description: this.description,
                            price: this.price,
                            stockQuantity: this.stockQuantity,
                            category: this.category,
                            updatedAt: this.updatedAt,
                            reviews: this.reviews
                        }
                    }
                );
                console.log('Đã cập nhật sản phẩm:', result);
            } else {
                // Thêm sản phẩm mới
                result = await db.collection('products').insertOne({
                    title: this.title,
                    imageUrl: this.imageUrl,
                    description: this.description,
                    price: this.price,
                    stockQuantity: this.stockQuantity,
                    category: this.category,
                    createdAt: this.createdAt,
                    updatedAt: this.updatedAt,
                    reviews: this.reviews
                });
                console.log('Đã thêm sản phẩm mới:', result);
            }
            return result;
        } catch (err) {
            console.error('Lỗi khi lưu sản phẩm:', err);
            throw err;
        }
    }

    static async fetchAll() {
        try {
            const db = getDb();
            console.log('Đang lấy danh sách sản phẩm từ MongoDB...');
            const products = await db.collection('products')
                .find()
                .sort({ createdAt: -1 })
                .toArray();
            console.log('Số sản phẩm tìm thấy:', products.length);
            return products;
        } catch (err) {
            console.error('Lỗi khi lấy danh sách sản phẩm:', err);
            throw err;
        }
    }

    static async find(filter = {}) {
        try {
            const db = getDb();
            console.log('Đang tìm sản phẩm với filter:', filter);
            const products = await db.collection('products')
                .find(filter)
                .sort({ createdAt: -1 })
                .toArray();
            console.log('Số sản phẩm tìm thấy:', products.length);
            return products;
        } catch (err) {
            console.error('Lỗi khi tìm sản phẩm:', err);
            throw err;
        }
    }

    static async findById(productId) {
        try {
            const db = getDb();
            console.log('Đang tìm sản phẩm với ID:', productId);
            const product = await db.collection('products')
                .findOne({ _id: new mongodb.ObjectId(productId) });
            console.log('Kết quả tìm kiếm:', product);
            return product;
        } catch (err) {
            console.error('Lỗi khi tìm sản phẩm:', err);
            throw err;
        }
    }

    static async deleteById(productId) {
        try {
            const db = getDb();
            const result = await db.collection('products')
                .deleteOne({ _id: new mongodb.ObjectId(productId) });
            console.log('Đã xóa sản phẩm:', result);
            return result;
        } catch (err) {
            console.error('Lỗi khi xóa sản phẩm:', err);
            throw err;
        }
    }

    static async findRelatedProducts(product, limit = 4) {
        try {
            const db = getDb();
            const relatedProducts = await db.collection('products')
                .find({
                    _id: { $ne: product._id },
                    price: {
                        $gte: product.price * 0.8,
                        $lte: product.price * 1.2
                    }
                })
                .limit(limit)
                .toArray();
            return relatedProducts;
        } catch (err) {
            console.error('Lỗi khi tìm sản phẩm liên quan:', err);
            throw err;
        }
    }

    // Cập nhật số lượng tồn kho khi đặt hàng thành công
    static async updateStock(productId, quantity) {
        try {
            if (!productId) {
                throw new Error('Product ID là bắt buộc');
            }
            if (!quantity || quantity <= 0) {
                throw new Error('Số lượng phải lớn hơn 0');
            }

            const db = getDb();
            console.log(`🔄 Cập nhật tồn kho: Sản phẩm ${productId}, giảm ${quantity}`);

            const result = await db.collection('products').updateOne(
                { _id: new mongodb.ObjectId(productId) },
                {
                    $inc: { stockQuantity: -quantity },
                    $set: { updatedAt: new Date() }
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
    }

    // Cập nhật tồn kho cho nhiều sản phẩm (khi đặt hàng)
    static async updateStockForOrder(orderItems) {
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
    }

    // Hoàn lại tồn kho khi hủy đơn hàng
    static async restoreStock(productId, quantity) {
        try {
            if (!productId) {
                throw new Error('Product ID là bắt buộc');
            }
            if (!quantity || quantity <= 0) {
                throw new Error('Số lượng phải lớn hơn 0');
            }

            const db = getDb();
            console.log(`🔄 Hoàn lại tồn kho: Sản phẩm ${productId}, tăng ${quantity}`);

            const result = await db.collection('products').updateOne(
                { _id: new mongodb.ObjectId(productId) },
                {
                    $inc: { stockQuantity: quantity },
                    $set: { updatedAt: new Date() }
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
    }

    // Hoàn lại tồn kho cho nhiều sản phẩm (khi hủy đơn hàng)
    static async restoreStockForOrder(orderItems) {
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
    }

    static async addReview(productId, review) {
        try {
            console.log('🔍 addReview: Starting to add review');
            console.log('🔍 addReview: Product ID:', productId);
            console.log('🔍 addReview: Review object:', review);

            const db = getDb();
            console.log('🔍 addReview: Database connection obtained');

            const objectId = new mongodb.ObjectId(productId);
            console.log('🔍 addReview: ObjectId created:', objectId);

            const result = await db.collection('products').updateOne(
                { _id: objectId },
                { $push: { reviews: review } }
            );

            console.log('🔍 addReview: Update result:', result);
            console.log('🔍 addReview: Matched count:', result.matchedCount);
            console.log('🔍 addReview: Modified count:', result.modifiedCount);

            return result;
        } catch (err) {
            console.error('🚨 addReview: Error adding review:', err);
            console.error('🚨 addReview: Error name:', err.name);
            console.error('🚨 addReview: Error message:', err.message);
            console.error('🚨 addReview: Error stack:', err.stack);
            throw err;
        }
    }

    static async getReviews(productId) {
        try {
            const db = getDb();
            const product = await db.collection('products').findOne({ _id: new mongodb.ObjectId(productId) }, { projection: { reviews: 1 } });
            return product && product.reviews ? product.reviews : [];
        } catch (err) {
            console.error('Lỗi khi lấy đánh giá:', err);
            throw err;
        }
    }

    // Lấy tất cả reviews với thông tin sản phẩm
    static async getAllReviewsWithProducts() {
        try {
            const db = getDb();
            const products = await db.collection('products').find({}).toArray();
            const allReviews = [];

            products.forEach(product => {
                if (product.reviews && product.reviews.length > 0) {
                    product.reviews.forEach(review => {
                        allReviews.push({
                            ...review,
                            productId: product._id,
                            productTitle: product.title,
                            productImage: product.imageUrl,
                            productBrand: product.brand || 'Không có thương hiệu'
                        });
                    });
                }
            });

            return allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (err) {
            console.error('Lỗi khi lấy tất cả đánh giá:', err);
            throw err;
        }
    }

    // Cập nhật trạng thái review
    static async updateReviewStatus(productId, reviewIndex, status) {
        try {
            const db = getDb();

            // Kiểm tra sản phẩm và review tồn tại
            const product = await db.collection('products').findOne(
                { _id: new mongodb.ObjectId(productId) }
            );

            if (!product || !product.reviews || !product.reviews[reviewIndex]) {
                throw new Error('Không tìm thấy sản phẩm hoặc đánh giá');
            }

            // Cập nhật trạng thái của review
            product.reviews[reviewIndex].approved = status;

            // Cập nhật toàn bộ mảng reviews
            const result = await db.collection('products').updateOne(
                { _id: new mongodb.ObjectId(productId) },
                { $set: { reviews: product.reviews } }
            );

            return result;
        } catch (err) {
            console.error('Lỗi khi cập nhật trạng thái đánh giá:', err);
            throw err;
        }
    }

    // Xóa review
    static async deleteReview(productId, reviewIndex) {
        try {
            const db = getDb();

            // Kiểm tra sản phẩm và review tồn tại
            const product = await db.collection('products').findOne(
                { _id: new mongodb.ObjectId(productId) }
            );

            if (!product || !product.reviews || !product.reviews[reviewIndex]) {
                throw new Error('Không tìm thấy sản phẩm hoặc đánh giá');
            }

            // Cập nhật reviews array trực tiếp bằng cách lọc bỏ review cần xóa
            const updatedReviews = product.reviews.filter((_, index) => index !== reviewIndex);

            // Cập nhật sản phẩm với mảng reviews mới
            const result = await db.collection('products').updateOne(
                { _id: new mongodb.ObjectId(productId) },
                { $set: { reviews: updatedReviews } }
            );

            return result;
        } catch (err) {
            console.error('Lỗi khi xóa đánh giá:', err);
            throw err;
        }
    }

    // Tính rating trung bình
    static async getAverageRating(productId) {
        try {
            const reviews = await this.getReviews(productId);
            const approvedReviews = reviews.filter(r => r.approved === true);
            if (approvedReviews.length === 0) return 0;

            const totalRating = approvedReviews.reduce((sum, review) => sum + (review.rating || 0), 0);
            return Math.round((totalRating / approvedReviews.length) * 10) / 10;
        } catch (err) {
            console.error('Lỗi khi tính rating trung bình:', err);
            return 0;
        }
    }
}