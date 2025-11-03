const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const moment = require('moment');

// Ensure PDF directory exists
const pdfDirPath = path.join(__dirname, '..', 'data', 'pdfs');
if (!fs.existsSync(pdfDirPath)) {
    console.log('Creating PDF directory:', pdfDirPath);
    fs.mkdirSync(pdfDirPath, { recursive: true });
}

// Format currency and date
const formatCurrency = (amount) => {
    try {
        return amount.toLocaleString('vi-VN') + ' đ';
    } catch (error) {
        console.error('Error formatting currency:', error);
        return amount + ' đ';
    }
};

// Format date using Moment.js
const formatDate = (date, format = 'MM/DD/YYYY') => {
    try {
        // Kiểm tra date có hợp lệ không trước khi format
        const mDate = moment(date);
        if (mDate.isValid()) {
            return mDate.format(format);
        } else {
            console.warn('Invalid date provided to formatDate:', date);
            // Trả về ngày hiện tại nếu date không hợp lệ
            return moment().format(format); 
        }
    } catch (error) {
        console.error('Error formatting date:', error);
        return moment().format(format); // Trả về ngày hiện tại nếu có lỗi
    }
};

// Draw a horizontal line
const drawLine = (doc, y) => {
    try {
        doc.strokeColor('#aaa').moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke();
    } catch (error) {
        console.error('Error drawing line:', error);
    }
};

