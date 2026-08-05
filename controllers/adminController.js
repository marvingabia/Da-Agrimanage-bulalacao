/*
    DA AgriManage - Admin Controller
    Handles admin-specific operations
*/

// Note: These imports are not used directly, models are imported dynamically where needed
// import { User } from "../models/UserMySQL.js";
// import { Inventory } from "../models/InventoryMySQL.js";
// import { Claim } from "../models/ClaimMySQL.js";
// import { DamageReport } from "../models/DamageReportMySQL.js";
// import { Insurance } from "../models/InsuranceMySQL.js";
// import { Announcement } from "../models/AnnouncementMySQL.js";

// Get all farmers
export const getAllFarmers = async (req, res) => {
    try {
        const { User } = await import('../models/UserMySQL.js');
        const farmers = await User.findByRole('farmer');
        res.json({ farmers });
    } catch (error) {
        console.error('Error getting farmers:', error);
        res.status(500).json({ error: 'Failed to load farmers' });
    }
};

// Get all staff (approved only)
export const getAllStaff = async (req, res) => {
    try {
        // Import User model from MySQL
        const { User } = await import('../models/UserMySQL.js');
        
        // Get all staff from MySQL
        const allStaff = await User.findByRole('staff');
        
        console.log(`📊 Total staff in database: ${allStaff.length}`);
        console.log(`📊 Staff approval status:`, allStaff.map(s => `${s.name}: ${s.isApproved}`).join(', '));
        
        // Filter for approved staff only (check for true, 1, or "1")
        const approvedStaff = allStaff
            .filter(user => user.isApproved === true || user.isApproved === 1 || user.isApproved === '1')
            .map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone || 'N/A',
                barangay: user.barangay || 'N/A',
                dob: user.dob,
                approvedAt: user.approvedAt,
                staffingManagement: user.staffingManagement || 'N/A',
                createdAt: user.createdAt,
                isApproved: user.isApproved
            }));
        
        console.log(`✅ Approved staff count: ${approvedStaff.length}`);
        
        res.json({ 
            success: true,
            staff: approvedStaff,
            count: approvedStaff.length
        });
    } catch (error) {
        console.error('Error getting staff:', error);
        res.status(500).json({ success: false, error: 'Failed to load staff' });
    }
};

// Get staff by ID
export const getStaffById = async (req, res) => {
    try {
        const { id } = req.params;
        const staff = await User.findById(id);
        if (!staff || staff.role !== 'staff') return res.status(404).json({ success: false, message: 'Staff not found' });
        res.json({ success: true, staff });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update staff member
export const updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, barangay, status } = req.body;
        const staff = await User.findById(id);
        if (!staff || staff.role !== 'staff') return res.status(404).json({ success: false, message: 'Staff not found' });
        staff.name = name; staff.email = email; staff.phone = phone; staff.barangay = barangay; staff.status = status;
        await staff.save();
        res.json({ success: true, message: 'Staff updated successfully', staff });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete staff member
export const deleteStaff = async (req, res) => {
    // TODO: Implement actual delete logic for User model
    res.json({ success: true, message: 'Staff deleted (mock)' });
};

// Create new staff member
export const createStaff = async (req, res) => {
    try {
        const { name, email, phone, barangay } = req.body;
        
        const staff = new User({
            name,
            email,
            phone,
            role: 'staff',
            barangay,
            status: 'active'
        });

        await staff.save();
        res.json({ success: true, message: 'Staff member created successfully', staff });
    } catch (error) {
        console.error('Error creating staff:', error);
        res.status(500).json({ error: 'Failed to create staff member' });
    }
};

// Get all inventory items
export const getAllInventory = async (req, res) => {
    try {
        const inventory = await Inventory.findAll();
        res.json({ inventory });
    } catch (error) {
        console.error('Error getting inventory:', error);
        res.status(500).json({ error: 'Failed to load inventory' });
    }
};

// Get all claims
export const getAllClaims = async (req, res) => {
    try {
        const claims = await Claim.findAll();
        res.json({ claims });
    } catch (error) {
        console.error('Error getting claims:', error);
        res.status(500).json({ error: 'Failed to load claims' });
    }
};

// Update claim status
export const updateClaimStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reviewNotes } = req.body;
        
        const claim = await Claim.findById(id);
        if (!claim) {
            return res.status(404).json({ error: 'Claim not found' });
        }

        await claim.updateStatus(status, req.session.userId, reviewNotes);
        res.json({ success: true, message: 'Claim status updated successfully', claim });
    } catch (error) {
        console.error('Error updating claim status:', error);
        res.status(500).json({ error: 'Failed to update claim status' });
    }
};

