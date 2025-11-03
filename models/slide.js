const mongoose = require('mongoose');

const slideSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    subtitle: {
        type: String,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    image: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^\/uploads\/slides\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
            },
            message: 'Hình ảnh phải là file hợp lệ'
        }
    },
    imageAlt: {
        type: String,
        trim: true,
        maxlength: 100
    },
    link: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                return !v || /^https?:\/\/.+/.test(v);
            },
            message: 'Link phải là URL hợp lệ'
        }
    },
    buttonText: {
        type: String,
        trim: true,
        maxlength: 50,
        default: 'Xem ngay'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        validate: {
            validator: function(v) {
                return !v || v > this.startDate;
            },
            message: 'Ngày kết thúc phải sau ngày bắt đầu'
        }
    },
    clickCount: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    },
    backgroundColor: {
        type: String,
        default: '#ffffff',
        validate: {
            validator: function(v) {
                return /^#[0-9A-F]{6}$/i.test(v);
            },
            message: 'Màu nền phải là mã hex hợp lệ'
        }
    },
    textColor: {
        type: String,
        default: '#000000',
        validate: {
            validator: function(v) {
                return /^#[0-9A-F]{6}$/i.test(v);
            },
            message: 'Màu chữ phải là mã hex hợp lệ'
        }
    },
    position: {
        type: String,
        enum: ['left', 'center', 'right'],
        default: 'center'
    },
    animation: {
        type: String,
        enum: ['fade', 'slide', 'zoom', 'flip'],
        default: 'fade'
    }
}, {
    timestamps: true
});

// Index for performance
slideSchema.index({ isActive: 1, sortOrder: 1 });
slideSchema.index({ startDate: 1, endDate: 1 });

// Virtual for checking if slide is currently active
slideSchema.virtual('isCurrentlyActive').get(function() {
    const now = new Date();
    return this.isActive && 
           this.startDate <= now && 
           (!this.endDate || this.endDate >= now);
});

// Method to increment view count
slideSchema.methods.incrementViewCount = function() {
    this.viewCount += 1;
    return this.save();
};

// Method to increment click count
slideSchema.methods.incrementClickCount = function() {
    this.clickCount += 1;
    return this.save();
};

module.exports = mongoose.model('Slide', slideSchema);
