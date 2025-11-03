// Signup page JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const strengthBar = document.getElementById('strengthBar');
    
    // Password strength checker
    if (passwordInput && strengthBar) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = checkPasswordStrength(password);
            updateStrengthBar(strength);
        });
    }
    
    // Password confirmation checker
    if (passwordInput && confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            const password = passwordInput.value;
            const confirmPassword = this.value;
            
            if (confirmPassword && password !== confirmPassword) {
                this.setCustomValidity('Mật khẩu không khớp');
                this.style.borderColor = '#f87171';
            } else {
                this.setCustomValidity('');
                this.style.borderColor = '#e2e8f0';
            }
        });
    }
    
    // Form validation
    const form = document.querySelector('.signup-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            if (password !== confirmPassword) {
                e.preventDefault();
                showError('Mật khẩu không khớp');
                return false;
            }
            
            if (password.length < 6) {
                e.preventDefault();
                showError('Mật khẩu phải có ít nhất 6 ký tự');
                return false;
            }
        });
    }
});

function checkPasswordStrength(password) {
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    
    // Character variety checks
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    return Math.min(strength, 4);
}

function updateStrengthBar(strength) {
    const strengthBar = document.getElementById('strengthBar');
    if (!strengthBar) return;
    
    // Remove all strength classes
    strengthBar.className = 'password-strength-bar';
    
    // Add appropriate strength class
    if (strength === 0) {
        strengthBar.style.width = '0%';
    } else if (strength === 1) {
        strengthBar.className += ' strength-weak';
    } else if (strength === 2) {
        strengthBar.className += ' strength-fair';
    } else if (strength === 3) {
        strengthBar.className += ' strength-good';
    } else if (strength === 4) {
        strengthBar.className += ' strength-strong';
    }
}

function showError(message) {
    // Remove existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Create new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="ri-error-warning-line error-icon"></i>
        <span>${message}</span>
    `;
    
    // Insert before form
    const form = document.querySelector('.signup-form');
    if (form) {
        form.parentNode.insertBefore(errorDiv, form);
    }
}

// Add smooth scrolling for better UX
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add loading state to submit button
document.querySelector('.signup-form')?.addEventListener('submit', function() {
    const submitBtn = this.querySelector('.signup-btn');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="ri-loader-4-line" style="margin-right: 8px; animation: spin 1s linear infinite;"></i>Đang xử lý...';
        submitBtn.disabled = true;
    }
});

// Add spin animation for loading icon
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
