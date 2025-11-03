const mongodb = require('mongodb');
require('dotenv').config();

const MongoClient = mongodb.MongoClient;

module.exports = class Review {
    constructor(id, productId, userId, userName, userEmail, rating, comment, approved = false, adminResponse = null, createdAt = null, updatedAt = null) {
        this._id = id ? new mongodb.ObjectId(id) : null;
        this.productId = productId ? new mongodb.ObjectId(productId) : null;
        this.userId = userId ? new mongodb.ObjectId(userId) : null;
        this.userName = userName;
        this.userEmail = userEmail;
        this.rating = rating;
        this.comment = comment;
        this.approved = approved;
        this.adminResponse = adminResponse;
        this.createdAt = createdAt || new Date();
        this.updatedAt = updatedAt || new Date();
    }

    async save() {
        let client;
        try {
            client = await MongoClient.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            
            const db = client.db();
            let result;

            if (this._id) {
                // Cập nhật review
                this.updatedAt = new Date();
                result = await db.collection('reviews').updateOne(
                    { _id: this._id },
                    {
                        $set: {
                            productId: this.productId,
                            userId: this.userId,
                            userName: this.userName,
                            userEmail: this.userEmail,
                            rating: this.rating,
                            comment: this.comment,
                            approved: this.approved,
                            adminResponse: this.adminResponse,
                            updatedAt: this.updatedAt
                        }
                    }
                );
                console.log('Đã cập nhật review:', result);
            } else {
                // Thêm review mới
                result = await db.collection('reviews').insertOne({
                    productId: this.productId,
                    userId: this.userId,
                    userName: this.userName,
                    userEmail: this.userEmail,
                    rating: this.rating,
                    comment: this.comment,
                    approved: this.approved,
                    adminResponse: this.adminResponse,
                    createdAt: this.createdAt,
                    updatedAt: this.updatedAt
                });
                console.log('Đã thêm review mới:', result);
            }
            return result;
        } catch (err) {
            console.error('Lỗi khi lưu review:', err);
            throw err;
        } finally {
            if (client) {
                await client.close();
            }
        }
    }

    static async fetchAll() {
        let client;
        try {
            client = await MongoClient.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            
            const db = client.db();
            console.log('Đang lấy danh sách reviews từ MongoDB...');
            const reviews = await db.collection('reviews')
                .find()
                .sort({ createdAt: -1 })
                .toArray();
            console.log('Số reviews tìm thấy:', reviews.length);
            return reviews;
        } catch (err) {
            console.error('Lỗi khi lấy danh sách reviews:', err);
            throw err;
        } finally {
            if (client) {
                await client.close();
            }
        }
    }

    static async find(filter = {}) {
        let client;
        try {
            client = await MongoClient.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            
            const db = client.db();
            console.log('Đang tìm reviews với filter:', filter);
            const reviews = await db.collection('reviews')
                .find(filter)
                .sort({ createdAt: -1 })
                .toArray();
            console.log('Số reviews tìm thấy:', reviews.length);
            return reviews;
        } catch (err) {
            console.error('Lỗi khi tìm reviews:', err);
            throw err;
        } finally {
            if (client) {
                await client.close();
            }
        }
    }

    static async findById(reviewId) {
        let client;
        try {
            client = await MongoClient.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            
            const db = client.db();
            console.log('Đang tìm review với ID:', reviewId);
            const review = await db.collection('reviews')
                .findOne({ _id: new mongodb.ObjectId(reviewId) });
            console.log('Kết quả tìm kiếm:', review);
            return review;
        } catch (err) {
            console.error('Lỗi khi tìm review:', err);
            throw err;
        } finally {
            if (client) {
                await client.close();
            }
        }
    }

    static async deleteById(reviewId) {
        let client;
        try {
            client = await MongoClient.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            
            const db = client.db();
            const result = await db.collection('reviews')
                .deleteOne({ _id: new mongodb.ObjectId(reviewId) });
            console.log('Đã xóa review:', result);
            return result;
        } catch (err) {
            console.error('Lỗi khi xóa review:', err);
            throw err;
        } finally {
            if (client) {
                await client.close();
            }
        }
    }

    // Lấy reviews với thông tin sản phẩm
    static async getAllReviewsWithProducts() {
        let client;
        try {
            client = await MongoClient.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            
            const db = client.db();
            const reviews = await db.collection('reviews')
                .aggregate([
                    {
                        $lookup: {
                            from: 'products',
                            localField: 'productId',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    {
                        $unwind: '$product'
                    },
                    {
                        $addFields: {
                            productTitle: '$product.title',
                            productImage: '$product.imageUrl',
                            productBrand: '$product.brand'
                        }
                    },
                    {
                        $sort: { createdAt: -1 }
                    }
                ])
                .toArray();

            return reviews;
        } catch (err) {
            console.error('Lỗi khi lấy reviews với thông tin sản phẩm:', err);
            throw err;
        } finally {
            if (client) {
                await client.close();
            }
        }
    }

    // Lấy reviews theo sản phẩm
    static async getReviewsByProduct(productId) {
        let client;
        try {
            client = await MongoClient.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            
            const db = client.db();
            const reviews = await db.collection('reviews')
                .find({ 
                    productId: new mongodb.ObjectId(productId),
                    approved: true 
                })
                .sort({ createdAt: -1 })
                .toArray();
            return reviews;
        } catch (err) {
            console.error('Lỗi khi lấy reviews theo sản phẩm:', err);
            throw err;
        } finally {
            if (client) {
                await client.close();
            }
        }
    }

    // Lấy reviews theo user
    static async getReviewsByUser(userId) {
        let client;
        try {
            client = await MongoClient.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            
            const db = client.db();
            const reviews = await db.collection('reviews')
                .aggregate([
                    {
                        $match: { userId: new mongodb.ObjectId(userId) }
                    },
                    {
                        $lookup: {
                            from: 'products',
                            localField: 'productId',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    {
                        $unwind: '$product'
                    },
                    {
                        $addFields: {
                            productTitle: '$product.title',
                            productImage: '$product.imageUrl'
                        }
                    },
                    {
                        $sort: { createdAt: -1 }
                    }
                ])
                .toArray();
            return reviews;
        } catch (err) {
            console.error('Lỗi khi lấy reviews theo user:', err);
            throw err;
        } finally {
            if (client) {
                await client.close();
            }
        }
    }

    // Cập nhật trạng thái duyệt
    static async updateApprovalStatus(reviewId, approved) {
        let client;
        try {
            client = await MongoClient.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            
            const db = client.db();
            const result = await db.collection('reviews').updateOne(
                { _id: new mongodb.ObjectId(reviewId) },
                {
                    $set: {
                        approved: approved,
                        updatedAt: new Date()
                    }
                }
            );
            return result;
        } catch (err) {
            console.error('Lỗi khi cập nhật trạng thái duyệt:', err);
            throw err;
        } finally {
            if (client) {
                await client.close();
            }
        }
    }

    // Thêm phản hồi admin
    static async addAdminResponse(reviewId, adminResponse) {
        let client;
        try {
            client = await MongoClient.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            
            const db = client.db();
            const result = await db.collection('reviews').updateOne(
                { _id: new mongodb.ObjectId(reviewId) },
                {
                    $set: {
                        adminResponse: adminResponse,
                        updatedAt: new Date()
                    }
                }
            );
            return result;
        } catch (err) {
            console.error('Lỗi khi thêm phản hồi admin:', err);
            throw err;
        } finally {
            if (client) {
                await client.close();
            }
        }
    }

    // Tính rating trung bình của sản phẩm
    static async getAverageRating(productId) {
        let client;
        try {
            client = await MongoClient.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            
            const db = client.db();
            const result = await db.collection('reviews').aggregate([
                {
                    $match: {
                        productId: new mongodb.ObjectId(productId),
                        approved: true
                    }
                },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: '$rating' },
                        totalReviews: { $sum: 1 }
                    }
                }
            ]).toArray();

            if (result.length === 0) {
                return { averageRating: 0, totalReviews: 0 };
            }

            return {
                averageRating: Math.round(result[0].averageRating * 10) / 10,
                totalReviews: result[0].totalReviews
            };
        } catch (err) {
            console.error('Lỗi khi tính rating trung bình:', err);
            return { averageRating: 0, totalReviews: 0 };
        } finally {
            if (client) {
                await client.close();
            }
        }
    }

    // Thống kê reviews
    static async getReviewStats() {
        let client;
        try {
            client = await MongoClient.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            
            const db = client.db();
            const stats = await db.collection('reviews').aggregate([
                {
                    $group: {
                        _id: null,
                        totalReviews: { $sum: 1 },
                        approvedReviews: {
                            $sum: { $cond: ['$approved', 1, 0] }
                        },
                        pendingReviews: {
                            $sum: { $cond: ['$approved', 0, 1] }
                        },
                        averageRating: { $avg: '$rating' },
                        ratingDistribution: {
                            $push: '$rating'
                        }
                    }
                }
            ]).toArray();

            if (stats.length === 0) {
                return {
                    totalReviews: 0,
                    approvedReviews: 0,
                    pendingReviews: 0,
                    averageRating: 0,
                    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                };
            }

            const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            stats[0].ratingDistribution.forEach(rating => {
                ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
            });

            return {
                totalReviews: stats[0].totalReviews,
                approvedReviews: stats[0].approvedReviews,
                pendingReviews: stats[0].pendingReviews,
                averageRating: Math.round(stats[0].averageRating * 10) / 10,
                ratingDistribution
            };
        } catch (err) {
            console.error('Lỗi khi lấy thống kê reviews:', err);
            throw err;
        } finally {
            if (client) {
                await client.close();
            }
        }
    }

    // Tìm kiếm reviews với filter
    static async searchReviews(filters = {}) {
        let client;
        try {
            client = await MongoClient.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            
            const db = client.db();
            const {
                search = '',
                productId = null,
                userId = null,
                rating = null,
                approved = null,
                dateFrom = null,
                dateTo = null,
                page = 1,
                limit = 10
            } = filters;

            let matchFilter = {};

            // Filter theo sản phẩm
            if (productId) {
                matchFilter.productId = new mongodb.ObjectId(productId);
            }

            // Filter theo user
            if (userId) {
                matchFilter.userId = new mongodb.ObjectId(userId);
            }

            // Filter theo rating
            if (rating) {
                matchFilter.rating = parseInt(rating);
            }

            // Filter theo trạng thái duyệt
            if (approved !== null) {
                matchFilter.approved = approved;
            }

            // Filter theo ngày
            if (dateFrom || dateTo) {
                matchFilter.createdAt = {};
                if (dateFrom) {
                    matchFilter.createdAt.$gte = new Date(dateFrom);
                }
                if (dateTo) {
                    matchFilter.createdAt.$lte = new Date(dateTo);
                }
            }

            const pipeline = [
                { $match: matchFilter },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'productId',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $unwind: '$product'
                },
                {
                    $addFields: {
                        productTitle: '$product.title',
                        productImage: '$product.imageUrl',
                        productBrand: '$product.brand'
                    }
                }
            ];

            // Thêm filter tìm kiếm text
            if (search) {
                pipeline.push({
                    $match: {
                        $or: [
                            { userName: { $regex: search, $options: 'i' } },
                            { comment: { $regex: search, $options: 'i' } },
                            { productTitle: { $regex: search, $options: 'i' } }
                        ]
                    }
                });
            }

            // Thêm sort và pagination
            pipeline.push(
                { $sort: { createdAt: -1 } },
                { $skip: (page - 1) * limit },
                { $limit: parseInt(limit) }
            );

            const reviews = await db.collection('reviews').aggregate(pipeline).toArray();

            // Đếm tổng số reviews
            const countPipeline = pipeline.slice(0, -2); // Bỏ skip và limit
            countPipeline.push({ $count: 'total' });
            const countResult = await db.collection('reviews').aggregate(countPipeline).toArray();
            const totalReviews = countResult.length > 0 ? countResult[0].total : 0;

            return {
                reviews,
                totalReviews,
                totalPages: Math.ceil(totalReviews / limit),
                currentPage: parseInt(page)
            };
        } catch (err) {
            console.error('Lỗi khi tìm kiếm reviews:', err);
            throw err;
        } finally {
            if (client) {
                await client.close();
            }
        }
    }

    // Kiểm tra user đã đánh giá sản phẩm chưa
    static async checkUserReview(productId, userId) {
        let client;
        try {
            client = await MongoClient.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            
            const db = client.db();
            const review = await db.collection('reviews').findOne({
                productId: new mongodb.ObjectId(productId),
                userId: new mongodb.ObjectId(userId)
            });
            return review;
        } catch (err) {
            console.error('Lỗi khi kiểm tra review của user:', err);
            throw err;
        } finally {
            if (client) {
                await client.close();
            }
        }
    }
};