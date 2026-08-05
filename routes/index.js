/*
    DA AgriManage - Main Routes
    Agricultural Management System Routes
*/

import express from "express";
// import { homePage } from "../controllers/homeController.js"; // Unused import removed
import { 
    loginPage, 
    registerPage, 
    forgotPasswordPage, 
    dashboardPage, 
    loginUser, 
    registerUser, 
    logoutUser,
    googleAuth,
    getPendingStaff,
    approveStaff,
    rejectStaff,
    getAllStaff
} from "../controllers/authController.js";
import { suspendStaff } from "../controllers/adminController.js";
import { requireAuth, requireRole, redirectIfAuthenticated } from "../middleware/auth.js";

// Local dashboard stats function for API routes
async function getLocalDashboardStats() {
    try {
        // Import the auth controller functions
        const { getAllRegisteredFarmers, getFarmerStats } = await import("../controllers/authController.js");
        const farmerStats = getFarmerStats();
        
        return {
            totalFarmers: farmerStats.totalFarmers,
            googleFarmers: farmerStats.googleFarmers,
            emailFarmers: farmerStats.emailFarmers,
            activeFarmers: farmerStats.activeFarmers,
            totalClaims: Math.floor(farmerStats.totalFarmers * 1.5),
            pendingReports: Math.floor(farmerStats.totalFarmers * 0.3),
            inventoryItems: 25,
            totalStaff: 5,
            totalAdmins: 1,
            pendingClaims: Math.floor(farmerStats.totalFarmers * 0.2),
            availableItems: 20,
            activeAnnouncements: 3
        };
    } catch (error) {
        console.error("Error getting dashboard stats:", error.message);
        return {
            totalFarmers: 0,
            googleFarmers: 0,
            emailFarmers: 0,
            activeFarmers: 0,
            totalClaims: 0,
            pendingReports: 0,
            inventoryItems: 25,
            totalStaff: 3,
            totalAdmins: 1,
            pendingClaims: 0,
            availableItems: 20,
            activeAnnouncements: 3
        };
    }
}

// Farmer Controller
import {
    getFarmerData,
    submitClaim,
    submitDamageReport,
    applyInsurance,
    getFarmerClaims,
    getFarmerDamageReports,
    getFarmerInsurance,
    getFarmerAnnouncements,
    submitRequestLetter,
    getFarmerRequestLetters
} from "../controllers/farmerController.js";

const router = express.Router();

// Public routes - Main Landing Pages (Farmer/Public)
router.get("/", (req, res) => {
    if (req.session.userId) {
        return res.redirect("/dashboard");
    }
    res.render("home", { title: "Home - Municipal Agriculture Office" });
});

router.get("/about", (req, res) => {
    res.render("about", { title: "About Us - Municipal Agriculture Office" });
});

router.get("/contact", (req, res) => {
    res.render("contact", { title: "Contact Us - Municipal Agriculture Office" });
});

router.get("/login", redirectIfAuthenticated, loginPage);
router.post("/login", loginUser);
router.get("/register", redirectIfAuthenticated, (req, res) => {
    res.render("register", { title: "Register - AgriSystem Dashboard" });
});
router.post("/register", registerUser);
router.post("/auth/google", googleAuth);
router.get("/forgot-password", redirectIfAuthenticated, forgotPasswordPage);

// Google OAuth Routes
import passport from "../config/passport.js";

// Check if Google OAuth is configured
const isGoogleConfigured = process.env.GOOGLE_CLIENT_ID && 
                            process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id.apps.googleusercontent.com';

if (isGoogleConfigured) {
    router.get("/auth/google", 
        passport.authenticate('google', { 
            scope: ['profile', 'email'] 
        })
    );

    router.get("/auth/google/callback",
        passport.authenticate('google', { failureRedirect: '/login' }),
        (req, res) => {
            // Successful authentication
            req.session.userId = req.user.id;
            req.session.userName = req.user.name;
            req.session.userEmail = req.user.email;
            req.session.userRole = req.user.role;
            req.session.isApproved = req.user.isApproved;
            
            console.log('✅ Google OAuth login successful:', req.user.email);
            res.redirect('/dashboard');
        }
    );
} else {
    // Fallback routes when Google OAuth is not configured
    router.get("/auth/google", (req, res) => {
        res.redirect('/login?error=google_not_configured');
    });
    
    router.get("/auth/google/callback", (req, res) => {
        res.redirect('/login?error=google_not_configured');
    });
}

// Staff Landing Pages - Separate from main pages
router.get("/staff", (req, res) => {
    if (req.session.userId && req.session.userRole === 'staff') {
        return res.redirect("/dashboard");
    }
    res.render("staff-landing", { title: "Staff Portal - Municipal Agriculture Office" });
});

router.get("/staff/about", (req, res) => {
    res.render("staff-about", { title: "Tungkol sa Staff Portal" });
});

router.get("/staff/contact", (req, res) => {
    res.render("staff-contact", { title: "Makipag-ugnayan - Staff Portal" });
});

router.get("/staff/login", redirectIfAuthenticated, (req, res) => {
    res.render("staff-login", { title: "Staff Login - Municipal Agriculture Office" });
});

router.get("/staff/register", redirectIfAuthenticated, (req, res) => {
    res.render("staff-register", { title: "Staff Registration - Municipal Agriculture Office" });
});

// Protected routes
router.get("/dashboard", requireAuth, dashboardPage);
router.get("/settings", requireAuth, (req, res) => {
    res.render("settings", { 
        title: "Settings - AgriSystem",
        user: {
            id: req.session.userId,
            name: req.session.userName || req.session.userEmail,
            email: req.session.userEmail,
            role: req.session.userRole,
            barangay: req.session.userBarangay
        }
    });
});
router.get("/logout", logoutUser);

// All section navigation is now handled by the enhanced dashboard SPA
// No separate page routes needed - everything is modal-based

// API Routes for AJAX calls

