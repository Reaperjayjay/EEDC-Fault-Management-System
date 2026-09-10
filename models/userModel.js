const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');

class User {
  // Create users table
  static async createTable() {
    const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      password_changed_at TIMESTAMP NULL DEFAULT NULL,
      role ENUM('admin', 'operator', 'engineer', 'user') DEFAULT 'user',
      phone VARCHAR(20),
      photo VARCHAR(255),
      password_reset_token VARCHAR(255) NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      password_reset_expires DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    )
  `;

    await db.query(sql);
  }

  // Get all users
  static async findAll() {
    const sql = `
    SELECT
      id,
      name,
      email,
      role,
      phone,
      photo,
      created_at,
      updated_at
    FROM users
    ORDER BY id DESC
  `;

    const [rows] = await db.query(sql);

    return rows;
  }

  static async findById(id) {
    console.log('FINDING USER ID:', id);

    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);

    console.log('USER ROWS:', rows);

    return rows[0];
  }

  // Find user by email
  static async findByEmail(email) {
    const sql = `
    SELECT *
    FROM users
    WHERE email = ?
    LIMIT 1
  `;

    const [rows] = await db.query(sql, [email]);

    return rows[0];
  }

  /////create user
  static async create(userData) {
    const { name, email, password, passwordConfirm, role, phone, photo } =
      userData;

    if (password !== passwordConfirm) {
      throw new Error('Passwords do not match');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const sql = `
    INSERT INTO users
    (name, email, password, password_changed_at, role, phone, photo)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
  `;

    const [result] = await db.query(sql, [
      name,
      email,
      hashedPassword,
      role || 'user',
      phone || null,
      photo || null,
    ]);

    const user = await this.findById(result.insertId);

    delete user.password;

    return user;
  }

  static async correctPassword(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
  }

  static async changedPasswordAfter(user, JWTTimestamp) {
    console.log('🔍 password_changed_at:', user.password_changed_at);
    console.log('🔍 JWT iat:', JWTTimestamp);

    if (!user.password_changed_at) {
      console.log('❌ password_changed_at is NULL');
      return false;
    }

    const changedTimestamp =
      new Date(user.password_changed_at).getTime() / 1000;

    console.log('🔍 changedTimestamp:', changedTimestamp);
    console.log('🔍 JWT timestamp:', JWTTimestamp);

    return JWTTimestamp < changedTimestamp;
  }

  static async createPasswordResetToken(id) {
    // Generate random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token before storing it in database
    const passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Token expires in 10 minutes
    const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

    console.log({ resetToken });
    console.log({ passwordResetToken });
    console.log({ passwordResetExpires });

    // Save hashed token and expiration in MySQL
    await db.query(
      `
      UPDATE users
      SET password_reset_token = ?,
          password_reset_expires = ?
      WHERE id = ?
    `,
      [passwordResetToken, passwordResetExpires, id],
    );

    // Return the ORIGINAL token
    return resetToken;
  }

  static async clearPasswordResetToken(id) {
    await db.query(
      `
      UPDATE users
      SET password_reset_token = NULL,
          password_reset_expires = NULL
      WHERE id = ?
    `,
      [id],
    );
  }

  /////////////////////////////////////
  static async findByResetToken(hashedToken) {
    const [rows] = await db.query(
      `
      SELECT *
      FROM users
      WHERE password_reset_token = ?
        AND password_reset_expires > NOW()
      LIMIT 1
    `,
      [hashedToken],
    );

    return rows[0];
  }

  /////////////////////////////////////////////////////
  static async resetPassword(id, password) {
    const hashedPassword = await bcrypt.hash(password, 12);

    await db.query(
      `
      UPDATE users
      SET password = ?,
          password_changed_at = CURRENT_TIMESTAMP,
          password_reset_token = NULL,
          password_reset_expires = NULL
      WHERE id = ?
    `,
      [hashedPassword, id],
    );

    return this.findById(id);
  }

  static async updatePassword(id, password) {
    const hashedPassword = await bcrypt.hash(password, 12);

    await db.query(
      `
      UPDATE users
      SET password = ?,
          password_changed_at = CURRENT_TIMESTAMP - INTERVAL 1 SECOND
      WHERE id = ?
    `,
      [hashedPassword, id],
    );

    return this.findById(id);
  }

  //////////
  // Update user
  static async findByIdAndUpdate(id, userData) {
    const allowedFields = {
      name: 'name',
      email: 'email',
      phone: 'phone',
      active: 'active',
    };

    const updates = [];
    const values = [];

    Object.entries(userData).forEach(([key, value]) => {
      if (allowedFields[key]) {
        updates.push(`${allowedFields[key]} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return null;
    }

    values.push(id);

    const sql = `
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = ?
  `;

    await db.query(sql, values);

    // Check whether the user actually exists
    const user = await this.findById(id);

    if (!user) {
      return null;
    }

    return user;
  }

  /////DEACTIVATE ME
  static async deactivate(id) {
    await db.query(
      `
    UPDATE users
    SET active = FALSE
    WHERE id = ?
    `,
      [id],
    );

    return this.findById(id);
  }

  // Delete user
  static async findByIdAndDelete(id) {
    const user = await this.findById(id);

    if (!user) {
      return null;
    }

    await db.query('DELETE FROM users WHERE id = ?', [id]);

    return user;
  }

  /////vhange role for users
  static async changeRole(id, role) {
    const allowedRoles = ['admin', 'operator', 'engineer', 'user'];

    if (!allowedRoles.includes(role)) {
      throw new Error('Invalid role');
    }

    const sql = `
    UPDATE users
    SET role = ?
    WHERE id = ?
  `;

    const [result] = await db.query(sql, [role, id]);

    if (result.affectedRows === 0) {
      return null;
    }

    return this.findById(id);
  }
}

module.exports = User;
