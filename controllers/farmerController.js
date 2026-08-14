/*
    DA AgriManage - Farmer Controller
    Handles farmer-specific operations
*/

// Import MySQL models
const mysqlModels = await Promise.all([
    import("../models/UserMySQL.js"),
    import("../models/ClaimMySQL.js"),
    import("../models/DamageReportMySQL.js"),
    import("../models/AnnouncementMySQL.js"),
    import("../models/RequestLetterMySQL.js")
]);

const User = mysqlModels[0].User || mysqlModels[0].default;
const Claim = mysqlModels[1].Claim || mysqlModels[1].default;
const DamageReport = mysqlModels[2].DamageReport || mysqlModels[2].default;
const Announcement = mysqlModels[3].Announcement || mysqlModels[3].default;
const RequestLetter = mysqlModels[4].RequestLetter || mysqlModels[4].default;

console.log('✅ Using MySQL models for farmer operations');

// Remove in-memory fallback globals — MySQL is required on Vercel
// (kept as no-ops so any stray references don't crash)


// Get farmer dashboard data
export const getFarmerData = async (req, res) => {
    try {
        const farmerId = req.session.userId;
        const farmer = await User.findById(farmerId);
        
        if (!farmer || farmer.role !== 'farmer') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [claims, damageReports, announcements] = await Promise.all([
            Claim.findByFarmer(farmerId),
            DamageReport.findByFarmer(farmerId),
            Announcement.findByBarangay(farmer.barangay)
        ]);

        res.json({
            farmer,
            claims,
            damageReports,
            announcements
        });
    } catch (error) {
        console.error('Error getting farmer data:', error);
        res.status(500).json({ error: 'Failed to load farmer data' });
    }
};

// Submit a new claim
export const submitClaim = async (req, res) => {
    try {
        const { claimType, itemRequested, quantity, unit, reason } = req.body;
        const farmerId = req.session.userId;
        const farmerEmail = req.session.userEmail;
        
        let farmer = await User.findById(farmerId);
        
        if (!farmer) {
            return res.status(403).json({ error: 'Farmer account not found. Please re-login.' });
        }
        
        if (farmer.role !== 'farmer') {
            return res.status(403).json({ error: 'Access denied' });
        }

        console.log('📝 Creating claim with data:', {
            farmerId,
            farmerName: farmer.name,
            claimType,
            itemRequested,
            quantity: parseFloat(quantity),
            unit,
            barangay: farmer.barangay
        });

        const claim = new Claim({
            farmerId,
            farmerName: farmer.name,
            claimType,
            itemRequested,
            quantity: parseFloat(quantity),
            unit,
            reason,
            barangay: farmer.barangay,
            status: 'pending'
        });

        const savedClaim = await claim.save();
        console.log('✅ Claim saved successfully with ID:', savedClaim.id);
        
        // 🔔 AUTOMATIC NOTIFICATION TO STAFF
        console.log(`🔔 NEW CLAIM: ${farmer.name} submitted ${itemRequested}`);
        if (!global.staffNotifications) {
            global.staffNotifications = [];
        }
        global.staffNotifications.push({
            type: 'new_claim',
            claimId: claim.id,
            farmerName: farmer.name,
            barangay: farmer.barangay,
            itemRequested: itemRequested,
            quantity: quantity,
            timestamp: new Date().toISOString()
        });
        
        res.json({ success: true, message: 'Claim submitted successfully! Staff will review your request.', claim });
    } catch (error) {
        console.error('Error submitting claim:', error);
        res.status(500).json({ error: 'Failed to submit claim' });
    }
};

// Submit damage report
export const submitDamageReport = async (req, res) => {
    try {
        const { 
            farmerName,
            contactNumber,
            barangay,
            location,
            incidentDate,
            disasterType,
            cropType,
            cropStage,
            affectedArea,
            damagePercentage,
            estimatedLoss,
            damageDescription,
            additionalNotes
        } = req.body;
        
        const farmerId = req.session.userId;
        const sessionFarmerName = req.session.userName;
        const sessionBarangay = req.session.userBarangay;
        const farmerEmail = req.session.userEmail;
        
        // Validate required fields
        if (!incidentDate || !disasterType || !cropType || !affectedArea || !damagePercentage) {
            return res.status(400).json({ 
                success: false,
                error: 'Please fill in all required fields' 
            });
        }

        // Verify farmer exists
        try {
            const { User } = await import('../models/UserMySQL.js');
            const farmer = await User.findById(farmerId);
            if (!farmer) {
                return res.status(403).json({ success: false, error: 'Farmer account not found. Please re-login.' });
            }
        } catch (dbError) {
            console.error('❌ Error verifying farmer:', dbError.message);
            return res.status(500).json({ success: false, error: 'Database error. Please try again.' });
        }

        const damageReportData = {
            id: 'DMG-' + Date.now(),
            farmerId: farmerId || 'unknown',
            farmerName: farmerName || sessionFarmerName || 'Unknown Farmer',
            contactNumber: contactNumber || '',
            barangay: barangay || sessionBarangay || 'Not specified',
            location: location || '',
            incidentDate: incidentDate,
            disasterType: disasterType,
            cropType: cropType,
            cropStage: cropStage || '',
            affectedArea: parseFloat(affectedArea),
            damagePercentage: parseFloat(damagePercentage),
            estimatedLoss: parseFloat(estimatedLoss) || 0,
            damageDescription: damageDescription || '',
            additionalNotes: additionalNotes || '',
            evidenceImages: req.body.evidenceImages || null,
            status: 'pending',
            verificationNotes: null,
            verifiedBy: null,
            verifiedAt: null,
            createdAt: new Date().toISOString()
        };

        const newReport = new DamageReport(damageReportData);
        await newReport.save();
        console.log('✅ Damage report saved to MySQL:', damageReportData.id);
        
        console.log('✅ Damage report submitted:', {
            id: damageReportData.id,
            farmer: damageReportData.farmerName,
            disaster: disasterType,
            crop: cropType,
            damage: damagePercentage + '%'
        });
        
        // Store notification for staff dashboard
        if (!global.staffNotifications) global.staffNotifications = [];
        global.staffNotifications.push({
            type: 'new_damage_report',
            reportId: damageReportData.id,
            farmerName: damageReportData.farmerName,
            barangay: damageReportData.barangay,
            disasterType: disasterType,
            cropType: cropType,
            damagePercentage: damagePercentage,
            timestamp: new Date().toISOString()
        });
        
        res.json({ 
            success: true, 
            message: 'Damage report submitted successfully! Staff will verify soon.',
            damageReport: damageReportData
        });
    } catch (error) {
        console.error('❌ Error submitting damage report:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to submit damage report. Please try again.' 
        });
    }
};

