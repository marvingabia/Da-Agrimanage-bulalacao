/*
    DA AgriManage - Request Letter Model (MySQL)
*/

import { getPool } from '../config/database.js';

function requirePool() {
    const pool = getPool();
    if (!pool) throw new Error('MySQL database is not available. Please ensure MySQL/Laragon is running.');
    return pool;
}

export class RequestLetter {
    constructor(data) {
        Object.assign(this, data);
    }

    async save() {
        const pool = requirePool();
        try {
            if (!this.id) {
                this.id = `REQ-${Date.now()}`;
            }

            await pool.query(
                `INSERT INTO request_letters (id, farmerId, farmerName, farmerEmail, barangay, requestType, 
                 subject, message, priority, contactNumber, status, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [this.id, this.farmerId, this.farmerName, this.farmerEmail, this.barangay, this.requestType,
                 this.subject, this.message, this.priority || 'normal', this.contactNumber, this.status || 'pending']
            );
            return this;
        } catch (error) {
            console.error('Error saving request letter:', error);
            throw error;
        }
    }

    async respond(response, respondedBy, status, actionTaken) {
        const pool = requirePool();
        try {
            await pool.query(
                `UPDATE request_letters SET response = ?, respondedBy = ?, respondedAt = NOW(), 
                 status = ?, actionTaken = ?, updatedAt = NOW() WHERE id = ?`,
                [response, respondedBy, status || 'responded', actionTaken, this.id]
            );
            this.response = response;
            this.respondedBy = respondedBy;
            this.status = status || 'responded';
            this.actionTaken = actionTaken;
            return this;
        } catch (error) {
            console.error('Error responding to request:', error);
            throw error;
        }
    }

    static async findAll() {
        const pool = requirePool();
        try {
            const [rows] = await pool.query('SELECT * FROM request_letters ORDER BY createdAt DESC');
            return rows.map(row => new RequestLetter(row));
        } catch (error) {
            console.error('Error finding request letters:', error);
            throw error;
        }
    }

    static async findById(id) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query('SELECT * FROM request_letters WHERE id = ?', [id]);
            return rows.length > 0 ? new RequestLetter(rows[0]) : null;
        } catch (error) {
            console.error('Error finding request letter by ID:', error);
            throw error;
        }
    }

    static async findByFarmer(farmerId) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(
                'SELECT * FROM request_letters WHERE farmerId = ? ORDER BY createdAt DESC',
                [farmerId]
            );
            return rows.map(row => new RequestLetter(row));
        } catch (error) {
            console.error('Error finding request letters by farmer:', error);
            throw error;
        }
    }

    static async create(data) {
        const request = new RequestLetter(data);
        return await request.save();
    }
}

export default RequestLetter;


