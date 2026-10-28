const db = require('../db');

class PerformanceReview {
  // CREATE TABLE
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS performance_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,


        assignment_id INT NOT NULL,
        engineer_id INT NOT NULL,
        reviewed_by INT NOT NULL,

        response_time_minutes DECIMAL(10,2),
        work_duration_minutes DECIMAL(10,2),

        resolution_quality DECIMAL(3,2) NOT NULL,
        response_time_score DECIMAL(3,2) NOT NULL,
        completion_time_score DECIMAL(3,2) NOT NULL,
        diagnosis DECIMAL(3,2) NOT NULL,
        safety_compliance DECIMAL(3,2) NOT NULL,

        overall_score DECIMAL(3,2) NOT NULL,

        comments TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (assignment_id)
          REFERENCES assignments(id)
          ON DELETE CASCADE,

        FOREIGN KEY (engineer_id)
          REFERENCES engineers(id)
          ON DELETE CASCADE,

        FOREIGN KEY (reviewed_by)
          REFERENCES users(id)
          ON DELETE CASCADE
      )
    `;

    await db.query(sql);
  }

  // GET ALL REVIEWS
  static async findAll() {
    const [rows] = await db.query(`
      SELECT
        pr.id,

        pr.assignment_id,

        pr.engineer_id,
        engineer_user.name AS engineer_name,

        pr.reviewed_by,
        reviewer.name AS reviewer_name,

        pr.response_time_minutes,
        pr.work_duration_minutes,

        pr.resolution_quality,
        pr.response_time_score,
        pr.completion_time_score,
        pr.diagnosis,
        pr.safety_compliance,

        pr.overall_score,

        pr.comments,
        pr.created_at

      FROM performance_reviews pr

      JOIN engineers e
        ON pr.engineer_id = e.id

      JOIN users engineer_user
        ON e.user_id = engineer_user.id

      JOIN users reviewer
        ON pr.reviewed_by = reviewer.id

      ORDER BY pr.id DESC
    `);

    return rows;
  }

  // GET ONE REVIEW
  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT
        pr.id,

        pr.assignment_id,

        pr.engineer_id,
        engineer_user.name AS engineer_name,

        pr.reviewed_by,
        reviewer.name AS reviewer_name,

        pr.response_time_minutes,
        pr.work_duration_minutes,

        pr.resolution_quality,
        pr.response_time_score,
        pr.completion_time_score,
        pr.diagnosis,
        pr.safety_compliance,

        pr.overall_score,

        pr.comments,
        pr.created_at

      FROM performance_reviews pr

      JOIN engineers e
        ON pr.engineer_id = e.id

      JOIN users engineer_user
        ON e.user_id = engineer_user.id

      JOIN users reviewer
        ON pr.reviewed_by = reviewer.id

      WHERE pr.id = ?
      `,
      [id],
    );

    return rows[0];
  }

  // CREATE PERFORMANCE REVIEW
  static async create(reviewData) {
    const {
      assignmentId,
      reviewedBy,
      resolutionQuality,
      diagnosis,
      safetyCompliance,
      comments,
    } = reviewData;

    // GET ASSIGNMENT
    const [assignmentRows] = await db.query(
      `
    SELECT
      id,
      engineer_id,
      status,
      assigned_at,
      accepted_at,
      started_at,
      completed_at
    FROM assignments
    WHERE id = ?
    `,
      [assignmentId],
    );

    if (assignmentRows.length === 0) {
      throw new Error('Assignment not found');
    }

    const assignment = assignmentRows[0];

    // GET ENGINEER FROM ASSIGNMENT
    const engineerId = assignment.engineer_id;

    // MAKE SURE JOB IS COMPLETED
    if (assignment.status !== 'completed') {
      throw new Error(
        'Assignment must be completed before creating a performance review',
      );
    }

    // MAKE SURE ALL TIMESTAMPS EXIST
    if (
      !assignment.assigned_at ||
      !assignment.accepted_at ||
      !assignment.started_at ||
      !assignment.completed_at
    ) {
      throw new Error('Assignment is missing required timestamps');
    }

    // CALCULATE RESPONSE TIME
    const assignedTime = new Date(assignment.assigned_at);
    const acceptedTime = new Date(assignment.accepted_at);

    const responseTimeMinutes = (acceptedTime - assignedTime) / (1000 * 60);

    // CALCULATE WORK DURATION
    const startedTime = new Date(assignment.started_at);
    const completedTime = new Date(assignment.completed_at);

    const workDurationMinutes = (completedTime - startedTime) / (1000 * 60);

    // RESPONSE TIME SCORE
    let responseTimeScore;

    if (responseTimeMinutes <= 15) {
      responseTimeScore = 5;
    } else if (responseTimeMinutes <= 30) {
      responseTimeScore = 4;
    } else if (responseTimeMinutes <= 60) {
      responseTimeScore = 3;
    } else if (responseTimeMinutes <= 120) {
      responseTimeScore = 2;
    } else {
      responseTimeScore = 1;
    }

    // COMPLETION TIME SCORE
    let completionTimeScore;

    if (workDurationMinutes <= 60) {
      completionTimeScore = 5;
    } else if (workDurationMinutes <= 120) {
      completionTimeScore = 4;
    } else if (workDurationMinutes <= 240) {
      completionTimeScore = 3;
    } else if (workDurationMinutes <= 480) {
      completionTimeScore = 2;
    } else {
      completionTimeScore = 1;
    }

    // CALCULATE OVERALL SCORE
    const overallScore =
      resolutionQuality * 0.3 +
      responseTimeScore * 0.2 +
      completionTimeScore * 0.25 +
      diagnosis * 0.15 +
      safetyCompliance * 0.1;

    // CREATE PERFORMANCE REVIEW
    const [result] = await db.query(
      `
    INSERT INTO performance_reviews
    (
      assignment_id,
      engineer_id,
      reviewed_by,

      response_time_minutes,
      work_duration_minutes,

      resolution_quality,
      response_time_score,
      completion_time_score,
      diagnosis,
      safety_compliance,

      overall_score,
      comments
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        assignmentId,
        engineerId,
        reviewedBy,

        responseTimeMinutes,
        workDurationMinutes,

        resolutionQuality,
        responseTimeScore,
        completionTimeScore,
        diagnosis,
        safetyCompliance,

        overallScore,
        comments || null,
      ],
    );

    // RECALCULATE ENGINEER'S OVERALL RATING
    const [ratingRows] = await db.query(
      `
    SELECT AVG(overall_score) AS average_rating
    FROM performance_reviews
    WHERE engineer_id = ?
    `,
      [engineerId],
    );

    const averageRating = ratingRows[0].average_rating || 0;

    // UPDATE ENGINEER PERFORMANCE
    await db.query(
      `
    UPDATE engineers
    SET
      performance_rating = ?,
      completed_jobs = (
        SELECT COUNT(*)
        FROM assignments
        WHERE engineer_id = ?
          AND status = 'completed'
      )
    WHERE id = ?
    `,
      [averageRating, engineerId, engineerId],
    );

    return this.findById(result.insertId);
  }

  // GET REVIEWS FOR ONE ENGINEER
  static async findByEngineerId(engineerId) {
    const [rows] = await db.query(
      `
      SELECT
        pr.id,
        pr.assignment_id,

        pr.engineer_id,
        engineer_user.name AS engineer_name,

        pr.response_time_minutes,
        pr.work_duration_minutes,

        pr.resolution_quality,
        pr.response_time_score,
        pr.completion_time_score,
        pr.diagnosis,
        pr.safety_compliance,

        pr.overall_score,

        pr.comments,
        pr.created_at

      FROM performance_reviews pr

      JOIN engineers e
        ON pr.engineer_id = e.id

      JOIN users engineer_user
        ON e.user_id = engineer_user.id

      WHERE pr.engineer_id = ?

      ORDER BY pr.id DESC
      `,
      [engineerId],
    );

    return rows;
  }

  // GET REVIEWS FOR THE LOGGED-IN ENGINEER
  static async findByEngineerUserId(userId) {
    const [rows] = await db.query(
      `
      SELECT
        pr.id,
        pr.assignment_id,
        pr.engineer_id,
        engineer_user.name AS engineer_name,
        pr.reviewed_by,
        reviewer.name AS reviewer_name,
        pr.response_time_minutes,
        pr.work_duration_minutes,
        pr.resolution_quality,
        pr.response_time_score,
        pr.completion_time_score,
        pr.diagnosis,
        pr.safety_compliance,
        pr.overall_score,
        pr.comments,
        pr.created_at
      FROM performance_reviews pr
      JOIN engineers e
        ON pr.engineer_id = e.id
      JOIN users engineer_user
        ON e.user_id = engineer_user.id
      JOIN users reviewer
        ON pr.reviewed_by = reviewer.id
      WHERE e.user_id = ?
      ORDER BY pr.created_at DESC
      `,
      [userId],
    );

    return rows;
  }

  // GET ENGINEER'S OVERALL PERFORMANCE SUMMARY
  static async getPerformanceSummaryByUserId(userId) {
    const [rows] = await db.query(
      `
    SELECT
      e.id AS engineer_id,
      u.name AS engineer_name,
      COUNT(pr.id) AS total_reviews,
      COALESCE(AVG(pr.overall_score), 0) AS average_score,
      COALESCE(MAX(pr.overall_score), 0) AS highest_score,
      COALESCE(MIN(pr.overall_score), 0) AS lowest_score,
      e.completed_jobs
    FROM engineers e
    JOIN users u
      ON e.user_id = u.id
    LEFT JOIN performance_reviews pr
      ON pr.engineer_id = e.id
    WHERE e.user_id = ?
    GROUP BY e.id, u.id, u.name, e.completed_jobs
    `,
      [userId],
    );

    return rows[0];
  }
}

module.exports = PerformanceReview;
