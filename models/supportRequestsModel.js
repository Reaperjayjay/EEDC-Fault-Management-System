const db = require('../db');

class SupportRequest {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS support_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,

        user_id INT NOT NULL,

        subject VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,

        status ENUM(
          'open',
          'in_progress',
          'resolved',
          'closed'
        ) DEFAULT 'open',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,

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
        subject,
        message,
        status,
        created_at,
        updated_at
      FROM support_requests
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId],
    );

    return rows;
  }

  static async create(requestData) {
    const { userId, subject, message } = requestData;

    const [result] = await db.query(
      `
      INSERT INTO support_requests (
        user_id,
        subject,
        message
      )
      VALUES (?, ?, ?)
      `,
      [userId, subject, message],
    );

    return result.insertId;
  }

  static async updateStatus(id, status) {
    const [result] = await db.query(
      `
      UPDATE support_requests
      SET status = ?
      WHERE id = ?
      `,
      [status, id],
    );

    return result.affectedRows > 0;
  }
}

module.exports = SupportRequest;
