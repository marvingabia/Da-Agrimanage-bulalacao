/*
    DA AgriManage - Inventory Model (MySQL)
*/

import { getPool } from '../config/database.js';

function requirePool() {
    const pool = getPool();
    if (!pool) throw new Error('MySQL database is not available. Please ensure MySQL/Laragon is running.');
    return pool;
}

export class Inventory {
    constructor(data) {
        Object.assign(this, data);
    }

    async save() {
        const pool = requirePool();
        try {
            if (!this.id) {
                this.id = `INV-${Date.now()}`;
            }

            console.log('💾 Saving inventory to database...');
            console.log('   ID:', this.id);
            console.log('   Item Name:', this.itemName);
            console.log('   Category:', this.category);
            console.log('   Quantity:', this.quantity);
            console.log('   Unit:', this.unit);
            console.log('   Location:', this.location);
            console.log('   Reorder Level:', this.reorderLevel);
            console.log('   Unit Cost:', this.unitCost);
            console.log('   Total Value:', this.totalValue);
            console.log('   Status:', this.status || 'available');

            const [result] = await pool.query(
                `INSERT INTO inventory (id, itemName, category, quantity, unit, description, 
                 reorderLevel, unitCost, totalValue, location, supplier, notes, status, 
                 createdBy, createdByName, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    this.id, 
                    this.itemName, 
                    this.category, 
                    this.quantity || 0, 
                    this.unit, 
                    this.description || null,
                    this.reorderLevel || 0,
                    this.unitCost || 0,
                    this.totalValue || 0,
                    this.location || null,
                    this.supplier || null,
                    this.notes || null,
                    this.status || 'available',
                    this.createdBy, 
                    this.createdByName
                ]
            );
            
            console.log('✅ Database INSERT result:', result);
            console.log('   Affected rows:', result.affectedRows);
            
            return this;
        } catch (error) {
            console.error('❌ Error saving inventory to database:', error);
            console.error('   Error code:', error.code);
            console.error('   Error message:', error.message);
            throw error;
        }
    }

    static async findAll() {
        const pool = requirePool();
        try {
            console.log('📡 Fetching all inventory from database...');
            const [rows] = await pool.query('SELECT * FROM inventory ORDER BY createdAt DESC');
            console.log(`✅ Found ${rows.length} inventory items in database`);
            if (rows.length > 0) {
                console.log('📋 First item:', rows[0].itemName, '(', rows[0].category, ')');
            }
            return rows.map(row => new Inventory(row));
        } catch (error) {
            console.error('❌ Error finding inventory:', error);
            throw error;
        }
    }

    static async findById(id) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query('SELECT * FROM inventory WHERE id = ?', [id]);
            return rows.length > 0 ? new Inventory(rows[0]) : null;
        } catch (error) {
            console.error('Error finding inventory by ID:', error);
            throw error;
        }
    }

    async delete() {
        const pool = requirePool();
        try {
            await pool.query('DELETE FROM inventory WHERE id = ?', [this.id]);
            return true;
        } catch (error) {
            console.error('Error deleting inventory item:', error);
            throw error;
        }
    }

    static async getStats() {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(`SELECT status, COUNT(*) as count FROM inventory GROUP BY status`);
            const stats = { total: 0, available: 0, low_stock: 0, out_of_stock: 0 };
            rows.forEach(r => { stats[r.status] = r.count; stats.total += r.count; });
            return stats;
        } catch (error) {
            console.error('Error getting inventory stats:', error);
            throw error;
        }
    }
}

export default Inventory;


