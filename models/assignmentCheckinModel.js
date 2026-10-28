const db = require('../db');

class AssignmentCheckin {
  static async createTable() {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS assignment_checkins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assignment_id INT NOT NULL,
        engineer_user_id INT NOT NULL,
        latitude DECIMAL(10, 7) NULL,
        longitude DECIMAL(10, 7) NULL,
        notes TEXT NULL,
        checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_assignment_id (assignment_id),
        INDEX idx_engineer_user_id (engineer_user_id)
      )
    `);
  }

  static async create({
    assignmentId,
    engineerUserId,
    latitude,
    longitude,
    notes,
  }) {
    const [result] = await db.execute(
      `INSERT INTO assignment_checkins
       (assignment_id, engineer_user_id, latitude, longitude, notes, checked_in_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        assignmentId,
        engineerUserId,
        latitude != null ? latitude : null,
        longitude != null ? longitude : null,
        notes != null ? notes : null,
      ],
    );

    return result;
  }

  static async findByAssignmentId(assignmentId) {
    const [rows] = await db.execute(
      `SELECT *
       FROM assignment_checkins
       WHERE assignment_id = ?
       ORDER BY checked_in_at DESC`,
      [assignmentId],
    );

    return rows;
  }
}

module.exports = AssignmentCheckin;
