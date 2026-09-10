const db = require('../db');

class Engineer {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS engineers (
        id INT AUTO_INCREMENT PRIMARY KEY,

        user_id INT NOT NULL UNIQUE,

        specialization ENUM(
          'substation',
          'feeder',
          'transformer',
          'distribution',
          'general'
        ) DEFAULT 'general',

        phone VARCHAR(20),

        latitude DECIMAL(10, 7),
        longitude DECIMAL(10, 7),

        availability ENUM(
          'available',
          'busy',
          'offline'
        ) DEFAULT 'offline',

        performance_rating DECIMAL(3, 2) DEFAULT 0.00,

        completed_jobs INT DEFAULT 0,

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

  static async findAll() {
    const [rows] = await db.query(`
      SELECT
        e.id,
        e.user_id,
        u.name,
        u.email,
        e.specialization,
        e.phone,
        e.latitude,
        e.longitude,
        e.availability,
        e.performance_rating,
        e.completed_jobs,
        e.created_at,
        e.updated_at
      FROM engineers e
      JOIN users u
        ON e.user_id = u.id
      ORDER BY e.id DESC
    `);

    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT
        e.id,
        e.user_id,
        u.name,
        u.email,
        e.specialization,
        e.phone,
        e.latitude,
        e.longitude,
        e.availability,
        e.performance_rating,
        e.completed_jobs,
        e.created_at,
        e.updated_at
      FROM engineers e
      JOIN users u
        ON e.user_id = u.id
      WHERE e.id = ?
      `,
      [id],
    );

    return rows[0];
  }

  static async create(engineerData) {
    const { userId, specialization, phone, latitude, longitude, availability } =
      engineerData;

    const [result] = await db.query(
      `
      INSERT INTO engineers
      (
        user_id,
        specialization,
        phone,
        latitude,
        longitude,
        availability
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        specialization || 'general',
        phone || null,
        latitude || null,
        longitude || null,
        availability || 'offline',
      ],
    );

    return this.findById(result.insertId);
  }

  static async update(id, engineerData) {
    const allowedFields = {
      specialization: 'specialization',
      phone: 'phone',
      latitude: 'latitude',
      longitude: 'longitude',
      availability: 'availability',
      performanceRating: 'performance_rating',
      completedJobs: 'completed_jobs',
    };

    const updates = [];
    const values = [];

    Object.entries(engineerData).forEach(([key, value]) => {
      if (allowedFields[key] && value !== undefined && value !== null) {
        updates.push(`${allowedFields[key]} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return null;
    }

    values.push(id);

    await db.query(
      `
      UPDATE engineers
      SET ${updates.join(', ')}
      WHERE id = ?
      `,
      values,
    );

    return this.findById(id);
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM engineers WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return null;
    }

    return true;
  }

  static async findByUserId(userId) {
    const [rows] = await db.query(
      `
    SELECT
      e.id,
      e.user_id,
      u.name,
      u.email,
      e.specialization,
      e.phone,
      e.latitude,
      e.longitude,
      e.availability,
      e.performance_rating,
      e.completed_jobs,
      e.created_at,
      e.updated_at
    FROM engineers e
    JOIN users u
      ON e.user_id = u.id
    WHERE e.user_id = ?
    `,
      [userId],
    );

    return rows[0];
  }
}

module.exports = Engineer;
