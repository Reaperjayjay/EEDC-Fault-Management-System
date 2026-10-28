const db = require('../db');
const { scoreWithModel } = require('../utils/AIranker');
const { getSpecializationsForFault } = require('../utils/faultSpecialization');
const {
  WEIGHTS,
  GENERAL_WEIGHTS,
  scoreEngineer,
  scoreGeneral,
} = require('../utils/Engineerscoring');

// Engineers further than this from the fault are not eligible.
// Override with MAX_ENGINEER_DISTANCE_KM in config.env.
const MAX_DISTANCE_KM = Number(process.env.MAX_ENGINEER_DISTANCE_KM) || 100;

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// An engineer with no known distance (no coordinates) is not excluded here.
const isWithinRange = (distanceKm) => {
  const distance = toNumberOrNull(distanceKm);
  return distance === null || distance <= MAX_DISTANCE_KM;
};

// Replaces each engineer's match_score with the PyTorch model's score when the
// ranking service is available. The formula score is kept as formula_score, and
// ranked_by says which one was used ("pytorch" or "formula").
// model_eligible is false when the AI service refuses to score the engineer
// (specialization not accepted for this fault type).
async function applyModelScores(engineers, faultType, severity) {
  const result = await scoreWithModel(
    engineers.map((engineer) => ({
      id: engineer.id,
      specialization: engineer.specialization,
      distance_km: toNumberOrNull(engineer.distance_km),
      performance_rating: toNumberOrNull(engineer.performance_rating) || 0,
      experience_years: toNumberOrNull(engineer.experience_years) || 0,
      completed_jobs: toNumberOrNull(engineer.completed_jobs) || 0,
    })),
    { faultType, severity },
  );

  if (!result) {
    return engineers.map((engineer) => ({ ...engineer, ranked_by: 'formula' }));
  }

  return engineers.map((engineer, index) => {
    const score = result.scores[index];

    // null = the AI service says this engineer is not eligible for this fault
    if (score === null) {
      return { ...engineer, ranked_by: 'formula', model_eligible: false };
    }

    return {
      ...engineer,
      formula_score: engineer.match_score,
      match_score: score,
      ranked_by: 'pytorch',
      model_eligible: true,
      model_version: result.model_version,
    };
  });
}

