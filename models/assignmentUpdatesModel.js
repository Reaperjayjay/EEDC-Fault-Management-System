const db = require('../db');

class AssignmentUpdate {
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS assignment_updates (
        id INT AUTO_INCREMENT PRIMARY KEY,

        assignment_id INT NOT NULL,

        engineer_id INT NOT NULL,

        status ENUM(
          'accepted',
          'in_progress',
          'arrived',
          'inspecting',
          'fault_identified',
          'repairing',
          'testing',
          'completed'
        ) NOT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (assignment_id)
          REFERENCES assignments(id)
          ON DELETE CASCADE,

        FOREIGN KEY (engineer_id)
          REFERENCES engineers(id)
          ON DELETE CASCADE
      )
    `;

    await db.query(sql);
  }

  // Get all progress updates
  static async findAll() {
    const [rows] = await db.query(`
      SELECT
        au.id,
        au.assignment_id,
        au.engineer_id,
        u.name AS engineer_name,
        au.status,
        au.created_at

      FROM assignment_updates au

      JOIN engineers e
        ON au.engineer_id = e.id

      JOIN users u
        ON e.user_id = u.id

      ORDER BY au.id DESC
    `);

    return rows;
  }

  // Get one progress update
  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT
        au.id,
        au.assignment_id,
        au.engineer_id,
        u.name AS engineer_name,
        au.status,
        au.created_at

      FROM assignment_updates au

      JOIN engineers e
        ON au.engineer_id = e.id

      JOIN users u
        ON e.user_id = u.id

      WHERE au.id = ?
      `,
      [id],
    );

    return rows[0];
  }

  static async create(updateData) {
    const { assignmentId, engineerId, status } = updateData;

    // Check assignment exists
    const [assignmentRows] = await db.query(
      `
    SELECT
      id,
      fault_id,
      engineer_id,
      status
    FROM assignments
    WHERE id = ?
    `,
      [assignmentId],
    );

    if (assignmentRows.length === 0) {
      throw new Error('Assignment not found');
    }

    const assignment = assignmentRows[0];

    // Make sure this engineer owns the assignment
    if (assignment.engineer_id !== Number(engineerId)) {
      throw new Error('You are not assigned to this job');
    }

    // Check status
    const allowedStatuses = [
      'accepted',
      'in_progress',
      'arrived',
      'inspecting',
      'fault_identified',
      'repairing',
      'testing',
      'completed',
    ];

    if (!allowedStatuses.includes(status)) {
      throw new Error('Invalid progress status');
    }

    // Create progress record
    const [result] = await db.query(
      `
    INSERT INTO assignment_updates
    (
      assignment_id,
      engineer_id,
      status
    )
    VALUES (?, ?, ?)
    `,
      [assignmentId, engineerId, status],
    );

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
        [assignmentId],
      );
    }

    // IN PROGRESS
    if (
      status === 'in_progress' ||
      status === 'arrived' ||
      status === 'inspecting' ||
      status === 'fault_identified' ||
      status === 'repairing' ||
      status === 'testing'
    ) {
      await db.query(
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
        [assignmentId],
      );

      // Update fault status
      await db.query(
        `
      UPDATE faults
      SET status = 'in_progress'
      WHERE id = ?
      `,
        [assignment.fault_id],
      );
    }

    // COMPLETED
    if (status === 'completed') {
      await db.query(
        `
      UPDATE assignments
      SET
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
        [assignmentId],
      );

      // Update fault to resolved
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

      // Make the site active again
      await db.query(
        `
    UPDATE sites
    SET
      status = 'active'
    WHERE id = (
      SELECT site_id
      FROM faults
      WHERE id = ?
    )
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
        [engineerId],
      );
    }

    return this.findById(result.insertId);
  }

  // Get all updates for one assignment
  static async findByAssignmentId(assignmentId) {
    const [rows] = await db.query(
      `
      SELECT
        au.id,
        au.assignment_id,
        au.engineer_id,
        u.name AS engineer_name,
        au.status,
        au.created_at

      FROM assignment_updates au

      JOIN engineers e
        ON au.engineer_id = e.id

      JOIN users u
        ON e.user_id = u.id

      WHERE au.assignment_id = ?

      ORDER BY au.id ASC
      `,
      [assignmentId],
    );

    return rows;
  }
}

module.exports = AssignmentUpdate;
