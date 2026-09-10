const db = require('../db');

class Assignment {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,

        fault_id INT NOT NULL,

        engineer_id INT NOT NULL,

        assigned_by INT,

        status ENUM(
          'assigned',
          'accepted',
          'rejected',
          'in_progress',
          'completed',
          'cancelled'
        ) DEFAULT 'assigned',

        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        accepted_at TIMESTAMP NULL DEFAULT NULL,

        started_at TIMESTAMP NULL DEFAULT NULL,

        completed_at TIMESTAMP NULL DEFAULT NULL,

        notes TEXT,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (fault_id)
          REFERENCES faults(id)
          ON DELETE CASCADE,

        FOREIGN KEY (engineer_id)
          REFERENCES engineers(id)
          ON DELETE CASCADE,

        FOREIGN KEY (assigned_by)
          REFERENCES users(id)
          ON DELETE SET NULL
      )
    `;

    await db.query(sql);
  }

  static async findAll() {
    const [rows] = await db.query(`
      SELECT
        a.id,

        a.fault_id,
        f.fault_type,
        f.severity,

        a.engineer_id,
        u.name AS engineer_name,

        a.assigned_by,

        a.status,

        a.assigned_at,
        a.accepted_at,
        a.started_at,
        a.completed_at,

        a.notes,
        a.updated_at

      FROM assignments a

      JOIN faults f
        ON a.fault_id = f.id

      JOIN engineers e
        ON a.engineer_id = e.id

      JOIN users u
        ON e.user_id = u.id

      ORDER BY a.id DESC
    `);

    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT
        a.id,

        a.fault_id,
        f.fault_type,
        f.severity,

        a.engineer_id,
        u.name AS engineer_name,

        a.assigned_by,

        a.status,

        a.assigned_at,
        a.accepted_at,
        a.started_at,
        a.completed_at,

        a.notes

      FROM assignments a

      JOIN faults f
        ON a.fault_id = f.id

      JOIN engineers e
        ON a.engineer_id = e.id

      JOIN users u
        ON e.user_id = u.id

      WHERE a.id = ?
      `,
      [id],
    );

    return rows[0];
  }

  static async create(assignmentData) {
    const { faultId, engineerId, assignedBy, notes } = assignmentData;

    const [result] = await db.query(
      `
      INSERT INTO assignments
      (
        fault_id,
        engineer_id,
        assigned_by,
        notes
      )
      VALUES (?, ?, ?, ?)
      `,
      [faultId, engineerId, assignedBy || null, notes || null],
    );

    // Change fault status to assigned
    await db.query(
      `
      UPDATE faults
      SET status = 'assigned'
      WHERE id = ?
      `,
      [faultId],
    );

    return this.findById(result.insertId);
  }

  static async updateStatus(id, status) {
    // ACCEPTED
    if (status === 'accepted') {
      await db.query(
        `
      UPDATE assignments
      SET
        status = 'accepted',
        accepted_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
        [id],
      );

      return this.findById(id);
    }

    // IN PROGRESS
    if (status === 'in_progress') {
      const [result] = await db.query(
        `
      UPDATE assignments
      SET
        status = 'in_progress',
        started_at = COALESCE(
          started_at,
          CURRENT_TIMESTAMP
        )
      WHERE id = ?
      `,
        [id],
      );

      if (result.affectedRows === 0) {
        return null;
      }

      // Get the fault connected to this assignment
      const assignment = await this.findById(id);

      // Update the fault
      await db.query(
        `
      UPDATE faults
      SET
        status = 'in_progress'
      WHERE id = ?
      `,
        [assignment.fault_id],
      );

      return this.findById(id);
    }

    // COMPLETED
    if (status === 'completed') {
      const [result] = await db.query(
        `
      UPDATE assignments
      SET
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
        [id],
      );

      if (result.affectedRows === 0) {
        return null;
      }

      // Get the fault connected to this assignment
      const assignment = await this.findById(id);

      // Update the fault
      await db.query(
        `
      UPDATE faults
      SET
        status = 'resolved',
        resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
        [assignment.fault_id],
      );

      // Make engineer available again
      await db.query(
        `
      UPDATE engineers
      SET
        availability = 'available'
      WHERE id = ?
      `,
        [assignment.engineer_id],
      );

      return this.findById(id);
    }

    // OTHER STATUSES
    const [result] = await db.query(
      `
    UPDATE assignments
    SET status = ?
    WHERE id = ?
    `,
      [status, id],
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return this.findById(id);
  }

  static async findByEngineerUserId(userId) {
    const [rows] = await db.query(
      `
    SELECT
      a.id AS assignment_id,
      a.engineer_id,
      a.fault_id,
      a.status AS assignment_status,

      f.fault_type,
      f.description,
      f.severity,
      f.status AS fault_status,

      s.site_code,
      s.site_name,
      s.address,
      s.status AS site_status,

      ST_Y(s.location) AS latitude,
      ST_X(s.location) AS longitude

    FROM assignments a

    JOIN engineers e
      ON a.engineer_id = e.id

    JOIN faults f
      ON a.fault_id = f.id

    JOIN sites s
      ON f.site_id = s.id

    WHERE e.user_id = ?

    ORDER BY a.id DESC
    `,
      [userId],
    );

    return rows;
  }
}

module.exports = Assignment;