// Get all damage reports
export const getAllDamageReports = async (req, res) => {
    try {
        const damageReports = await DamageReport.findAll();
        res.json({ damageReports });
    } catch (error) {
        console.error('Error getting damage reports:', error);
        res.status(500).json({ error: 'Failed to load damage reports' });
    }
};

// Update damage report status
export const updateDamageReportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, verificationNotes } = req.body;
        
        const damageReport = await DamageReport.findById(id);
        if (!damageReport) {
            return res.status(404).json({ error: 'Damage report not found' });
        }

        await damageReport.updateStatus(status, req.session.userId, verificationNotes);
        res.json({ success: true, message: 'Damage report status updated successfully', damageReport });
    } catch (error) {
        console.error('Error updating damage report status:', error);
        res.status(500).json({ error: 'Failed to update damage report status' });
    }
};

// Get all insurance applications
export const getAllInsurance = async (req, res) => {
    try {
        const insurance = await Insurance.findAll();
        res.json({ insurance });
    } catch (error) {
        console.error('Error getting insurance applications:', error);
        res.status(500).json({ error: 'Failed to load insurance applications' });
    }
};

// Update insurance status
export const updateInsuranceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, approvalNotes } = req.body;
        
        const insurance = await Insurance.findById(id);
        if (!insurance) {
            return res.status(404).json({ error: 'Insurance application not found' });
        }

        let policyNumber = '';
        if (status === 'approved') {
            policyNumber = insurance.generatePolicyNumber();
        }

        await insurance.updateStatus(status, req.session.userId, approvalNotes, policyNumber);
        res.json({ success: true, message: 'Insurance status updated successfully', insurance });
    } catch (error) {
        console.error('Error updating insurance status:', error);
        res.status(500).json({ error: 'Failed to update insurance status' });
    }
};

// Get all announcements
export const getAllAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.findAll();
        res.json({ announcements });
    } catch (error) {
        console.error('Error getting announcements:', error);
        res.status(500).json({ error: 'Failed to load announcements' });
    }
};

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
    try {
        const [userStats, inventoryStats, claimStats, damageStats, insuranceStats, announcementStats] = await Promise.all([
            User.getStats(),
            Inventory.getStats(),
            Claim.getStats(),
            DamageReport.getStats(),
            Insurance.getStats(),
            Announcement.getStats()
        ]);

        res.json({
            users: userStats,
            inventory: inventoryStats,
            claims: claimStats,
            damage: damageStats,
            insurance: insuranceStats,
            announcements: announcementStats
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ error: 'Failed to load dashboard statistics' });
    }
};

// Import Request Letter model for monitoring
import { RequestLetter } from "../models/RequestLetterMySQL.js";

// Admin: View all request letters (Read-only monitoring)
export const monitorAllRequests = async (req, res) => {
    try {
        const requests = await RequestLetter.findAll();
        
        // Calculate stats
        const stats = {
            total: requests.length,
            pending: requests.filter(r => r.status === 'pending').length,
            responded: requests.filter(r => r.status === 'responded').length,
            approved: requests.filter(r => r.status === 'approved').length,
            rejected: requests.filter(r => r.status === 'rejected').length
        };
        
        res.json({
            success: true,
            requests,
            stats,
            note: 'Admin monitoring view - read-only'
        });
    } catch (error) {
        console.error('Error monitoring requests:', error);
        res.status(500).json({ error: 'Failed to load request monitoring data' });
    }
};

// Admin: Get activity logs (all user activities)
export const getActivityLogs = async (req, res) => {
    try {
        // This would track all CRUD operations by staff and submissions by farmers
        const logs = [
            {
                id: 1,
                timestamp: new Date().toISOString(),
                user: 'Staff Member',
                role: 'staff',
                action: 'approved_request',
                details: 'Approved request #123 for Rice Seeds',
                ipAddress: req.ip
            },
            {
                id: 2,
                timestamp: new Date().toISOString(),
                user: 'Juan Dela Cruz',
                role: 'farmer',
                action: 'submitted_request',
                details: 'Submitted new request for Fertilizer',
                ipAddress: req.ip
            }
        ];
        
        res.json({
            success: true,
            logs,
            note: 'Admin activity monitoring'
        });
    } catch (error) {
        console.error('Error getting activity logs:', error);
        res.status(500).json({ error: 'Failed to load activity logs' });
    }
};