// Generate Order Invoice PDF - NO HEADER/FOOTER
const generateOrderPDF = async (order, user) => {
    return new Promise((resolve, reject) => {
        try {
            const fileName = `order-${order._id}-${moment().format('YYYYMMDD')}.pdf`;
            const filePath = path.join(pdfDirPath, fileName);
            const doc = new PDFDocument({ size: 'A4', margin: 50 });

            // Đăng ký font Roboto nếu có
            let useRoboto = false;
            if (safeRegisterFont(doc, 'Roboto', robotoRegularPath)) {
                try {
                    doc.font('Roboto');
                    useRoboto = true;
                } catch (e) {
                    doc.font('Helvetica');
                }
            } else {
                doc.font('Helvetica');
            }

            const writeStream = fs.createWriteStream(filePath);
            writeStream.on('error', (error) => reject(error));
            doc.pipe(writeStream);

            // --- Màu sắc & biến ---
            const pageMargins = doc.page.margins;
            const startY = pageMargins.top;
            const contentWidth = doc.page.width - pageMargins.left - pageMargins.right;
            const endY = doc.page.height - pageMargins.bottom;
            let currentY = startY;
            const lineGap = 4;
            const primaryColor = '#2563EB';
            const greyColor = '#F3F4F6';
            const darkGreyColor = '#E5E7EB';
            const textColor = '#1F2937';
            const lightTextColor = '#6B7280';

            // --- Helper Function to Add New Page ---
            const addNewPageIfNeeded = (neededHeight) => {
                if (currentY + neededHeight > endY - lineGap) {
                    doc.addPage();
                    currentY = startY;
                    return true; 
                }
                return false; 
            };
            
            // --- Tiêu đề & thương hiệu ---
            addNewPageIfNeeded(40);
            doc.font(useRoboto ? 'Roboto' : 'Helvetica-Bold').fontSize(22).fillColor(primaryColor)
                .text('SHOE STORE', pageMargins.left, currentY, { align: 'center', width: contentWidth });
            currentY += 28;
            doc.font(useRoboto ? 'Roboto' : 'Helvetica-Bold').fontSize(18).fillColor(textColor)
                .text('HÓA ĐƠN BÁN HÀNG', pageMargins.left, currentY, { align: 'center', width: contentWidth });
            currentY += 24;
            drawLine(doc, currentY);
            currentY += 8;

            // --- Thông tin cửa hàng ---
            doc.font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(10).fillColor(textColor)
                .text('Địa chỉ: 123 Đường Giày, Quận Thời Trang, TP. Hồ Chí Minh', pageMargins.left, currentY)
                .text('Hotline: 0123 456 789   |   Email: support@shoestore.vn', pageMargins.left, currentY + 14);
            currentY += 32;

            // --- Thông tin hóa đơn & khách hàng ---
            addNewPageIfNeeded(90);
            const infoBoxWidth = (contentWidth - 12) / 2;
            const infoBoxHeight = 80;
            const infoBoxStartY = currentY;
            const infoBoxPadX = 14;
            const infoBoxPadY = 10;
            // Box 1: Hóa đơn
            doc.roundedRect(pageMargins.left, infoBoxStartY, infoBoxWidth, infoBoxHeight, 8).fillAndStroke(greyColor, darkGreyColor);
            doc.fillColor(textColor).font(useRoboto ? 'Roboto' : 'Helvetica-Bold').fontSize(11).text('Thông tin hóa đơn', pageMargins.left + infoBoxPadX, infoBoxStartY + infoBoxPadY - 2);
            doc.font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(9);
            let y = infoBoxStartY + infoBoxPadY + 14;
            doc.text(`Mã hóa đơn: ${order._id}`, pageMargins.left + infoBoxPadX, y, { lineGap }); y += 13;
            doc.text(`Ngày lập: ${formatDate(order.createdAt, 'DD/MM/YYYY HH:mm')}`, pageMargins.left + infoBoxPadX, y, { lineGap }); y += 13;
            doc.text(`Trạng thái: ${order.status || 'Chờ xác nhận'}`, pageMargins.left + infoBoxPadX, y, { lineGap }); y += 13;
            doc.text(`Thanh toán: ${order.paymentStatus === 'paid' || order.paymentStatus === 'completed' ? 'Đã thanh toán' : 'Chưa thanh toán'}`, pageMargins.left + infoBoxPadX, y, { lineGap });
            // Box 2: Khách hàng
            doc.roundedRect(pageMargins.left + infoBoxWidth + 12, infoBoxStartY, infoBoxWidth, infoBoxHeight, 8).fillAndStroke(greyColor, darkGreyColor);
            doc.fillColor(textColor).font(useRoboto ? 'Roboto' : 'Helvetica-Bold').fontSize(11).text('Thông tin khách hàng', pageMargins.left + infoBoxWidth + 12 + infoBoxPadX, infoBoxStartY + infoBoxPadY - 2);
            doc.font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(9);
            y = infoBoxStartY + infoBoxPadY + 14;
            doc.text(`Họ tên: ${user.name || (order.shippingInfo && order.shippingInfo.name) || 'N/A'}`, pageMargins.left + infoBoxWidth + 12 + infoBoxPadX, y, { lineGap }); y += 13;
            doc.text(`Email: ${user.email || (order.shippingInfo && order.shippingInfo.email) || 'N/A'}`, pageMargins.left + infoBoxWidth + 12 + infoBoxPadX, y, { lineGap }); y += 13;
            doc.text(`SĐT: ${(order.shippingInfo && order.shippingInfo.phone) || user.phone || 'N/A'}`, pageMargins.left + infoBoxWidth + 12 + infoBoxPadX, y, { lineGap }); y += 13;
            doc.text(`Địa chỉ: ${(order.shippingInfo && order.shippingInfo.address) || user.address || 'N/A'}`, pageMargins.left + infoBoxWidth + 12 + infoBoxPadX, y, { lineGap, width: infoBoxWidth - 2 * infoBoxPadX });
            currentY = infoBoxStartY + infoBoxHeight + 14;

            // --- Bảng sản phẩm ---
            addNewPageIfNeeded(32);
            const tableHeaderY = currentY;
            doc.rect(pageMargins.left, tableHeaderY, contentWidth, 22).fill(darkGreyColor);
            doc.fillColor(textColor).font(useRoboto ? 'Roboto' : 'Helvetica-Bold').fontSize(10);
            doc.text('Sản phẩm', pageMargins.left + 10, tableHeaderY + 7, { width: contentWidth * 0.32 - 10 })
               .text('Mã SP', pageMargins.left + contentWidth * 0.32, tableHeaderY + 7, { width: contentWidth * 0.13, align: 'left' })
               .text('Số lượng', pageMargins.left + contentWidth * 0.45, tableHeaderY + 7, { width: contentWidth * 0.12, align: 'right' })
               .text('Đơn giá', pageMargins.left + contentWidth * 0.57, tableHeaderY + 7, { width: contentWidth * 0.18, align: 'right' })
               .text('Thành tiền', pageMargins.left + contentWidth * 0.75, tableHeaderY + 7, { width: contentWidth * 0.25 - 10, align: 'right' });
            currentY = tableHeaderY + 24;
            doc.font(useRoboto ? 'Roboto' : 'Helvetica');

            // --- Dữ liệu sản phẩm ---
            let i = 0;
            let subtotal = 0;
            order.items.forEach((item) => {
                // ✅ Xử lý thông tin sản phẩm đầy đủ hơn
                let productName = 'Sản phẩm không xác định';
                let sku = 'N/A';
                
                // Kiểm tra nếu có productId đã populate
                if (item.productId && typeof item.productId === 'object') {
                    productName = item.productId.title || 'Sản phẩm không xác định';
                    sku = item.productId.sku || item.productId._id.toString().slice(-8).toUpperCase();
                } else if (item.title) {
                    // Fallback nếu có title trực tiếp
                    productName = item.title;
                    sku = item.sku || (item.productId ? item.productId.toString().slice(-8).toUpperCase() : 'N/A');
                } else if (item.product && item.product.name) {
                    // Fallback cho cấu trúc cũ
                    productName = item.product.name;
                    sku = item.product.sku || 'N/A';
                }
                
                const quantity = parseInt(item.quantity) || 1;
                const price = parseFloat(item.price) || 0;
                const totalPrice = price * quantity;
                subtotal += totalPrice;

                const productNameHeight = doc.fontSize(9).heightOfString(productName, { width: contentWidth * 0.32 - 10, lineGap });
                const itemHeight = productNameHeight + lineGap * 3.5;
                const rowNeededHeight = itemHeight + 4;
                if (addNewPageIfNeeded(rowNeededHeight)) {
                    // Vẽ lại header bảng trên trang mới
                    const newTableHeaderY = currentY;
                    doc.rect(pageMargins.left, newTableHeaderY, contentWidth, 22).fill(darkGreyColor);
                    doc.fillColor(textColor).font(useRoboto ? 'Roboto' : 'Helvetica-Bold').fontSize(10);
                    doc.text('Sản phẩm', pageMargins.left + 10, newTableHeaderY + 7, { width: contentWidth * 0.32 - 10 })
                       .text('Mã SP', pageMargins.left + contentWidth * 0.32, newTableHeaderY + 7, { width: contentWidth * 0.13, align: 'left' })
                       .text('Số lượng', pageMargins.left + contentWidth * 0.45, newTableHeaderY + 7, { width: contentWidth * 0.12, align: 'right' })
                       .text('Đơn giá', pageMargins.left + contentWidth * 0.57, newTableHeaderY + 7, { width: contentWidth * 0.18, align: 'right' })
                       .text('Thành tiền', pageMargins.left + contentWidth * 0.75, newTableHeaderY + 7, { width: contentWidth * 0.25 - 10, align: 'right' });
                    currentY = newTableHeaderY + 24;
                    doc.font(useRoboto ? 'Roboto' : 'Helvetica');
                }
                if (i % 2 !== 0) {
                     doc.rect(pageMargins.left, currentY, contentWidth, itemHeight).fill(greyColor);
                }
                const rowY = currentY + lineGap + 2;
                doc.fillColor(textColor).fontSize(9)
                   .text(productName, pageMargins.left + 10, rowY, { width: contentWidth * 0.32 - 10, lineGap })
                   .text(sku, pageMargins.left + contentWidth * 0.32, rowY, { width: contentWidth * 0.13, align: 'left' })
                   .text(quantity.toString(), pageMargins.left + contentWidth * 0.45, rowY, { width: contentWidth * 0.12, align: 'right' })
                   .text(formatCurrency(price), pageMargins.left + contentWidth * 0.57, rowY, { width: contentWidth * 0.18, align: 'right' })
                   .text(formatCurrency(totalPrice), pageMargins.left + contentWidth * 0.75, rowY, { width: contentWidth * 0.25 - 10, align: 'right' });
                currentY += itemHeight;
                i++;
            });

            // --- Tổng kết ---
            addNewPageIfNeeded(80);
            currentY += 14;
            const shippingFee = order.shippingFee || 0;
            const discount = order.discount || 0;
            const grandTotal = subtotal + shippingFee - discount;
            // KHÔNG vẽ khung xanh/tổng kết nữa, chỉ để text căn phải
            let summaryX = pageMargins.left + contentWidth - 280;
            let summaryY = currentY;
            doc.font(useRoboto ? 'Roboto' : 'Helvetica-Bold').fontSize(11).fillColor(textColor)
                .text('Tổng tiền hàng:', summaryX, summaryY, { width: 180, align: 'left' })
                .text(`${formatCurrency(subtotal)}`, summaryX + 180, summaryY, { width: 100, align: 'right' });
            summaryY += 18;
            doc.text('Phí vận chuyển:', summaryX, summaryY, { width: 180, align: 'left' })
                .text(`${formatCurrency(shippingFee)}`, summaryX + 180, summaryY, { width: 100, align: 'right' });
            summaryY += 18;
            doc.text('Giảm giá:', summaryX, summaryY, { width: 180, align: 'left' })
                .text(`- ${formatCurrency(discount)}`, summaryX + 180, summaryY, { width: 100, align: 'right' });
            summaryY += 18;
            doc.text('Tổng cộng:', summaryX, summaryY, { width: 180, align: 'left' })
                .text(`${formatCurrency(grandTotal)}`, summaryX + 180, summaryY, { width: 100, align: 'right' });
            summaryY += 18;
            doc.font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(9).fillColor(textColor)
                .text(`Bằng chữ: ${convertNumberToVietnameseWords(grandTotal)} đồng`, summaryX, summaryY, { width: 280 });
            currentY = summaryY + 24;

            // --- Chữ ký ---
            addNewPageIfNeeded(60);
            currentY = summaryY + 24 + 30;
            doc.font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(10).fillColor(textColor)
                .text('Người mua hàng', pageMargins.left + 40, currentY)
                .text('Người lập hóa đơn', pageMargins.left + contentWidth - 180, currentY);
            doc.fontSize(9).fillColor(lightTextColor)
                .text('(Ký, ghi rõ họ tên)', pageMargins.left + 40, currentY + 16)
                .text('(Ký, ghi rõ họ tên)', pageMargins.left + contentWidth - 180, currentY + 16);

            doc.end();
            writeStream.on('finish', () => resolve(filePath));
        } catch (error) {
            reject(error);
        }
    });
};

