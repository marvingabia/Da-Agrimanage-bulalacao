/*
 * Auto-Refresh System for Staff Dashboard
 * Automatically updates lists when farmers submit new items
 */

// Auto-refresh interval (10 seconds for near real-time)
const REFRESH_INTERVAL = 10000;

// Track last counts to detect changes
let lastCounts = {
    damageReports: 0,
    insurance: 0,
    requestLetters: 0,
    claims: 0
};

// Initialize auto-refresh when page loads
document.addEventListener('DOMContentLoaded', function() {
    const userRole = document.body.dataset.userRole || '';
    
    if (userRole === 'staff' || userRole === 'admin') {
        console.log('🔄 Auto-refresh enabled for staff/admin');
        startAutoRefresh();
    }
});

function startAutoRefresh() {
    // Initial load
    checkForNewSubmissions();
    
    // Set up interval
    setInterval(checkForNewSubmissions, REFRESH_INTERVAL);
}

async function checkForNewSubmissions() {
    try {
        // Check damage reports
        const damageReports = await fetch('/api/damage-reports').then(r => r.json());
        if (damageReports.success && damageReports.damageReports) {
            updateIfChanged('damageReports', damageReports.damageReports.length);
        }
        
        // Check insurance
        const insurance = await fetch('/api/insurance').then(r => r.json());
        if (insurance.success && insurance.insurance) {
            updateIfChanged('insurance', insurance.insurance.length);
        }
        
        // Check request letters
        const requests = await fetch('/api/staff/request-letters').then(r => r.json());
        if (requests.success && requests.requests) {
            updateIfChanged('requestLetters', requests.requests.length);
        }
        
        // Check claims
        const claims = await fetch('/api/claims').then(r => r.json());
        if (claims.success && claims.claims) {
            updateIfChanged('claims', claims.claims.length);
        }
    } catch (error) {
        console.error('Auto-refresh error:', error);
    }
}

function updateIfChanged(type, newCount) {
    if (lastCounts[type] !== newCount && lastCounts[type] > 0) {
        const increase = newCount - lastCounts[type];
        if (increase > 0) {
            showNotification(type, increase);
            refreshCurrentSection(type);
        }
    }
    lastCounts[type] = newCount;
}

function showNotification(type, count) {
    const messages = {
        damageReports: `${count} new damage report(s)`,
        insurance: `${count} new insurance application(s)`,
        requestLetters: `${count} new request letter(s)`,
        claims: `${count} new claim(s)`
    };
    
    const message = messages[type] || `${count} new submission(s)`;
    
    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Farmer Submission', {
            body: message,
            icon: '/images/logo.png'
        });
    }
    
    // Show in-page notification
    showInPageNotification(message);
    
    // Update badge count
    updateBadge(type, count);
}

function showInPageNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-info alert-dismissible fade show position-fixed';
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        <strong>🔔 New Submission!</strong><br>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 5000);
}

function updateBadge(type, increase) {
    const badgeMap = {
        damageReports: 'sidebar-reports-count',
        insurance: 'sidebar-insurance-count',
        requestLetters: 'sidebar-requests-count',
        claims: 'sidebar-claims-count'
    };
    
    const badgeId = badgeMap[type];
    if (badgeId) {
        const badge = document.getElementById(badgeId);
        if (badge) {
            const current = parseInt(badge.textContent) || 0;
            badge.textContent = current + increase;
            badge.classList.add('badge-pulse');
        }
    }
}

function refreshCurrentSection(type) {
    const sectionMap = {
        damageReports: 'damage-reports',
        insurance: 'insurance',
        requestLetters: 'request-letters',
        claims: 'claims'
    };
    
    const currentSection = document.querySelector('[id$="-section"][style*="display: block"]');
    if (currentSection && currentSection.id === `${sectionMap[type]}-section`) {
        console.log(`🔄 Refreshing ${type} section...`);
        if (typeof window[`load${capitalize(type)}`] === 'function') {
            window[`load${capitalize(type)}`]();
        }
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Request notification permission on load
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}
