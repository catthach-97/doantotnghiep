const Category = require('../models/category');

module.exports = async (req, res, next) => {
  try {
    // Chỉ lấy danh mục đang hiển thị (isActive = true)
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.locals.categories = categories;
  } catch (err) {
    res.locals.categories = [];
  }
  next();
}; 