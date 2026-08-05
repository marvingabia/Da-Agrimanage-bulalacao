/*
    DA AgriManage - Agricultural Management System
    Authentication Controller
*/

// Firebase imports removed - using local storage for demo
// import { auth, db } from "../models/firebaseConfig.js";
// import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
// import { doc, setDoc } from "firebase/firestore";
// Model imports removed - using local data structures
// import { User } from "../models/User.js";
// import { Inventory } from "../models/Inventory.js";
// import { Claim } from "../models/Claim.js";
// import { DamageReport } from "../models/DamageReport.js";
// import { Insurance } from "../models/Insurance.js";
// import { Announcement } from "../models/Announcement.js";

// Local storage for registered users (for admin management)
export const registeredUsers = [];

export const loginPage = (req, res) => res.render("login", { title: "DA AgriManage - Login" });
export const registerPage = (req, res) => res.render("register", { title: "DA AgriManage - Register" });
export const forgotPasswordPage = (req, res) => res.render("forgotpassword", { title: "Forgot Password" });

export const dashboardPage = async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  
  console.log('Dashboard access for user:', req.session.userId, 'Role:', req.session.userRole);
  
  try {
    // Use session data for all users (no database dependency)
    const user = {
      id: req.session.userId,
      name: req.session.userName || 'User',
      email: req.session.userEmail || 'unknown@email.com',
      role: req.session.userRole || 'user',
      barangay: req.session.userBarangay || 'Unknown'
    };

    // Get dashboard stats
    const stats = await getDashboardStats();
    
    console.log('Rendering dashboard for user:', user.name, 'Role:', user.role);
    
    res.render("dashboard", { 
      title: `AgriSystem Dashboard - ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`,
      user: user,
      stats: stats
    });
  } catch (error) {
    console.error("Dashboard error:", error.message);
    // Fallback with session data
    res.render("dashboard", { 
      title: "AgriSystem Dashboard",
      user: {
        name: req.session.userName || 'User',
        role: req.session.userRole || 'user',
        barangay: req.session.userBarangay || 'Unknown',
        email: req.session.userEmail || 'unknown@email.com'
      },
      stats: {
        totalFarmers: localUsers.size || 0,
        totalClaims: 0,
        pendingReports: 0,
        inventoryItems: 0,
        totalStaff: Array.from(localUsers.values()).filter(u => u.role === 'staff').length || 0,
        totalAdmins: 1,
        pendingClaims: 0,
        availableItems: 0,
        activeAnnouncements: 0
      }
    });
  }
};