export const getFarmerClaims = async (req, res) => {
    try {
        const farmerId = req.session.userId;
        const claims = await Claim.findByFarmer(farmerId);
        return res.json({ claims });
    } catch (error) {
        console.error('Error getting farmer claims:', error);
        res.status(500).json({ error: 'Failed to load claims' });
    }
};

export const getFarmerDamageReports = async (req, res) => {
    try {
        const farmerId = req.session.userId;
        const damageReports = await DamageReport.findByFarmer(farmerId);
        return res.json({ damageReports });
    } catch (error) {
        console.error('Error getting damage reports:', error);
        res.status(500).json({ error: 'Failed to load damage reports' });
    }
};

// Get announcements for farmer's barangay
export const getFarmerAnnouncements = async (req, res) => {
    try {
        const farmerId = req.session.userId;
        const farmer = await User.findById(farmerId);
        
        if (!farmer) {
            return res.status(404).json({ error: 'Farmer not found' });
        }

        const announcements = await Announcement.findByBarangay(farmer.barangay);
        res.json({ announcements });
    } catch (error) {
        console.error('Error getting announcements:', error);
        res.status(500).json({ error: 'Failed to load announcements' });
    }
};


// Submit request letter (RequestLetter is already imported at the top)
export const submitRequestLetter = async (req, res) => {
    try {
        const farmerId = req.session.userId;
        const farmerName = req.session.userName;
        const farmerEmail = req.session.userEmail;
        const farmerBarangay = req.session.userBarangay || 'Not specified';
        
        const {
            requestType,
            subject,
            message,
            priority,
            contactNumber
        } = req.body;
        
        // Validate required fields
        if (!requestType || !subject || !message || !contactNumber) {
            return res.status(400).json({ 
                success: false,
                error: 'Please fill in all required fields (Request Type, Subject, Message, Contact Number)' 
            });
        }

        // Verify farmer exists
        try {
            const { User } = await import('../models/UserMySQL.js');
            const farmer = await User.findById(farmerId);
            if (!farmer) {
                return res.status(404).json({ success: false, error: 'Farmer account not found. Please re-login.' });
            }
        } catch (dbError) {
            console.error('❌ Error verifying farmer:', dbError.message);
            return res.status(500).json({ success: false, error: 'Database error. Please try again.' });
        }
        
        const requestData = {
            id: 'REQ-' + Date.now(),
            farmerId: farmerId || 'unknown',
            farmerName: farmerName || 'Unknown Farmer',
            farmerEmail: farmerEmail || '',
            barangay: farmerBarangay,
            requestType,
            subject,
            message,
            priority: priority || 'normal',
            contactNumber,
            status: 'pending',
            response: null,
            actionTaken: null,
            respondedBy: null,
            respondedAt: null,
            createdAt: new Date().toISOString()
        };
        
        let savedId = requestData.id;
        const newRequest = new RequestLetter(requestData);
        await newRequest.save();
        savedId = newRequest.id || requestData.id;
        console.log('✅ Request letter saved to MySQL:', savedId);
        
        console.log('✅ Request letter submitted:', {
            id: requestData.id,
            farmer: farmerName,
            type: requestType,
            subject: subject
        });
        
        // Trigger real-time notification for staff
        console.log(`🔔 REAL-TIME NOTIFICATION: New request letter from ${farmerName}`);
        
        // Store notification for staff dashboard
        if (!global.staffNotifications) {
            global.staffNotifications = [];
        }
        global.staffNotifications.push({
            type: 'new_request_letter',
            requestId: savedId,
            farmerName: farmerName,
            barangay: farmerBarangay,
            requestType: requestType,
            subject: subject,
            priority: priority || 'normal',
            timestamp: new Date().toISOString()
        });
        
        res.json({
            success: true,
            message: 'Request letter submitted successfully! Staff will respond soon.',
            request: requestData
        });
    } catch (error) {
        console.error('❌ Error submitting request letter:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to submit request letter. Please try again.' 
        });
    }
};

export const getFarmerRequestLetters = async (req, res) => {
    try {
        const farmerId = req.session.userId;
        const requests = await RequestLetter.findByFarmer(farmerId);
        return res.json({ success: true, requests: requests || [] });
    } catch (error) {
        console.error('Error getting request letters:', error);
        res.status(500).json({ error: 'Failed to load request letters' });
    }
};