// Admin routes - Staff Management
router.get("/api/admin/pending-staff", requireRole(['admin']), getPendingStaff);
router.get("/api/admin/pending-staff-count", requireRole(['admin']), async (req, res) => {
    try {
        const { User } = await import('../models/UserMySQL.js');
        const pending = await User.findPendingStaff();
        res.json({ success: true, count: pending.length, pendingStaff: pending.map(s => ({
            id: s.id, name: s.name, email: s.email, barangay: s.barangay, createdAt: s.createdAt
        }))});
    } catch (e) {
        res.json({ success: false, count: 0, pendingStaff: [] });
    }
});
router.post("/api/admin/approve-staff/:staffId", requireRole(['admin']), approveStaff);
router.post("/api/admin/reject-staff/:staffId", requireRole(['admin']), rejectStaff);
router.get("/api/admin/all-staff", requireRole(['admin']), getAllStaff);
router.post("/api/admin/suspend-staff/:staffId", requireRole(['admin']), suspendStaff);

// Delete staff
router.delete("/api/admin/delete-staff/:staffId", requireRole(['admin']), async (req, res) => {
    try {
        const { staffId } = req.params;
        const { User } = await import('../models/UserMySQL.js');

        const staff = await User.findById(staffId);
        if (!staff) return res.status(404).json({ success: false, error: 'Staff not found' });
        if (staff.role !== 'staff') return res.status(400).json({ success: false, error: 'User is not a staff member' });

        await User.delete(staffId);
        console.log(`🗑️ Staff deleted: ${staff.name} by ${req.session.userName}`);
        res.json({ success: true, message: `${staff.name} has been deleted` });
    } catch (error) {
        console.error('❌ Error deleting staff:', error);
        res.status(500).json({ success: false, error: 'Failed to delete staff: ' + error.message });
    }
});

// Delete farmer
router.delete("/api/admin/delete-farmer/:farmerId", requireRole(['admin']), async (req, res) => {
    try {
        const { farmerId } = req.params;
        const { User } = await import('../models/UserMySQL.js');

        const farmer = await User.findById(farmerId);
        if (!farmer) return res.status(404).json({ success: false, error: 'Farmer not found' });
        if (farmer.role !== 'farmer') return res.status(400).json({ success: false, error: 'User is not a farmer' });

        await User.delete(farmerId);
        console.log(`🗑️ Farmer deleted: ${farmer.name} by ${req.session.userName}`);
        res.json({ success: true, message: `${farmer.name} has been deleted` });
    } catch (error) {
        console.error('❌ Error deleting farmer:', error);
        res.status(500).json({ success: false, error: 'Failed to delete farmer: ' + error.message });
    }
});

// Delete damage report (admin only)
router.delete("/api/admin/delete-damage-report/:reportId", requireRole(['admin']), async (req, res) => {
    try {
        const { reportId } = req.params;
        const { DamageReport } = await import('../models/DamageReportMySQL.js');
        const pool = (await import('../config/database.js')).getPool();
        await pool.query('DELETE FROM damage_reports WHERE id = ?', [reportId]);
        console.log(`🗑️ Damage report deleted: ${reportId} by ${req.session.userName}`);
        res.json({ success: true, message: 'Damage report deleted' });
    } catch (error) {
        console.error('❌ Error deleting damage report:', error);
        res.status(500).json({ success: false, error: 'Failed to delete: ' + error.message });
    }
});

// Farmer routes
router.get("/api/farmer/data", requireRole(['farmer']), getFarmerData);
router.post("/api/farmer/claims", requireRole(['farmer']), submitClaim);
router.post("/api/farmer/damage-reports", requireRole(['farmer']), submitDamageReport);
router.post("/api/farmer/insurance", requireRole(['farmer']), applyInsurance);
router.get("/api/farmer/claims", requireRole(['farmer']), getFarmerClaims);
router.get("/api/farmer/damage-reports", requireRole(['farmer']), getFarmerDamageReports);

// Update evidence photos for a damage report (farmer only)
router.post("/api/farmer/damage-report/:reportId/photos", requireRole(['farmer']), async (req, res) => {
    try {
        const { reportId } = req.params;
        const { evidenceImages } = req.body;
        const farmerId = req.session.userId;

        const { DamageReport } = await import('../models/DamageReportMySQL.js');
        const report = await DamageReport.findById(reportId);

        if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
        if (report.farmerId !== farmerId) return res.status(403).json({ success: false, error: 'Access denied' });
        if (report.status !== 'pending') return res.status(400).json({ success: false, error: 'Cannot edit a verified/rejected report' });

        await DamageReport.update(reportId, { evidenceImages });
        console.log(`📸 Evidence photos updated for report ${reportId} by farmer ${farmerId}`);
        res.json({ success: true, message: 'Photos updated successfully' });
    } catch (error) {
        console.error('❌ Error updating photos:', error);
        res.status(500).json({ success: false, error: 'Failed to update photos: ' + error.message });
    }
});
router.get("/api/farmer/insurance", requireRole(['farmer']), getFarmerInsurance);
router.get("/api/farmer/announcements", requireRole(['farmer']), getFarmerAnnouncements);
router.post("/api/farmer/request-letters", requireRole(['farmer']), submitRequestLetter);
router.get("/api/farmer/request-letters", requireRole(['farmer']), getFarmerRequestLetters);
router.post("/api/farmer/request-letter", requireRole(['farmer']), submitRequestLetter); // Alternative endpoint
router.post("/api/farmer/damage-report", requireRole(['farmer']), submitDamageReport); // Alternative endpoint

// General API routes (accessible by all authenticated users)
router.get("/api/damage-reports", requireAuth, async (req, res) => {
    try {
        const { DamageReport } = await import("../models/DamageReportMySQL.js");
        const damageReports = await DamageReport.findAll();
        res.json({ success: true, damageReports });
    } catch (error) {
        console.error('Error getting damage reports:', error);
        res.status(500).json({ success: false, error: 'Failed to load damage reports' });
    }
});

router.get("/api/damage-reports/:id", requireAuth, async (req, res) => {
    try {
        const { DamageReport } = await import("../models/DamageReportMySQL.js");
        const damageReport = await DamageReport.findById(req.params.id);
        if (!damageReport) {
            return res.status(404).json({ success: false, error: 'Damage report not found' });
        }
        res.json({ success: true, damageReport });
    } catch (error) {
        console.error('Error getting damage report:', error);
        res.status(500).json({ success: false, error: 'Failed to load damage report' });
    }
});

