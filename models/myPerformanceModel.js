const db = require('../db');

const num = (v) => (v === null || v === undefined ? 0 : Number(v));

class MyPerformance {
  // Summary for the logged-in engineer. userId = req.user.id.
  static async getSummary(userId) {
    const empty = {
      assignments: { total: 0, completed: 0, active: 0 },
      timing: { avgResponseMinutes: 0, avgWorkMinutes: 0 },
      reviews: {
        count: 0,
        avgScore: 0,
        avgResolutionQuality: 0,
        avgResponseTimeScore: 0,
        avgCompletionTimeScore: 0,
        avgDiagnosis: 0,
        avgSafetyCompliance: 0,
      },
      overdueAssignments: 0,
      firstTimeRepairRate: 0,
    };

    const [engRows] = await db.query(
      'SELECT id FROM engineers WHERE user_id = ?',
      [userId],
    );
    if (engRows.length === 0) return empty;
    const engineerId = engRows[0].id;

    const [[counts]] = await db.query(
      `
      SELECT
        COUNT(*) AS total,
        SUM(status = 'completed') AS completed,
        SUM(status <> 'completed') AS active
      FROM assignments
      WHERE engineer_id = ?
      `,
      [engineerId],
    );

    const [[timing]] = await db.query(
      `
      SELECT
        AVG(TIMESTAMPDIFF(MINUTE, assigned_at, accepted_at)) AS avg_response,
        AVG(TIMESTAMPDIFF(MINUTE, started_at, completed_at)) AS avg_work
      FROM assignments
      WHERE engineer_id = ?
        AND status = 'completed'
        AND assigned_at IS NOT NULL
        AND accepted_at IS NOT NULL
        AND started_at IS NOT NULL
        AND completed_at IS NOT NULL
      `,
      [engineerId],
    );

    const [[reviews]] = await db.query(
      `
      SELECT
        COUNT(id) AS review_count,
        AVG(overall_score) AS avg_score,
        AVG(resolution_quality) AS avg_resolution,
        AVG(response_time_score) AS avg_response,
        AVG(completion_time_score) AS avg_completion,
        AVG(diagnosis) AS avg_diagnosis,
        AVG(safety_compliance) AS avg_safety
      FROM performance_reviews
      WHERE engineer_id = ?
      `,
      [engineerId],
    );

    // Unfinished, not cancelled/rejected, assigned more than 24 hours ago.
    const [[overdue]] = await db.query(
      `
      SELECT COUNT(*) AS overdue
      FROM assignments
      WHERE engineer_id = ?
        AND status NOT IN ('completed', 'cancelled', 'rejected')
        AND assigned_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `,
      [engineerId],
    );

    // Completed jobs where the fault was never reassigned.
    const [[firstTime]] = await db.query(
      `
      SELECT COUNT(*) AS first_time
      FROM assignments a
      WHERE a.engineer_id = ?
        AND a.status = 'completed'
        AND (SELECT COUNT(*) FROM assignments x WHERE x.fault_id = a.fault_id) = 1
      `,
      [engineerId],
    );

    const completed = num(counts.completed);

    return {
      assignments: {
        total: num(counts.total),
        completed,
        active: num(counts.active),
      },
      timing: {
        avgResponseMinutes: Math.round(num(timing.avg_response)),
        avgWorkMinutes: Math.round(num(timing.avg_work)),
      },
      reviews: {
        count: num(reviews.review_count),
        avgScore: num(reviews.avg_score),
        avgResolutionQuality: num(reviews.avg_resolution),
        avgResponseTimeScore: num(reviews.avg_response),
        avgCompletionTimeScore: num(reviews.avg_completion),
        avgDiagnosis: num(reviews.avg_diagnosis),
        avgSafetyCompliance: num(reviews.avg_safety),
      },
      overdueAssignments: num(overdue.overdue),
      firstTimeRepairRate: completed
        ? Math.round((num(firstTime.first_time) / completed) * 1000) / 10
        : 0,
    };
  }

  // History grouped by month or quarter. period = 'monthly' | 'quarterly'.
  static async getHistory(userId, period) {
    const label =
      period === 'quarterly'
        ? "CONCAT(YEAR(pr.created_at), '-Q', QUARTER(pr.created_at))"
        : "DATE_FORMAT(pr.created_at, '%Y-%m')";

    const [rows] = await db.query(
      `
      SELECT
        ${label} AS period,
        COUNT(pr.id) AS reviews,
        AVG(pr.overall_score) AS avg_score,
        AVG(pr.response_time_score) AS avg_response_time_score,
        AVG(pr.completion_time_score) AS avg_completion_time_score,
        AVG(pr.safety_compliance) AS avg_safety_compliance
      FROM performance_reviews pr
      JOIN engineers e ON pr.engineer_id = e.id
      WHERE e.user_id = ?
      GROUP BY period
      ORDER BY period ASC
      `,
      [userId],
    );

    return rows.map((r) => ({
      period: r.period,
      reviews: num(r.reviews),
      avgScore: num(r.avg_score),
      avgResponseTimeScore: num(r.avg_response_time_score),
      avgCompletionTimeScore: num(r.avg_completion_time_score),
      avgSafetyCompliance: num(r.avg_safety_compliance),
    }));
  }
}

module.exports = MyPerformance;