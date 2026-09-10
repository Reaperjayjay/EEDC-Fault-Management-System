const db = require('../db');

class Site {
  // ============================================================
  // CREATE TABLE
  // ============================================================
  static async createTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS sites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        site_code VARCHAR(50) NOT NULL UNIQUE,
        site_name VARCHAR(150) NOT NULL,
        address VARCHAR(255),
        location POINT NOT NULL,
        site_type ENUM(
          'substation',
          'feeder',
          'transformer',
          'distribution'
        ),
        status ENUM(
          'active',
          'inactive',
          'maintenance'
        ) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,
        SPATIAL INDEX idx_site_location (location)
      )
    `);
  }

  // ============================================================
  // GET ALL SITES
  // ============================================================
  static async findAll(queryObj, sort, fields, limit, skip) {
    queryObj = queryObj || {};

    const allowedFields = {
      id: 'id',

      siteCode: 'site_code',
      site_code: 'site_code',

      siteName: 'site_name',
      site_name: 'site_name',

      address: 'address',

      siteType: 'site_type',
      site_type: 'site_type',

      status: 'status',

      createdAt: 'created_at',
      created_at: 'created_at',

      updatedAt: 'updated_at',
      updated_at: 'updated_at',
    };

    // ----------------------------------------------------------
    // SELECT
    // ----------------------------------------------------------

    let selectedFields = `
      id,
      site_code,
      site_name,
      address,
      ST_Y(location) AS latitude,
      ST_X(location) AS longitude,
      site_type,
      status,
      created_at,
      updated_at
    `;

    if (fields) {
      const fieldList = fields
        .split(',')
        .map((field) => field.trim())
        .filter(
          (field) =>
            allowedFields[field] ||
            field === 'latitude' ||
            field === 'longitude',
        );

      if (fieldList.length > 0) {
        selectedFields = fieldList
          .map((field) => {
            if (field === 'latitude') {
              return 'ST_Y(location) AS latitude';
            }

            if (field === 'longitude') {
              return 'ST_X(location) AS longitude';
            }

            return allowedFields[field];
          })
          .join(', ');
      }
    }

    let sql = `SELECT ${selectedFields} FROM sites`;

    const conditions = [];
    const values = [];

    // ----------------------------------------------------------
    // FILTERING
    // ----------------------------------------------------------

    Object.entries(queryObj).forEach(([key, value]) => {
      // Operators such as:
      // latitude[gte]
      // status[eq]
      // siteType[eq]

      if (
        typeof value === 'object' &&
        value !== null &&
        value.operator &&
        value.value !== undefined
      ) {
        const operators = {
          gte: '>=',
          gt: '>',
          lte: '<=',
          lt: '<',
          eq: '=',
        };

        let column;

        if (key === 'latitude') {
          column = 'ST_Y(location)';
        } else if (key === 'longitude') {
          column = 'ST_X(location)';
        } else {
          column = allowedFields[key];
        }

        if (column && operators[value.operator]) {
          conditions.push(`${column} ${operators[value.operator]} ?`);

          values.push(value.value);
        }

        return;
      }

      // Normal filtering
      if (value !== '') {
        let column;

        if (key === 'latitude') {
          column = 'ST_Y(location)';
        } else if (key === 'longitude') {
          column = 'ST_X(location)';
        } else {
          column = allowedFields[key];
        }

        if (column) {
          conditions.push(`${column} = ?`);
          values.push(value);
        }
      }
    });

    // ----------------------------------------------------------
    // WHERE
    // ----------------------------------------------------------

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // ----------------------------------------------------------
    // SORT
    // ----------------------------------------------------------

    if (sort) {
      const sortFields = sort.split(',');

      const orderBy = sortFields
        .map((field) => {
          let sortOrder = 'ASC';

          field = field.trim();

          if (field.startsWith('-')) {
            sortOrder = 'DESC';
            field = field.substring(1).trim();
          }

          let column;

          if (field === 'latitude') {
            column = 'ST_Y(location)';
          } else if (field === 'longitude') {
            column = 'ST_X(location)';
          } else {
            column = allowedFields[field];
          }

          if (!column) {
            return null;
          }

          return `${column} ${sortOrder}`;
        })
        .filter(Boolean);

      if (orderBy.length > 0) {
        sql += ` ORDER BY ${orderBy.join(', ')}`;
      }
    }

    // ----------------------------------------------------------
    // PAGINATION
    // ----------------------------------------------------------

    if (limit !== undefined && skip !== undefined) {
      sql += ' LIMIT ? OFFSET ?';

      values.push(Number(limit), Number(skip));
    }

    console.log('SQL:', sql);
    console.log('VALUES:', values);

    const [rows] = await db.query(sql, values);

    return rows;
  }

  // ============================================================
  // GET ONE SITE
  // ============================================================
  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT
        id,
        site_code,
        site_name,
        address,
        ST_Y(location) AS latitude,
        ST_X(location) AS longitude,
        site_type,
        status,
        created_at,
        updated_at
      FROM sites
      WHERE id = ?
      `,
      [id],
    );

    return rows[0];
  }

  // ============================================================
  // CREATE SITE
  // ============================================================
  static async create(siteData) {
    const {
      site_code: siteCode,
      site_name: siteName,
      address,
      location,
      site_type: siteType,
      status,
    } = siteData;

    const [result] = await db.query(
      `
    INSERT INTO sites
    (
      site_code,
      site_name,
      address,
      location,
      site_type,
      status
    )
    VALUES (
      ?,
      ?,
      ?,
      POINT(?, ?),
      ?,
      ?
    )
    `,
      [
        siteCode,
        siteName,
        address || null,

        // POINT(longitude, latitude)
        location.longitude,
        location.latitude,

        siteType,
        status || 'active',
      ],
    );

    return this.findById(result.insertId);
  }

  // ============================================================
  // UPDATE SITE
  // ============================================================
  static async findByIdAndUpdate(id, siteData) {
    const allowedFields = {
      siteCode: 'site_code',
      siteName: 'site_name',
      address: 'address',
      siteType: 'site_type',
      status: 'status',
    };

    const updates = [];
    const values = [];

    // ----------------------------------------------------------
    // NORMAL FIELDS
    // ----------------------------------------------------------

    Object.entries(siteData).forEach(([key, value]) => {
      if (
        allowedFields[key] &&
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        updates.push(`${allowedFields[key]} = ?`);
        values.push(value);
      }
    });

    // ----------------------------------------------------------
    // LOCATION
    // ----------------------------------------------------------

    const hasLatitude =
      siteData.latitude !== undefined && siteData.latitude !== null;

    const hasLongitude =
      siteData.longitude !== undefined && siteData.longitude !== null;

    // Only update location when BOTH coordinates are provided
    if (hasLatitude && hasLongitude) {
      updates.push(`location = POINT(?, ?)`);

      // IMPORTANT:
      // POINT(longitude, latitude)
      values.push(siteData.longitude, siteData.latitude);
    }

    // ----------------------------------------------------------
    // NO VALID FIELDS
    // ----------------------------------------------------------

    if (updates.length === 0) {
      return null;
    }

    values.push(id);

    // ----------------------------------------------------------
    // UPDATE
    // ----------------------------------------------------------

    await db.query(
      `
      UPDATE sites
      SET ${updates.join(', ')}
      WHERE id = ?
      `,
      values,
    );

    // ----------------------------------------------------------
    // RETURN UPDATED SITE
    // ----------------------------------------------------------

    return this.findById(id);
  }

  // ============================================================
  // DELETE ONE SITE
  // ============================================================
  static async findByIdAndDelete(id) {
    const [rows] = await db.query(
      `
      SELECT
        id,
        site_code,
        site_name,
        address,
        ST_Y(location) AS latitude,
        ST_X(location) AS longitude,
        site_type,
        status,
        created_at,
        updated_at
      FROM sites
      WHERE id = ?
      `,
      [id],
    );

    if (rows.length === 0) {
      return null;
    }

    const site = rows[0];

    await db.query('DELETE FROM sites WHERE id = ?', [id]);

    return site;
  }

  // ============================================================
  // DELETE ALL SITES
  // ============================================================
  static async deleteAll() {
    await db.query('DELETE FROM sites');
  }
}

module.exports = Site;