// Get pending staff (not approved yet)
export const getPendingStaff = async (req, res) => {
    try {
        // Import User model from MySQL
        const { User } = await import('../models/UserMySQL.js');
        
        // Get pending staff from MySQL database
        const pendingStaffUsers = await User.findPendingStaff();
        
        // Map to frontend-friendly format
        const pendingStaff = pendingStaffUsers.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || 'N/A',
            barangay: user.barangay || 'N/A',
            staffingManagement: user.staffingManagement || 'N/A',
            createdAt: user.createdAt,
            approved: user.isApproved
        }));
        
        console.log(`✅ Found ${pendingStaff.length} pending staff in MySQL`);
        if (pendingStaff.length > 0) {
            console.log('📋 Pending staff:', pendingStaff.map(s => `${s.name} (${s.email})`).join(', '));
        }
        
        res.json({ 
            success: true, 
            pendingStaff,
            count: pendingStaff.length
        });
    } catch (error) {
        console.error('❌ Error getting pending staff:', error);
        res.status(500).json({ success: false, error: 'Failed to load pending staff' });
    }
};

// Approve staff member
export const approveStaff = async (req, res) => {
    try {
        const { staffId } = req.params;

        // Import User model from MySQL
        const { User } = await import('../models/UserMySQL.js');
        
        // Find the staff member by ID in MySQL
        const staff = await User.findById(staffId);
        
        if (!staff || staff.role !== 'staff') {
            return res.status(404).json({ success: false, error: 'Staff member not found' });
        }

        // Update approval status in MySQL
        await User.approveStaff(staffId);
        
        console.log(`✅ Staff approved in MySQL: ${staff.name} (${staff.email})`);
        
        res.json({ 
            success: true, 
            message: `${staff.name} has been approved successfully. They can now login.`,
            staff: {
                id: staff.id,
                name: staff.name,
                email: staff.email,
                approved: true
            }
        });
    } catch (error) {
        console.error('❌ Error approving staff:', error);
        res.status(500).json({ success: false, error: 'Failed to approve staff' });
    }
};

// Reject staff member
export const rejectStaff = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { reason } = req.body;

        // Import User model from MySQL
        const { User } = await import('../models/UserMySQL.js');
        
        // Find the staff member by ID in MySQL
        const staff = await User.findById(staffId);
        
        if (!staff || staff.role !== 'staff') {
            return res.status(404).json({ success: false, error: 'Staff member not found' });
        }

        // Delete the user from MySQL
        await User.rejectStaff(staffId);
        
        console.log(`❌ Staff rejected in MySQL: ${staff.name} (${staff.email}) - Reason: ${reason || 'No reason provided'}`);
        
        res.json({ 
            success: true, 
            message: `${staff.name}'s registration has been rejected and removed.` 
        });
    } catch (error) {
        console.error('❌ Error rejecting staff:', error);
        res.status(500).json({ success: false, error: 'Failed to reject staff' });
    }
};

// Approve farmer (Admin only)
export const approveFarmer = async (req, res) => {
    try {
        const { id } = req.params;
        // Logic is now inside this controller
        const { registeredUsers, localUsers } = await import('./authController.js');
        const farmer = registeredUsers.find(user => user.id === id && user.role === 'farmer');

        if (!farmer) {
            return res.status(404).json({ success: false, message: 'Farmer not found' });
        }

        farmer.approved = true;
        farmer.approvedDate = new Date().toISOString();

        if (localUsers.has(farmer.email)) {
            const localUser = localUsers.get(farmer.email);
            localUser.approved = true;
        }

        res.json({ success: true, message: `Farmer ${farmer.name} has been approved.` });
    } catch (error) {
        console.error('Error approving farmer:', error);
        res.status(500).json({ success: false, message: 'Failed to approve farmer' });
    }
};

// Reject farmer (Admin only)
export const rejectFarmer = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const { registeredUsers } = await import('./authController.js');
        const farmer = registeredUsers.find(user => user.id === id && user.role === 'farmer');

        if (!farmer) {
            return res.status(404).json({ success: false, message: 'Farmer not found' });
        }

        farmer.approved = false;
        farmer.rejected = true;
        farmer.rejectionReason = reason || 'No reason provided';
        farmer.rejectedDate = new Date().toISOString();

        res.json({ success: true, message: `Farmer ${farmer.name} has been rejected.` });
    } catch (error) {
        console.error('Error rejecting farmer:', error);
        res.status(500).json({ success: false, message: 'Failed to reject farmer' });
    }
};


