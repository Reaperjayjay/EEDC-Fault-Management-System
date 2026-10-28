const db = require('../db');

class EngineerDashboard {
  static async getDashboard(userId) {
    // 1. Find the engineer belonging to the logged-in user.
    const [engineerRows] = await db.query(
      `
      SELECT
        e.id AS engineer_id,
        e.user_id,
        u.name,
        u.email,
        e.phone,
        e.specialization,
        e.latitude,
        e.longitude,
        e.availability,
        e.performance_rating,
        e.completed_jobs
      FROM engineers e
      JOIN users u ON u.id = e.user_id
      WHERE e.user_id = ?
      LIMIT 1
      `,
      [userId],
    );

    if (engineerRows.length === 0) {
      throw new Error('No engineer profile is linked to this account.');
    }

    const engineer = engineerRows[0];
    const engineerId = engineer.engineer_id;

    // 2. Retrieve this engineer's assignments and related faults/sites.
    const [assignments] = await db.query(
      `
      SELECT
        a.id AS assignment_id,
        a.fault_id,
        a.status AS assignment_status,
        a.assigned_at,
        a.accepted_at,
        a.started_at,
        a.completed_at,
        a.notes,

        f.fault_type,
        f.description,
        f.severity,
        f.status AS fault_status,
        f.reported_at,
        f.resolved_at,
        f.detected_latitude,
        f.detected_longitude,

        s.id AS site_id,
        s.site_code,
        s.site_name,
        s.address,
        ST_Y(s.location) AS site_latitude,
        ST_X(s.location) AS site_longitude,
        s.status AS site_status

      FROM assignments a
      JOIN faults f ON f.id = a.fault_id
      JOIN sites s ON s.id = f.site_id
      WHERE a.engineer_id = ?
      ORDER BY a.assigned_at DESC
      `,
      [engineerId],
    );

    // 3. Calculate live assignment statistics.
    const totalAssignments = assignments.length;

    const completedAssignments = assignments.filter(
      (a) => a.assignment_status === 'completed',
    ).length;

    const inProgressAssignments = assignments.filter(
      (a) => a.assignment_status === 'in_progress',
    ).length;

    const pendingAssignments = assignments.filter(
      (a) => a.assignment_status === 'assigned',
    ).length;

    const acceptedAssignments = assignments.filter(
      (a) => a.assignment_status === 'accepted',
    ).length;

    // 4. Calculate the average performance score from actual reviews.
    const [performanceRows] = await db.query(
      `
      SELECT
        COUNT(*) AS review_count,
        AVG(overall_score) AS average_score,
        AVG(response_time_minutes) AS average_response_minutes,
        AVG(work_duration_minutes) AS average_work_minutes
      FROM performance_reviews
      WHERE engineer_id = ?
      `,
      [engineerId],
    );

    const performance = performanceRows[0];
    const averageScore =
      performance.average_score == null
        ? null
        : Number(Number(performance.average_score).toFixed(2));

    // 5. Retrieve this engineer's latest performance reviews.
    const [reviews] = await db.query(
      `
      SELECT
        pr.id,
        pr.assignment_id,
        pr.overall_score,
        pr.resolution_quality,
        pr.response_time_score,
        pr.completion_time_score,
        pr.diagnosis,
        pr.safety_compliance,
        pr.comments,
        pr.created_at,
        f.fault_type,
        s.site_name
      FROM performance_reviews pr
      JOIN assignments a ON a.id = pr.assignment_id
      JOIN faults f ON f.id = a.fault_id
      JOIN sites s ON s.id = f.site_id
      WHERE pr.engineer_id = ?
      ORDER BY pr.created_at DESC
      LIMIT 10
      `,
      [engineerId],
    );

    // 6. Retrieve the latest recorded assignment activity.
    const [activity] = await db.query(
      `
      SELECT
        au.id,
        au.assignment_id,
        au.status,
        au.created_at,
        f.fault_type,
        s.site_name
      FROM assignment_updates au
      JOIN assignments a ON a.id = au.assignment_id
      JOIN faults f ON f.id = a.fault_id
      JOIN sites s ON s.id = f.site_id
      WHERE au.engineer_id = ?
      ORDER BY au.created_at DESC
      LIMIT 10
      `,
      [engineerId],
    );

    // 7. Return all dashboard data in one object.
    return {
      engineer,

      stats: {
        totalAssignments,
        pendingAssignments,
        acceptedAssignments,
        inProgressAssignments,
        completedAssignments,
        completionRate:
          totalAssignments === 0
            ? 0
            : Number(
                ((completedAssignments / totalAssignments) * 100).toFixed(1),
              ),
      },

      performance: {
        reviewCount: Number(performance.review_count || 0),
        averageScore,
        averageResponseMinutes:
          performance.average_response_minutes == null
            ? null
            : Number(Number(performance.average_response_minutes).toFixed(1)),
        averageWorkMinutes:
          performance.average_work_minutes == null
            ? null
            : Number(Number(performance.average_work_minutes).toFixed(1)),
      },

      assignments,
      reviews,
      activity,
    };
  }
}

module.exports = EngineerDashboard;
