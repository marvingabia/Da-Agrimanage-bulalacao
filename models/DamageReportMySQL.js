/*
    DA AgriManage - Damage Report Model (MySQL)
*/

import { getPool } from '../config/database.js';

function requirePool() {
    const pool = getPool();
    if (!pool) throw new Error('MySQL database is not available. Please ensure MySQL/Laragon is running.');
    return pool;
}

export class DamageReport {
    constructor(data) {
        Object.assign(this, data);
    }

    async save() {
        const pool = requirePool();
        try {
            if (!this.id) {
                this.id = `DMG-${Date.now()}`;
            }

            await pool.query(
                `INSERT INTO damage_reports (id, farmerId, farmerName, contactNumber, barangay, location, 
                 incidentDate, disasterType, cropType, cropStage, affectedArea, damagePercentage, 
                 estimatedLoss, damageDescription, additionalNotes, evidenceImages, status, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [this.id, this.farmerId, this.farmerName, this.contactNumber, this.barangay, this.location,
                 this.incidentDate, this.disasterType, this.cropType, this.cropStage, this.affectedArea,
                 this.damagePercentage, this.estimatedLoss, this.damageDescription, this.additionalNotes,
                 this.evidenceImages || null,
                 this.status || 'pending']
            );
            return this;
        } catch (error) {
            console.error('Error saving damage report:', error);
            throw error;
        }
    }

    static async findAll() {
        const pool = requirePool();
        try {
            const [rows] = await pool.query('SELECT * FROM damage_reports ORDER BY createdAt DESC');
            return rows.map(row => new DamageReport(row));
        } catch (error) {
            console.error('Error finding damage reports:', error);
            throw error;
        }
    }

    static async findById(id) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query('SELECT * FROM damage_reports WHERE id = ?', [id]);
            return rows.length > 0 ? new DamageReport(rows[0]) : null;
        } catch (error) {
            console.error('Error finding damage report by ID:', error);
            throw error;
        }
    }

    static async findByFarmer(farmerId) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(
                'SELECT * FROM damage_reports WHERE farmerId = ? ORDER BY createdAt DESC',
                [farmerId]
            );
            return rows.map(row => new DamageReport(row));
        } catch (error) {
            console.error('Error finding damage reports by farmer:', error);
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
            await pool.query(`UPDATE damage_reports SET ${fields.join(', ')} WHERE id = ?`, values);
            return await DamageReport.findById(id);
        } catch (error) {
            console.error('Error updating damage report:', error);
            throw error;
        }
    }

    async delete() {
        const pool = requirePool();
        try {
            await pool.query('DELETE FROM damage_reports WHERE id = ?', [this.id]);
            return true;
        } catch (error) {
            console.error('Error deleting damage report:', error);
            throw error;
        }
    }

    async updateStatus(status, verifiedBy, notes) {
        const pool = requirePool();
        try {
            await pool.query(
                `UPDATE damage_reports SET status = ?, verificationNotes = ?, verifiedBy = ?, verifiedAt = NOW(), updatedAt = NOW() WHERE id = ?`,
                [status, notes, verifiedBy, this.id]
            );
            this.status = status;
            return this;
        } catch (error) {
            console.error('Error updating damage report status:', error);
            throw error;
        }
    }

    static async getStats() {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(`SELECT status, COUNT(*) as count FROM damage_reports GROUP BY status`);
            const stats = { total: 0, pending: 0, verified: 0, rejected: 0 };
            rows.forEach(r => { stats[r.status] = r.count; stats.total += r.count; });
            return stats;
        } catch (error) {
            console.error('Error getting damage report stats:', error);
            throw error;
        }
    }
}

export default DamageReport;