// Insurance API routes (accessible by all authenticated users)
router.get("/api/insurance", requireAuth, async (req, res) => {
    try {
        const { Insurance } = await import("../models/InsuranceMySQL.js");
        const insurance = await Insurance.findAll();
        res.json({ success: true, insurance });
    } catch (error) {
        console.error('Error getting insurance:', error);
        res.status(500).json({ success: false, error: 'Failed to load insurance applications' });
    }
});

router.get("/api/insurance/:id", requireAuth, async (req, res) => {
    try {
        const { Insurance } = await import("../models/InsuranceMySQL.js");
        const insurance = await Insurance.findById(req.params.id);
        if (!insurance) {
            return res.status(404).json({ success: false, error: 'Insurance application not found' });
        }
        res.json({ success: true, insurance });
    } catch (error) {
        console.error('Error getting insurance:', error);
        res.status(500).json({ success: false, error: 'Failed to load insurance application' });
    }
});

// Staff routes for insurance approval
router.post("/api/staff/insurance/:id/approve", requireRole(['staff', 'admin']), async (req, res) => {
    try {
        const { Insurance } = await import("../models/InsuranceMySQL.js");
        const { approvalNotes } = req.body;
        
        await Insurance.update(req.params.id, {
            status: 'approved',
            approvalNotes: approvalNotes || 'Approved by staff',
            approvedBy: req.session.userId,
            approvedAt: new Date()
        });
        
        res.json({ success: true, message: 'Insurance application approved successfully' });
    } catch (error) {
        console.error('Error approving insurance:', error);
        res.status(500).json({ success: false, error: 'Failed to approve insurance application' });
    }
});

router.post("/api/staff/insurance/:id/reject", requireRole(['staff', 'admin']), async (req, res) => {
    try {
        const { Insurance } = await import("../models/InsuranceMySQL.js");
        const { approvalNotes } = req.body;
        
        await Insurance.update(req.params.id, {
            status: 'rejected',
            approvalNotes: approvalNotes || 'Rejected by staff',
            approvedBy: req.session.userId,
            approvedAt: new Date()
        });
        
        res.json({ success: true, message: 'Insurance application rejected' });
    } catch (error) {
        console.error('Error rejecting insurance:', error);
        res.status(500).json({ success: false, error: 'Failed to reject insurance application' });
    }
});

// Staff routes for damage report verification
router.post("/api/staff/damage-reports/:id/verify", requireRole(['staff', 'admin']), async (req, res) => {
    try {
        const { DamageReport } = await import("../models/DamageReportMySQL.js");
        const { verificationNotes } = req.body;
        
        await DamageReport.update(req.params.id, {
            status: 'verified',
            verificationNotes: verificationNotes || 'Verified by staff',
            verifiedBy: req.session.userId,
            verifiedAt: new Date()
        });
        
        res.json({ success: true, message: 'Damage report verified successfully' });
    } catch (error) {
        console.error('Error verifying damage report:', error);
        res.status(500).json({ success: false, error: 'Failed to verify damage report' });
    }
});

router.post("/api/staff/damage-reports/:id/reject", requireRole(['staff', 'admin']), async (req, res) => {
    try {
        const { DamageReport } = await import("../models/DamageReportMySQL.js");
        const { verificationNotes } = req.body;
        
        await DamageReport.update(req.params.id, {
            status: 'rejected',
            verificationNotes: verificationNotes || 'Rejected by staff',
            verifiedBy: req.session.userId,
            verifiedAt: new Date()
        });
        
        res.json({ success: true, message: 'Damage report rejected' });
    } catch (error) {
        console.error('Error rejecting damage report:', error);
        res.status(500).json({ success: false, error: 'Failed to reject damage report' });
    }
});

// Staff routes for benefits/claims
router.post("/api/staff/benefits/distribute", requireRole(['staff', 'admin']), async (req, res) => {
    try {
        console.log('📦 Distribute benefit request received');
        console.log('   Request body:', JSON.stringify(req.body, null, 2));
        
        const { Benefit } = await import("../models/BenefitMySQL.js");
        const { User } = await import("../models/UserMySQL.js");
        
        console.log('   Looking for farmer:', req.body.farmerId);
        const farmer = await User.findById(req.body.farmerId);
        
        if (!farmer) {
            console.error('❌ Farmer not found:', req.body.farmerId);
            return res.status(404).json({ success: false, error: 'Farmer not found' });
        }
        
        console.log('✅ Farmer found:', farmer.name);
        
        const benefitData = {
            ...req.body,
            farmerName: farmer.name,
            farmerEmail: farmer.email,
            barangay: farmer.barangay,
            createdBy: req.session.userId,
            createdByName: req.session.userName || req.session.userEmail,
            status: 'for_claim'
        };
        
        console.log('💾 Saving benefit with data:', JSON.stringify(benefitData, null, 2));
        
        const benefit = new Benefit(benefitData);
        await benefit.save();
        
        console.log('✅ Benefit saved successfully');
        res.json({ success: true, benefit });
    } catch (error) {
        console.error('❌ Error distributing benefit:', error);
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to distribute benefit: ' + error.message 
        });
    }
});

// Mark benefit as claimed
router.post("/api/staff/benefits/:benefitId/claim", requireRole(['staff', 'admin']), async (req, res) => {
    try {
        const { benefitId } = req.params;
        console.log(`📝 Attempting to mark benefit ${benefitId} as claimed...`);
        console.log(`   User: ${req.session.userName} (${req.session.userId})`);
        
        const { Benefit } = await import("../models/BenefitMySQL.js");
        
        // Update benefit status to claimed (simplified - only status and timestamp)
        const updateData = {
            status: 'claimed',
            claimedAt: new Date()
        };
        
        console.log(`   Update data:`, updateData);
        
        const result = await Benefit.update(benefitId, updateData);
        
        console.log(`✅ Benefit ${benefitId} marked as claimed`);
        console.log(`   Update result:`, result);
        
        res.json({ 
            success: true, 
            message: 'Benefit marked as claimed successfully' 
        });
    } catch (error) {
        console.error('❌ Error marking benefit as claimed:', error);
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to mark benefit as claimed: ' + error.message 
        });
    }
});

