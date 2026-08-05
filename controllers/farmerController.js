/*
    DA AgriManage - Farmer Controller
    Handles farmer-specific operations
*/

// Import MySQL models
const mysqlModels = await Promise.all([
    import("../models/UserMySQL.js"),
    import("../models/ClaimMySQL.js"),
    import("../models/DamageReportMySQL.js"),
    import("../models/InsuranceMySQL.js"),
    import("../models/AnnouncementMySQL.js"),
    import("../models/RequestLetterMySQL.js")
]);

const User = mysqlModels[0].User || mysqlModels[0].default;
const Claim = mysqlModels[1].Claim || mysqlModels[1].default;
const DamageReport = mysqlModels[2].DamageReport || mysqlModels[2].default;
const Insurance = mysqlModels[3].Insurance || mysqlModels[3].default;
const Announcement = mysqlModels[4].Announcement || mysqlModels[4].default;
const RequestLetter = mysqlModels[5].RequestLetter || mysqlModels[5].default;

console.log('✅ Using MySQL models for farmer operations');

// Get farmer dashboard data
export const getFarmerData = async (req, res) => {
    try {
        const farmerId = req.session.userId;
        const farmer = await User.findById(farmerId);
        
        if (!farmer || farmer.role !== 'farmer') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [claims, damageReports, insurance, announcements] = await Promise.all([
            Claim.findByFarmer(farmerId),
            DamageReport.findByFarmer(farmerId),
            Insurance.findByFarmer(farmerId),
            Announcement.findByBarangay(farmer.barangay)
        ]);

        res.json({
            farmer,
            claims,
            damageReports,
            insurance,
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
        
        // If farmer not found in MySQL, save from session
        if (!farmer) {
            console.log(`⚠️ Farmer ${farmerId} not found in MySQL, saving from session...`);
            const { localUsers } = await import('./authController.js');
            const localFarmer = localUsers.get(farmerEmail);
            
            if (localFarmer) {
                console.log(`📝 Saving farmer to MySQL before claim`);
                const newUser = new User(localFarmer);
                await newUser.save();
                farmer = localFarmer;
                console.log(`✅ Farmer saved successfully`);
            } else {
                return res.status(403).json({ error: 'Farmer account not found. Please re-login.' });
            }
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

        // Verify user exists in database — save them if missing (prevents FK error)
        try {
            const { User } = await import('../models/UserMySQL.js');
            let farmer = await User.findById(farmerId);
            
            if (!farmer) {
                console.log(`⚠️ Farmer ${farmerId} not found in MySQL, auto-saving from session...`);
                const newUser = new User({
                    id: farmerId,
                    name: req.session.userName || farmerName || 'Unknown',
                    email: req.session.userEmail || '',
                    role: 'farmer',
                    barangay: req.session.userBarangay || barangay || '',
                    status: 'active',
                    isApproved: true,
                    authProvider: 'email'
                });
                await newUser.save();
                console.log(`✅ Farmer auto-saved to MySQL before damage report`);
            }
        } catch (dbError) {
            console.error('⚠️ Error verifying/saving farmer:', dbError.message);
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

        // Use MySQL DamageReport model
        const newReport = new DamageReport(damageReportData);
        await newReport.save();
        
        console.log('✅ Damage report submitted:', {
            id: newReport.id,
            farmer: damageReportData.farmerName,
            disaster: disasterType,
            crop: cropType,
            damage: damagePercentage + '%'
        });
        
        // Trigger real-time notification for staff
        console.log(`🔔 REAL-TIME NOTIFICATION: New damage report from ${damageReportData.farmerName}`);
        
        // Store notification for staff dashboard
        if (!global.staffNotifications) {
            global.staffNotifications = [];
        }
        global.staffNotifications.push({
            type: 'new_damage_report',
            reportId: newReport.id,
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
            damageReport: newReport
        });
    } catch (error) {
        console.error('❌ Error submitting damage report:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to submit damage report. Please try again.' 
        });
    }
};

// Apply for crop insurance
export const applyInsurance = async (req, res) => {
    try {
        const { 
            cropType, 
            insuredArea, 
            plantingDate, 
            expectedHarvestDate, 
            insuranceType,
            cropVariety,
            totalFarmArea,
            farmLocation,
            previousYield,
            farmingExperience,
            additionalInfo,
            contactNumber,
            emergencyContact,
            estimatedPremium,
            estimatedCoverage
        } = req.body;
        
        const farmerId = req.session.userId;
        const farmerName = req.session.userName;
        const farmerBarangay = req.session.userBarangay;
        
        if (!farmerId || !farmerName || !farmerBarangay) {
            return res.status(403).json({ error: 'Access denied - missing farmer information' });
        }

        // Verify user exists in database
        try {
            const { User } = await import('../models/UserMySQL.js');
            let farmer = await User.findById(farmerId);
            
            if (!farmer) {
                console.log(`⚠️ Farmer ${farmerId} not found in MySQL, checking local storage...`);
                // Try to get from local storage and save to MySQL
                const { localUsers } = await import('./authController.js');
                const localFarmer = localUsers.get(req.session.userEmail);
                
                if (localFarmer) {
                    console.log(`📝 Saving farmer to MySQL: ${localFarmer.name} (${localFarmer.email})`);
                    const newUser = new User(localFarmer);
                    await newUser.save();
                    console.log(`✅ Farmer saved to MySQL successfully`);
                } else {
                    return res.status(404).json({ error: 'Farmer account not found. Please re-login.' });
                }
            }
        } catch (dbError) {
            console.error('⚠️ Error verifying farmer:', dbError.message);
            // Continue anyway - will use local storage fallback
        }

        // Use user-provided premium and coverage amounts
        const premiumAmount = parseFloat(estimatedPremium) || 0;
        const coverageAmount = parseFloat(estimatedCoverage) || 0;

        const insurance = new Insurance({
            farmerId,
            farmerName: farmerName,
            barangay: farmerBarangay,
            cropType,
            cropVariety,
            insuredArea: parseFloat(insuredArea),
            totalFarmArea: parseFloat(totalFarmArea) || 0,
            plantingDate: new Date(plantingDate),
            expectedHarvestDate: new Date(expectedHarvestDate),
            insuranceType,
            farmLocation,
            previousYield: parseInt(previousYield) || 0,
            farmingExperience: parseInt(farmingExperience) || 0,
            premiumAmount,
            coverageAmount,
            additionalInfo,
            contactNumber,
            emergencyContact,
            status: 'pending'
        });

        await insurance.save();
        
        console.log('✅ Insurance application saved:', {
            id: insurance.id,
            farmerId,
            farmerName,
            barangay: farmerBarangay,
            cropType,
            insuredArea
        });
        
        // Trigger real-time notification for staff
        console.log(`🔔 REAL-TIME NOTIFICATION: New insurance application from ${farmerName}`);
        
        // Store notification for staff dashboard
        if (!global.staffNotifications) {
            global.staffNotifications = [];
        }
        global.staffNotifications.push({
            type: 'new_insurance',
            insuranceId: insurance.id,
            farmerName: farmerName,
            barangay: farmerBarangay,
            cropType: cropType,
            insuredArea: insuredArea,
            timestamp: new Date().toISOString()
        });
        
        res.json({ 
            success: true, 
            message: 'Insurance application submitted successfully', 
            insurance,
            farmerName,
            barangay: farmerBarangay
        });
    } catch (error) {
        console.error('Error applying for insurance:', error);
        res.status(500).json({ error: 'Failed to apply for insurance' });
    }
};

// Get farmer's claims
export const getFarmerClaims = async (req, res) => {
    try {
        const farmerId = req.session.userId;
        const claims = await Claim.findByFarmer(farmerId);
        res.json({ claims });
    } catch (error) {
        console.error('Error getting farmer claims:', error);
        res.status(500).json({ error: 'Failed to load claims' });
    }
};

// Get farmer's damage reports
export const getFarmerDamageReports = async (req, res) => {
    try {
        const farmerId = req.session.userId;
        const damageReports = await DamageReport.findByFarmer(farmerId);
        res.json({ damageReports });
    } catch (error) {
        console.error('Error getting damage reports:', error);
        res.status(500).json({ error: 'Failed to load damage reports' });
    }
};

// Get farmer's insurance applications
export const getFarmerInsurance = async (req, res) => {
    try {
        const farmerId = req.session.userId;
        const insurance = await Insurance.findByFarmer(farmerId);
        res.json({ insurance });
    } catch (error) {
        console.error('Error getting insurance applications:', error);
        res.status(500).json({ error: 'Failed to load insurance applications' });
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

        // Verify user exists in database (same fix as insurance)
        try {
            const { User } = await import('../models/UserMySQL.js');
            let farmer = await User.findById(farmerId);
            
            if (!farmer) {
                console.log(`⚠️ Farmer ${farmerId} not found in MySQL, saving from session...`);
                const { localUsers } = await import('./authController.js');
                const localFarmer = localUsers.get(farmerEmail);
                
                if (localFarmer) {
                    console.log(`📝 Saving farmer to MySQL: ${localFarmer.name} (${localFarmer.email})`);
                    const newUser = new User(localFarmer);
                    await newUser.save();
                    console.log(`✅ Farmer saved to MySQL successfully`);
                } else {
                    return res.status(404).json({ 
                        success: false,
                        error: 'Farmer account not found. Please re-login.' 
                    });
                }
            }
        } catch (dbError) {
            console.error('⚠️ Error verifying farmer:', dbError.message);
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
        
        // Use MySQL RequestLetter model
        const newRequest = new RequestLetter(requestData);
        await newRequest.save();
        
        console.log('✅ Request letter submitted:', {
            id: newRequest.id,
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
            requestId: newRequest.id,
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
            request: newRequest
        });
    } catch (error) {
        console.error('❌ Error submitting request letter:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to submit request letter. Please try again.' 
        });
    }
};

// Get farmer's request letters
export const getFarmerRequestLetters = async (req, res) => {
    try {
        const farmerId = req.session.userId;
        
        // Use MySQL RequestLetter model
        const requests = await RequestLetter.findByFarmer(farmerId);
        
        res.json({
            success: true,
            requests: requests || []
        });
    } catch (error) {
        console.error('Error getting request letters:', error);
        res.status(500).json({ error: 'Failed to load request letters' });
    }
};