// Validate product data using Lodash
const validateProduct = (product) => {
    try {
        // Kiểm tra product có phải object không và không phải null/array
        if (!_.isObject(product) || _.isNull(product) || _.isArray(product)) {
            console.error('Invalid product data (not an object):', product);
            return false;
        }

        // Kiểm tra các trường bắt buộc
        const requiredFields = ['title', 'price'];
        if (!_.every(requiredFields, (field) => _.has(product, field))) {
            const missing = _.difference(requiredFields, _.keys(product));
            console.error(`Missing required field(s): ${missing.join(', ')}`, product);
            return false;
        }

        // Kiểm tra kiểu dữ liệu
        if (!_.isString(product.title)) {
            console.error('Invalid title type:', product.title);
            return false;
        }
        // isFinite kiểm tra cả number và không phải Infinity/-Infinity
        if (!_.isFinite(product.price)) {
            console.error('Invalid price type or value:', product.price);
            return false;
        }
        // Kiểm tra giá không âm
        if (product.price < 0) {
            console.error('Invalid price value (negative):', product.price);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error validating product:', error);
        return false;
    }
};

// Format product data using Lodash
const formatProductData = (product) => {
    try {
        return {
            // _.get(object, path, [defaultValue])
            title: _.trim(_.get(product, 'title', 'No name')),
            category: _.trim(_.get(product, 'category', 'No category')),
            // _.toNumber chuyển đổi giá trị thành số, trả về 0 nếu không hợp lệ
            price: _.toNumber(_.get(product, 'price', 0)) || 0, 
            description: _.trim(_.get(product, 'description', 'No description'))
        };
    } catch (error) {
        console.error('Error formatting product data:', error);
        // Trả về giá trị mặc định an toàn
        return {
            title: 'No name', category: 'No category', price: 0, description: 'No description'
        };
    }
};

// Generate Product List PDF - Use Lodash for sum
const generateProductsPDF = async (products) => {
    return new Promise((resolve, reject) => {
        try {
            if (!_.isArray(products)) throw new Error('Products must be an array');
            
            // Sử dụng lodash để map và filter (tương tự nhưng có thể thay thế)
            const validProducts = _.chain(products)
                                    .filter(validateProduct)
                                    .map(formatProductData)
                                    .value(); // Kết thúc chain và lấy kết quả

            if (_.isEmpty(validProducts)) throw new Error('No valid products to export');

            // Sử dụng moment để định dạng ngày trong tên file
            const fileName = `products-catalog-${moment().format('YYYY-MM-DD')}.pdf`;
            const filePath = path.join(pdfDirPath, fileName);
            const doc = new PDFDocument({ 
                size: 'A4', margin: 50, font: 'Helvetica', bufferPages: true
            });

            const writeStream = fs.createWriteStream(filePath);
            writeStream.on('error', reject);
            doc.pipe(writeStream);

            // --- Variables & Colors ---
            const pageMargins = doc.page.margins;
            const startY = pageMargins.top;
            const contentWidth = doc.page.width - pageMargins.left - pageMargins.right;
            const endY = doc.page.height - pageMargins.bottom - 20;
            let currentY = startY;
            const primaryColor = '#2563EB';
            const greyColor = '#F3F4F6';
            const darkGreyColor = '#D1D5DB';
            const textColor = '#1F2937';
            const lightTextColor = '#6B7280';
            const rowHeight = 30;
            const headerHeight = 20;
            const pageNumber = 1;
            
            // --- Helper to draw table header ---
            const drawTableHeader = (yPos) => {
                doc.rect(pageMargins.left, yPos, contentWidth, headerHeight).fill(darkGreyColor);
                doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9);
                const textY = yPos + 7;
                doc.text('No.', pageMargins.left + 10, textY, { width: 30 });
                doc.text('Product Name', pageMargins.left + 50, textY, { width: 180 }); 
                doc.text('Category', pageMargins.left + 240, textY, { width: 80 });
                doc.text('Price', pageMargins.left + 330, textY, { width: 70, align: 'right' });
                doc.text('Description', pageMargins.left + 410, textY, { width: contentWidth - 410 - 10 });
                doc.font('Helvetica'); 
                return yPos + headerHeight + 5; 
            };

            // --- Title & Info ---
            doc.font('Helvetica-Bold').fontSize(18).fillColor(textColor)
               .text('Product Catalog', pageMargins.left, currentY, { align: 'center', width: contentWidth });
            currentY += 25;
            doc.font('Helvetica').fontSize(10).fillColor(lightTextColor)
               .text(`Generated on: ${formatDate(new Date(), 'MMMM Do, YYYY')}`, pageMargins.left, currentY, { align: 'right', width: contentWidth });
            currentY += 20;

            // --- Draw Table Header for first page ---
            currentY = drawTableHeader(currentY);

            // --- Table Body ---
            let i = 0;
            validProducts.forEach((product, index) => {
                 if (currentY + rowHeight > endY) {
                    doc.addPage();
                    currentY = startY;
                    currentY = drawTableHeader(currentY);
                }
                if (i % 2 !== 0) {
                     doc.rect(pageMargins.left, currentY, contentWidth, rowHeight).fill(greyColor);
                }
                const textY = currentY + (rowHeight - 10) / 2;
                doc.fillColor(textColor).fontSize(9);
                doc.text(index + 1, pageMargins.left + 10, textY, { width: 30 });
                doc.text(product.title, pageMargins.left + 50, textY, { width: 180, ellipsis: true }); 
                doc.text(product.category, pageMargins.left + 240, textY, { width: 80, ellipsis: true });
                doc.text(formatCurrency(product.price), pageMargins.left + 330, textY, { width: 70, align: 'right' });
                doc.text(product.description, pageMargins.left + 410, textY, { width: contentWidth - 410 - 10, ellipsis: true, lineBreak: false }); 
                currentY += rowHeight;
                i++;
            });

            // --- Total Summary - Use Lodash _.sumBy ---
            if (currentY + 50 > endY) { 
                doc.addPage();
                currentY = startY;
            }
            currentY += 20;
            // Sử dụng _.sumBy(collection, [iteratee=_.identity])
            const totalValue = _.sumBy(validProducts, 'price'); 
            
            const summaryBoxY = currentY;
            const summaryBoxHeight = 40;
            doc.rect(pageMargins.left, summaryBoxY, contentWidth, summaryBoxHeight).fill(darkGreyColor);
            doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10);
            doc.text(`Total Products: ${validProducts.length}`, pageMargins.left + 15, summaryBoxY + 15)
               .text(`Total Value: ${formatCurrency(totalValue)}`, pageMargins.left + contentWidth / 2, summaryBoxY + 15, { width: contentWidth / 2 - 15, align: 'right' });
            currentY = summaryBoxY + summaryBoxHeight + 10;

            // --- Finalize PDF (như cũ) ---
            const range = doc.bufferedPageRange(); 
            for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex++) {
                doc.switchToPage(pageIndex);
                doc.fontSize(8).fillColor(lightTextColor)
                   .text(`Page ${pageIndex + 1} of ${range.count} | Generated: ${formatDate(new Date(), 'L LT')}`,
                         pageMargins.left, 
                         doc.page.height - pageMargins.bottom + 5, 
                         { align: 'center', width: contentWidth });
            }
            doc.flushPages(); 
            doc.end();

            writeStream.on('finish', () => {
                console.log('Products PDF write completed');
                resolve(filePath);
            });
        } catch (error) {
            console.error('Error generating products PDF:', error);
            reject(error);
        }
    });
};