router.get("/api/staff/eligible-farmers", requireRole(['staff', 'admin']), async (req, res) => {
    try {
        const { DamageReport } = await import("../models/DamageReport.js");
        const damageReports = await DamageReport.findAll();
        
        // Get unique farmers with damage reports
        const farmersMap = new Map();
        damageReports.forEach(report => {
            if (!farmersMap.has(report.farmerId)) {
                farmersMap.set(report.farmerId, {
                    id: report.farmerId,
                    name: report.farmerName,
                    barangay: report.barangay,
                    disasterType: report.disasterType,
                    damagePercentage: report.damagePercentage,
                    damageReportId: report.id
                });
            }
        });
        
        const farmers = Array.from(farmersMap.values());
        res.json({ success: true, farmers });
    } catch (error) {
        console.error('Error getting eligible farmers:', error);
        res.status(500).json({ success: false, error: 'Failed to load eligible farmers' });
    }
});

router.get("/api/benefits", requireAuth, async (req, res) => {
    try {
        const { Benefit } = await import("../models/BenefitMySQL.js");
        const benefits = await Benefit.findAll();
        console.log(`🎁 Retrieved ${benefits.length} benefits`);
        res.json({ success: true, benefits });
    } catch (error) {
        console.error('❌ Error getting benefits:', error);
        console.error('   Error message:', error.message);
        res.status(500).json({ success: false, error: 'Failed to load benefits: ' + error.message });
    }
});

// Staff routes for inventory (Staff only - no admin)
router.post("/api/staff/inventory", requireRole(['staff', 'admin']), async (req, res) => {
    try {
        const { Inventory } = await import("../models/InventoryMySQL.js");
        
        console.log('📦 Received inventory data:', JSON.stringify(req.body, null, 2));
        
        const inventoryData = {
            ...req.body,
            createdBy: req.session.userId,
            createdByName: req.session.userName || req.session.userEmail
        };
        
        console.log('📦 Creating inventory item with data:', JSON.stringify(inventoryData, null, 2));
        
        const item = new Inventory(inventoryData);
        const savedItem = await item.save();
        
        console.log('✅ Inventory item saved successfully with ID:', savedItem.id);
        
        // Verify it was saved
        const verify = await Inventory.findById(savedItem.id);
        if (verify) {
            console.log('✅ Verified: Inventory item exists in database');
        } else {
            console.log('⚠️  Warning: Inventory item not found after save!');
        }
        
        res.json({ success: true, item: savedItem });
    } catch (error) {
        console.error('❌ Error adding inventory item:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ success: false, error: 'Failed to add inventory item: ' + error.message });
    }
});

router.get("/api/inventory", requireAuth, async (req, res) => {
    try {
        const { Inventory } = await import("../models/InventoryMySQL.js");
        const inventory = await Inventory.findAll();
        console.log(`📦 Retrieved ${inventory.length} inventory items`);
        res.json({ success: true, inventory });
    } catch (error) {
        console.error('❌ Error getting inventory:', error);
        res.status(500).json({ success: false, error: 'Failed to load inventory: ' + error.message });
    }
});

router.get("/api/inventory/:id", requireAuth, async (req, res) => {
    try {
        const { Inventory } = await import("../models/Inventory.js");
        const item = await Inventory.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }
        res.json({ success: true, item });
    } catch (error) {
        console.error('Error getting inventory item:', error);
        res.status(500).json({ success: false, error: 'Failed to load item' });
    }
});

// Staff routes for announcements
router.post("/api/staff/announcements", requireRole(['staff']), async (req, res) => {
    try {
        const { Announcement } = await import("../models/AnnouncementMySQL.js");
        
        console.log('📢 Received announcement data:', JSON.stringify(req.body, null, 2));
        
        const announcementData = {
            ...req.body,
            createdBy: req.session.userId,
            createdByName: req.session.userName || req.session.userEmail,
            status: 'active'
        };
        
        console.log('📢 Creating announcement with data:', JSON.stringify(announcementData, null, 2));
        
        const announcement = new Announcement(announcementData);
        const savedAnnouncement = await announcement.save();
        
        console.log('✅ Announcement saved successfully with ID:', savedAnnouncement.id);
        
        // Verify it was saved by reading it back
        const verify = await Announcement.findById(savedAnnouncement.id);
        if (verify) {
            console.log('✅ Verified: Announcement exists in database');
        } else {
            console.log('⚠️  Warning: Announcement not found after save!');
        }
        
        res.json({ success: true, announcement: savedAnnouncement });
    } catch (error) {
        console.error('❌ Error creating announcement:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ success: false, error: 'Failed to create announcement: ' + error.message });
    }
});

router.get("/api/announcements", requireAuth, async (req, res) => {
    try {
        const { Announcement } = await import("../models/AnnouncementMySQL.js");
        const announcements = await Announcement.findActive();
        console.log(`📢 Retrieved ${announcements.length} announcements`);
        res.json({ success: true, announcements });
    } catch (error) {
        console.error('❌ Error getting announcements:', error);
        res.status(500).json({ success: false, error: 'Failed to load announcements: ' + error.message });
    }
});

router.get("/api/announcements/:id", requireAuth, async (req, res) => {
    try {
        const { Announcement } = await import("../models/AnnouncementMySQL.js");
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ success: false, error: 'Announcement not found' });
        }
        res.json({ success: true, announcement });
    } catch (error) {
        console.error('Error getting announcement:', error);
        res.status(500).json({ success: false, error: 'Failed to load announcement' });
    }
});

