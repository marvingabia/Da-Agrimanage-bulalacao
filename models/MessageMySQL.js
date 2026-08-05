/*
    DA AgriManage - Message Model (MySQL)
    For admin-staff communication
*/

import { getPool } from '../config/database.js';

function requirePool() {
    const pool = getPool();
    if (!pool) throw new Error('MySQL database is not available. Please ensure MySQL/Laragon is running.');
    return pool;
}

export class Message {
    constructor(data) {
        this.id = data.id || `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.senderId = data.senderId;
        this.senderName = data.senderName;
        this.senderRole = data.senderRole;
        this.receiverId = data.receiverId;
        this.receiverName = data.receiverName;
        this.receiverRole = data.receiverRole;
        this.message = data.message;
        this.isRead = data.isRead || false;
        this.readAt = data.readAt || null;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    async save() {
        const pool = requirePool();
        try {
            await pool.query(
                `INSERT INTO messages (id, senderId, senderName, senderRole, receiverId, receiverName, receiverRole, message, isRead, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [this.id, this.senderId, this.senderName, this.senderRole, this.receiverId, this.receiverName, this.receiverRole, this.message, this.isRead]
            );
            console.log(`✅ Message saved: ${this.id}`);
            return this;
        } catch (error) {
            console.error('❌ Error saving message:', error);
            throw error;
        }
    }

    // Get conversation between two users
    static async getConversation(userId1, userId2) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(
                `SELECT * FROM messages 
                 WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
                 ORDER BY createdAt ASC`,
                [userId1, userId2, userId2, userId1]
            );
            return rows.map(row => new Message(row));
        } catch (error) {
            console.error('Error getting conversation:', error);
            throw error;
        }
    }

    // Get all conversations for a user (list of people they've chatted with)
    static async getUserConversations(userId) {
        const pool = requirePool();
        try {
            // Simplified query without complex subquery
            const [rows] = await pool.query(
                `SELECT DISTINCT 
                    CASE 
                        WHEN senderId = ? THEN receiverId 
                        ELSE senderId 
                    END as contactId,
                    CASE 
                        WHEN senderId = ? THEN receiverName 
                        ELSE senderName 
                    END as contactName,
                    CASE 
                        WHEN senderId = ? THEN receiverRole 
                        ELSE senderRole 
                    END as contactRole,
                    MAX(createdAt) as lastMessageTime
                 FROM messages 
                 WHERE senderId = ? OR receiverId = ?
                 GROUP BY contactId, contactName, contactRole
                 ORDER BY lastMessageTime DESC`,
                [userId, userId, userId, userId, userId]
            );
            
            // Get unread count separately for each contact
            for (let row of rows) {
                const [unreadRows] = await pool.query(
                    `SELECT COUNT(*) as count FROM messages 
                     WHERE receiverId = ? AND senderId = ? AND isRead = FALSE`,
                    [userId, row.contactId]
                );
                row.unreadCount = unreadRows[0].count;
            }
            
            return rows;
        } catch (error) {
            console.error('Error getting user conversations:', error);
            throw error;
        }
    }

    // Mark messages as read
    static async markAsRead(senderId, receiverId) {
        const pool = requirePool();
        try {
            await pool.query(
                `UPDATE messages SET isRead = TRUE, readAt = NOW() 
                 WHERE senderId = ? AND receiverId = ? AND isRead = FALSE`,
                [senderId, receiverId]
            );
            return true;
        } catch (error) {
            console.error('Error marking messages as read:', error);
            throw error;
        }
    }

    // Get unread count for a user
    static async getUnreadCount(userId) {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(
                `SELECT COUNT(*) as count FROM messages WHERE receiverId = ? AND isRead = FALSE`,
                [userId]
            );
            return rows[0].count;
        } catch (error) {
            console.error('Error getting unread count:', error);
            throw error;
        }
    }

    // Get all staff for admin to message
    static async getStaffList() {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(
                `SELECT id, name, email, barangay FROM users WHERE role = 'staff' AND isApproved = TRUE ORDER BY name ASC`
            );
            return rows;
        } catch (error) {
            console.error('Error getting staff list:', error);
            throw error;
        }
    }

    // Get all admins for staff to message
    static async getAdminList() {
        const pool = requirePool();
        try {
            const [rows] = await pool.query(
                `SELECT id, name, email FROM users WHERE role = 'admin' ORDER BY name ASC`
            );
            return rows;
        } catch (error) {
            console.error('Error getting admin list:', error);
            throw error;
        }
    }
}

export default Message;


