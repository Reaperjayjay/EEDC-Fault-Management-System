const db = require('../db');

// Returns the first value that is not undefined or null, otherwise null.
// (Replaces the ?? operator so older ESLint parser settings don't complain.)
const firstDefined = (...values) => {
  const found = values.find((value) => value !== undefined && value !== null);
  return found === undefined ? null : found;
};

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
      reporter.name AS reported_by_name,

      f.fault_type,
      f.description,
      f.severity,
      f.status,

      f.detected_latitude,
      f.detected_longitude,

      f.reported_at,
      f.resolved_at,
      f.updated_at,

      a.id AS assignment_id,
      a.engineer_id,
      engineer_user.name AS engineer_name,
      a.status AS assignment_status

    FROM faults f

    JOIN sites s
      ON f.site_id = s.id

    LEFT JOIN users reporter
      ON f.reported_by = reporter.id

    LEFT JOIN assignments a
      ON a.id = (
        SELECT MAX(a2.id)
        FROM assignments a2
        WHERE a2.fault_id = f.id
      )

    LEFT JOIN engineers e
      ON a.engineer_id = e.id

    LEFT JOIN users engineer_user
      ON e.user_id = engineer_user.id

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

  // NEW: the fault's coordinates. Uses the detected position,
  // and falls back to the site's position if none was recorded.
  static async getCoordinates(id) {
    const [rows] = await db.query(
      `
      SELECT
        COALESCE(f.detected_latitude, ST_Y(s.location)) AS latitude,
        COALESCE(f.detected_longitude, ST_X(s.location)) AS longitude
      FROM faults f
      JOIN sites s ON f.site_id = s.id
      WHERE f.id = ?
      `,
      [id],
    );

    return rows[0] || null;
  }

  static async create(faultData) {
    // Accept both camelCase and snake_case keys from the request body.
    // Reading properties (faultData.site_id) avoids declaring snake_case
    // variables, so the ESLint camelcase rule has nothing to complain about.
    const siteId = firstDefined(faultData.site_id, faultData.siteId);
    const siteCode = firstDefined(faultData.site_code, faultData.siteCode);
    const faultType = firstDefined(faultData.fault_type, faultData.faultType);
    const { description, severity } = faultData;
    const detectedLatitude = firstDefined(
      faultData.detected_latitude,
      faultData.detectedLatitude,
    );
    const detectedLongitude = firstDefined(
      faultData.detected_longitude,
      faultData.detectedLongitude,
    );
    const reportedBy = firstDefined(
      faultData.reportedBy,
      faultData.reported_by,
    );

    // Accept a numeric site ID or look up a site by its site code.
    let siteIdToUse = siteId;

    if (siteIdToUse == null || siteIdToUse === '') {
      const codeToUse = siteCode;

      if (!codeToUse) {
        throw new Error('A valid site_id or site_code is required');
      }

      const [siteRows] = await db.query(
        `SELECT id FROM sites WHERE site_code = ? LIMIT 1`,
        [codeToUse],
      );

      if (siteRows.length === 0) {
        throw new Error('Site not found');
      }

      siteIdToUse = siteRows[0].id;
    }

    // Verify that the selected site exists.
    const [siteRows] = await db.query(
      `SELECT id FROM sites WHERE id = ? LIMIT 1`,
      [siteIdToUse],
    );

    if (siteRows.length === 0) {
      throw new Error('Site not found');
    }

    const [result] = await db.query(
      `
    INSERT INTO faults (
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
        siteIdToUse,
        reportedBy,
        faultType,
        description || null,
        severity || 'medium',
        detectedLatitude,
        detectedLongitude,
      ],
    );

    // Mark the site as under maintenance.
    await db.query(`UPDATE sites SET status = 'maintenance' WHERE id = ?`, [
      siteIdToUse,
    ]);

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

  static async findByReporter(userId) {
    const [rows] = await db.query(
      `
    SELECT
      f.id,
      f.site_id,
      s.site_code,
      s.site_name,
      s.location,
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
    JOIN sites s ON f.site_id = s.id
    LEFT JOIN users u ON f.reported_by = u.id
    WHERE f.reported_by = ?
    ORDER BY f.reported_at DESC
    `,
      [userId],
    );

    return rows;
  }
}

module.exports = Fault;
