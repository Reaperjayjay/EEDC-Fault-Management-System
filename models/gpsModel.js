const db = require('../db');

class GPSModel {
  // Get active assignments belonging to the logged-in engineer
  static async getMyAssignments(userId) {
    const [rows] = await db.execute(
      `SELECT
      a.id AS assignment_id,
      a.fault_id,
      a.status AS assignment_status,
      f.severity,
      f.fault_type,
      f.description,
      s.site_name,
      s.address,
      ST_Y(s.location) AS site_latitude,
      ST_X(s.location) AS site_longitude,
      a.assigned_at AS assigned_at
   FROM assignments a
   INNER JOIN engineers e ON e.id = a.engineer_id
   INNER JOIN faults f ON f.id = a.fault_id
   INNER JOIN sites s ON s.id = f.site_id
   WHERE e.user_id = ?
     AND a.status NOT IN ('completed', 'cancelled')
   ORDER BY a.assigned_at DESC`,
      [userId],
    );

    return rows;
  }

  // Confirm an assignment belongs to the logged-in engineer
  static async findEngineerAssignment(assignmentId, userId) {
    const [rows] = await db.execute(
      `SELECT a.id
       FROM assignments a
       INNER JOIN engineers e ON e.id = a.engineer_id
       WHERE a.id = ? AND e.user_id = ?
       LIMIT 1`,
      [assignmentId, userId],
    );

    return rows[0] || null;
  }

  // Save the engineer's GPS location
  static async saveLocation(assignmentId, userId, latitude, longitude) {
    const [result] = await db.execute(
      `INSERT INTO engineer_locations
       (assignment_id, engineer_user_id, latitude, longitude, recorded_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [assignmentId, userId, latitude, longitude],
    );

    return result;
  }

  // Save the engineer's arrival at the site
  static async createCheckIn(assignmentId, userId, latitude, longitude, notes) {
    const [result] = await db.execute(
      `INSERT INTO assignment_checkins
       (assignment_id, engineer_user_id, latitude, longitude, notes, checked_in_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [assignmentId, userId, latitude, longitude, notes],
    );

    return result;
  }
}

module.exports = GPSModel;
