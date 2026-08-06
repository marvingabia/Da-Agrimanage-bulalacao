/*
    DA AgriManage - Agricultural Management System
    Authentication Middleware
*/

// Helper: detect if request expects JSON (API call)
const isApiRequest = (req) => {
    return req.originalUrl.includes('/api/') ||
           req.path.startsWith('/api/') ||
           (req.headers.accept && req.headers.accept.includes('application/json')) ||
           req.xhr;
};

export const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        if (isApiRequest(req)) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        return res.redirect('/login');
    }
    next();
};

export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.session.userId) {
            if (isApiRequest(req)) {
                return res.status(401).json({ error: 'Not authenticated' });
            }
            return res.redirect('/login');
        }
        
        if (!roles.includes(req.session.userRole)) {
            if (isApiRequest(req)) {
                return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
            }
            return res.status(403).render('error', { 
                title: 'Access Denied',
                message: 'You do not have permission to access this resource.'
            });
        }
        
        next();
    };
};

export const redirectIfAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    next();
};

// Staff-only operations (Full CRUD access)
export const requireStaffOnly = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (req.session.userRole !== 'staff') {
        return res.status(403).json({ 
            error: 'Access denied. Only staff can perform CRUD operations.' 
        });
    }
    
    next();
};

// Admin view-only (Monitoring/Supervising)
export const requireAdminView = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (req.session.userRole !== 'admin') {
        return res.status(403).json({ 
            error: 'Access denied. Admin only.' 
        });
    }
    
    next();
};

// Staff or Admin (for viewing data)
export const requireStaffOrAdmin = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!['staff', 'admin'].includes(req.session.userRole)) {
        return res.status(403).json({ 
            error: 'Access denied. Staff or Admin access required.' 
        });
    }
    
    next();
};