const robotoRegularPath = path.join(__dirname, '../public/fonts/Roboto-Regular.ttf');
function safeRegisterFont(doc, name, path) {
    try {
        if (fs.existsSync(path)) {
            doc.registerFont(name, path);
            return true;
        }
    } catch (e) {}
    return false;
}

// Generate Inventory PDF
const generateInventoryPDF = async (products, categories, statistics) => {
    return new Promise((resolve, reject) => {
        try {
            const fileName = `inventory-report-${moment().format('YYYYMMDD-HHmmss')}.pdf`;
            const filePath = path.join(pdfDirPath, fileName);
            const doc = new PDFDocument({ 
                size: 'A4', 
                margin: 50
            });

            // Chỉ đăng ký và sử dụng Roboto-Regular cho toàn bộ PDF
            let useRoboto = false;
            if (safeRegisterFont(doc, 'Roboto', robotoRegularPath)) {
                try {
                    doc.font('Roboto');
                    useRoboto = true;
                } catch (e) {
                    console.warn('Could not use Roboto font, fallback to Helvetica:', e.message);
                    doc.font('Helvetica');
                }
            } else {
                doc.font('Helvetica');
            }

            const writeStream = fs.createWriteStream(filePath);
            writeStream.on('error', (error) => reject(error));
            doc.pipe(writeStream);

            // Variables & Colors
            const pageMargins = doc.page.margins;
            const startY = pageMargins.top;
            const contentWidth = doc.page.width - pageMargins.left - pageMargins.right;
            const endY = doc.page.height - pageMargins.bottom;
            let currentY = startY;
            const lineGap = 4;
            const primaryColor = '#2563EB';
            const greyColor = '#F3F4F6';
            const darkGreyColor = '#E5E7EB';
            const textColor = '#1F2937';
            const lightTextColor = '#6B7280';

            // Helper Function to Add New Page
            const addNewPageIfNeeded = (neededHeight) => {
                if (currentY + neededHeight > endY - lineGap) {
                    doc.addPage();
                    currentY = startY;
                    return true; 
                }
                return false; 
            };

            // Title
            addNewPageIfNeeded(40);
            doc.font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(24).fillColor(textColor)
               .text('BÁO CÁO QUẢN LÝ KHO SẢN PHẨM', pageMargins.left, currentY, { align: 'center', width: contentWidth });
            currentY += 32;
            doc.font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(10).fillColor(lightTextColor)
               .text(`Ngày xuất báo cáo: ${moment().format('DD/MM/YYYY HH:mm')}`, pageMargins.left, currentY, { align: 'center', width: contentWidth });
            currentY += 20;
            drawLine(doc, currentY);
            currentY += 12;

            // Statistics Section
            addNewPageIfNeeded(80);
            doc.font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(14).fillColor(textColor)
               .text('THỐNG KÊ TỔNG QUAN', pageMargins.left, currentY);
            currentY += 20;

            const statBoxWidth = (contentWidth - 30) / 4;
            const statBoxHeight = 50;
            const statBoxY = currentY;

            // Total Items
            doc.roundedRect(pageMargins.left, statBoxY, statBoxWidth, statBoxHeight, 8).fillAndStroke(greyColor, darkGreyColor);
            doc.fillColor(textColor).font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(12).text('Tổng sản phẩm', pageMargins.left + 10, statBoxY + 8);
            doc.font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(16).text(statistics.totalItems.toString(), pageMargins.left + 10, statBoxY + 25);

            // In Stock
            doc.roundedRect(pageMargins.left + statBoxWidth + 10, statBoxY, statBoxWidth, statBoxHeight, 8).fillAndStroke(greyColor, darkGreyColor);
            doc.fillColor(textColor).font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(12).text('Còn hàng', pageMargins.left + statBoxWidth + 20, statBoxY + 8);
            doc.font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(16).text(statistics.inStockItems.toString(), pageMargins.left + statBoxWidth + 20, statBoxY + 25);

            // Out of Stock
            doc.roundedRect(pageMargins.left + (statBoxWidth + 10) * 2, statBoxY, statBoxWidth, statBoxHeight, 8).fillAndStroke(greyColor, darkGreyColor);
            doc.fillColor(textColor).font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(12).text('Hết hàng', pageMargins.left + (statBoxWidth + 10) * 2 + 10, statBoxY + 8);
            doc.font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(16).text(statistics.outOfStockItems.toString(), pageMargins.left + (statBoxWidth + 10) * 2 + 10, statBoxY + 25);

            // Low Stock
            doc.roundedRect(pageMargins.left + (statBoxWidth + 10) * 3, statBoxY, statBoxWidth, statBoxHeight, 8).fillAndStroke(greyColor, darkGreyColor);
            doc.fillColor(textColor).font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(12).text('Sắp hết', pageMargins.left + (statBoxWidth + 10) * 3 + 10, statBoxY + 8);
            doc.font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(16).text(statistics.lowStockItems.toString(), pageMargins.left + (statBoxWidth + 10) * 3 + 10, statBoxY + 25);

            currentY = statBoxY + statBoxHeight + 20;

            // Total Stock Value
            addNewPageIfNeeded(40);
            doc.font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(12).fillColor(textColor)
               .text(`Tổng giá trị kho: ${formatCurrency(statistics.totalStockValue)}`, pageMargins.left, currentY);
            currentY += 20;
            drawLine(doc, currentY);
            currentY += 12;

            // Products Table Header
            addNewPageIfNeeded(32);
            const tableHeaderY = currentY;
            doc.rect(pageMargins.left, tableHeaderY, contentWidth, 24).fill(darkGreyColor);
            doc.fillColor(textColor).font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(10);
            doc.text('Sản phẩm', pageMargins.left + 12, tableHeaderY + 8, { width: contentWidth * 0.35 - 12 })
               .text('Danh mục', pageMargins.left + contentWidth * 0.35, tableHeaderY + 8, { width: contentWidth * 0.15, align: 'left' })
               .text('Giá', pageMargins.left + contentWidth * 0.5, tableHeaderY + 8, { width: contentWidth * 0.15, align: 'right' })
               .text('Tồn kho', pageMargins.left + contentWidth * 0.65, tableHeaderY + 8, { width: contentWidth * 0.12, align: 'right' })
               .text('Giá trị', pageMargins.left + contentWidth * 0.77, tableHeaderY + 8, { width: contentWidth * 0.23 - 12, align: 'right' });
            currentY = tableHeaderY + 26;
            doc.font(useRoboto ? 'Roboto' : 'Helvetica');

            // Products Table Body
            let i = 0;
            products.forEach((product) => {
                const productName = product.title || 'Unknown product';
                const category = product.category || 'Chưa phân loại';
                const price = product.price || 0;
                const stockQuantity = product.stockQuantity || 0;
                const stockValue = price * stockQuantity;

                const productNameHeight = doc.fontSize(9).heightOfString(productName, { width: contentWidth * 0.35 - 12, lineGap });
                const itemHeight = productNameHeight + lineGap * 3;
                const rowNeededHeight = itemHeight + 4;

                if (addNewPageIfNeeded(rowNeededHeight)) {
                    // Draw table header again
                    const newTableHeaderY = currentY;
                    doc.rect(pageMargins.left, newTableHeaderY, contentWidth, 24).fill(darkGreyColor);
                    doc.fillColor(textColor).font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(10);
                    doc.text('Sản phẩm', pageMargins.left + 12, newTableHeaderY + 8, { width: contentWidth * 0.35 - 12 })
                       .text('Danh mục', pageMargins.left + contentWidth * 0.35, newTableHeaderY + 8, { width: contentWidth * 0.15, align: 'left' })
                       .text('Giá', pageMargins.left + contentWidth * 0.5, newTableHeaderY + 8, { width: contentWidth * 0.15, align: 'right' })
                       .text('Tồn kho', pageMargins.left + contentWidth * 0.65, newTableHeaderY + 8, { width: contentWidth * 0.12, align: 'right' })
                       .text('Giá trị', pageMargins.left + contentWidth * 0.77, newTableHeaderY + 8, { width: contentWidth * 0.23 - 12, align: 'right' });
                    currentY = newTableHeaderY + 26;
                    doc.font(useRoboto ? 'Roboto' : 'Helvetica');
                }

                if (i % 2 !== 0) {
                     doc.rect(pageMargins.left, currentY, contentWidth, itemHeight).fill(greyColor);
                }

                const rowY = currentY + lineGap + 2;
                doc.fillColor(textColor).fontSize(9)
                   .text(productName, pageMargins.left + 12, rowY, { width: contentWidth * 0.35 - 12, lineGap })
                   .text(category, pageMargins.left + contentWidth * 0.35, rowY, { width: contentWidth * 0.15, align: 'left' })
                   .text(formatCurrency(price), pageMargins.left + contentWidth * 0.5, rowY, { width: contentWidth * 0.15, align: 'right' })
                   .text(stockQuantity.toString(), pageMargins.left + contentWidth * 0.65, rowY, { width: contentWidth * 0.12, align: 'right' })
                   .text(formatCurrency(stockValue), pageMargins.left + contentWidth * 0.77, rowY, { width: contentWidth * 0.23 - 12, align: 'right' });

                currentY += itemHeight;
                i++;
            });

            // Footer
            addNewPageIfNeeded(40);
            currentY += 20;
            drawLine(doc, currentY);
            currentY += 12;
            doc.font(useRoboto ? 'Roboto' : 'Helvetica').fontSize(9).fillColor(lightTextColor)
               .text('Báo cáo được tạo tự động bởi hệ thống quản lý kho', pageMargins.left, currentY, { align: 'center', width: contentWidth });

            doc.end();
            writeStream.on('finish', () => {
                resolve(fs.readFileSync(filePath));
            });
        } catch (error) {
            reject(error);
        }
    });
};

