// Favorites Page JavaScript
class FavoritesPage {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.animateCards();
    }

    bindEvents() {
        // Remove favorite buttons
        document.querySelectorAll('.btn-remove-favorite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const productId = btn.closest('.favorite-card').dataset.productId;
                this.removeFavorite(productId);
            });
        });

        // View detail buttons
        document.querySelectorAll('.btn-view-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Add loading state
                btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Đang tải...';
                btn.style.pointerEvents = 'none';
            });
        });
    }

    async removeFavorite(productId) {
        const card = document.querySelector(`[data-product-id="${productId}"]`);
        if (!card) return;

        // Show loading state
        card.style.opacity = '0.5';
        card.style.pointerEvents = 'none';

        try {
            const response = await fetch(`/favorites/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                // Animate card removal
                card.style.transform = 'scale(0.8)';
                card.style.opacity = '0';
                
                setTimeout(() => {
                    card.remove();
                    
                    // Check if no more favorites
                    const remainingCards = document.querySelectorAll('.favorite-card');
                    if (remainingCards.length === 0) {
                        this.showEmptyState();
                    }
                }, 300);

                this.showNotification('Đã xóa khỏi danh sách yêu thích!', 'success');
                this.updateStats();
            } else {
                throw new Error(data.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Error removing favorite:', error);
            this.showNotification('Có lỗi xảy ra khi xóa khỏi yêu thích!', 'error');
            
            // Restore card state
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
        }
    }

    showEmptyState() {
        const main = document.querySelector('main');
        const grid = document.querySelector('.favorites-grid');
        
        if (grid) {
            grid.remove();
        }

        // Remove stats section
        const stats = document.querySelector('.favorites-stats');
        if (stats) {
            stats.remove();
        }

        // Add empty state
        main.innerHTML += `
            <div class="empty-favorites">
                <div class="empty-favorites-icon">
                    <i class="ri-heart-line"></i>
                </div>
                <h2>Chưa có sản phẩm yêu thích</h2>
                <p>Hãy khám phá và thêm những sản phẩm bạn yêu thích vào danh sách này!</p>
                <a href="/products" class="btn-explore">
                    <i class="ri-store-line"></i>
                    Khám phá sản phẩm
                </a>
            </div>
        `;
    }

    updateStats() {
        const remainingCards = document.querySelectorAll('.favorite-card');
        const count = remainingCards.length;
        
        // Update count stat
        const countStat = document.querySelector('.stat-number');
        if (countStat) {
            countStat.textContent = count;
        }

        // Update total value
        let totalValue = 0;
        remainingCards.forEach(card => {
            const priceText = card.querySelector('.favorite-card-price').textContent;
            const price = parseInt(priceText.replace(/[^\d]/g, ''));
            totalValue += price;
        });

        const valueStats = document.querySelectorAll('.stat-number');
        if (valueStats.length > 1) {
            valueStats[1].textContent = totalValue.toLocaleString('vi-VN') + ' ₫';
        }

        // Update average
        const average = count > 0 ? Math.round(totalValue / count) : 0;
        if (valueStats.length > 2) {
            valueStats[2].textContent = average.toLocaleString('vi-VN') + ' ₫';
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

    animateCards() {
        const cards = document.querySelectorAll('.favorite-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    // Add to cart from favorites
    async addToCart(productId, quantity = 1) {
        try {
            const response = await fetch('/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    productId: productId,
                    quantity: quantity
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Đã thêm vào giỏ hàng!', 'success');
            } else {
                throw new Error(data.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            this.showNotification('Có lỗi xảy ra khi thêm vào giỏ hàng!', 'error');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new FavoritesPage();
});

// Export for global access
window.FavoritesPage = FavoritesPage;
