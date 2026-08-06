/*
    DA AgriManage - User Model (MySQL)
    Connects to phpMyAdmin MySQL Database
*/

import { getPool } from '../config/database.js';
import bcrypt from 'bcrypt';

function requirePool() {
    const pool = getPool();
    if (!pool) throw new Error('MySQL database is not available. Please ensure MySQL/Laragon is running.');
    return pool;
}

export class User {
    constructor(data) {
        this.id = data.id || null;
        this.name = data.name;
        this.email = data.email;
        this.password = data.password;
        this.role = data.role; // 'farmer', 'staff', 'admin'
        this.barangay = data.barangay;
        this.phone = data.phone;
        this.dob = data.dob; // Date of Birth
        this.staffingManagement = data.staffingManagement;
        this.authProvider = data.authProvider || 'email';
        this.isApproved = data.isApproved !== undefined ? data.isApproved : (data.role === 'staff' ? false : true);
        this.status = data.status || 'active';
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    async save() {
        const pool = requirePool();
        try {
            // Check if user already exists
            const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [this.id]);
            
            if (existing.length > 0) {
                // Update existing user
                console.log(`📝 Updating existing user: ${this.id}`);
                await pool.query(
                    `UPDATE users SET name = ?, email = ?, role = ?, barangay = ?, phone = ?, dob = ?,
                     staffingManagement = ?, isApproved = ?, updatedAt = NOW() WHERE id = ?`,
                    [this.name, this.email, this.role, this.barangay, this.phone, this.dob, this.staffingManagement, this.isApproved, this.id]
                );
            } else {
                if (!this.id) {
                    this.id = `USER-${Date.now()}`;
                }
                
                console.log(`✨ Creating new user in MySQL: ${this.id} (${this.email})`);
                
                // ── Safe migration: add missing columns only if they don't exist ──
                // Works on MySQL 5.7 and 8.x (no IF NOT EXISTS for ALTER TABLE)
                const missingColumns = [
                    { name: 'status',           def: "VARCHAR(50) DEFAULT 'active'" },
                    { name: 'suspensionStart',   def: 'TIMESTAMP NULL' },
                    { name: 'suspensionEnd',     def: 'TIMESTAMP NULL' },
                    { name: 'suspensionDuration',def: 'INT' },
                    { name: 'suspensionUnit',    def: 'VARCHAR(20)' },
                    { name: 'suspensionReason',  def: 'TEXT' },
                    { name: 'suspendedBy',       def: 'VARCHAR(255)' },
                    { name: 'suspendedByName',   def: 'VARCHAR(255)' },
                    { name: 'googleId',          def: 'VARCHAR(255)' },
                ];

                // Check which columns actually exist
                const [cols] = await pool.query(
                    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
                );
                const existingCols = new Set(cols.map(c => c.COLUMN_NAME));

                for (const col of missingColumns) {
                    if (!existingCols.has(col.name)) {
                        try {
                            await pool.query(`ALTER TABLE users ADD COLUMN \`${col.name}\` ${col.def}`);
                            console.log(`✅ Added missing column: ${col.name}`);
                        } catch (colErr) {
                            console.warn(`⚠️ Could not add column ${col.name}:`, colErr.message);
                        }
                    }
                }

                // Insert the new user
                await pool.query(
                    `INSERT INTO users (id, name, email, password, role, barangay, phone, dob, staffingManagement, authProvider, isApproved, status, createdAt) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [this.id, this.name, this.email, this.password, this.role, this.barangay, this.phone, this.dob, this.staffingManagement, this.authProvider, this.isApproved, this.status || 'active']
                );
                
                console.log(`✅ User saved to MySQL successfully: ${this.id}`);
            }
            return this;
        } catch (error) {
            console.error('❌ Error saving user to MySQL:', error.message);
            console.error('   User ID:', this.id);
            console.error('   Email:', this.email);
            throw error;
        }
    }

    static async findById(id) {
        const pool = requirePool();
        try {
            console.log(`🔍 UserMySQL.findById called with ID: "${id}"`);
            console.log(`   ID type: ${typeof id}`);
            console.log(`   ID length: ${id ? id.length : 'null'}`);
            
            const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
            
            console.log(`   Query result: ${rows.length} row(s) found`);
            
            if (rows.length > 0) {
                console.log(`   ✅ Found user: ${rows[0].name} (${rows[0].email})`);
            } else {
                console.log(`   ❌ No user found with ID: "${id}"`);
                
                // Debug: Show similar IDs
                const [similar] = await pool.query('SELECT id, name, email FROM users WHERE id LIKE ? LIMIT 5', [`%${id.substring(0, 10)}%`]);
                if (similar.length > 0) {
                    console.log(`   💡 Similar IDs in database:`);
                    similar.forEach(s => console.log(`      - ${s.id} (${s.name})`));
                }
            }
            
            return rows.length > 0 ? new User(rows[0]) : null;
        } catch (error) {
            console.error('❌ Error finding user by ID:', error);
            throw error;
        }
    }

    static async findByEmail(email) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
            console.log(`🔍 findByEmail(${email}): found ${rows.length} row(s)`);
            if (rows.length > 0) {
                console.log(`   Row data:`, JSON.stringify(rows[0]));
            } else {
                // Debug: show all users in DB
                const [allUsers] = await pool.query('SELECT id, name, email, role FROM users LIMIT 10');
                console.log(`   All users in DB (up to 10):`, JSON.stringify(allUsers));
            }
            return rows.length > 0 ? new User(rows[0]) : null;
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    }

    static async findByRole(role) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(
                'SELECT * FROM users WHERE role = ? ORDER BY createdAt DESC',
                [role]
            );
            return rows.map(row => new User(row));
        } catch (error) {
            console.error('Error finding users by role:', error);
            throw error;
        }
    }

    static async findPendingStaff() {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(
                'SELECT * FROM users WHERE role = ? AND (isApproved = 0 OR isApproved IS NULL) ORDER BY createdAt DESC',
                ['staff']
            );
            console.log(`📋 Found ${rows.length} pending staff in database (isApproved = 0 or NULL)`);
            if (rows.length > 0) {
                console.log(`   Pending staff: ${rows.map(r => `${r.name} (isApproved=${r.isApproved})`).join(', ')}`);
            }
            return rows.map(row => new User(row));
        } catch (error) {
            console.error('Error finding pending staff:', error);
            throw error;
        }
    }

    static async findAll() {
        const pool = requirePool();
        try {
            const [rows] = await pool.query('SELECT * FROM users ORDER BY createdAt DESC');
            return rows.map(row => new User(row));
        } catch (error) {
            console.error('Error finding all users:', error);
            throw error;
        }
    }

    async verifyPassword(password) {
        if (!this.password) return false;
        return await bcrypt.compare(password, this.password);
    }

    static async approveStaff(staffId) {
        const pool = requirePool();
        try {
            console.log(`💾 Updating database: Setting isApproved = 1 for staff ${staffId}`);
            const [result] = await pool.query(
                'UPDATE users SET isApproved = 1, updatedAt = NOW() WHERE id = ? AND role = ?',
                [staffId, 'staff']
            );
            console.log(`✅ Database updated: ${result.affectedRows} row(s) affected`);
            
            // Verify the update
            const [rows] = await pool.query(
                'SELECT id, name, email, isApproved FROM users WHERE id = ?',
                [staffId]
            );
            if (rows.length > 0) {
                console.log(`✅ Verified: ${rows[0].name} - isApproved = ${rows[0].isApproved}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error approving staff:', error);
            throw error;
        }
    }

    static async rejectStaff(staffId) {
        const pool = requirePool();
        try {
            await pool.query('DELETE FROM users WHERE id = ? AND role = ?', [staffId, 'staff']);
            return true;
        } catch (error) {
            console.error('Error rejecting staff:', error);
            throw error;
        }
    }

    static async suspendStaff(staffId, suspensionData) {
        const pool = requirePool();
        try {
            const { 
                status, 
                suspensionStart, 
                suspensionEnd, 
                suspensionDuration, 
                suspensionUnit, 
                suspensionReason,
                suspendedBy,
                suspendedByName
            } = suspensionData;
            
            await pool.query(
                `UPDATE users SET 
                    status = ?,
                    suspensionStart = ?,
                    suspensionEnd = ?,
                    suspensionDuration = ?,
                    suspensionUnit = ?,
                    suspensionReason = ?,
                    suspendedBy = ?,
                    suspendedByName = ?,
                    updatedAt = NOW()
                WHERE id = ? AND role = ?`,
                [
                    status,
                    suspensionStart,
                    suspensionEnd,
                    suspensionDuration,
                    suspensionUnit,
                    suspensionReason,
                    suspendedBy,
                    suspendedByName,
                    staffId,
                    'staff'
                ]
            );
            return true;
        } catch (error) {
            console.error('Error suspending staff:', error);
            throw error;
        }
    }

    // Update user (for staff CRUD)
    static async update(id, data) {
        const pool = requirePool();
        try {
            const { name, email, barangay, phone, dob } = data;
            
            const [result] = await pool.query(
                `UPDATE users SET name = ?, email = ?, barangay = ?, phone = ?, dob = ?, updatedAt = NOW() 
                 WHERE id = ?`,
                [name, email, barangay, phone, dob, id]
            );
            
            console.log(`✅ Updated user ${id}:`, result.affectedRows, 'rows affected');
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    // Delete user (for staff CRUD)
    static async delete(id) {
        const pool = requirePool();
        try {
            const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
            console.log(`✅ Deleted user ${id}:`, result.affectedRows, 'rows affected');
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    static async getStats() {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(`SELECT role, COUNT(*) as count FROM users GROUP BY role`);
            const stats = { total: 0, farmers: 0, staff: 0, admins: 0 };
            rows.forEach(r => {
                stats.total += Number(r.count);
                if (r.role === 'farmer') stats.farmers = Number(r.count);
                if (r.role === 'staff') stats.staff = Number(r.count);
                if (r.role === 'admin') stats.admins = Number(r.count);
            });
            return stats;
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    }
}

export default User;