// Import Staff Duty model
import {
    getActiveDutySessions,
    getPendingDutySessions,
    approveDutySession,
    rejectDutySession,
    getDutyStatistics
} from '../models/StaffDuty.js';

// Mock StaffDuty model if not available
const StaffDuty = {
    getActiveDutySessions: () => [],
    getPendingDutySessions: () => [],
    approveDutySession: (id, admin, notes) => ({ id, staffName: 'Mock Staff', status: 'approved' }),
    rejectDutySession: (id, admin, reason) => ({ id, staffName: 'Mock Staff', status: 'rejected' }),
    getDutyStatistics: () => ({ total: 0, active: 0, pending: 0 }),
    getAllDutySessions: () => [],
    endDutySession: (id, admin, notes) => ({ id, staffName: 'Mock Staff', status: 'ended' })
};

// Get active staff duty sessions
export const getActiveDuty = async (req, res) => {
    try {
        const sessions = getActiveDutySessions();
        const stats = getDutyStatistics();
        
        res.json({
            success: true,
            sessions,
            stats
        });
    } catch (error) {
        console.error('Error getting active duty:', error);
        res.status(500).json({ error: 'Failed to load active duty sessions' });
    }
};

// Get pending duty sessions
export const getPendingDuty = async (req, res) => {
    try {
        const sessions = getPendingDutySessions();
        
        res.json({
            success: true,
            sessions,
            count: sessions.length
        });
    } catch (error) {
        console.error('Error getting pending duty:', error);
        res.status(500).json({ error: 'Failed to load pending duty sessions' });
    }
};

// Approve staff duty
export const approveDuty = async (req, res) => {
    try {
        const { sessionId, notes } = req.body;
        const adminName = req.session.userName;
        
        const session = approveDutySession(sessionId, adminName, notes);
        
        if (session) {
            res.json({
                success: true,
                message: `${session.staffName} is now on duty`,
                session
            });
        } else {
            res.status(404).json({ error: 'Duty session not found' });
        }
    } catch (error) {
        console.error('Error approving duty:', error);
        res.status(500).json({ error: 'Failed to approve duty' });
    }
};

// Reject staff duty
export const rejectDuty = async (req, res) => {
    try {
        const { sessionId, reason } = req.body;
        const adminName = req.session.userName;
        
        const session = rejectDutySession(sessionId, adminName, reason);
        
        if (session) {
            res.json({
                success: true,
                message: `Duty request rejected for ${session.staffName}`,
                session
            });
        } else {
            res.status(404).json({ error: 'Duty session not found' });
        }
    } catch (error) {
        console.error('Error rejecting duty:', error);
        res.status(500).json({ error: 'Failed to reject duty' });
    }
};

// Staff Management Functions for Admin Dashboard

// Get staff duty status for management dashboard
export const getStaffDutyStatus = async (req, res) => {
    try {
        // Import functions from authController and StaffDuty model
        const { getAllRegisteredUsers } = await import('../controllers/authController.js');
        const { getAllDutySessions, getDutyStatistics } = await import('../models/StaffDuty.js');
        
        const allUsers = getAllRegisteredUsers();
        const allSessions = getAllDutySessions();
        
        // Get staff who are logged in (have active sessions)
        const loggedInStaff = allUsers.filter(user => 
            user.role === 'staff' && 
            user.approved === true &&
            allSessions.some(session => session.staffEmail === user.email && session.status !== 'ended')
        ).map(staff => {
            const session = allSessions.find(s => s.staffEmail === staff.email && s.status !== 'ended');
            return {
                id: staff.id,
                name: staff.name,
                email: staff.email,
                loginTime: session ? session.startTime : null,
                accountStatus: staff.approved ? 'approved' : 'pending',
                dutyStatus: session ? session.status : 'no_session',
                dutyId: session ? session.id : null
            };
        });
        
        const stats = getDutyStatistics();
        const totalStaff = allUsers.filter(u => u.role === 'staff').length;
        
        res.json({
            success: true,
            loggedInStaff,
            stats: {
                loggedIn: loggedInStaff.length,
                pendingApproval: loggedInStaff.filter(s => s.dutyStatus === 'pending').length,
                total: totalStaff
            }
        });
    } catch (error) {
        console.error('Error getting staff duty status:', error);
        res.status(500).json({ error: 'Failed to load staff duty status' });
    }
};