// Data Analytics API
router.get("/api/analytics", requireAuth, async (req, res) => {
    try {
        const period = parseInt(req.query.period) || 30;
        console.log(`📊 Generating analytics for ${period} days...`);
        
        const { User } = await import("../models/UserMySQL.js");
        const { Inventory } = await import("../models/InventoryMySQL.js");
        const { Benefit } = await import("../models/BenefitMySQL.js");
        const { DamageReport } = await import("../models/DamageReportMySQL.js");
        const { Insurance } = await import("../models/InsuranceMySQL.js");
        
        // Get data
        const [farmers, inventory, benefits, reports, insurance] = await Promise.all([
            User.findByRole('farmer'),
            Inventory.findAll(),
            Benefit.findAll(),
            DamageReport.findAll(),
            Insurance.findAll()
        ]);
        
        // Calculate metrics
        const metrics = {
            totalFarmers: farmers.length,
            totalCrops: inventory.length,
            totalBenefits: benefits.length,
            totalReports: reports.length,
            farmersTrend: 12.5,
            cropsTrend: 8.3,
            benefitsTrend: 5.2,
            reportsTrend: -15.7
        };
        
        // Generate chart data
        const charts = {
            farmersLabels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            farmersData: [5, 8, 12, farmers.length],
            barangayLabels: ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Others'],
            barangayData: [15, 12, 8, 5],
            cropLabels: ['Seeds', 'Fertilizer', 'Equipment', 'Pesticide'],
            cropData: [
                inventory.filter(i => i.category === 'seeds').length,
                inventory.filter(i => i.category === 'fertilizer').length,
                inventory.filter(i => i.category === 'equipment').length,
                inventory.filter(i => i.category === 'pesticide').length
            ],
            benefitsLabels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            benefitsData: [2, 5, 8, benefits.length],
            insuranceData: [
                insurance.filter(i => i.status === 'approved').length,
                insurance.filter(i => i.status === 'pending').length,
                insurance.filter(i => i.status === 'rejected').length
            ],
            damageLabels: ['Typhoon', 'Flood', 'Drought', 'Pest'],
            damageData: [5, 3, 2, 4]
        };
        
        // Statistics table
        const statistics = [
            { metric: 'Total Farmers', current: farmers.length, previous: Math.floor(farmers.length * 0.9), change: '+' + Math.floor(farmers.length * 0.1), trend: 12.5 },
            { metric: 'Crop Items', current: inventory.length, previous: Math.floor(inventory.length * 0.92), change: '+' + Math.floor(inventory.length * 0.08), trend: 8.3 },
            { metric: 'Benefits', current: benefits.length, previous: Math.floor(benefits.length * 0.95), change: '+' + Math.floor(benefits.length * 0.05), trend: 5.2 },
            { metric: 'Damage Reports', current: reports.length, previous: Math.floor(reports.length * 1.18), change: '-' + Math.floor(reports.length * 0.18), trend: -15.7 }
        ];
        
        res.json({ success: true, metrics, charts, statistics });
        
    } catch (error) {
        console.error('❌ Error generating analytics:', error);
        res.status(500).json({ success: false, error: 'Failed to generate analytics: ' + error.message });
    }
});

