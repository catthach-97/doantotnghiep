const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true
    },
    approved: {
        type: Boolean,
        default: false
    },
    adminResponse: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Indexes để cải thiện hiệu suất
reviewSchema.index({ productId: 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ approved: 1 });
reviewSchema.index({ productId: 1, approved: 1 });

// Static method để kiểm tra user đã đánh giá sản phẩm chưa
reviewSchema.statics.checkUserReview = async function(productId, userId) {
    try {
        return await this.findOne({
            productId: productId,
            userId: userId
        });
    } catch (error) {
        console.error('Error checking user review:', error);
        throw error;
    }
};

module.exports = mongoose.model('Review', reviewSchema);