class Engineer {
  // Create the engineers table if it does not already exist
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS engineers (
        id INT AUTO_INCREMENT PRIMARY KEY,

        user_id INT NOT NULL UNIQUE,

        specialization ENUM(
          'substation',
          'feeder',
          'transformer',
          'distribution',
          'general'
        ) DEFAULT 'general',

        experience_years INT UNSIGNED NOT NULL DEFAULT 0,

        phone VARCHAR(20),

        latitude DECIMAL(10, 7),
        longitude DECIMAL(10, 7),

        availability ENUM(
          'available',
          'busy',
          'offline'
        ) DEFAULT 'offline',

        performance_rating DECIMAL(3, 2) DEFAULT 0.00,

        completed_jobs INT DEFAULT 0,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      )
    `;

    await db.query(sql);
  }

  // Get all engineers
  static async findAll() {
    const [rows] = await db.query(`
      SELECT
        e.id,
        e.user_id,
        u.name,
        u.email,
        e.specialization,
        e.experience_years,
        e.phone,
        e.latitude,
        e.longitude,
        e.availability,
        e.performance_rating,
        e.completed_jobs,
        e.created_at,
        e.updated_at
      FROM engineers e
      JOIN users u
        ON e.user_id = u.id
      ORDER BY e.id DESC
    `);

    return rows;
  }

  // Get one engineer by engineer ID
  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT
        e.id,
        e.user_id,
        u.name,
        u.email,
        e.specialization,
        e.experience_years,
        e.phone,
        e.latitude,
        e.longitude,
        e.availability,
        e.performance_rating,
        e.completed_jobs,
        e.created_at,
        e.updated_at
      FROM engineers e
      JOIN users u
        ON e.user_id = u.id
      WHERE e.id = ?
      `,
      [id],
    );

    return rows[0] || null;
  }

  // Create a new engineer
  static async create(engineerData) {
    const {
      userId,
      specialization,
      experienceYears,
      phone,
      latitude,
      longitude,
      availability,
    } = engineerData;

    // Avoids the ?? operator so older ESLint parser settings don't choke.
    // Unlike ||, these checks keep legitimate 0 values.
    const safeExperienceYears =
      experienceYears !== undefined && experienceYears !== null
        ? experienceYears
        : 0;
    const safeLatitude =
      latitude !== undefined && latitude !== null ? latitude : null;
    const safeLongitude =
      longitude !== undefined && longitude !== null ? longitude : null;

    const [result] = await db.query(
      `
      INSERT INTO engineers (
        user_id,
        specialization,
        experience_years,
        phone,
        latitude,
        longitude,
        availability
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        specialization || 'general',
        safeExperienceYears,
        phone || null,
        safeLatitude,
        safeLongitude,
        availability || 'offline',
      ],
    );

    return this.findById(result.insertId);
  }

  // Update engineer details
  static async update(id, engineerData) {
    const allowedFields = {
      specialization: 'specialization',
      experienceYears: 'experience_years',
      phone: 'phone',
      latitude: 'latitude',
      longitude: 'longitude',
      availability: 'availability',
      performanceRating: 'performance_rating',
      completedJobs: 'completed_jobs',
    };

    const updates = [];
    const values = [];

    Object.entries(engineerData).forEach(([key, value]) => {
      if (
        Object.prototype.hasOwnProperty.call(allowedFields, key) &&
        value !== undefined &&
        value !== null
      ) {
        updates.push(`${allowedFields[key]} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    await db.query(
      `
      UPDATE engineers
      SET ${updates.join(', ')}
      WHERE id = ?
      `,
      values,
    );

    // The phone number is stored twice: engineers.phone and users.phone.
    // Keep the user's account phone in sync (an empty value never erases it).
    const newPhone = engineerData.phone;
    if (
      newPhone !== undefined &&
      newPhone !== null &&
      String(newPhone).trim() !== ''
    ) {
      await db.query(
        `
        UPDATE users u
        JOIN engineers e
          ON e.user_id = u.id
        SET u.phone = ?
        WHERE e.id = ?
        `,
        [String(newPhone).trim(), id],
      );
    }

    return this.findById(id);
  }

  // Delete an engineer
  static async delete(id) {
    const [result] = await db.query('DELETE FROM engineers WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return null;
    }

    return true;
  }

  // Find an engineer using the associated user ID
  static async findByUserId(userId) {
    const [rows] = await db.query(
      `
      SELECT
        e.id,
        e.user_id,
        u.name,
        u.email,
        e.specialization,
        e.experience_years,
        e.phone,
        e.latitude,
        e.longitude,
        e.availability,
        e.performance_rating,
        e.completed_jobs,
        e.created_at,
        e.updated_at
      FROM engineers e
      JOIN users u
        ON e.user_id = u.id
      WHERE e.user_id = ?
      `,
      [userId],
    );

    return rows[0] || null;
  }

  // NEW: makes sure a user has a row in the engineers table (safe to call twice).
  static async ensureForUser(userId) {
    // The new engineer row starts with the phone number from the user account.
    await db.query(
      'INSERT IGNORE INTO engineers (user_id, phone) SELECT id, phone FROM users WHERE id = ?',
      [userId],
    );

    return this.findByUserId(userId);
  }

  // Available engineers suited to a fault type, within range, ranked by a
  // 0-100 match score (specialization, distance, performance rating and
  // experience; see utils/Engineerscoring.js).
  static async findSuggestedForFault(
    faultType,
    latitude = null,
    longitude = null,
    severity = null,
  ) {
    const specs = getSpecializationsForFault(faultType);
    const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

    const distanceSql = hasCoords
      ? 'ROUND(ST_Distance_Sphere(POINT(e.longitude, e.latitude), POINT(?, ?)) / 1000, 2)'
      : 'NULL';

    // Placeholders appear in this order: best-match spec, [lng, lat], spec list
    const params = [specs[0]];
    if (hasCoords) params.push(longitude, latitude);
    params.push(specs);

    const [rows] = await db.query(
      `
      SELECT
        e.id,
        e.user_id,
        u.name,
        e.specialization,
        e.experience_years,
        e.latitude,
        e.longitude,
        e.performance_rating,
        e.completed_jobs,
        (e.specialization = ?) AS is_best_match,
        ${distanceSql} AS distance_km
      FROM engineers e
      JOIN users u ON e.user_id = u.id
      WHERE e.availability = 'available'
        AND u.role = 'engineer'
        AND u.active = 1
        AND e.specialization IN (?)
      ORDER BY
        is_best_match DESC,
        distance_km IS NULL,
        distance_km ASC,
        e.performance_rating DESC,
        e.experience_years DESC
      `,
      params,
    );

    // Drop engineers who are too far from the fault.
    const nearby = rows.filter((row) => isWithinRange(row.distance_km));

    // Score every engineer (0-100) with the formula first.
    const scored = nearby.map((row) => {
      const { matchScore, breakdown } = scoreEngineer(row, specs);
      return { ...row, match_score: matchScore, score_breakdown: breakdown };
    });

    // Then let the PyTorch model re-score them (when the service is available).
    // Engineers the model refuses to score are not eligible and are dropped.
    const ranked = (await applyModelScores(scored, faultType, severity)).filter(
      (engineer) => engineer.model_eligible !== false,
    );

    return ranked.sort((a, b) => b.match_score - a.match_score);
  }

  // Every engineer, ranked. With a fault type the score uses specialization,
  // distance, rating and experience; without one it uses rating and experience.
  // "Eligible" means: active, available, a fitting specialization (when a
  // fault is given) and within range. Eligible engineers always rank first.
  // With eligibleOnly = true, ineligible engineers are left out of the result.
  static async findRanked(
    faultType = null,
    latitude = null,
    longitude = null,
    severity = null,
    eligibleOnly = false,
  ) {
    const specs = faultType ? getSpecializationsForFault(faultType) : null;
    const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

    const distanceSql = hasCoords
      ? 'ROUND(ST_Distance_Sphere(POINT(e.longitude, e.latitude), POINT(?, ?)) / 1000, 2)'
      : 'NULL';
    const params = hasCoords ? [longitude, latitude] : [];

    const [rows] = await db.query(
      `
      SELECT
        e.id,
        e.user_id,
        u.name,
        u.email,
        e.specialization,
        e.experience_years,
        e.phone,
        e.latitude,
        e.longitude,
        e.availability,
        e.performance_rating,
        e.completed_jobs,
        u.active,
        ${distanceSql} AS distance_km
      FROM engineers e
      JOIN users u ON e.user_id = u.id
      WHERE u.role = 'engineer'
      `,
      params,
    );

    const scored = rows.map((row) => {
      const { matchScore, breakdown } = specs
        ? scoreEngineer(row, specs)
        : scoreGeneral(row);

      const isActive = Number(row.active) === 1;
      const isAvailable = isActive && row.availability === 'available';
      const fitsFault = !specs || specs.includes(row.specialization);
      const inRange = !specs || isWithinRange(row.distance_km);

      let reason = null;
      if (!isActive) {
        reason = 'Account is inactive';
      } else if (!isAvailable) {
        reason = `Engineer is ${row.availability}`;
      } else if (!fitsFault) {
        reason = 'Specialization does not fit this fault';
      } else if (!inRange) {
        reason = `Too far from the fault (over ${MAX_DISTANCE_KM} km)`;
      }

      return {
        ...row,
        is_eligible: isAvailable && fitsFault && inRange,
        ineligible_reason: reason,
        match_score: matchScore,
        score_breakdown: breakdown,
      };
    });

    // With a fault selected, the PyTorch model (when available) scores everyone.
    // Without a fault there is no fault_type to send, so the formula is used.
    const modelRanked = specs
      ? await applyModelScores(scored, faultType, severity)
      : scored.map((engineer) => ({ ...engineer, ranked_by: 'formula' }));

    // Engineers the AI refuses to score are not eligible for this fault.
    const ranked = modelRanked.map((engineer) => {
      if (engineer.model_eligible !== false) return engineer;

      return {
        ...engineer,
        is_eligible: false,
        ineligible_reason:
          engineer.ineligible_reason ||
          'Specialization not accepted by the AI ranker for this fault',
      };
    });

    ranked.sort(
      (a, b) =>
        Number(b.is_eligible) - Number(a.is_eligible) ||
        b.match_score - a.match_score,
    );

    const visible = eligibleOnly
      ? ranked.filter((engineer) => engineer.is_eligible)
      : ranked;

    return {
      weights: specs ? WEIGHTS : GENERAL_WEIGHTS,
      engineers: visible.map((engineer, index) => ({
        ...engineer,
        rank: index + 1,
      })),
    };
  }
}

module.exports = Engineer;
