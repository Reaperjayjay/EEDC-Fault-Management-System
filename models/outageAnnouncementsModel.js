const db = require('../db');

class OutageAnnouncement {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS outage_announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,

        title VARCHAR(200) NOT NULL,
        description TEXT,

        location VARCHAR(255) NOT NULL,

        outage_type ENUM(
          'planned_maintenance',
          'unplanned_outage',
          'restoration'
        ) NOT NULL,

        status ENUM(
          'scheduled',
          'ongoing',
          'restored',
          'cancelled'
        ) DEFAULT 'scheduled',

        start_time DATETIME NULL,
        expected_restoration DATETIME NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await db.query(sql);
  }

  static async findAll() {
    const [rows] = await db.query(
      `
      SELECT
        id,
        title,
        description,
        location,
        outage_type,
        status,
        start_time,
        expected_restoration,
        created_at,
        updated_at
      FROM outage_announcements
      ORDER BY created_at DESC
      `,
    );

    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT *
      FROM outage_announcements
      WHERE id = ?
      `,
      [id],
    );

    return rows[0] || null;
  }

  static async create(announcementData) {
    const {
      title,
      description,
      location,
      outageType,
      status = 'scheduled',
      startTime,
      expectedRestoration,
    } = announcementData;

    const [result] = await db.query(
      `
      INSERT INTO outage_announcements (
        title,
        description,
        location,
        outage_type,
        status,
        start_time,
        expected_restoration
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        description || null,
        location,
        outageType,
        status,
        startTime || null,
        expectedRestoration || null,
      ],
    );

    return this.findById(result.insertId);
  }
}

module.exports = OutageAnnouncement;