// Approve staff duty from management dashboard
export const approveStaffDuty = async (req, res) => {
    try {
        const dutyId = parseInt(req.params.id);
        const adminName = req.session.userName || 'Admin';
        
        const { approveDutySession } = await import('../models/StaffDuty.js');
        const session = approveDutySession(dutyId, adminName, 'Approved from Staff Management Dashboard');
        
        if (session) {
            res.json({
                success: true,
                message: `${session.staffName} is now approved for duty`,
                session
            });
        } else {
            res.status(404).json({ error: 'Duty session not found' });
        }
    } catch (error) {
        console.error('Error approving staff duty:', error);
        res.status(500).json({ error: 'Failed to approve staff duty' });
    }
};

// Reject staff duty from management dashboard
export const rejectStaffDuty = async (req, res) => {
    try {
        const dutyId = parseInt(req.params.id);
        const { reason } = req.body;
        const adminName = req.session.userName || 'Admin';
        
        const { rejectDutySession } = await import('../models/StaffDuty.js');
        const session = rejectDutySession(dutyId, adminName, reason || 'Rejected from Staff Management Dashboard');
        
        if (session) {
            res.json({
                success: true,
                message: `Duty request rejected for ${session.staffName}`,
                session
            });
        } else {
            res.status(404).json({ error: 'Duty session not found' });
        }
    } catch (error) {
        console.error('Error rejecting staff duty:', error);
        res.status(500).json({ error: 'Failed to reject staff duty' });
    }
};

// End staff duty from management dashboard
export const endStaffDuty = async (req, res) => {
    try {
        const dutyId = parseInt(req.params.id);
        const adminName = req.session.userName || 'Admin';
        
        const { endDutySession } = await import('../models/StaffDuty.js');
        const session = endDutySession(dutyId, adminName, 'Ended from Staff Management Dashboard');
        
        if (session) {
            res.json({
                success: true,
                message: `Duty ended for ${session.staffName}`,
                session
            });
        } else {
            res.status(404).json({ error: 'Duty session not found' });
        }
    } catch (error) {
        console.error('Error ending staff duty:', error);
        res.status(500).json({ error: 'Failed to end staff duty' });
    }
};

// Suspend staff member with duration
export const suspendStaff = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { duration, unit, reason } = req.body;

        console.log('🔍 Suspend staff request:', { staffId, duration, unit, reason });

        // Import User model from MySQL
        const { User } = await import('../models/UserMySQL.js');

        // Find the staff member by ID in MySQL
        const staff = await User.findById(staffId);

        console.log('👤 Staff found:', staff ? `${staff.name} (${staff.email})` : 'NOT FOUND');

        if (!staff || staff.role !== 'staff') {
            console.log('❌ Staff validation failed:', { found: !!staff, role: staff?.role });
            return res.status(404).json({ success: false, error: 'Staff member not found' });
        }

        // Calculate suspension end date
        const suspensionStart = new Date();
        const suspensionEnd = new Date();

        if (unit === 'days') {
            suspensionEnd.setDate(suspensionEnd.getDate() + duration);
        } else if (unit === 'weeks') {
            suspensionEnd.setDate(suspensionEnd.getDate() + (duration * 7));
        } else if (unit === 'months') {
            suspensionEnd.setMonth(suspensionEnd.getMonth() + duration);
        }

        console.log('📅 Suspension dates:', {
            start: suspensionStart.toISOString(),
            end: suspensionEnd.toISOString()
        });

        // Update staff status in MySQL
        const suspensionData = {
            status: 'suspended',
            suspensionStart: suspensionStart,
            suspensionEnd: suspensionEnd,
            suspensionDuration: duration,
            suspensionUnit: unit,
            suspensionReason: reason || 'No reason provided',
            suspendedBy: req.session.userId,
            suspendedByName: req.session.userName || 'Admin'
        };

        console.log('💾 Attempting to update database with:', suspensionData);

        await User.suspendStaff(staffId, suspensionData);

        console.log(`⏸️ Staff suspended: ${staff.name} (${staff.email}) for ${duration} ${unit}`);
        console.log(`   Suspension ends: ${suspensionEnd.toISOString()}`);
        console.log(`   Reason: ${reason || 'No reason provided'}`);

        res.json({
            success: true,
            message: `${staff.name} has been suspended for ${duration} ${unit}.`,
            staff: {
                id: staff.id,
                name: staff.name,
                email: staff.email,
                status: 'suspended',
                suspensionEnd: suspensionEnd
            }
        });
    } catch (error) {
        console.error('❌ Error suspending staff:', error);
        console.error('❌ Error details:', {
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage,
            sql: error.sql
        });
        res.status(500).json({
            success: false,
            error: 'Failed to suspend staff',
            details: error.message
        });
    }
}