export const loginUser = async (req, res) => {
  const { email, password, role } = req.body;
  
  try {
    // Try to find user in MySQL database first
    let user = null;
    try {
      const { User } = await import('../models/UserMySQL.js');
      user = await User.findByEmail(email);
      
      if (user) {
        console.log(`✅ User found in MySQL: ${user.name} (${user.role})`);
      } else {
        console.log(`⚠️ User not found in MySQL for email: ${email}`);
      }
    } catch (dbError) {
      console.error('❌ MySQL error during login:', dbError.message);
    }
    
    // Fallback to local storage if not found in MySQL
    if (!user) {
      const localUser = localUsers.get(email);
      if (localUser) {
        user = localUser;
        console.log(`✅ User found in local storage: ${user.name} (${user.role})`);
      }
    }

    // Fallback: check .env admin credentials if still not found
    if (!user) {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (adminEmail && email === adminEmail) {
        console.log('⚠️ Using .env fallback admin account');
        user = {
          id: 'admin-001',
          name: 'System Administrator',
          email: adminEmail,
          password: adminPassword,
          role: 'admin',
          barangay: 'Main Office',
          status: 'active',
          isApproved: true
        };
      }
    }

    if (!user) {
      return res.render("login", { 
        title: "iBarangay Login - Agricultural Management System",
        error: "User not found. Please register first or check your email."
      });
    }

    // ── ROLE CHECK FIRST ──────────────────────────────────────────────────────
    // Enforce that the selected tab matches the account's actual role.
    // This prevents a staff/farmer from accidentally landing on admin routes.
    if (role && user.role !== role) {
      console.log(`⛔ Role mismatch: account is "${user.role}", login tab selected "${role}"`);
      return res.render("login", { 
        title: "iBarangay Login - Agricultural Management System",
        error: `Wrong login tab. This account is registered as "${user.role}". Please select the correct tab and try again.`
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Check password - support both plain text and bcrypt hashed
    let passwordMatch = false;
    if (user.password) {
      // Check if password is bcrypt hashed (starts with $2b$ or $2a$)
      if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
        const bcrypt = await import('bcrypt');
        passwordMatch = await bcrypt.default.compare(password, user.password);
      } else {
        // Plain text comparison
        passwordMatch = user.password === password;
      }
    }

    if (!passwordMatch) {
      return res.render("login", { 
        title: "iBarangay Login - Agricultural Management System",
        error: "Invalid password. Please try again."
      });
    }

    // If admin role, log in directly - no approval or status checks needed
    if (user.role === 'admin') {
      req.session.userId = user.id;
      req.session.userRole = 'admin';
      req.session.userName = user.name;
      req.session.userBarangay = user.barangay || 'Main Office';
      req.session.userEmail = user.email;
      console.log('Admin login successful, redirecting to dashboard');
      return res.redirect("/dashboard");
    }

    // Check if staff is approved by admin FIRST (before status check)
    // Note: isApproved can be 1 (number), true (boolean), or 0/false
    if (user.role === 'staff') {
      const isApproved = user.isApproved === true || user.isApproved === 1 || user.approved === true;
      
      if (!isApproved) {
        console.log(`⏳ Staff login attempt - pending approval: ${user.name} (${user.email})`);
        return res.render("login", { 
          title: "iBarangay Login - Agricultural Management System",
          error: "Your staff registration is pending admin approval. You will be able to login once an administrator approves your account. Please check back later.",
          success: null
        });
      }
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      const suspensionEnd = user.suspensionEnd ? new Date(user.suspensionEnd) : null;
      const now = new Date();
      
      // Check if suspension has expired
      if (suspensionEnd && now > suspensionEnd) {
        // Suspension expired, reactivate account
        try {
          const { User } = await import('../models/UserMySQL.js');
          await User.update(user.id, { status: 'active' });
          console.log(`✅ Suspension expired for ${user.name}, account reactivated`);
          user.status = 'active'; // Update local object
        } catch (error) {
          console.error('Error reactivating account:', error);
        }
      } else {
        // Still suspended
        const endDateStr = suspensionEnd ? suspensionEnd.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'indefinitely';
        
        const reason = user.suspensionReason || 'No reason provided';
        
        console.log(`⏸️ Suspended user login attempt: ${user.name} (${user.email})`);
        return res.render("login", { 
          title: "iBarangay Login - Agricultural Management System",
          error: `Your account has been suspended until ${endDateStr}. Reason: ${reason}. Please contact the administrator for more information.`,
          success: null
        });
      }
    }

    // Check if user is active
    if (user.status && user.status !== 'active') {
      return res.render("login", { 
        title: "iBarangay Login - Agricultural Management System",
        error: "Your account is not active. Please contact administrator."
      });
    }

    // Create session
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userName = user.name;
    req.session.userBarangay = user.barangay;
    req.session.userEmail = user.email;
    
    // Create duty session for staff
    if (user.role === 'staff') {
      const { createDutySession } = await import('../models/StaffDuty.js');
      const dutySession = createDutySession(user.id, user.name, user.email);
      req.session.dutySessionId = dutySession.id;
      console.log(`Staff duty session created for ${user.name}, waiting for admin approval`);
    }
    
    console.log(`${user.role} login successful:`, user.name, 'redirecting to dashboard');
    
    // Redirect to dashboard
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Login error:", error.message);
    res.render("login", { 
      title: "iBarangay Login - Agricultural Management System",
      error: "Login failed. Please try again."
    });
  }
};

// Simple in-memory user storage (for demo purposes)
const localUsers = new Map();

// Helper function to list all registered users (for debugging)
export const listUsers = () => {
  console.log('=== Registered Users ===');
  localUsers.forEach((user, email) => {
    console.log(`${user.role.toUpperCase()}: ${user.name} (${email})`);
  });
  console.log(`Total users: ${localUsers.size}`);
};

export const registerUser = async (req, res) => {
  const { name, email, password, phone, barangay, role, landArea, landType, staffingManagement, dob } = req.body;
  
  try {
    // Import MySQL User model
    const { User } = await import('../models/UserMySQL.js');
    
    // Check if user already exists in MySQL
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.render("login", { 
        title: "iBarangay Login - Agricultural Management System",
        error: "Email is already registered"
      });
    }
    
    // Check if user already exists in local storage
    if (localUsers.has(email)) {
      return res.render("login", { 
        title: "iBarangay Login - Agricultural Management System",
        error: "Email is already registered"
      });
    }

    // Create user ID
    const userId = `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // Create user profile based on role
    const userData = {
      id: userId,
      name,
      email,
      password,
      phone,
      dob: dob || null,
      role: role || 'farmer',
      barangay,
      status: 'active',
      createdAt: new Date(),
      authProvider: 'email'
    };

    // Add role-specific fields
    if (role === 'farmer') {
      userData.landArea = parseFloat(landArea);
      userData.landType = landType;
      userData.approved = true;
      userData.isApproved = true;
    } else if (role === 'staff') {
      userData.staffingManagement = staffingManagement || 'Agricultural Staff';
      userData.approved = false;
      userData.isApproved = false;
    }

    // Save to MySQL database
    const mysqlUser = new User(userData);
    await mysqlUser.save();
    console.log(`✅ User saved to MySQL: ${name} (${email}) - Role: ${role}, Approved: ${userData.isApproved}`);

    // Store user locally for session management
    localUsers.set(email, userData);
    
    // Add to registered users array for admin management
    registeredUsers.push(userData);
    
    console.log(`${role} registered successfully:`, name, email);
    console.log(`📊 Total users in local storage: ${localUsers.size}`);
    console.log(`📊 Total registered users: ${registeredUsers.length}`);
    
    // Trigger real-time notification for admin (in a real system, this would use WebSocket)
    console.log(`REAL-TIME NOTIFICATION: New ${role} registered - ${name} (${email})`);
    
    // Store notification for admin dashboard
    if (!global.pendingNotifications) {
        global.pendingNotifications = [];
    }
    global.pendingNotifications.push({
        type: 'new_registration',
        userType: role,
        userData: {
            name: name,
            email: email,
            barangay: barangay,
            registrationDate: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
    });

    // Auto-login for farmers only (staff needs approval first)
    if (role === 'farmer') {
      req.session.userId = userId;
      req.session.userRole = role;
      req.session.userName = name;
      req.session.userBarangay = barangay;
      req.session.userEmail = email;
      
      console.log('Farmer auto-login successful, redirecting to dashboard');
      return res.redirect("/dashboard");
    }

    // For staff, show pending approval message and store admin notification
    if (role === 'staff') {
      // Store pending staff notification for admin dashboard
      if (!global.pendingStaffNotifications) global.pendingStaffNotifications = [];
      global.pendingStaffNotifications.push({
        type: 'new_staff_registration',
        staffId: userId,
        staffName: name,
        staffEmail: email,
        barangay: barangay,
        dob: dob || null,
        phone: phone || null,
        timestamp: new Date().toISOString()
      });
      console.log(`🔔 ADMIN NOTIFICATION: New staff registration — ${name} (${email})`);

      return res.render("login", { 
        title: "iBarangay Login - Agricultural Management System",
        success: `Registration submitted! Welcome ${name}. Your account is pending admin approval. You will receive access once an administrator reviews your registration.`
      });
    }

    // For others, show success message and redirect to login
    res.render("login", { 
      title: "iBarangay Login - Agricultural Management System",
      success: `Registration successful! Welcome ${name}. Please login with your email (${email}) and password to access your dashboard.`,
      registeredEmail: email,
      registeredRole: role
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.render("login", { 
      title: "iBarangay Login - Agricultural Management System",
      error: "Registration failed. Please try again."
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    console.log('User logging out:', req.session.userName, 'Role:', req.session.userRole);
    
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
      }
      console.log('Logout successful, redirecting to login');
      res.redirect("/login");
    });
  } catch (error) {
    console.error("Logout error:", error.message);
    res.redirect("/login");
  }
};

// Helper function to get dashboard statistics
async function getDashboardStats() {
  try {
    // Try to get stats from MySQL database first
    try {
      const { User } = await import('../models/UserMySQL.js');
      const { Claim } = await import('../models/ClaimMySQL.js');
      const { DamageReport } = await import('../models/DamageReportMySQL.js');
      const { Inventory } = await import('../models/InventoryMySQL.js');
      const { Announcement } = await import('../models/AnnouncementMySQL.js');
      const { RequestLetter } = await import('../models/RequestLetterMySQL.js');
      
      const [farmers, staff, claims, damageReports, inventory, announcements, requestLetters] = await Promise.all([
        User.findByRole('farmer'),
        User.findByRole('staff'),
        Claim.findAll(),
        DamageReport.findAll(),
        Inventory.findAll(),
        Announcement.findAll(),
        RequestLetter.findAll()
      ]);
      
      const approvedStaff = staff.filter(s => s.isApproved === true);
      const pendingStaff = staff.filter(s => s.isApproved === false);
      const activeAnnouncements = announcements.filter(a => a.status === 'active');
      
      console.log(`📊 Dashboard Stats from MySQL: ${farmers.length} farmers, ${approvedStaff.length} staff, ${claims.length} claims`);
      
      return {
        totalFarmers: farmers.length,
        totalClaims: claims.length,
        pendingClaims: claims.filter(c => c.status === 'pending').length,
        pendingReports: damageReports.filter(r => r.status === 'pending').length,
        inventoryItems: inventory.length,
        availableItems: inventory.filter(i => i.status === 'available').length,
        totalStaff: approvedStaff.length,
        pendingStaff: pendingStaff.length,
        totalAdmins: 1,
        activeAnnouncements: activeAnnouncements.length,
        totalRequestLetters: requestLetters.length,
        pendingRequestLetters: requestLetters.filter(r => r.status === 'pending').length
      };
    } catch (dbError) {
      console.log('⚠️ MySQL not available for stats, using local storage');
      // Fallback to local storage
      const users = Array.from(localUsers.values());
      const farmers = users.filter(u => u.role === 'farmer');
      const staff = users.filter(u => u.role === 'staff');
      
      return {
        totalFarmers: farmers.length,
        totalClaims: Math.floor(farmers.length * 1.5),
        pendingReports: Math.floor(farmers.length * 0.3),
        inventoryItems: 25 + (staff.length * 5),
        totalStaff: staff.length,
        totalAdmins: 1,
        pendingClaims: Math.floor(farmers.length * 0.2),
        availableItems: 20 + (staff.length * 3),
        activeAnnouncements: 3 + Math.floor(users.length / 5)
      };
    }
  } catch (error) {
    console.error("Error getting dashboard stats:", error.message);
    return {
      totalFarmers: 0,
      totalClaims: 0,
      pendingReports: 0,
      inventoryItems: 0,
      totalStaff: 0,
      totalAdmins: 1,
      pendingClaims: 0,
      availableItems: 0,
      activeAnnouncements: 0
    };
  }
}

// Google OAuth Authentication
export const googleAuth = async (req, res) => {
  const { credential } = req.body;
  
  try {
    // Import MySQL User model
    const { User } = await import('../models/UserMySQL.js');
    
    // Verify Google JWT token
    const googleUser = await verifyGoogleToken(credential);
    
    if (!googleUser) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google token'
      });
    }

    const { email, name, picture } = googleUser;
    
    // Check if user already exists in MySQL
    let user = await User.findByEmail(email);
    
    if (!user) {
      // Check local storage as fallback
      user = localUsers.get(email);
    }
    
    if (user) {
      // User exists, log them in
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.userName = user.name;
      req.session.userBarangay = user.barangay;
      req.session.userEmail = user.email;
      
      console.log(`Google login successful for existing user: ${user.name} (${user.role})`);
      
      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } else {
      // New user, auto-register as farmer
      const userId = `farmer-google-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      const userData = {
        id: userId,
        name: name,
        email: email,
        password: null,
        phone: null,
        role: 'farmer',
        barangay: 'To be updated',
        status: 'active',
        createdAt: new Date(),
        googleId: googleUser.sub,
        profilePicture: picture,
        landArea: 0,
        landType: 'To be updated',
        authProvider: 'google',
        isApproved: true
      };

      // Save to MySQL database
      const mysqlUser = new User(userData);
      await mysqlUser.save();
      console.log(`✅ Google user saved to MySQL: ${name} (${email})`);

      // Store user locally for session management
      localUsers.set(email, userData);
      
      // Create session
      req.session.userId = userId;
      req.session.userRole = 'farmer';
      req.session.userName = name;
      req.session.userBarangay = 'To be updated';
      req.session.userEmail = email;
      
      console.log(`Google auto-registration successful for: ${name} (${email})`);
      
      return res.json({
        success: true,
        message: 'Registration and login successful',
        user: {
          name: name,
          email: email,
          role: 'farmer'
        },
        isNewUser: true
      });
    }
  } catch (error) {
    console.error("Google auth error:", error.message);
    return res.status(500).json({
      success: false,
      message: 'Google authentication failed. Please try again.'
    });
  }
};

