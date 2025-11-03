// Product Detail Page JavaScript
class ProductDetail {
    constructor() {
        this.productId = null;
        this.maxStock = 0;
        this.isAddingToCart = false;
        this.init();
    }

    init() {
        this.productId = document.querySelector('[data-product-id]')?.dataset.productId;
        this.maxStock = parseInt(document.querySelector('[data-max-stock]')?.dataset.maxStock || '0');
        this.bindEvents();
        this.updateQuantityButtons();
    }

    bindEvents() {
        // Quantity controls
        document.getElementById('quantity')?.addEventListener('change', (e) => this.handleQuantityChange(e));
        document.getElementById('decreaseBtn')?.addEventListener('click', () => this.decreaseQuantity());
        document.getElementById('increaseBtn')?.addEventListener('click', () => this.increaseQuantity());
        
        // Add to cart
        document.getElementById('addToCartBtn')?.addEventListener('click', () => this.addToCart(true)); // true = redirect to detail
        document.getElementById('addToCartOnlyBtn')?.addEventListener('click', () => this.addToCart(false)); // false = no redirect
        
        // Wishlist
        document.getElementById('wishlistBtn')?.addEventListener('click', () => this.addToWishlist());
        
        // Share
        document.getElementById('shareBtn')?.addEventListener('click', () => this.shareProduct());
        
        // Tab switching - only target tab links, not navigation links
        document.querySelectorAll('.product-tabs .nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = link.getAttribute('data-tab');
                this.showTab(tabName);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    handleQuantityChange(e) {
        let value = parseInt(e.target.value);
        if (isNaN(value) || value < 1) {
            e.target.value = 1;
            value = 1;
        } else if (value > this.maxStock) {
            e.target.value = this.maxStock;
            value = this.maxStock;
        }
        this.updateQuantityButtons();
    }

    increaseQuantity() {
        const quantityInput = document.getElementById('quantity');
        let currentValue = parseInt(quantityInput.value);
        if (currentValue < this.maxStock) {
            quantityInput.value = currentValue + 1;
            this.updateQuantityButtons();
        }
    }

    decreaseQuantity() {
        const quantityInput = document.getElementById('quantity');
        let currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
            quantityInput.value = currentValue - 1;
            this.updateQuantityButtons();
        }
    }

    updateQuantityButtons() {
        const quantity = parseInt(document.getElementById('quantity')?.value || '1');
        const decreaseBtn = document.getElementById('decreaseBtn');
        const increaseBtn = document.getElementById('increaseBtn');
        
        if (decreaseBtn) decreaseBtn.disabled = quantity <= 1;
        if (increaseBtn) increaseBtn.disabled = quantity >= this.maxStock;
    }

    async addToCart(redirectToDetail = true) {
        if (this.isAddingToCart) return;
        
        const quantity = parseInt(document.getElementById('quantity')?.value || '1');
        const addToCartBtn = document.getElementById('addToCartBtn');
        const addToCartOnlyBtn = document.getElementById('addToCartOnlyBtn');
        const addToCartText = document.getElementById('addToCartText');
        
        if (quantity < 1 || quantity > this.maxStock) {
            this.showNotification('Số lượng không hợp lệ!', 'error');
            return;
        }

        this.isAddingToCart = true;
        if (addToCartBtn) addToCartBtn.disabled = true;
        if (addToCartOnlyBtn) addToCartOnlyBtn.disabled = true;
        if (addToCartText) addToCartText.innerHTML = '<span class="loading"></span> Đang thêm...';

        try {
            const response = await fetch('/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    productId: this.productId,
                    quantity: quantity
                })
            });

