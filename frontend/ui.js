// Common UI utilities (Toast, Loaders, Icons)

// Initialize Lucide Icons
function initIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

document.addEventListener('DOMContentLoaded', initIcons);

// Toast Notification System
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '';
    if (type === 'success') icon = '<i data-lucide="check-circle"></i>';
    if (type === 'error') icon = '<i data-lucide="alert-circle"></i>';
    if (type === 'info') icon = '<i data-lucide="info"></i>';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);
    initIcons();

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Global replace of alert
window.alert = function(msg) {
    // Determine type based on message content roughly
    let type = 'info';
    if (msg.toLowerCase().includes('success')) type = 'success';
    if (msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error') || msg.toLowerCase().includes('invalid')) type = 'error';
    
    showToast(msg, type);
};

// Skeleton Loader Generator
function getSkeletonCard() {
    return `
        <div class="skeleton-card">
            <div class="skeleton skeleton-text" style="width: 30%; margin-bottom: 15px;"></div>
            <div class="skeleton skeleton-title" style="width: 70%; margin-bottom: 10px;"></div>
            <div class="skeleton skeleton-text" style="width: 50%; margin-bottom: 10px;"></div>
            <div class="skeleton skeleton-text" style="width: 90%; margin-bottom: 20px;"></div>
            <div class="skeleton skeleton-button" style="width: 100px;"></div>
        </div>
    `;
}

// Export functions if using modules, otherwise they are global
window.initIcons = initIcons;
window.showToast = showToast;
window.getSkeletonCard = getSkeletonCard;