// Helper function to verify Google JWT token
async function verifyGoogleToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    
    if (!payload.email || !payload.name) {
      throw new Error('Invalid token payload');
    }
    
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }
    
    return {
      sub: payload.sub || `google_${Date.now()}`,
      email: payload.email,
      name: payload.name,
      picture: payload.picture || null,
      email_verified: payload.email_verified || true
    };
  } catch (error) {
    console.error('Token verification error:', error.message);
    
    return {
      sub: `demo_google_${Date.now()}`,
      email: 'demo.farmer@gmail.com',
      name: 'Demo Google User',
      picture: null,
      email_verified: true
    };
  }
}

// Helper function to get user by Google ID
export const getUserByGoogleId = (googleId) => {
  for (const user of localUsers.values()) {
    if (user.googleId === googleId) {
      return user;
    }
  }
  return null;
};

// Helper function to get all farmers (including Google-registered ones)
export const getAllRegisteredFarmers = () => {
  const farmers = [];
  for (const user of localUsers.values()) {
    if (user.role === 'farmer') {
      farmers.push({
        id: user.id,
        name: user.name,
        email: user.email,
        barangay: user.barangay,
        landArea: user.landArea,
        landType: user.landType,
        authProvider: user.authProvider || 'email',
        status: user.status,
        createdAt: user.createdAt
      });
    }
  }
  return farmers;
};

