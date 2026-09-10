const db = require('../db');

class Fault {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS faults (
        id INT AUTO_INCREMENT PRIMARY KEY,

        site_id INT NOT NULL,

        reported_by INT,

        fault_type ENUM(
          'power_failure',
          'transformer_fault',
          'feeder_fault',
          'equipment_failure',
          'overheating',
          'voltage_problem',
          'other'
        ) NOT NULL,

        description TEXT,

        severity ENUM(
          'low',
          'medium',
          'high',
          'critical'
        ) DEFAULT 'medium',

        status ENUM(
          'pending',
          'assigned',
          'in_progress',
          'resolved',
          'cancelled'
        ) DEFAULT 'pending',

        detected_latitude DECIMAL(10, 7),

        detected_longitude DECIMAL(10, 7),

        reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        resolved_at TIMESTAMP NULL DEFAULT NULL,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (site_id)
          REFERENCES sites(id)
          ON DELETE CASCADE,

        FOREIGN KEY (reported_by)
          REFERENCES users(id)
          ON DELETE SET NULL
      )
    `;

    await db.query(sql);
  }

  static async findAll() {
    const [rows] = await db.query(`
      SELECT
        f.id,
        f.site_id,
        s.site_code,
        s.site_name,

        f.reported_by,
        u.name AS reported_by_name,

        f.fault_type,
        f.description,
        f.severity,
        f.status,

        f.detected_latitude,
        f.detected_longitude,

        f.reported_at,
        f.resolved_at,
        f.updated_at

      FROM faults f

      JOIN sites s
        ON f.site_id = s.id

      LEFT JOIN users u
        ON f.reported_by = u.id

      ORDER BY f.id DESC
    `);

    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT
        f.id,
        f.site_id,
        s.site_code,
        s.site_name,

        f.reported_by,
        u.name AS reported_by_name,

        f.fault_type,
        f.description,
        f.severity,
        f.status,

        f.detected_latitude,
        f.detected_longitude,

        f.reported_at,
        f.resolved_at,
        f.updated_at

      FROM faults f

      JOIN sites s
        ON f.site_id = s.id

      LEFT JOIN users u
        ON f.reported_by = u.id

      WHERE f.id = ?
      `,
      [id],
    );

    return rows[0];
  }

  static async create(faultData) {
    const {
      site_code: siteCode,
      faultType,
      description,
      severity,
      detectedLatitude,
      detectedLongitude,
      reportedBy,
    } = faultData;

    const [siteRows] = await db.query(
      `
    SELECT id
    FROM sites
    WHERE site_code = ?
    LIMIT 1
    `,
      [siteCode],
    );

    if (siteRows.length === 0) {
      throw new Error('Site not found');
    }

    const siteId = siteRows[0].id;

    const [result] = await db.query(
      `
    INSERT INTO faults
    (
      site_id,
      reported_by,
      fault_type,
      description,
      severity,
      detected_latitude,
      detected_longitude
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        siteId,
        reportedBy || null,
        faultType,
        description || null,
        severity || 'medium',
        detectedLatitude || null,
        detectedLongitude || null,
      ],
    );

    // Change site status to maintenance
    await db.query(
      `
    UPDATE sites
    SET status = 'maintenance'
    WHERE id = ?
    `,
      [siteId],
    );

    return this.findById(result.insertId);
  }

  static async updateStatus(id, status) {
    if (status === 'resolved') {
      await db.query(
        `
      UPDATE faults
      SET
        status = ?,
        resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
        [status, id],
      );
    } else {
      await db.query(
        `
      UPDATE faults
      SET status = ?
      WHERE id = ?
      `,
        [status, id],
      );
    }

    return this.findById(id);
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM faults WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return null;
    }

    return true;
  }
}

module.exports = Fault;
