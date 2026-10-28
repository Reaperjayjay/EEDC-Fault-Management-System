const db = require('../db');

// Read-only queries for the admin "Engineer Performance" page.
// (Your existing PerformanceReview model is not changed.)

// Builds the WHERE part for an optional date range on the review date.
function buildFilter(from, to) {
  const conditions = [];
  const params = [];

  if (from) {
    conditions.push('pr.created_at >= ?');
    params.push(`${from} 00:00:00`);
  }

  if (to) {
    // "to" is inclusive: include the whole last day.
    conditions.push('pr.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(to);
  }

  return { params, where: conditions.length ? conditions.join(' AND ') : '' };
}

class PerformanceReport {
  // Numbers for the four summary cards.
  static async getOverview({ from, to } = {}) {
    const { where, params } = buildFilter(from, to);

    const [rows] = await db.query(
      `
      SELECT
        COUNT(DISTINCT pr.engineer_id) AS total_reviewed,
        COALESCE(AVG(pr.overall_score), 0) AS avg_score,
        COUNT(pr.id) AS reviews,
        COUNT(DISTINCT pr.assignment_id) AS completed_jobs
      FROM performance_reviews pr
      ${where ? `WHERE ${where}` : ''}
      `,
      params,
    );

    return rows[0];
  }

  // Completed assignments that have no review yet and have every timestamp the
  // review calculation needs (assigned, accepted, started and completed).
  static async findReviewableAssignments() {
    const [rows] = await db.query(`
      SELECT
        a.id,
        a.fault_id,
        a.engineer_id,
        a.assigned_at,
        a.accepted_at,
        a.started_at,
        a.completed_at,
        f.fault_type,
        f.severity,
        s.site_name,
        u.name AS engineer_name
      FROM assignments a
      JOIN faults f
        ON a.fault_id = f.id
      JOIN sites s
        ON f.site_id = s.id
      JOIN engineers e
        ON a.engineer_id = e.id
      JOIN users u
        ON e.user_id = u.id
      LEFT JOIN performance_reviews pr
        ON pr.assignment_id = a.id
      WHERE a.status = 'completed'
        AND pr.id IS NULL
        AND a.assigned_at IS NOT NULL
        AND a.accepted_at IS NOT NULL
        AND a.started_at IS NOT NULL
        AND a.completed_at IS NOT NULL
      ORDER BY a.completed_at DESC
    `);

    return rows;
  }

  // One row per engineer who has at least one review in the period.
  static async getEngineersSummary({ from, to } = {}) {
    const { where, params } = buildFilter(from, to);

    const [rows] = await db.query(
      `
      SELECT
        e.id,
        u.name,
        COUNT(pr.id) AS review_count,
        COUNT(DISTINCT pr.assignment_id) AS jobs_completed,
        AVG(pr.overall_score) AS avg_score,
        AVG(pr.response_time_score) AS avg_response_score,
        AVG(pr.safety_compliance) AS avg_safety_score
      FROM performance_reviews pr
      JOIN engineers e
        ON pr.engineer_id = e.id
      JOIN users u
        ON e.user_id = u.id
      ${where ? `WHERE ${where}` : ''}
      GROUP BY e.id, u.id, u.name
      ORDER BY avg_score DESC
      `,
      params,
    );

    return rows;
  }

  // One engineer with every review in the period, newest first.
  static async getEngineerDetails(engineerId, { from, to } = {}) {
    const [engineerRows] = await db.query(
      `
      SELECT e.id, u.name
      FROM engineers e
      JOIN users u
        ON e.user_id = u.id
      WHERE e.id = ?
      `,
      [engineerId],
    );

    if (engineerRows.length === 0) return null;

    const { where, params } = buildFilter(from, to);

    const [reviews] = await db.query(
      `
      SELECT
        pr.id,
        pr.assignment_id,
        a.fault_id,
        pr.created_at,
        pr.resolution_quality,
        pr.response_time_score,
        pr.completion_time_score,
        pr.diagnosis,
        pr.safety_compliance,
        pr.overall_score,
        pr.response_time_minutes,
        pr.work_duration_minutes,
        pr.comments,
        reviewer.name AS reviewer_name
      FROM performance_reviews pr
      JOIN assignments a
        ON pr.assignment_id = a.id
      JOIN users reviewer
        ON pr.reviewed_by = reviewer.id
      WHERE pr.engineer_id = ?
      ${where ? `AND ${where}` : ''}
      ORDER BY pr.created_at DESC, pr.id DESC
      `,
      [engineerId, ...params],
    );

    return { ...engineerRows[0], reviews };
  }
}

module.exports = PerformanceReport;