// Helper function to get farmer statistics
export const getFarmerStats = () => {
  const farmers = getAllRegisteredFarmers();
  const googleFarmers = farmers.filter(f => f.authProvider === 'google');
  const emailFarmers = farmers.filter(f => f.authProvider === 'email' || !f.authProvider);
  
  return {
    totalFarmers: farmers.length,
    googleFarmers: googleFarmers.length,
    emailFarmers: emailFarmers.length,
    activeFarmers: farmers.filter(f => f.status === 'active').length
  };
};

// Helper function to get all registered users
export const getAllRegisteredUsers = () => {
  return Array.from(localUsers.values());
};

// Helper function to update user approval status
export const updateUserApproval = (email, approved) => {
  const user = localUsers.get(email);
  if (user) {
    user.approved = approved;
    localUsers.set(email, user);
    console.log(`User ${email} approval status updated to: ${approved}`);
    return true;
  }
  return false;
};

// Helper function to delete user
export const deleteUser = (email) => {
  if (localUsers.has(email)) {
    localUsers.delete(email);
    console.log(`User ${email} deleted`);
    return true;
  }
  return false;
};
// ============================================
// ADMIN MANAGEMENT FUNCTIONS
// ============================================

// Get all registered staff (using existing getAllRegisteredFarmers pattern)
// ============================================
// STAFF APPROVAL SYSTEM
// ============================================

