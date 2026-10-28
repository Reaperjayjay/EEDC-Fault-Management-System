const db = require('../db');

class CustomerNotification {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS customer_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,

        user_id INT NOT NULL,

        title VARCHAR(150) NOT NULL,
        message TEXT NOT NULL,

        notification_type ENUM(
          'fault_update',
          'outage',
          'assignment',
          'general'
        ) DEFAULT 'general',

        is_read BOOLEAN DEFAULT FALSE,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      )
    `;

    await db.query(sql);
  }

  static async findByUserId(userId) {
    const [rows] = await db.query(
      `
      SELECT
        id,
        user_id,
        title,
        message,
        notification_type,
        is_read,
        created_at
      FROM customer_notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId],
    );

    return rows;
  }

  static async create(notificationData) {
    const {
      userId,
      title,
      message,
      notificationType = 'general',
    } = notificationData;

    const [result] = await db.query(
      `
      INSERT INTO customer_notifications
        (user_id, title, message, notification_type)
      VALUES (?, ?, ?, ?)
      `,
      [userId, title, message, notificationType],
    );

    return result.insertId;
  }

  static async markAsRead(id, userId) {
    const [result] = await db.query(
      `
      UPDATE customer_notifications
      SET is_read = TRUE
      WHERE id = ? AND user_id = ?
      `,
      [id, userId],
    );

    return result.affectedRows > 0;
  }
}

module.exports = CustomerNotification;