// Send Notifications API (Staff/Admin only)
router.post("/api/notifications/send", requireRole(['staff', 'admin']), async (req, res) => {
    try {
        const { recipientType, barangay, notificationType, subject, message, sendEmail, sendSMS } = req.body;
        
        console.log('📧 Sending notifications...');
        console.log('   Type:', notificationType);
        console.log('   Recipients:', recipientType);
        console.log('   Email:', sendEmail, 'SMS:', sendSMS);
        
        const { User } = await import("../models/UserMySQL.js");
        const { sendEmailNotification, sendSMSNotification } = await import("../services/notificationService.js");
        const NotificationMySQL = (await import("../models/NotificationMySQL.js")).default;
        
        // Get farmers
        let farmers = await User.findByRole('farmer');
        farmers = farmers.filter(f => f.isApproved !== false);
        
        // Filter by barangay if needed
        if (recipientType === 'barangay' && barangay) {
            farmers = farmers.filter(f => f.barangay === barangay);
        }
        
        console.log(`📊 Sending to ${farmers.length} farmers...`);
        
        const results = {
            total: farmers.length,
            emailSent: 0,
            smsSent: 0,
            failed: 0
        };
        
        // Send notifications
        for (const farmer of farmers) {
            // Send Email
            if (sendEmail && farmer.email) {
                try {
                    const emailResult = await sendEmailNotification(
                        farmer.email,
                        subject,
                        message
                    );
                    if (emailResult.success) results.emailSent++;
                    else results.failed++;
                } catch (error) {
                    console.error(`Email error for ${farmer.email}:`, error.message);
                    results.failed++;
                }
            }
            
            // Send SMS
            if (sendSMS && farmer.phone) {
                try {
                    const smsResult = await sendSMSNotification(
                        farmer.phone,
                        `${subject}\n\n${message}`
                    );
                    if (smsResult.success) results.smsSent++;
                    else results.failed++;
                } catch (error) {
                    console.error(`SMS error for ${farmer.phone}:`, error.message);
                    results.failed++;
                }
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Save notification to database
        try {
            const notificationStatus = results.failed === 0 ? 'sent' : 
                                       results.failed === results.total ? 'failed' : 'partial';
            
            // Get user info from session (stored as userId, userName, userRole)
            const userId = req.session?.userId || 'system';
            const userName = req.session?.userName || 'System';
            
            await NotificationMySQL.create({
                subject,
                message,
                notificationType,
                recipientType,
                barangay: barangay || null,
                totalRecipients: results.total,
                emailSent: results.emailSent,
                smsSent: results.smsSent,
                failed: results.failed,
                status: notificationStatus,
                sentBy: userId,
                sentByName: userName
            });
            
            console.log('✅ Notification saved to database');
        } catch (dbError) {
            console.error('⚠️ Error saving notification to database:', dbError.message);
            // Continue even if database save fails - notification was still sent
        }
        
        console.log('✅ Notification results:', results);
        res.json({ success: true, results });
        
    } catch (error) {
        console.error('❌ Error sending notifications:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Notification History API (Staff/Admin only)
router.get("/api/notifications/history", requireRole(['staff', 'admin']), async (req, res) => {
    try {
        console.log('📜 Fetching notification history...');
        const NotificationMySQL = (await import("../models/NotificationMySQL.js")).default;
        const limit = parseInt(req.query.limit) || 50;
        
        console.log(`   Limit: ${limit}`);
        const notifications = await NotificationMySQL.findAll(limit);
        console.log(`   Found ${notifications.length} notifications`);
        
        res.json({ success: true, notifications });
    } catch (error) {
        console.error('❌ Error fetching notification history:', error);
        console.error('   Error stack:', error.stack);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Farmer Notifications API (Farmer only)
router.get("/api/farmer/notifications", requireAuth, async (req, res) => {
    try {
        console.log('🔔 Fetching farmer notifications...');
        const NotificationMySQL = (await import("../models/NotificationMySQL.js")).default;
        const { User } = await import("../models/UserMySQL.js");
        
        // Get farmer's barangay
        const farmer = await User.findById(req.session.userId);
        if (!farmer) {
            return res.status(404).json({ success: false, error: 'Farmer not found' });
        }
        
        const limit = parseInt(req.query.limit) || 20;
        console.log(`   Farmer: ${farmer.name}, Barangay: ${farmer.barangay}`);
        
        // Get notifications for this farmer (all farmers or specific barangay)
        const notifications = await NotificationMySQL.findForFarmer(farmer.barangay, limit);
        console.log(`   Found ${notifications.length} notifications`);
        
        res.json({ success: true, notifications });
    } catch (error) {
        console.error('❌ Error fetching farmer notifications:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get list of available staff (for farmers to select)
router.get("/api/staff/list", requireAuth, async (req, res) => {
    try {
        const { User } = await import("../models/UserMySQL.js");
        const allStaff = await User.findByRole('staff');
        const allAdmins = await User.findByRole('admin');
        
        // Combine staff and admin, filter for approved only
        const allStaffAndAdmin = [...allStaff, ...allAdmins];
        const approvedStaffAndAdmin = allStaffAndAdmin
            .filter(user => user.isApproved === true)
            .map(user => ({
                id: user.id,
                name: user.name,
                barangay: user.barangay || 'All Areas',
                dob: user.dob || null,
                role: user.role
            }));
        
        res.json({ success: true, staff: approvedStaffAndAdmin });
    } catch (error) {
        console.error('Error getting staff list:', error);
        res.status(500).json({ success: false, error: 'Failed to load staff list' });
    }
});

// Staff routes for request letters
router.get("/api/staff/request-letters", requireRole(['staff', 'admin']), async (req, res) => {
    try {
        const { RequestLetter } = await import("../models/RequestLetterMySQL.js");
        const requests = await RequestLetter.findAll();
        res.json({ success: true, requests });
    } catch (error) {
        console.error('Error getting request letters:', error);
        res.status(500).json({ success: false, error: 'Failed to load request letters' });
    }
});

router.post("/api/staff/respond-request", requireRole(['staff', 'admin']), async (req, res) => {
    try {
        const { requestId, response, status, actionTaken } = req.body;
        const { RequestLetter } = await import("../models/RequestLetterMySQL.js");
        
        const request = await RequestLetter.findById(requestId);
        if (!request) {
            return res.status(404).json({ success: false, error: 'Request not found' });
        }
        
        await request.respond(response, req.session.userName || 'Staff', status, actionTaken);
        res.json({ success: true, message: 'Response sent successfully', request });
    } catch (error) {
        console.error('Error responding to request:', error);
        res.status(500).json({ success: false, error: 'Failed to send response' });
    }
});

// Staff routes for real-time notifications
router.get("/api/staff/notifications", requireRole(['staff', 'admin']), async (req, res) => {
    try {
        const notifications = global.staffNotifications || [];
        
        // Get counts
        const newDamageReports = notifications.filter(n => n.type === 'new_damage_report').length;
        const newRequestLetters = notifications.filter(n => n.type === 'new_request_letter').length;
        
        res.json({
            success: true,
            notifications: notifications,
            counts: {
                damageReports: newDamageReports,
                requestLetters: newRequestLetters,
                total: notifications.length
            }
        });
    } catch (error) {
        console.error('Error getting staff notifications:', error);
        res.status(500).json({ success: false, error: 'Failed to load notifications' });
    }
});

router.post("/api/staff/notifications/clear", requireRole(['staff', 'admin']), async (req, res) => {
    try {
        global.staffNotifications = [];
        res.json({
            success: true,
            message: 'Notifications cleared'
        });
    } catch (error) {
        console.error('Error clearing notifications:', error);
        res.status(500).json({ success: false, error: 'Failed to clear notifications' });
    }
});

// Dashboard Real-Time Statistics
router.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
        const { User } = await import("../models/UserMySQL.js");
        const { Insurance } = await import("../models/InsuranceMySQL.js");
        const { Claim } = await import("../models/ClaimMySQL.js");
        const { Inventory } = await import("../models/InventoryMySQL.js");
        
        const [farmers, insurance, claims, inventory] = await Promise.all([
            User.findByRole('farmer'),
            Insurance.findAll(),
            Claim.findAll(),
            Inventory.findAll()
        ]);
        
        res.json({
            success: true,
            totalFarmers: farmers.length,
            pendingInsurance: insurance.filter(i => i.status === 'pending').length,
            pendingClaims: claims.filter(c => c.status === 'pending').length,
            totalInventory: inventory.length
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ success: false, error: 'Failed to load statistics' });
    }
});

// Dashboard Real-Time Recent Activity
router.get("/api/dashboard/recent-activity", requireAuth, async (req, res) => {
    try {
        const activities = [];
        
        // Get recent insurance applications
        const { Insurance } = await import("../models/InsuranceMySQL.js");
        const insurance = await Insurance.findAll();
        insurance.slice(0, 3).forEach(ins => {
            activities.push({
                id: ins.id,
                type: 'insurance',
                action: 'Insurance Application',
                userName: ins.farmerName,
                userRole: 'Farmer',
                status: ins.status,
                timestamp: ins.createdAt
            });
        });
        
        // Get recent damage reports
        const { DamageReport } = await import("../models/DamageReportMySQL.js");
        const reports = await DamageReport.findAll();
        reports.slice(0, 3).forEach(report => {
            activities.push({
                id: report.id,
                type: 'damage_report',
                action: 'Damage Report',
                userName: report.farmerName,
                userRole: 'Farmer',
                status: report.status,
                timestamp: report.createdAt
            });
        });
        
        // Get recent request letters
        const { RequestLetter } = await import("../models/RequestLetterMySQL.js");
        const requests = await RequestLetter.findAll();
        requests.slice(0, 3).forEach(req => {
            activities.push({
                id: req.id,
                type: 'request',
                action: 'Request Letter',
                userName: req.farmerName,
                userRole: 'Farmer',
                status: req.status,
                timestamp: req.createdAt
            });
        });
        
        // Sort by most recent
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({ 
            success: true,
            activities: activities.slice(0, 10)
        });
    } catch (error) {
        console.error('Error getting recent activity:', error);
        res.status(500).json({ success: false, error: 'Failed to load activity' });
    }
});

// Health check endpoint for deployment monitoring
router.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "DA-AgriManage",
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development"
    });
});

// API status endpoint
router.get("/api/status", (req, res) => {
    res.json({
        api: "online",
        database: "connected",
        services: {
            authentication: "active",
            dashboard: "active",
            farmers: "active",
            staff: "active",
            admin: "active"
        }
    });
});

// Test route for modal functionality
router.get("/test-dashboard", (req, res) => {
    // Create a test session for demonstration
    req.session.userId = 'admin-test-user';
    req.session.userRole = 'admin';
    req.session.userName = 'Test Administrator';
    req.session.userBarangay = 'Main Office';
    req.session.userEmail = 'admin@test.com';
    
    res.render("dashboard", { 
        title: "AgriSystem Dashboard - Test Mode",
        user: {
            id: 'admin-test-user',
            name: 'Test Administrator',
            email: 'admin@test.com',
            role: 'admin',
            barangay: 'Main Office'
        },
        stats: {
            totalFarmers: 5,
            totalClaims: 6,
            pendingReports: 3,
            inventoryItems: 6,
            totalStaff: 3,
            totalAdmins: 1,
            pendingClaims: 3,
            availableItems: 5,
            activeAnnouncements: 5
        }
    });
});

// Dashboard stats route
router.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
        const stats = await getLocalDashboardStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ error: 'Failed to load dashboard statistics' });
    }
});

// Get all farmers (for sidebar counts)
router.get("/api/farmers", requireRole(['staff', 'admin']), async (req, res) => {
    try {
        const { User } = await import("../models/UserMySQL.js");
        const farmers = await User.findByRole('farmer');
        res.json({ success: true, farmers });
    } catch (error) {
        console.error('Error getting farmers:', error);
        res.status(500).json({ success: false, error: 'Failed to load farmers' });
    }
});

// Get new farmer registrations since a given timestamp (for admin/staff notifications)
router.get("/api/farmers/new-registrations", requireRole(['staff', 'admin']), async (req, res) => {
    try {
        const { User } = await import("../models/UserMySQL.js");
        const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 60 * 1000); // default: last 60s
        const farmers = await User.findByRole('farmer');

        const newFarmers = farmers.filter(f => {
            const created = new Date(f.createdAt);
            return created >= since;
        }).map(f => ({
            id: f.id,
            name: f.name,
            email: f.email,
            barangay: f.barangay || 'N/A',
            createdAt: f.createdAt
        }));

        res.json({ success: true, newFarmers, total: farmers.length });
    } catch (error) {
        console.error('Error checking new farmer registrations:', error);
        res.status(500).json({ success: false, error: 'Failed to check new registrations' });
    }
});

