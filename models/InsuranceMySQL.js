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
            
            // Build dynamic update query
            Object.keys(data).forEach(key => {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            });
            
            values.push(id);
            
            await pool.query(
                `UPDATE insurance SET ${fields.join(', ')} WHERE id = ?`,
                values
            );
            
            return await Insurance.findById(id);
        } catch (error) {
            console.error('Error updating insurance:', error);
            throw error;
        }
    }
}

export default Insurance;


