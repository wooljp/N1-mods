const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const BaseAdapter = require('./base-adapter');

class MySQLAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.pool = null;
  }

  async connect() {
    try {
      const poolConfig = {
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelayMs: 30000,
        timezone: '+00:00',
        supportBigNumbers: true,
        bigNumberStrings: true,
        dateStrings: true,
        multipleStatements: false,
        decimalNumbers: true,
        ssl: this.config.ssl || false
      };

      this.pool = mysql.createPool(poolConfig);
      
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      
      this.connected = true;
      return true;
    } catch (error) {
      this.lastError = error;
      throw error;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.connected = false;
  }

  async getConnection() {
    return await this.pool.getConnection();
  }

  async createTables() {
    const connection = await this.getConnection();
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS banned_users (
          username VARCHAR(60) PRIMARY KEY,
          banned_by VARCHAR(60),
          reason VARCHAR(255),
          banned_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS shadowbanned_users (
          username VARCHAR(60) PRIMARY KEY,
          banned_by VARCHAR(60),
          banned_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL,
          suffix INT,
          display_name VARCHAR(60) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          is_admin BOOLEAN DEFAULT FALSE,
          status_text VARCHAR(100) DEFAULT '',
          login_token VARCHAR(255),
          color VARCHAR(20) DEFAULT '#000000',
          theme VARCHAR(20) DEFAULT 'default',
          registration_ip VARCHAR(45),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME,
          KEY idx_username_suffix (username, suffix),
          KEY idx_login_token (login_token),
          KEY idx_display_name (display_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          username VARCHAR(50) PRIMARY KEY,
          color VARCHAR(20) DEFAULT '#000000',
          custom_message VARCHAR(50) DEFAULT '',
          theme VARCHAR(20) DEFAULT 'default',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS ip_bans (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ip_address VARCHAR(45) NOT NULL UNIQUE,
          banned_by VARCHAR(60) NOT NULL,
          reason VARCHAR(255) DEFAULT '',
          banned_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS user_ip_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          display_name VARCHAR(60) NOT NULL,
          ip_address VARCHAR(45) NOT NULL,
          first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_seen DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_ip (display_name, ip_address),
          KEY idx_display_name (display_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      return true;
    } finally {
      connection.release();
    }
  }

  async getUsers() {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM users');
      const users = {};
      rows.forEach(row => {
        users[row.username] = {
          color: row.color,
          customMessage: row.custom_message,
          theme: row.theme,
          createdAt: row.created_at
        };
      });
      return users;
    } finally {
      connection.release();
    }
  }

  async upsertUser(username, data) {
    const connection = await this.getConnection();
    try {
      await connection.query(`
        INSERT INTO users (username, color, custom_message, theme)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          color = COALESCE(?, color),
          custom_message = COALESCE(?, custom_message),
          theme = COALESCE(?, theme)
      `, [username, data.color || '#000000', data.customMessage || '', data.theme || 'default',
          data.color, data.customMessage, data.theme]);
      return true;
    } finally {
      connection.release();
    }
  }

  async getMessages(limit = 500) {
    console.log('[Database] Messages are stored in-memory only');
    return null;
  }

  async addMessage(messageData) {
    console.log('[Database] Messages are stored in-memory only');
    return false;
  }

  async updateMessage(id, username, newMessage, isPrivilegedAdmin = false) {
    console.log('[Database] Messages are stored in-memory only');
    return { success: false, error: 'Messages are stored in-memory only' };
  }

  async deleteMessage(id, username, isPrivilegedAdmin = false) {
    console.log('[Database] Messages are stored in-memory only');
    return false;
  }

  async deleteAllMessages() {
    console.log('[Database] Messages are stored in-memory only');
    return false;
  }

  async deleteAllPrivateMessages() {
    console.log('[Database] Messages are stored in-memory only');
    return false;
  }

  async addPrivateMessage(messageData) {
    console.log('[Database] Messages are stored in-memory only');
    return false;
  }

  async getPrivateMessages(user1, user2, limit = 100) {
    console.log('[Database] Messages are stored in-memory only');
    return [];
  }

  async getAllPrivateMessagesForUser(username, limit = 100) {
    console.log('[Database] Messages are stored in-memory only');
    return [];
  }

  async getAllPrivateMessages(limit = 200) {
    console.log('[Database] Messages are stored in-memory only');
    return [];
  }

  async updatePrivateMessage(id, newMessage, isPrivilegedAdmin = false) {
    console.log('[Database] Messages are stored in-memory only');
    return { success: false, error: 'Messages are stored in-memory only' };
  }

  async deletePrivateMessage(id, username, isPrivilegedAdmin = false) {
    console.log('[Database] Messages are stored in-memory only');
    return { success: false, error: 'Messages are stored in-memory only' };
  }

  async getPrivateMessageById(id) {
    console.log('[Database] Messages are stored in-memory only');
    return null;
  }

  async signup(username, password, registrationIp) {
    const connection = await this.getConnection();
    try {
      const isAdminName = this.config.adminUsers?.includes(username);
      
      const passwordHash = await bcrypt.hash(password, 10);
      const token = crypto.randomBytes(32).toString('hex');

      if (isAdminName) {
        await connection.query(`
          INSERT INTO accounts (username, suffix, display_name, password_hash, is_admin, login_token, registration_ip)
          VALUES (?, NULL, ?, ?, TRUE, ?, ?)
        `, [username, username, passwordHash, token, registrationIp]);
      } else {
        const [suffixResult] = await connection.query(
          'SELECT COALESCE(MAX(suffix), 0) + 1 as next_suffix FROM accounts WHERE username = ?',
          [username]
        );
        const suffix = suffixResult[0].next_suffix;
        const displayName = `${username}#${suffix}`;

        await connection.query(`
          INSERT INTO accounts (username, suffix, display_name, password_hash, login_token, registration_ip)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [username, suffix, displayName, passwordHash, token, registrationIp]);
      }

      return { 
        success: true, 
        account: { 
          displayName: isAdminName ? username : `${username}#${suffix}`, 
          isAdmin: isAdminName, 
          token,
          color: '#000000',
          theme: 'default',
          statusText: ''
        } 
      };
    } finally {
      connection.release();
    }
  }

  async login(username, password, currentIp) {
    const connection = await this.getConnection();
    try {
      const [accounts] = await connection.query('SELECT * FROM accounts WHERE username = ?', [username]);

      if (accounts.length === 0) {
        return { success: false, error: 'アカウントが見つかりません' };
      }

      for (const account of accounts) {
        const isValid = await bcrypt.compare(password, account.password_hash);

        if (isValid) {
          const token = crypto.randomBytes(32).toString('hex');
          await connection.query('UPDATE accounts SET login_token = ?, last_login = NOW() WHERE id = ?', [token, account.id]);

          return {
            success: true,
            account: {
              displayName: account.display_name,
              isAdmin: account.is_admin,
              token,
              color: account.color,
              theme: account.theme,
              statusText: account.status_text
            }
          };
        }
      }

      return { success: false, error: 'パスワードが間違っています' };
    } finally {
      connection.release();
    }
  }

  async addShadowBan(username, bannedBy) {
    const connection = await this.getConnection();
    try {
      await connection.query(
        'INSERT INTO shadowbanned_users (username, banned_by) VALUES (?, ?) ON DUPLICATE KEY UPDATE banned_by = ?',
        [username, bannedBy, bannedBy]
      );
      return true;
    } finally {
      connection.release();
    }
  }

  async removeShadowBan(username) {
    const connection = await this.getConnection();
    try {
      await connection.query('DELETE FROM shadowbanned_users WHERE username = ?', [username]);
      return true;
    } finally {
      connection.release();
    }
  }

  async getShadowBannedUsers() {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.query('SELECT username FROM shadowbanned_users');
      return rows.map(row => row.username);
    } finally {
      connection.release();
    }
  }

  async seedAdminAccounts(adminUsers, privilegedPasswords, adminPassword) {
    const connection = await this.getConnection();
    try {
      for (const adminName of adminUsers) {
        const password = privilegedPasswords[adminName] || adminPassword;
        if (!password) continue;
        
        const passwordHash = await bcrypt.hash(password, 10);

        const [exists] = await connection.query('SELECT id FROM accounts WHERE display_name = ?', [adminName]);
        if (exists.length === 0) {
          await connection.query(`
            INSERT INTO accounts (username, suffix, display_name, password_hash, is_admin)
            VALUES (?, NULL, ?, ?, TRUE)
          `, [adminName, adminName, passwordHash]);
        }
      }
    } finally {
      connection.release();
    }
  }

  normalizeIpAddress(ip) {
    if (!ip) return ip;
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    if (ip === '::1') {
      return '127.0.0.1';
    }
    return ip;
  }

  // IP BAN関連の実装
  async addBannedIP(ipAddress, bannedBy, reason = '') {
    const connection = await this.getConnection();
    try {
      const normalizedIp = this.normalizeIpAddress(ipAddress);
      await connection.query(`
        INSERT INTO ip_bans (ip_address, banned_by, reason, banned_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
        banned_by = VALUES(banned_by),
        reason = VALUES(reason),
        banned_at = NOW()
      `, [normalizedIp, bannedBy, reason]);
    } finally {
      connection.release();
    }
  }

  async removeBannedIP(ipAddress) {
    const connection = await this.getConnection();
    try {
      const normalizedIp = this.normalizeIpAddress(ipAddress);
      await connection.query('DELETE FROM ip_bans WHERE ip_address = ?', [normalizedIp]);
    } finally {
      connection.release();
    }
  }

  async isIpBanned(ipAddress) {
    const connection = await this.getConnection();
    try {
      const normalizedIp = this.normalizeIpAddress(ipAddress);
      const [rows] = await connection.query('SELECT * FROM ip_bans WHERE ip_address = ?', [normalizedIp]);
      return rows.length > 0;
    } finally {
      connection.release();
    }
  }

  async getAllIpBans() {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM ip_bans ORDER BY banned_at DESC');
      return rows.map(row => ({
        ip: row.ip_address,
        bannedBy: row.banned_by,
        reason: row.reason || '',
        bannedAt: row.banned_at
      }));
    } finally {
      connection.release();
    }
  }

  async getBannedIPs() {
    return this.getAllIpBans();
  }
}

module.exports = MySQLAdapter;