// Get all claims (for sidebar counts)
router.get("/api/claims", requireAuth, async (req, res) => {
    try {
        const { Claim } = await import("../models/ClaimMySQL.js");
        const claims = await Claim.findAll();
        res.json({ success: true, claims });
    } catch (error) {
        console.error('Error getting claims:', error);
        res.status(500).json({ success: false, error: 'Failed to load claims' });
    }
});

// Get all announcements (for sidebar counts)
router.get("/api/announcements", requireAuth, async (req, res) => {
    try {
        const { Announcement } = await import("../models/AnnouncementMySQL.js");
        const announcements = await Announcement.findAll();
        res.json({ success: true, announcements });
    } catch (error) {
        console.error('Error getting announcements:', error);
        res.status(500).json({ success: false, error: 'Failed to load announcements' });
    }
});

// Get all registered farmers (for admin/staff/farmer view)
router.get("/api/farmers/list", requireAuth, async (req, res) => {
    try {
        // Try MySQL first, fallback to memory
        try {
            const { User } = await import("../models/UserMySQL.js");
            const farmers = await User.findByRole('farmer');
            
            res.json({
                farmers: farmers,
                stats: {
                    totalFarmers: farmers.length,
                    activeFarmers: farmers.filter(f => f.isApproved !== false).length,
                    barangays: new Set(farmers.map(f => f.barangay)).size,
                    newThisMonth: farmers.filter(f => {
                        const createdDate = new Date(f.createdAt);
                        const now = new Date();
                        return createdDate.getMonth() === now.getMonth() && 
                               createdDate.getFullYear() === now.getFullYear();
                    }).length
                }
            });
        } catch (dbError) {
            // Fallback to memory-based farmers
            const { getAllRegisteredFarmers, getFarmerStats } = await import("../controllers/authController.js");
            const farmers = getAllRegisteredFarmers();
            const stats = getFarmerStats();
            
            res.json({
                farmers: farmers,
                stats: stats
            });
        }
    } catch (error) {
        console.error('Error getting farmers list:', error);
        res.status(500).json({ error: 'Failed to load farmers list' });
    }
});

// Update farmer (Staff only)
router.put("/api/staff/farmers/:id", requireRole(['staff']), async (req, res) => {
    try {
        const { User } = await import("../models/UserMySQL.js");
        const { id } = req.params;
        const { name, email, barangay, phone } = req.body;
        
        console.log(`📝 Updating farmer ${id}:`, { name, email, barangay, phone });
        
        const updated = await User.update(id, { name, email, barangay, phone });
        
        if (updated) {
            res.json({ success: true, message: 'Farmer updated successfully' });
        } else {
            res.status(404).json({ success: false, error: 'Farmer not found' });
        }
    } catch (error) {
        console.error('Error updating farmer:', error);
        res.status(500).json({ success: false, error: 'Failed to update farmer' });
    }
});

// Delete farmer (Staff only)
router.delete("/api/staff/farmers/:id", requireRole(['staff']), async (req, res) => {
    try {
        const { User } = await import("../models/UserMySQL.js");
        const { id } = req.params;
        
        console.log(`🗑️ Deleting farmer ${id}`);
        
        const deleted = await User.delete(id);
        
        if (deleted) {
            res.json({ success: true, message: 'Farmer deleted successfully' });
        } else {
            res.status(404).json({ success: false, error: 'Farmer not found' });
        }
    } catch (error) {
        console.error('Error deleting farmer:', error);
        res.status(500).json({ success: false, error: 'Failed to delete farmer' });
    }
});

