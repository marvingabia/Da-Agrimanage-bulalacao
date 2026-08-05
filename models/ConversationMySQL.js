/*
    DA AgriManage - Conversation Model (MySQL)
    Admin-Staff Communication System
*/

import { getPool } from '../config/database.js';

function requirePool() {
    const pool = getPool();
    if (!pool) throw new Error('MySQL database is not available. Please ensure MySQL/Laragon is running.');
    return pool;
}

export class Conversation {
    constructor(data) {
        Object.assign(this, data);
    }

    async save() {
        const pool = requirePool();
        try {
            if (!this.id) {
                this.id = `MSG-${Date.now()}`;
            }

            await pool.query(
                `INSERT INTO conversations (id, senderId, senderName, senderRole, receiverId, 
                 receiverRole, message, isRead, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [this.id, this.senderId, this.senderName, this.senderRole, this.receiverId,
                 this.receiverRole, this.message, this.isRead || false]
            );
            return this;
        } catch (error) {
            console.error('Error saving conversation:', error);
            throw error;
        }
    }

    static async findAll() {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(
                'SELECT * FROM conversations ORDER BY createdAt DESC'
            );
            return rows.map(row => new Conversation(row));
        } catch (error) {
            console.error('Error finding conversations:', error);
            throw error;
        }
    }

    static async findById(id) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query('SELECT * FROM conversations WHERE id = ?', [id]);
            return rows.length > 0 ? new Conversation(rows[0]) : null;
        } catch (error) {
            console.error('Error finding conversation by ID:', error);
            throw error;
        }
    }

    static async findBySender(senderId) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(
                'SELECT * FROM conversations WHERE senderId = ? ORDER BY createdAt DESC',
                [senderId]
            );
            return rows.map(row => new Conversation(row));
        } catch (error) {
            console.error('Error finding conversations by sender:', error);
            throw error;
        }
    }

    static async findByReceiver(receiverId) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(
                'SELECT * FROM conversations WHERE receiverId = ? OR receiverId IS NULL ORDER BY createdAt DESC',
                [receiverId]
            );
            return rows.map(row => new Conversation(row));
        } catch (error) {
            console.error('Error finding conversations by receiver:', error);
            throw error;
        }
    }

    static async findConversation(userId1, userId2) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(
                `SELECT * FROM conversations 
                 WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
                 ORDER BY createdAt ASC`,
                [userId1, userId2, userId2, userId1]
            );
            return rows.map(row => new Conversation(row));
        } catch (error) {
            console.error('Error finding conversation:', error);
            throw error;
        }
    }

    static async markAsRead(id) {
        const pool = requirePool();
        try {
            await pool.query(
                'UPDATE conversations SET isRead = TRUE WHERE id = ?',
                [id]
            );
            return true;
        } catch (error) {
            console.error('Error marking conversation as read:', error);
            throw error;
        }
    }

    static async getUnreadCount(userId) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(
                'SELECT COUNT(*) as count FROM conversations WHERE receiverId = ? AND isRead = FALSE',
                [userId]
            );
            return rows[0].count;
        } catch (error) {
            console.error('Error getting unread count:', error);
            throw error;
        }
    }

    static async deleteMessage(id) {
        const pool = requirePool();
        try {
            await pool.query('DELETE FROM conversations WHERE id = ?', [id]);
            return true;
        } catch (error) {
            console.error('Error deleting conversation:', error);
            throw error;
        }
    }
}

export default Conversation;


