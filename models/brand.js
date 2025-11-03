const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  slug: { 
    type: String, 
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: { 
    type: String,
    trim: true
  },
  logo: { 
    type: String,
    default: ''
  },
  website: { 
    type: String,
    trim: true
  },
  country: { 
    type: String,
    trim: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  sortOrder: { 
    type: Number, 
    default: 0 
  },
  metaTitle: { 
    type: String,
    trim: true
  },
  metaDescription: { 
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Tạo slug từ name trước khi lưu
brandSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Loại bỏ ký tự đặc biệt
      .replace(/\s+/g, '-') // Thay thế khoảng trắng bằng dấu gạch ngang
      .replace(/-+/g, '-') // Loại bỏ dấu gạch ngang liên tiếp
      .trim('-'); // Loại bỏ dấu gạch ngang ở đầu và cuối
  }
  next();
});

module.exports = mongoose.model('Brand', brandSchema);
