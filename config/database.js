/*
    DA AgriManage - MySQL Database Configuration
    Connect to phpMyAdmin MySQL Database
*/

import mysql from 'mysql2/promise';

// Database Configuration
// Supports both local MySQL (Laragon/XAMPP) and PlanetScale
const isPlanetScale = process.env.DB_HOST?.includes('psdb.cloud');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',           // Default phpMyAdmin user
    password: process.env.DB_PASSWORD || '',       // Default phpMyAdmin password (empty)
    database: process.env.DB_NAME || 'da_agrimanage',  // Change this to your database name
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // PlanetScale specific settings
    ...(isPlanetScale && {
        ssl: {
            rejectUnauthorized: true
        }
    })
};

// Create connection pool
let pool;

export async function initDatabase() {
    try {
        // First, connect without database to create it if it doesn't exist
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });

        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        console.log('✅ Database created/verified:', dbConfig.database);
        await connection.end();

        // Now create the pool with the database
        pool = mysql.createPool(dbConfig);
        
        // Test the connection
        const testConnection = await pool.getConnection();
        console.log('✅ MySQL Connected successfully!');
        testConnection.release();

        // Create tables
        await createTables();
        
        return pool;
    } catch (error) {
        console.error('❌ MySQL Connection Error:', error.message);
        console.error('💡 Make sure Laragon/XAMPP is running with MySQL started');
        console.error('📝 System will continue in fallback mode (local storage)');
        // Don't throw error, allow app to continue
        return null;
    }
}