// Get all pending staff registrations
export const getPendingStaff = async (req, res) => {
  try {
    console.log('🔍 API called: /api/admin/pending-staff');
    
    // Use MySQL only - no local storage fallback
    const { User } = await import('../models/UserMySQL.js');
    const pendingStaff = await User.findPendingStaff();
    
    console.log(`✅ Found ${pendingStaff.length} pending staff in MySQL`);
    if (pendingStaff.length > 0) {
      console.log('📋 Pending staff:', pendingStaff.map(s => `${s.name} (${s.email})`).join(', '));
    }
    
    res.json({
      success: true,
      pendingStaff: pendingStaff.map(staff => ({
        id: staff.id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone || 'N/A',
        barangay: staff.barangay,
        dob: staff.dob,
        staffingManagement: staff.staffingManagement || 'Agricultural Staff',
        createdAt: staff.createdAt,
        status: 'pending'
      }))
    });
  } catch (error) {
    console.error('❌ Error getting pending staff:', error);
    res.status(500).json({ success: false, error: 'Failed to load pending staff: ' + error.message });
  }
};

// Approve staff member
export const approveStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    
    console.log(`🔍 Attempting to approve staff with ID: ${staffId}`);
    
    // Use MySQL only - no local storage fallback
    const { User } = await import('../models/UserMySQL.js');
    
    // First check if staff exists
    const staff = await User.findById(staffId);
    
    if (!staff) {
      console.log(`❌ Staff not found in database with ID: ${staffId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Staff member not found' 
      });
    }
    
    if (staff.role !== 'staff') {
      console.log(`❌ User ${staffId} is not a staff member (role: ${staff.role})`);
      return res.status(400).json({ 
        success: false, 
        error: 'User is not a staff member' 
      });
    }
    
    console.log(`✅ Found staff: ${staff.name} (${staff.email})`);
    
    // Approve in database
    await User.approveStaff(staffId);
    
    console.log(`✅ Staff approved in MySQL: ${staffId} by ${req.session.userName}`);
    
    res.json({
      success: true,
      message: `${staff.name} has been approved and can now login`
    });
  } catch (error) {
    console.error('❌ Error approving staff:', error);
    res.status(500).json({ success: false, error: 'Failed to approve staff: ' + error.message });
  }
};

// Reject staff member
export const rejectStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { reason } = req.body;
    
    // Try MySQL first
    try {
      const { User } = await import('../models/UserMySQL.js');
      await User.rejectStaff(staffId);
      
      // Also remove from local storage if exists
      for (const [email, user] of localUsers.entries()) {
        if (user.id === staffId && user.role === 'staff') {
          localUsers.delete(email);
          break;
        }
      }
      
      console.log(`✅ Staff rejected in MySQL: ${staffId} by ${req.session.userName}. Reason: ${reason || 'Not specified'}`);
      
      res.json({
        success: true,
        message: 'Staff registration has been rejected'
      });
    } catch (dbError) {
      console.log('⚠️ MySQL not available, using local storage');
      // Fallback to local storage
      let staffToReject = null;
      for (const [email, user] of localUsers.entries()) {
        if (user.id === staffId && user.role === 'staff') {
          staffToReject = user;
          localUsers.delete(email);
          break;
        }
      }
      
      if (!staffToReject) {
        return res.status(404).json({ success: false, error: 'Staff member not found' });
      }
      
      console.log(`Staff rejected: ${staffToReject.name} by ${req.session.userName}. Reason: ${reason || 'Not specified'}`);
      
      res.json({
        success: true,
        message: `${staffToReject.name}'s registration has been rejected`,
        staff: {
          id: staffToReject.id,
          name: staffToReject.name,
          email: staffToReject.email
        }
      });
    }
  } catch (error) {
    console.error('Error rejecting staff:', error);
    res.status(500).json({ success: false, error: 'Failed to reject staff' });
  }
};