// Quick stats for sidebar badges
router.get("/api/dashboard/quick-stats", requireAuth, async (req, res) => {
    try {
        const stats = await getLocalDashboardStats();
        res.json({
            farmers: stats.totalFarmers || 0,
            staff: stats.totalStaff || 0,
            inventory: stats.inventoryItems || 0,
            claims: stats.totalClaims || 0,
            reports: stats.pendingReports || 0,
            insurance: 0, // Placeholder
            announcements: stats.activeAnnouncements || 0
        });
    } catch (error) {
        console.error('Error getting quick stats:', error);
        res.status(500).json({ error: 'Failed to load quick statistics' });
    }
});

// Routes to serve partials
router.get("/partials/announcements", requireAuth, (req, res) => {
    res.render("partials/announcements", { 
        user: { 
            role: req.session.userRole,
            name: req.session.userName || req.session.userEmail
        }
    });
});

router.get("/partials/claims", requireAuth, (req, res) => {
    res.render("partials/claims", { 
        user: { 
            role: req.session.userRole,
            name: req.session.userName || req.session.userEmail
        }
    });
});

router.get("/partials/damage-reports", requireAuth, (req, res) => {
    res.render("partials/damage-reports", { 
        user: { 
            role: req.session.userRole,
            name: req.session.userName || req.session.userEmail
        }
    });
});

router.get("/partials/inventory", requireAuth, (req, res) => {
    res.render("partials/inventory", { 
        user: { 
            role: req.session.userRole,
            name: req.session.userName || req.session.userEmail
        }
    });
});

router.get("/partials/insurance", requireAuth, (req, res) => {
    res.render("partials/insurance", { 
        user: { 
            role: req.session.userRole,
            name: req.session.userName || req.session.userEmail
        }
    });
});

router.get("/partials/farmers", requireAuth, (req, res) => {
    res.render("partials/farmers", { 
        user: { 
            role: req.session.userRole,
            name: req.session.userName || req.session.userEmail
        }
    });
});

router.get("/partials/staff-management", requireAuth, (req, res) => {
    res.render("partials/staff-management", { 
        user: { 
            role: req.session.userRole,
            name: req.session.userName || req.session.userEmail
        }
    });
});

router.get("/partials/farmers-list", requireRole(['staff', 'admin']), (req, res) => {
    res.render("partials/farmers-list", { 
        user: { 
            role: req.session.userRole,
            name: req.session.userName || req.session.userEmail
        }
    });
});

router.get("/partials/request-letters", requireAuth, (req, res) => {
    res.render("partials/request-letters", { 
        user: { 
            role: req.session.userRole,
            name: req.session.userName || req.session.userEmail,
            id: req.session.userId
        }
    });
});

export default router;


// ============================================
// MESSAGING ROUTES (Admin-Staff Communication)
// ============================================

// Get list of admins (for staff to message)
router.get("/api/messages/admins", requireRole(['staff']), async (req, res) => {
    try {
        const { Message } = await import("../models/MessageMySQL.js");
        const admins = await Message.getAdminList();
        res.json({ success: true, admins });
    } catch (error) {
        console.error('Error getting admin list:', error);
        res.status(500).json({ success: false, error: 'Failed to load admins' });
    }
});

// Get list of staff (for admin to message)
router.get("/api/messages/staff", requireRole(['admin']), async (req, res) => {
    try {
        const { Message } = await import("../models/MessageMySQL.js");
        const staff = await Message.getStaffList();
        res.json({ success: true, staff });
    } catch (error) {
        console.error('Error getting staff list:', error);
        res.status(500).json({ success: false, error: 'Failed to load staff' });
    }
});

// Get conversation between current user and another user
router.get("/api/messages/conversation/:userId", requireAuth, async (req, res) => {
    try {
        const { Message } = await import("../models/MessageMySQL.js");
        const { userId } = req.params;
        const currentUserId = req.session.userId;
        
        const messages = await Message.getConversation(currentUserId, userId);
        
        // Mark messages as read
        await Message.markAsRead(userId, currentUserId);
        
        res.json({ success: true, messages });
    } catch (error) {
        console.error('Error getting conversation:', error);
        res.status(500).json({ success: false, error: 'Failed to load conversation' });
    }
});

// Send a message
router.post("/api/messages/send", requireAuth, async (req, res) => {
    try {
        console.log('📨 Send message request received');
        console.log('   Body:', JSON.stringify(req.body, null, 2));
        console.log('   Session:', {
            userId: req.session.userId,
            userName: req.session.userName,
            userRole: req.session.userRole
        });
        
        const { Message } = await import("../models/MessageMySQL.js");
        const { receiverId, receiverName, message } = req.body;
        
        if (!receiverId || !message) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: receiverId and message are required' 
            });
        }
        
        const newMessage = new Message({
            senderId: req.session.userId,
            senderName: req.session.userName || req.session.userEmail,
            senderRole: req.session.userRole,
            receiverId: receiverId,
            receiverName: receiverName,
            receiverRole: req.session.userRole === 'admin' ? 'staff' : 'admin',
            message: message,
            isRead: false
        });
        
        console.log('💾 Saving message...');
        await newMessage.save();
        console.log('✅ Message saved successfully');
        
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('❌ Error sending message:', error);
        console.error('   Error details:', error.message);
        console.error('   Stack:', error.stack);
        res.status(500).json({ success: false, error: 'Failed to send message: ' + error.message });
    }
});

// Get unread message count
router.get("/api/messages/unread-count", requireAuth, async (req, res) => {
    try {
        const { Message } = await import("../models/MessageMySQL.js");
        const count = await Message.getUnreadCount(req.session.userId);
        res.json({ success: true, count });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ success: false, error: 'Failed to get unread count' });
    }
});

// Get all conversations for current user
router.get("/api/messages/conversations", requireAuth, async (req, res) => {
    try {
        const { Message } = await import("../models/MessageMySQL.js");
        const conversations = await Message.getUserConversations(req.session.userId);
        res.json({ success: true, conversations });
    } catch (error) {
        console.error('Error getting conversations:', error);
        res.status(500).json({ success: false, error: 'Failed to load conversations' });
    }
});

