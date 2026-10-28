const db = require('../db');

// Queries for the admin "Engineer Management" page.
// An "engineer" here is a user whose role is "engineer" (see PATCH /users/:id/role)
// together with their row in the engineers table.

const ENGINEER_SELECT = `
  SELECT
    e.id,
    e.user_id,
    u.name,
    u.email,
    COALESCE(NULLIF(e.phone, ''), u.phone) AS phone,
    u.role,
    u.active,
    e.specialization,
    e.experience_years,
    e.availability,
    e.performance_rating,
    e.completed_jobs,
    e.latitude,
    e.longitude,
    e.updated_at AS last_updated,
    (
      SELECT AVG(pr.safety_compliance)
      FROM performance_reviews pr
      WHERE pr.engineer_id = e.id
    ) AS avg_safety,
    (
      SELECT COUNT(*)
      FROM assignments a
      WHERE a.engineer_id = e.id
        AND a.status NOT IN ('rejected', 'cancelled', 'completed')
    ) AS active_assignments
  FROM engineers e
  JOIN users u
    ON e.user_id = u.id
`;

class EngineerManagement {
  // Every user with the engineer role must have a row in the engineers table.
  // This creates any missing rows (for example right after a role change).
  static async ensureEngineerRows() {
    await db.query(`
      INSERT IGNORE INTO engineers (user_id, phone)
      SELECT id, phone FROM users WHERE role = 'engineer'
    `);
  }

  // All engineers (users whose role is currently "engineer").
  static async findAllEngineers() {
    await this.ensureEngineerRows();

    const [rows] = await db.query(`
      ${ENGINEER_SELECT}
      WHERE u.role = 'engineer'
      ORDER BY u.name
    `);

    return rows;
  }

  static async findOneEngineer(id) {
    const [rows] = await db.query(
      `
      ${ENGINEER_SELECT}
      WHERE e.id = ?
      `,
      [id],
    );

    return rows[0] || null;
  }

  // Every user, for the "Change role" picker. Never includes passwords or tokens.
  static async findUsers() {
    const [rows] = await db.query(`
      SELECT id, name, email, phone, role, active
      FROM users
      ORDER BY name
    `);

    return rows;
  }

  // All assignments of one engineer, newest first.
  static async findAssignments(engineerId) {
    const [rows] = await db.query(
      `
      SELECT
        a.id,
        a.fault_id,
        a.status,
        a.assigned_at,
        a.completed_at,
        f.fault_type,
        s.site_name
      FROM assignments a
      JOIN faults f
        ON a.fault_id = f.id
      JOIN sites s
        ON f.site_id = s.id
      WHERE a.engineer_id = ?
      ORDER BY a.id DESC
      `,
      [engineerId],
    );

    return rows;
  }

  static async countLiveAssignments(engineerId) {
    const [rows] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM assignments
      WHERE engineer_id = ?
        AND status NOT IN ('rejected', 'cancelled', 'completed')
      `,
      [engineerId],
    );

    return Number(rows[0].total);
  }

  // Activates or deactivates the engineer's account (users.active).
  // A deactivated engineer is also set to offline.
  static async setAccountActive(engineerId, active) {
    await db.query(
      `
      UPDATE users u
      JOIN engineers e
        ON e.user_id = u.id
      SET u.active = ?
      WHERE e.id = ?
      `,
      [active ? 1 : 0, engineerId],
    );

    if (!active) {
      await db.query(
        `UPDATE engineers SET availability = 'offline' WHERE id = ?`,
        [engineerId],
      );
    }
  }
}

module.exports = EngineerManagement;
