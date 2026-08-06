/*
    DA AgriManage - Insurance Model (MySQL)
*/

import { getPool } from '../config/database.js';

function requirePool() {
    const pool = getPool();
    if (!pool) throw new Error('MySQL database is not available. Please ensure MySQL/Laragon is running.');
    return pool;
}

export class Insurance {
    constructor(data) {
        Object.assign(this, data);
    }

    async save() {
        const pool = requirePool();
        try {
            if (!this.id) {
                this.id = `INS-${Date.now()}`;
            }

            await pool.query(
                `INSERT INTO insurance (id, farmerId, farmerName, barangay, contactNumber, farmLocation, 
                 cropType, cropVariety, insuredArea, totalFarmArea, plantingDate, expectedHarvestDate, 
                 insuranceType, coveragePeriod, premiumAmount, coverageAmount, additionalInfo, status, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [this.id, this.farmerId, this.farmerName, this.barangay, this.contactNumber, this.farmLocation,
                 this.cropType, this.cropVariety, this.insuredArea, this.totalFarmArea, this.plantingDate,
                 this.expectedHarvestDate, this.insuranceType, this.coveragePeriod, this.premiumAmount,
                 this.coverageAmount, this.additionalInfo, this.status || 'pending']
            );
            return this;
        } catch (error) {
            console.error('Error saving insurance:', error);
            throw error;
        }
    }

    static async findAll() {
        const pool = requirePool();
        try {
            const [rows] = await pool.query('SELECT * FROM insurance ORDER BY createdAt DESC');
            return rows.map(row => new Insurance(row));
        } catch (error) {
            console.error('Error finding insurance:', error);
            throw error;
        }
    }

    static async findById(id) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query('SELECT * FROM insurance WHERE id = ?', [id]);
            return rows.length > 0 ? new Insurance(rows[0]) : null;
        } catch (error) {
            console.error('Error finding insurance by ID:', error);
            throw error;
        }
    }

    static async findByFarmer(farmerId) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(
                'SELECT * FROM insurance WHERE farmerId = ? ORDER BY createdAt DESC',
                [farmerId]
            );
            return rows.map(row => new Insurance(row));
        } catch (error) {
            console.error('Error finding insurance by farmer:', error);
            throw error;
        }
    }

    static async update(id, data) {
        const pool = requirePool();
        try {
            const fields = [];
            const values = [];
            Object.keys(data).forEach(key => { fields.push(`${key} = ?`); values.push(data[key]); });
            values.push(id);
            await pool.query(`UPDATE insurance SET ${fields.join(', ')} WHERE id = ?`, values);
            return await Insurance.findById(id);
        } catch (error) {
            console.error('Error updating insurance:', error);
            throw error;
        }
    }

    async delete() {
        const pool = requirePool();
        try {
            await pool.query('DELETE FROM insurance WHERE id = ?', [this.id]);
            return true;
        } catch (error) {
            console.error('Error deleting insurance:', error);
            throw error;
        }
    }

    async updateStatus(status, approvedBy, notes, policyNumber) {
        const pool = requirePool();
        try {
            await pool.query(
                `UPDATE insurance SET status = ?, approvalNotes = ?, approvedBy = ?, approvedAt = NOW(), updatedAt = NOW() WHERE id = ?`,
                [status, notes, approvedBy, this.id]
            );
            this.status = status;
            return this;
        } catch (error) {
            console.error('Error updating insurance status:', error);
            throw error;
        }
    }

    generatePolicyNumber() {
        return `POL-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    }

    static async getStats() {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(`SELECT status, COUNT(*) as count FROM insurance GROUP BY status`);
            const stats = { total: 0, pending: 0, approved: 0, rejected: 0 };
            rows.forEach(r => { stats[r.status] = r.count; stats.total += r.count; });
            return stats;
        } catch (error) {
            console.error('Error getting insurance stats:', error);
            throw error;
        }
    }
}

export default Insurance;