async function createTables() {
    try {
        // Users Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255),
                role ENUM('farmer', 'staff', 'admin') NOT NULL,
                barangay VARCHAR(255),
                authProvider ENUM('email', 'google') DEFAULT 'email',
                googleId VARCHAR(255),
                isApproved BOOLEAN DEFAULT FALSE,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_role (role),
                INDEX idx_barangay (barangay),
                INDEX idx_googleId (googleId)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Insurance Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS insurance (
                id VARCHAR(255) PRIMARY KEY,
                farmerId VARCHAR(255) NOT NULL,
                farmerName VARCHAR(255) NOT NULL,
                barangay VARCHAR(255) NOT NULL,
                contactNumber VARCHAR(50),
                farmLocation VARCHAR(255),
                cropType VARCHAR(100) NOT NULL,
                cropVariety VARCHAR(100),
                insuredArea DECIMAL(10,2) NOT NULL,
                totalFarmArea DECIMAL(10,2),
                plantingDate DATE NOT NULL,
                expectedHarvestDate DATE NOT NULL,
                insuranceType VARCHAR(100) NOT NULL,
                coveragePeriod VARCHAR(100),
                premiumAmount DECIMAL(10,2),
                coverageAmount DECIMAL(10,2),
                additionalInfo TEXT,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                approvalNotes TEXT,
                approvedBy VARCHAR(255),
                approvedAt TIMESTAMP NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (farmerId) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_farmer (farmerId),
                INDEX idx_status (status),
                INDEX idx_barangay (barangay)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Damage Reports Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS damage_reports (
                id VARCHAR(255) PRIMARY KEY,
                farmerId VARCHAR(255) NOT NULL,
                farmerName VARCHAR(255) NOT NULL,
                contactNumber VARCHAR(50),
                barangay VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                incidentDate DATE NOT NULL,
                disasterType VARCHAR(100) NOT NULL,
                cropType VARCHAR(100) NOT NULL,
                cropStage VARCHAR(100),
                affectedArea DECIMAL(10,2) NOT NULL,
                damagePercentage INT NOT NULL,
                estimatedLoss DECIMAL(12,2),
                damageDescription TEXT NOT NULL,
                additionalNotes TEXT,
                status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
                verificationNotes TEXT,
                verifiedBy VARCHAR(255),
                verifiedAt TIMESTAMP NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (farmerId) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_farmer (farmerId),
                INDEX idx_status (status),
                INDEX idx_barangay (barangay)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Request Letters Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS request_letters (
                id VARCHAR(255) PRIMARY KEY,
                farmerId VARCHAR(255) NOT NULL,
                farmerName VARCHAR(255) NOT NULL,
                farmerEmail VARCHAR(255),
                barangay VARCHAR(255) NOT NULL,
                requestType VARCHAR(100) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                priority ENUM('normal', 'urgent', 'emergency') DEFAULT 'normal',
                contactNumber VARCHAR(50) NOT NULL,
                status ENUM('pending', 'responded', 'resolved') DEFAULT 'pending',
                response TEXT,
                actionTaken VARCHAR(255),
                respondedBy VARCHAR(255),
                respondedAt TIMESTAMP NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (farmerId) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_farmer (farmerId),
                INDEX idx_status (status),
                INDEX idx_barangay (barangay)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Claims Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS claims (
                id VARCHAR(255) PRIMARY KEY,
                farmerId VARCHAR(255) NOT NULL,
                farmerName VARCHAR(255) NOT NULL,
                barangay VARCHAR(255) NOT NULL,
                claimType VARCHAR(100) NOT NULL,
                itemRequested VARCHAR(255) NOT NULL,
                quantity DECIMAL(10,2) NOT NULL,
                unit VARCHAR(50) NOT NULL,
                reason TEXT NOT NULL,
                status ENUM('pending', 'approved', 'rejected', 'claimed') DEFAULT 'pending',
                approvalNotes TEXT,
                approvedBy VARCHAR(255),
                approvedAt TIMESTAMP NULL,
                claimedAt TIMESTAMP NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (farmerId) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_farmer (farmerId),
                INDEX idx_status (status),
                INDEX idx_barangay (barangay)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Inventory Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventory (
                id VARCHAR(255) PRIMARY KEY,
                itemName VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                quantity DECIMAL(10,2) NOT NULL,
                unit VARCHAR(50) NOT NULL,
                description TEXT,
                supplier VARCHAR(255),
                dateReceived DATE,
                expiryDate DATE,
                status ENUM('available', 'low_stock', 'out_of_stock') DEFAULT 'available',
                createdBy VARCHAR(255),
                createdByName VARCHAR(255),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_category (category),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Announcements Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS announcements (
                id VARCHAR(255) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                category VARCHAR(100) NOT NULL,
                priority ENUM('normal', 'important', 'urgent') DEFAULT 'normal',
                targetBarangay VARCHAR(255),
                targetRole ENUM('all', 'farmer', 'staff') DEFAULT 'all',
                status ENUM('active', 'archived') DEFAULT 'active',
                createdBy VARCHAR(255) NOT NULL,
                createdByName VARCHAR(255) NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_barangay (targetBarangay),
                INDEX idx_category (category)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Benefits Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS benefits (
                id VARCHAR(255) PRIMARY KEY,
                farmerId VARCHAR(255) NOT NULL,
                farmerName VARCHAR(255) NOT NULL,
                farmerEmail VARCHAR(255),
                barangay VARCHAR(255) NOT NULL,
                benefitType VARCHAR(100) NOT NULL,
                itemName VARCHAR(255) NOT NULL,
                quantity DECIMAL(10,2) NOT NULL,
                unit VARCHAR(50) NOT NULL,
                damageReportId VARCHAR(255),
                status ENUM('for_claim', 'claimed', 'expired') DEFAULT 'for_claim',
                claimedAt TIMESTAMP NULL,
                createdBy VARCHAR(255) NOT NULL,
                createdByName VARCHAR(255) NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (farmerId) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_farmer (farmerId),
                INDEX idx_status (status),
                INDEX idx_barangay (barangay)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Conversations Table (Admin-Staff Communication)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS conversations (
                id VARCHAR(255) PRIMARY KEY,
                senderId VARCHAR(255) NOT NULL,
                senderName VARCHAR(255) NOT NULL,
                senderRole ENUM('staff', 'admin') NOT NULL,
                receiverId VARCHAR(255),
                receiverRole ENUM('staff', 'admin'),
                message TEXT NOT NULL,
                isRead BOOLEAN DEFAULT FALSE,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_sender (senderId),
                INDEX idx_receiver (receiverId),
                INDEX idx_created (createdAt),
                INDEX idx_read (isRead)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Notifications Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(100) PRIMARY KEY,
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                notificationType VARCHAR(50) NOT NULL,
                recipientType VARCHAR(50) NOT NULL,
                barangay VARCHAR(100),
                totalRecipients INT DEFAULT 0,
                emailSent INT DEFAULT 0,
                smsSent INT DEFAULT 0,
                failed INT DEFAULT 0,
                status ENUM('sent', 'failed', 'partial') DEFAULT 'sent',
                sentBy VARCHAR(100),
                sentByName VARCHAR(255),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_type (notificationType),
                INDEX idx_created (createdAt)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ All database tables created successfully!');
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
        throw error;
    }
}

export function getPool() {
    if (!pool) {
        throw new Error('Database pool not initialized. Call initDatabase() first.');
    }
    return pool;
}

export default { initDatabase, getPool };
