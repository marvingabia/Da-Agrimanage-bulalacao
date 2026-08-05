/*
    DA AgriManage - Benefit Model (MySQL)
*/

import { getPool } from '../config/database.js';

function requirePool() {
    const pool = getPool();
    if (!pool) throw new Error('MySQL database is not available. Please ensure MySQL/Laragon is running.');
    return pool;
}

export class Benefit {
    constructor(data) {
        Object.assign(this, data);
    }

    async save() {
        const pool = requirePool();
        try {
            if (!this.id) {
                this.id = `BEN-${Date.now()}`;
            }

            console.log('💾 Saving benefit to database...');
            console.log('   ID:', this.id);
            console.log('   Farmer:', this.farmerName);
            console.log('   Benefit Type:', this.benefitType);
            console.log('   Item:', this.itemName);
            console.log('   Quantity:', this.quantity);
            console.log('   Status:', this.status || 'for_claim');

            // Try to insert with only required fields first
            try {
                const [result] = await pool.query(
                    `INSERT INTO benefits (id, farmerId, farmerName, farmerEmail, barangay, benefitType, 
                     itemName, quantity, unit, value, description, distributionDate, distributionLocation, 
                     notes, damageReportId, status, createdBy, createdByName, createdAt) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        this.id, 
                        this.farmerId, 
                        this.farmerName, 
                        this.farmerEmail, 
                        this.barangay, 
                        this.benefitType,
                        this.itemName, 
                        this.quantity, 
                        this.unit, 
                        this.value || null, 
                        this.description || null, 
                        this.distributionDate || null, 
                        this.distributionLocation || null, 
                        this.notes || null,
                        this.damageReportId || null, 
                        this.status || 'for_claim',
                        this.createdBy, 
                        this.createdByName
                    ]
                );
                
                console.log('✅ Database INSERT result:', result);
                console.log('   Affected rows:', result.affectedRows);
                
                return this;
            } catch (insertError) {
                // If insert fails, try with minimal fields (backward compatibility)
                console.warn('⚠️ Full insert failed, trying minimal fields...');
                console.warn('   Error:', insertError.message);
                
                const [result] = await pool.query(
                    `INSERT INTO benefits (id, farmerId, farmerName, farmerEmail, barangay, benefitType, 
                     itemName, quantity, unit, damageReportId, status, createdBy, createdByName, createdAt) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        this.id, 
                        this.farmerId, 
                        this.farmerName, 
                        this.farmerEmail, 
                        this.barangay, 
                        this.benefitType,
                        this.itemName, 
                        this.quantity, 
                        this.unit, 
                        this.damageReportId || null, 
                        this.status || 'for_claim',
                        this.createdBy, 
                        this.createdByName
                    ]
                );
                
                console.log('✅ Minimal insert successful');
                return this;
            }
        } catch (error) {
            console.error('❌ Error saving benefit to database:', error);
            console.error('   Error code:', error.code);
            console.error('   Error message:', error.message);
            console.error('   SQL State:', error.sqlState);
            console.error('   SQL Message:', error.sqlMessage);
            throw error;
        }
    }

    static async findAll() {
        const pool = requirePool();
        try {
            const [rows] = await pool.query('SELECT * FROM benefits ORDER BY createdAt DESC');
            return rows.map(row => new Benefit(row));
        } catch (error) {
            console.error('Error finding benefits:', error);
            throw error;
        }
    }

    static async findById(id) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query('SELECT * FROM benefits WHERE id = ?', [id]);
            return rows.length > 0 ? new Benefit(rows[0]) : null;
        } catch (error) {
            console.error('Error finding benefit by ID:', error);
            throw error;
        }
    }

    static async findByFarmer(farmerId) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(
                'SELECT * FROM benefits WHERE farmerId = ? ORDER BY createdAt DESC',
                [farmerId]
            );
            return rows.map(row => new Benefit(row));
        } catch (error) {
            console.error('Error finding benefits by farmer:', error);
            throw error;
        }
    }

    static async updateStatus(id, status) {
        const pool = requirePool();
        try {
            await pool.query(
                'UPDATE benefits SET status = ?, updatedAt = NOW() WHERE id = ?',
                [status, id]
            );
            return true;
        } catch (error) {
            console.error('Error updating benefit status:', error);
            throw error;
        }
    }

    static async markAsClaimed(id) {
        const pool = requirePool();
        try {
            await pool.query(
                'UPDATE benefits SET status = ?, claimedAt = NOW(), updatedAt = NOW() WHERE id = ?',
                ['claimed', id]
            );
            return true;
        } catch (error) {
            console.error('Error marking benefit as claimed:', error);
            throw error;
        }
    }

    static async update(id, data) {
        const pool = requirePool();
        try {
            const fields = [];
            const values = [];
            
            // Build dynamic update query
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(data[key]);
                }
            });
            
            // Add updatedAt
            fields.push('updatedAt = NOW()');
            
            // Add id for WHERE clause
            values.push(id);
            
            const query = `UPDATE benefits SET ${fields.join(', ')} WHERE id = ?`;
            
            console.log(`📝 Updating benefit ${id}:`, data);
            const [result] = await pool.query(query, values);
            console.log(`✅ Updated benefit ${id}:`, result.affectedRows, 'rows affected');
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating benefit:', error);
            throw error;
        }
    }
}

export default Benefit;

