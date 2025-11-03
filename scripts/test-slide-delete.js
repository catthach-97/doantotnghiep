const mongoose = require('mongoose');
const Slide = require('../models/slide');
const { deleteOldSlideImage } = require('../middleware/slide-upload');

// Sử dụng cùng connection string như trong app.js
const MONGODB_URI = 'mongodb+srv://ITCschool:8GZ4Vs2IufF9uwFY@cluster0.unzei.mongodb.net/Cshop?retryWrites=true&w=majority&appName=Cluster0';

async function testSlideDelete() {
    try {
        console.log('🔄 Đang kết nối đến MongoDB Atlas...');
        
        // Kết nối database
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Đã kết nối MongoDB Atlas thành công!');
        
        // Lấy danh sách slides hiện tại
        const slides = await Slide.find({});
        console.log(`\n📋 Tìm thấy ${slides.length} slides hiện tại:`);
        
        slides.forEach((slide, index) => {
            console.log(`${index + 1}. ${slide.title || 'Untitled'} - ${slide.image || 'No image'}`);
        });
        
        if (slides.length > 0) {
            console.log('\n🧪 Test xóa slide đầu tiên...');
            const firstSlide = slides[0];
            
            // Test xóa hình ảnh
            if (firstSlide.image) {
                console.log(`🗑️  Đang xóa hình ảnh: ${firstSlide.image}`);
                deleteOldSlideImage(firstSlide.image);
            }
            
            // Test xóa slide
            console.log(`🗑️  Đang xóa slide: ${firstSlide._id}`);
            await Slide.findByIdAndDelete(firstSlide._id);
            console.log('✅ Đã xóa slide thành công!');
            
            // Kiểm tra lại
            const remainingSlides = await Slide.find({});
            console.log(`\n📊 Còn lại ${remainingSlides.length} slides`);
        } else {
            console.log('\n⚠️  Không có slide nào để test');
        }
        
        console.log('\n🎉 Test hoàn thành!');
        
    } catch (error) {
        console.error('❌ Lỗi khi test slide delete:', error);
    } finally {
        if (mongoose.connection.readyState === 1) {
            mongoose.connection.close();
        }
    }
}

testSlideDelete();