// --- Hàm chuyển số thành chữ tiếng Việt đơn giản ---
function convertNumberToVietnameseWords(number) {
    // Đơn giản hóa, chỉ dùng cho số nhỏ, có thể thay bằng thư viện nếu cần
    const ChuSo = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    function DocSo3ChuSo(baso) {
        let tram = Math.floor(baso / 100);
        let chuc = Math.floor((baso % 100) / 10);
        let donvi = baso % 10;
        let ketQua = '';
        if (tram > 0) {
            ketQua += ChuSo[tram] + ' trăm';
            if (chuc === 0 && donvi > 0) ketQua += ' linh';
        }
        if (chuc > 1) {
            ketQua += ' ' + ChuSo[chuc] + ' mươi';
            if (donvi === 1) ketQua += ' mốt';
            else if (donvi === 5) ketQua += ' lăm';
            else if (donvi > 0) ketQua += ' ' + ChuSo[donvi];
        } else if (chuc === 1) {
            ketQua += ' mười';
            if (donvi === 1) ketQua += ' một';
            else if (donvi === 5) ketQua += ' lăm';
            else if (donvi > 0) ketQua += ' ' + ChuSo[donvi];
        } else if (donvi > 0) {
            ketQua += ' ' + ChuSo[donvi];
        }
        return ketQua.trim();
    }
    if (typeof number !== 'number' || isNaN(number)) return '';
    if (number === 0) return 'không';
    let str = '';
    let ty = Math.floor(number / 1e9);
    let trieu = Math.floor((number % 1e9) / 1e6);
    let nghin = Math.floor((number % 1e6) / 1e3);
    let tram = number % 1e3;
    if (ty > 0) str += DocSo3ChuSo(ty) + ' tỷ';
    if (trieu > 0) str += (str ? ', ' : '') + DocSo3ChuSo(trieu) + ' triệu';
    if (nghin > 0) str += (str ? ', ' : '') + DocSo3ChuSo(nghin) + ' nghìn';
    if (tram > 0) str += (str ? ', ' : '') + DocSo3ChuSo(tram);
    return str.trim();
}

module.exports = {
    generateOrderPDF,
    generateProductsPDF,
    generateInventoryPDF
};
