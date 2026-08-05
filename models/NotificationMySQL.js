import { getPool } from '../config/database.js';

function requirePool() {
    const pool = getPool();
    if (!pool) throw new Error('MySQL database is not available. Please ensure MySQL/Laragon is running.');
    return pool;
}
import { v4 as uuidv4 } from 'uuid';

class NotificationMySQL {
    /**
     * Create a new notification record
     */
    static async create(notificationData) {
        const pool = requirePool();
        const connection = await pool.getConnection();
        try {
            const id = uuidv4();
            const {
                subject,
                message,
                notificationType,
                recipientType,
                barangay,
                totalRecipients,
                emailSent,
                smsSent,
                failed,
                status,
                sentBy,
                sentByName
            } = notificationData;

            const query = `
                INSERT INTO notifications (
                    id, subject, message, notificationType, recipientType, 
                    barangay, totalRecipients, emailSent, smsSent, failed, 
                    status, sentBy, sentByName, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;

            await connection.execute(query, [
                id,
                subject,
                message,
                notificationType,
                recipientType,
                barangay || null,
                totalRecipients || 0,
                emailSent || 0,
                smsSent || 0,
                failed || 0,
                status || 'sent',
                sentBy || null,
                sentByName || null
            ]);

            return { success: true, id };
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get all notifications (recent first)
     */
    static async findAll(limit = 50) {
        try {
            const pool = requirePool();
            const connection = await pool.getConnection();
            try {
                // Ensure limit is an integer
                const limitInt = parseInt(limit) || 50;
                
                const query = `
                    SELECT * FROM notifications 
                    ORDER BY createdAt DESC 
                    LIMIT ${limitInt}
                `;
                const [rows] = await connection.execute(query);
                return rows;
            } catch (error) {
                console.error('Error executing query:', error);
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Error getting pool or connection:', error);
            throw error;
        }
    }

    /**
     * Get notification by ID
     */
    static async findById(id) {
        const pool = requirePool();
        const connection = await pool.getConnection();
        try {
            const query = 'SELECT * FROM notifications WHERE id = ?';
            const [rows] = await connection.execute(query, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error fetching notification:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get notifications by type
     */
    static async findByType(notificationType) {
        const pool = requirePool();
        const connection = await pool.getConnection();
        try {
            const query = `
                SELECT * FROM notifications 
                WHERE notificationType = ? 
                ORDER BY createdAt DESC
            `;
            const [rows] = await connection.execute(query, [notificationType]);
            return rows;
        } catch (error) {
            console.error('Error fetching notifications by type:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get notifications for a specific farmer (by barangay)
     * Returns notifications sent to "all" farmers or to the farmer's specific barangay
     */
    static async findForFarmer(barangay, limit = 20) {
        const pool = requirePool();
        const connection = await pool.getConnection();
        try {
            const limitInt = parseInt(limit) || 20;
            const query = `
                SELECT * FROM notifications 
                WHERE recipientType = 'all' 
                   OR (recipientType = 'barangay' AND barangay = ?)
                ORDER BY createdAt DESC 
                LIMIT ${limitInt}
            `;
            const [rows] = await connection.execute(query, [barangay]);
            return rows;
        } catch (error) {
            console.error('Error fetching farmer notifications:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get notifications by date range
     */
    static async findByDateRange(startDate, endDate) {
        const pool = requirePool();
        const connection = await pool.getConnection();
        try {
            const query = `
                SELECT * FROM notifications 
                WHERE createdAt BETWEEN ? AND ? 
                ORDER BY createdAt DESC
            `;
            const [rows] = await connection.execute(query, [startDate, endDate]);
            return rows;
        } catch (error) {
            console.error('Error fetching notifications by date:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get notification statistics
     */
    static async getStats() {
        const pool = requirePool();
        const connection = await pool.getConnection();
        try {
            const query = `
                SELECT 
                    COUNT(*) as total,
                    SUM(totalRecipients) as totalRecipients,
                    SUM(emailSent) as totalEmailSent,
                    SUM(smsSent) as totalSmsSent,
                    SUM(failed) as totalFailed,
                    notificationType,
                    COUNT(*) as count
                FROM notifications 
                GROUP BY notificationType
            `;
            const [rows] = await connection.execute(query);
            return rows;
        } catch (error) {
            console.error('Error fetching notification stats:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Delete notification by ID
     */
    static async delete(id) {
        const pool = requirePool();
        const connection = await pool.getConnection();
        try {
            const query = 'DELETE FROM notifications WHERE id = ?';
            await connection.execute(query, [id]);
            return { success: true };
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
}

export default NotificationMySQL;


