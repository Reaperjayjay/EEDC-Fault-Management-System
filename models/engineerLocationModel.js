const db = require('../db');

class EngineerLocation {
  static async createTable() {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS engineer_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assignment_id INT NOT NULL,
        engineer_user_id INT NOT NULL,
        latitude DECIMAL(10, 7) NOT NULL,
        longitude DECIMAL(10, 7) NOT NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_assignment_id (assignment_id),
        INDEX idx_engineer_user_id (engineer_user_id)
      )
    `);
  }

  static async create({ assignmentId, engineerUserId, latitude, longitude }) {
    const [result] = await db.execute(
      `INSERT INTO engineer_locations
       (assignment_id, engineer_user_id, latitude, longitude, recorded_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [assignmentId, engineerUserId, latitude, longitude],
    );

    return result;
  }

  static async findByAssignmentId(assignmentId) {
    const [rows] = await db.execute(
      `SELECT *
       FROM engineer_locations
       WHERE assignment_id = ?
       ORDER BY recorded_at DESC`,
      [assignmentId],
    );

    return rows;
  }
}

module.exports = EngineerLocation;