            // Không hiển thị alert lỗi kết nối, luôn chuyển sang trang giỏ hàng
            setTimeout(() => {
                window.location.href = '/cart';
            }, 500);
        } catch (error) {
            // Không hiển thị alert lỗi kết nối nữa, chỉ chuyển trang
            window.location.href = '/cart';
        } finally {
            this.isAddingToCart = false;
            if (addToCartBtn) addToCartBtn.disabled = false;
            if (addToCartOnlyBtn) addToCartOnlyBtn.disabled = false;
            if (addToCartText) addToCartText.innerHTML = '<i class="ri-shopping-cart-line"></i> Thêm vào giỏ & Xem chi tiết';
        }
    }

    async addToWishlist() {
        if (window.isAuthenticated === false || window.isAuthenticated === 'false') {
            window.location.href = '/login?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search);
            return;
        }
        const btn = document.getElementById('wishlistBtn');
        const icon = btn?.querySelector('i');
        const span = btn?.querySelector('span');
        if (!btn || !icon || !this.productId) return;
        const isFavorite = icon.classList.contains('ri-heart-fill');
        try {
            if (!isFavorite) {
                const res = await fetch(`/favorites/${this.productId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
                if (res.ok) {
                    // Cập nhật icon
                    icon.classList.remove('ri-heart-line', 'text-gray-400');
                    icon.classList.add('ri-heart-fill', 'text-red-500');
                    // Cập nhật text
                    if (span) span.textContent = 'Đã yêu thích';
                    // Cập nhật title
                    btn.title = 'Bỏ khỏi yêu thích';
                    this.showNotification('Đã thêm vào yêu thích!', 'success');
                } else {
                    this.showNotification('Không thể thêm vào yêu thích!', 'error');
                }
            } else {
                const res = await fetch(`/favorites/${this.productId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
                if (res.ok) {
                    // Cập nhật icon
                    icon.classList.remove('ri-heart-fill', 'text-red-500');
                    icon.classList.add('ri-heart-line', 'text-gray-400');
                    // Cập nhật text
                    if (span) span.textContent = 'Yêu thích';
                    // Cập nhật title
                    btn.title = 'Thêm vào yêu thích';
                    this.showNotification('Đã bỏ khỏi yêu thích!', 'success');
                } else {
                    this.showNotification('Không thể bỏ khỏi yêu thích!', 'error');
                }
            }
        } catch (err) {
            this.showNotification('Có lỗi xảy ra khi thao tác yêu thích!', 'error');
        }
    }

    shareProduct() {
        const productTitle = document.querySelector('.product-title')?.textContent || 'Sản phẩm';
        const productUrl = window.location.href;
        
        if (navigator.share) {
            navigator.share({
                title: productTitle,
                url: productUrl
            }).then(() => {
                this.showNotification('Đã chia sẻ sản phẩm!', 'success');
            }).catch(() => {
                this.showNotification('Chia sẻ bị hủy', 'info');
            });
        } else {
            // Fallback: copy URL to clipboard
            navigator.clipboard.writeText(productUrl).then(() => {
                this.showNotification('Đã sao chép link sản phẩm!', 'success');
            }).catch(() => {
                this.showNotification('Không thể sao chép link', 'error');
            });
        }
    }

    showTab(tabName) {
        // Hide all tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });

        // Remove active class from all tab buttons
        document.querySelectorAll('.nav-link').forEach(button => {
            button.classList.remove('active');
        });

        // Show selected tab
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) selectedTab.style.display = 'block';

        // Add active class to selected tab button
        const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeButton) activeButton.classList.add('active');
    }

    updateCartCount(count) {
        const cartCountElement = document.querySelector('.cart-count');
        if (cartCountElement && count !== undefined) {
            cartCountElement.textContent = count;
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = type === 'success' ? 'check' : type === 'error' ? 'close' : 'information';
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="ri-${icon}-line"></i>
                ${message}
            </div>
        `;

        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    handleKeyboard(e) {
        if (e.key === 'Enter' && document.activeElement.id === 'quantity') {
            this.addToCart(true); // Sử dụng button chính (redirect to detail)
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new ProductDetail();
});

// Export for global access
window.ProductDetail = ProductDetail; 