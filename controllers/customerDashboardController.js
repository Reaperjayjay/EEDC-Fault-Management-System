const catchAsync = require('../utils/catchAsync');
const db = require('../db');

exports.getCustomerDashboard = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;

  // 1. Get the customer's fault report statistics

  const [summaryRows] = await db.query(
    `SELECT
    COUNT(*) AS totalReports,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END)
      AS resolvedReports,
    COUNT(CASE
      WHEN status IN ('pending', 'assigned', 'in_progress')
      THEN 1
    END) AS activeReports
  FROM faults
  WHERE reported_by = ?`,
    [customerId],
  );

  // 2. Get the customer's most recent fault reports
  const [reports] = await db.query(
    `
    SELECT
      f.id,
      f.site_id,
      s.site_code,
      s.site_name,
      s.location,
      f.fault_type,
      f.description,
      f.severity,
      f.status,
      f.detected_latitude,
      f.detected_longitude,
      f.reported_at,
      f.resolved_at

    FROM faults f

    JOIN sites s
      ON f.site_id = s.id

    WHERE f.reported_by = ?

    ORDER BY f.reported_at DESC
    LIMIT 5
    `,
    [customerId],
  );

  // 3. Return the dashboard information
  res.status(200).json({
    status: 'success',
    data: {
      summary: summaryRows[0],
      recentFaultReports: reports,
    },
  });
});
