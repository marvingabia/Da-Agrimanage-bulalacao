/*
    DA AgriManage - Admin Routes
    Handles all API endpoints for administrators.
*/
import express from 'express';
import { requireRole } from '../middleware/auth.js'; // Siguraduhing tama ang path sa auth middleware
import {
    // User Management
    getAllFarmers,
    getAllStaff,
    createStaff,
    updateStaff, // Idinagdag ito
    deleteStaff, // Idinagdag ito
    getStaffById,
    getPendingStaff,
    approveStaff,
    rejectStaff,

    // Monitoring (Read-only)
    getAllInventory,
    getAllClaims,
    getAllDamageReports,
    getAllInsurance,
    getAllAnnouncements,
    monitorAllRequests,
    updateClaimStatus,
    approveFarmer,
    rejectFarmer,
    updateDamageReportStatus,
    updateInsuranceStatus,

    // Dashboard and Logs
    getDashboardStats,
    getActivityLogs,

    // Staff Duty Management
    getStaffDutyStatus,
    approveStaffDuty,
    rejectStaffDuty,
    endStaffDuty
} from '../controllers/adminController.js';

const router = express.Router();

// Lahat ng routes dito ay para sa 'admin' role lang
router.use(requireRole(['admin']));

// Monitoring Routes
router.get('/monitor/inventory', getAllInventory);
router.get('/monitor/claims', getAllClaims);
router.get('/monitor/reports', getAllDamageReports);
router.get('/monitor/insurance', getAllInsurance);
router.get('/monitor/announcements', getAllAnnouncements);
router.get('/monitor/requests', monitorAllRequests);

// Status Update Routes (for Admin approval)
router.put('/claims/:id/status', updateClaimStatus);
router.put('/reports/:id/status', updateDamageReportStatus);
router.put('/insurance/:id/status', updateInsuranceStatus);

// Staff & Farmer Management
// NOTE: specific paths must come BEFORE /:id to avoid route conflicts
router.get('/staff/pending', getPendingStaff);           // GET pending staff list
router.post('/staff/approve/:staffId', approveStaff);    // Approve a staff member
router.post('/staff/reject/:staffId', rejectStaff);      // Reject a staff member
router.get('/staff/duty-status', getStaffDutyStatus);
router.put('/staff/duty/:id/approve', approveStaffDuty);
router.put('/staff/duty/:id/reject', rejectStaffDuty);
router.put('/staff/duty/:id/end', endStaffDuty);
router.get('/staff/:id', getStaffById);                  // Get single staff for edit
router.get('/staff', getAllStaff);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);                   // Update staff
router.delete('/staff/:id', deleteStaff);                // Delete staff
router.get('/farmers', getAllFarmers);
router.post('/farmers/:id/approve', approveFarmer);      // Approve farmer
router.post('/farmers/:id/reject', rejectFarmer);        // Reject farmer

// Dashboard
router.get('/stats', getDashboardStats);
router.get('/logs', getActivityLogs);

export default router;