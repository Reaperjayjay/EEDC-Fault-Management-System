-- Exports real training data from MySQL 8 (it needs window functions).
-- Run it, then save the result as real_training.csv with a header row.
--
-- One row per performance review. The target is the review's overall score:
-- how well the job actually went. The engineer's rating and job count are
-- calculated from reviews BEFORE this one, so the answer is never leaked
-- into the inputs.
--
-- Known gaps (see README.md): distance_km is empty because your database does
-- not record it when an assignment is made, and experience_years is the
-- engineer's current value.

WITH reviews AS (
  SELECT
    pr.id,
    pr.engineer_id,
    pr.assignment_id,
    pr.overall_score,
    AVG(pr.overall_score) OVER (
      PARTITION BY pr.engineer_id
      ORDER BY pr.created_at, pr.id
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ) AS prior_rating,
    COUNT(*) OVER (
      PARTITION BY pr.engineer_id
      ORDER BY pr.created_at, pr.id
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ) AS prior_jobs
  FROM performance_reviews pr
)
SELECT
  r.id AS review_id,
  f.fault_type,
  f.severity,
  e.specialization,
  e.experience_years,
  COALESCE(r.prior_rating, 0) AS performance_rating,
  r.prior_jobs AS completed_jobs,
  NULL AS distance_km,
  r.overall_score AS target
FROM reviews r
JOIN assignments a ON r.assignment_id = a.id
JOIN faults f ON a.fault_id = f.id
JOIN engineers e ON r.engineer_id = e.id
ORDER BY r.id;
