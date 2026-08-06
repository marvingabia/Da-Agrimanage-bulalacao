/*
 * Mobile Menu Handler
 * Handles sidebar toggle for mobile devices
 */

// Global toggleSidebar function — must be global for onclick="toggleSidebar()" in HTML
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const hamburger = document.querySelector('.hamburger-btn');

    if (!sidebar || !overlay) return;

    const isOpen = sidebar.classList.contains('show');

    sidebar.classList.toggle('show');
    overlay.classList.toggle('show');

    // Update hamburger icon
    if (hamburger) {
        const icon = hamburger.querySelector('i');
        if (icon) {
            icon.className = isOpen ? 'fas fa-bars' : 'fas fa-times';
        }
    }

    // Prevent body scroll when sidebar is open
    document.body.style.overflow = isOpen ? '' : 'hidden';
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const hamburger = document.querySelector('.hamburger-btn');

    if (sidebar) sidebar.classList.remove('show');
    if (overlay) overlay.classList.remove('show');
    if (hamburger) {
        const icon = hamburger.querySelector('i');
        if (icon) icon.className = 'fas fa-bars';
    }
    document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', function() {
    // Do NOT create duplicate hamburger — it already exists in dashboard.xian HTML
    // Just ensure the overlay exists
    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = closeSidebar;
        document.body.appendChild(overlay);
    }

    const sidebar = document.querySelector('.sidebar');

    // Close sidebar when clicking a nav link (mobile only)
    if (sidebar) {
        const navLinks = sidebar.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    closeSidebar();
                }
            });
        });
    }

    // Close sidebar on window resize if screen becomes larger
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });

    // Handle swipe gestures
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        const swipeThreshold = 50;
        const diff = touchEndX - touchStartX;
        const sidebar = document.querySelector('.sidebar');

        // Swipe right to open (from left edge)
        if (diff > swipeThreshold && touchStartX < 50 && sidebar && !sidebar.classList.contains('show')) {
            toggleSidebar();
        }

        // Swipe left to close
        if (diff < -swipeThreshold && sidebar && sidebar.classList.contains('show')) {
            closeSidebar();
        }
    });
});

// Add scroll indicator for tables
document.addEventListener('DOMContentLoaded', function() {
    const tableContainers = document.querySelectorAll('.table-responsive');
    
    tableContainers.forEach(container => {
        container.addEventListener('scroll', function() {
            if (this.scrollLeft > 10) {
                this.classList.add('scrolled');
            } else {
                this.classList.remove('scrolled');
            }
        });
    });
});

// Prevent zoom on double tap (iOS)
let lastTouchEnd = 0;
document.addEventListener('touchend', function(event) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Add viewport meta tag if not present
if (!document.querySelector('meta[name="viewport"]')) {
    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(viewport);
}