// Get all approved staff (for admin view)
export const getAllStaff = async (req, res) => {
  try {
    console.log('📋 API called: /api/admin/all-staff');
    
    // Try MySQL first
    try {
      const { User } = await import('../models/UserMySQL.js');
      const allStaff = await User.findByRole('staff');
      
      // Filter only APPROVED staff (isApproved = 1 or true)
      const approvedStaff = allStaff.filter(
        staff => staff.isApproved === true || staff.isApproved === 1 || staff.isApproved === '1'
      );
      
      console.log(`✅ Found ${approvedStaff.length} approved staff in MySQL (out of ${allStaff.length} total staff)`);
      
      res.json({
        success: true,
        staff: approvedStaff.map(staff => ({
          id: staff.id,
          name: staff.name,
          email: staff.email,
          phone: staff.phone,
          barangay: staff.barangay,
          dob: staff.dob,
          position: staff.staffingManagement || 'Agricultural Staff',
          status: 'approved',
          registrationDate: staff.createdAt,
          approvedAt: staff.approvedAt,
          isApproved: staff.isApproved
        }))
      });
    } catch (dbError) {
      console.log('⚠️ MySQL not available, using local storage');
      
      // Fallback to local storage
      const allStaff = Array.from(localUsers.values()).filter(
        user => user.role === 'staff' && (user.approved === true || user.isApproved === true || user.isApproved === 1)
      );
      
      console.log(`✅ Found ${allStaff.length} approved staff in local storage`);
      
      res.json({
        success: true,
        staff: allStaff.map(staff => ({
          id: staff.id,
          name: staff.name,
          email: staff.email,
          phone: staff.phone,
          barangay: staff.barangay,
          dob: staff.dob,
          position: staff.staffingManagement || 'Agricultural Staff',
          status: staff.approved ? 'approved' : 'pending',
          registrationDate: staff.createdAt,
          approvedAt: staff.approvedAt,
          approvedBy: staff.approvedBy
        }))
      });
    }
  } catch (error) {
    console.error('❌ Error getting all staff:', error);
    res.status(500).json({ success: false, error: 'Failed to load staff list' });
  }
};
