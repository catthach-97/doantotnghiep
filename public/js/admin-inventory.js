// Admin Inventory Management JavaScript
class InventoryManager {
    constructor() {
        this.initializeEventListeners();
        this.updateBulkUpdateButton();
    }

    initializeEventListeners() {
        // Individual stock update buttons
        document.querySelectorAll('.update-stock-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleStockUpdate(e));
        });

        // Bulk selection
        const selectAll = document.getElementById('selectAll');
        const selectAllBtn = document.getElementById('selectAllBtn');
        const productCheckboxes = document.querySelectorAll('.product-checkbox');

        if (selectAll) {
            selectAll.addEventListener('change', () => this.handleSelectAll());
        }

        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.handleSelectAllButton());
        }

        productCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateBulkUpdateButton());
        });

        // Bulk update modal
        const bulkUpdateBtn = document.getElementById('bulkUpdateBtn');
        const cancelBulkUpdate = document.getElementById('cancelBulkUpdate');
        const confirmBulkUpdate = document.getElementById('confirmBulkUpdate');
        const bulkUpdateModal = document.getElementById('bulkUpdateModal');

        if (bulkUpdateBtn) {
            bulkUpdateBtn.addEventListener('click', () => this.showBulkUpdateModal());
        }

        if (cancelBulkUpdate) {
            cancelBulkUpdate.addEventListener('click', () => this.hideBulkUpdateModal());
        }

        if (confirmBulkUpdate) {
            confirmBulkUpdate.addEventListener('click', () => this.handleBulkUpdate());
        }

        if (bulkUpdateModal) {
            bulkUpdateModal.addEventListener('click', (e) => {
                if (e.target === bulkUpdateModal) {
                    this.hideBulkUpdateModal();
                }
            });
        }

        // Quantity input validation
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('input', (e) => this.validateQuantityInput(e));
        });
    }

    handleStockUpdate(event) {
        const btn = event.currentTarget;
        const productId = btn.dataset.productId;
        const action = btn.dataset.action;
        const quantityInput = document.querySelector(`input[data-product-id="${productId}"]`);
        const quantity = parseInt(quantityInput.value);

        if (isNaN(quantity) || quantity < 0) {
            this.showNotification('Vui lòng nhập số lượng hợp lệ', 'error');
            return;
        }

        this.updateStockQuantity(productId, quantity, action);
    }

    async updateStockQuantity(productId, quantity, action) {
        try {
            const response = await fetch('/admin/inventory/update-stock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: productId,
                    quantity: quantity,
                    action: action
                })
            });

            const data = await response.json();

            if (data.success) {
                // Update the quantity input with new value
                const quantityInput = document.querySelector(`input[data-product-id="${productId}"]`);
                quantityInput.value = data.product.stockQuantity;
                
                // Update stock status badge
                this.updateStockStatusBadge(productId, data.product.stockQuantity);
                
                this.showNotification('Cập nhật thành công!', 'success');
            } else {
                this.showNotification(data.message || 'Cập nhật thất bại!', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Lỗi kết nối!', 'error');
        }
    }

    handleSelectAll() {
        const selectAll = document.getElementById('selectAll');
        const productCheckboxes = document.querySelectorAll('.product-checkbox');
        
        productCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAll.checked;
        });
        
        this.updateBulkUpdateButton();
    }

    handleSelectAllButton() {
        const productCheckboxes = document.querySelectorAll('.product-checkbox');
        const selectAll = document.getElementById('selectAll');
        const allChecked = Array.from(productCheckboxes).every(cb => cb.checked);
        
        productCheckboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });
        
        selectAll.checked = !allChecked;
        this.updateBulkUpdateButton();
    }

    updateBulkUpdateButton() {
        const checkedCount = document.querySelectorAll('.product-checkbox:checked').length;
        const bulkUpdateBtn = document.getElementById('bulkUpdateBtn');
        const selectedCount = document.getElementById('selectedCount');
        
        if (bulkUpdateBtn) {
            bulkUpdateBtn.disabled = checkedCount === 0;
        }
        
        if (selectedCount) {
            selectedCount.textContent = checkedCount;
        }
    }

    showBulkUpdateModal() {
        const checkedProducts = document.querySelectorAll('.product-checkbox:checked');
        if (checkedProducts.length === 0) {
            this.showNotification('Vui lòng chọn ít nhất một sản phẩm', 'error');
            return;
        }
        
        const modal = document.getElementById('bulkUpdateModal');
        modal.classList.remove('hidden');
    }

    hideBulkUpdateModal() {
        const modal = document.getElementById('bulkUpdateModal');
        modal.classList.add('hidden');
    }

    async handleBulkUpdate() {
        const action = document.getElementById('bulkAction').value;
        const quantity = parseInt(document.getElementById('bulkQuantity').value);
        const checkedProducts = document.querySelectorAll('.product-checkbox:checked');

        if (isNaN(quantity) || quantity < 0) {
            this.showNotification('Vui lòng nhập số lượng hợp lệ', 'error');
            return;
        }

        const updates = Array.from(checkedProducts).map(checkbox => ({
            productId: checkbox.value,
            quantity: quantity,
            action: action
        }));

        await this.bulkUpdateStock(updates);
        this.hideBulkUpdateModal();
    }

    async bulkUpdateStock(updates) {
        try {
            const response = await fetch('/admin/inventory/bulk-update-stock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    updates: updates
                })
            });

            const data = await response.json();

            if (data.success) {
                // Update all affected products
                data.results.forEach(result => {
                    if (result.success) {
                        const quantityInput = document.querySelector(`input[data-product-id="${result.productId}"]`);
                        if (quantityInput) {
                            quantityInput.value = result.newQuantity;
                            this.updateStockStatusBadge(result.productId, result.newQuantity);
                        }
                    }
                });

                this.showNotification(data.message, 'success');
                
                // Uncheck all checkboxes
                document.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = false);
                const selectAll = document.getElementById('selectAll');
                if (selectAll) selectAll.checked = false;
                this.updateBulkUpdateButton();
            } else {
                this.showNotification(data.message || 'Cập nhật thất bại!', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Lỗi kết nối!', 'error');
        }
    }

    updateStockStatusBadge(productId, stockQuantity) {
        const quantityInput = document.querySelector(`input[data-product-id="${productId}"]`);
        if (!quantityInput) return;

        const stockStatus = quantityInput.closest('td').querySelector('.stock-status');
        if (!stockStatus) return;
        
        let newBadge;
        if (stockQuantity > 10) {
            newBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <i class="ri-checkbox-circle-line mr-1"></i> ${stockQuantity}
            </span>`;
        } else if (stockQuantity > 0) {
            newBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <i class="ri-error-warning-line mr-1"></i> ${stockQuantity}
            </span>`;
        } else {
            newBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <i class="ri-close-circle-line mr-1"></i> Hết hàng
            </span>`;
        }
        
        stockStatus.innerHTML = newBadge;
    }

    validateQuantityInput(event) {
        const input = event.target;
        const value = parseInt(input.value);
        
        if (value < 0) {
            input.value = 0;
        }
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            document.body.removeChild(notification);
        });

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full ${
            type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="ri-${type === 'success' ? 'check' : 'close'}-line mr-2"></i>
                ${message}
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Export functions
    exportToPDF() {
        const currentUrl = new URL(window.location.href);
        window.open('/admin/inventory/export', '_blank');
    }

    // Filter functions
    applyFilters() {
        const form = document.querySelector('form[method="GET"]');
        if (form) {
            form.submit();
        }
    }

    clearFilters() {
        const searchInput = document.querySelector('input[name="search"]');
        const categorySelect = document.querySelector('select[name="category"]');
        const stockSelect = document.querySelector('select[name="stock"]');
        const sortSelect = document.querySelector('select[name="sort"]');

        if (searchInput) searchInput.value = '';
        if (categorySelect) categorySelect.value = '';
        if (stockSelect) stockSelect.value = '';
        if (sortSelect) sortSelect.value = '';

        this.applyFilters();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.inventoryManager = new InventoryManager();
});

// Export for global access
window.InventoryManager = InventoryManager; 