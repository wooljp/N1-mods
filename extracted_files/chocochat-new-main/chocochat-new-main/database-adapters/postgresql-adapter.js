const { Client } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const BaseAdapter = require('./base-adapter');

class PostgreSQLAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.client = null;
  }

  async connect() {
    try {
      this.client = new Client({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        ssl: this.config.ssl || false
      });

      await this.client.connect();
      this.connected = true;
      return true;
    } catch (error) {
      this.lastError = error;
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
    this.connected = false;
  }

  async createTables() {
    try {
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS banned_users (
          username VARCHAR(60) PRIMARY KEY,
          banned_by VARCHAR(60),
          reason VARCHAR(255),
          banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.client.query(`
        CREATE TABLE IF NOT EXISTS shadowbanned_users (
          username VARCHAR(60) PRIMARY KEY,
          banned_by VARCHAR(60),
          banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.client.query(`
        CREATE TABLE IF NOT EXISTS accounts (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) NOT NULL,
          suffix INTEGER,
          display_name VARCHAR(60) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          is_admin BOOLEAN DEFAULT FALSE,
          status_text VARCHAR(100) DEFAULT '',
          login_token VARCHAR(255),
          color VARCHAR(20) DEFAULT '#000000',
          theme VARCHAR(20) DEFAULT 'default',
          registration_ip VARCHAR(45),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP
        )
      `);

      await this.client.query(`
        CREATE INDEX IF NOT EXISTS idx_accounts_username_suffix ON accounts(username, suffix)
      `);
      await this.client.query(`
        CREATE INDEX IF NOT EXISTS idx_accounts_login_token ON accounts(login_token)
      `);

      await this.client.query(`
        CREATE TABLE IF NOT EXISTS users (
          username VARCHAR(50) PRIMARY KEY,
          color VARCHAR(20) DEFAULT '#000000',
          custom_message VARCHAR(50) DEFAULT '',
          theme VARCHAR(20) DEFAULT 'default',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.client.query(`
        CREATE TABLE IF NOT EXISTS ip_bans (
          id SERIAL PRIMARY KEY,
          ip_address VARCHAR(45) NOT NULL UNIQUE,
          banned_by VARCHAR(60) NOT NULL,
          reason VARCHAR(255) DEFAULT '',
          banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.client.query(`
        CREATE TABLE IF NOT EXISTS user_ip_history (
          id SERIAL PRIMARY KEY,
          display_name VARCHAR(60) NOT NULL,
          ip_address VARCHAR(45) NOT NULL,
          first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (display_name, ip_address)
        )
      `);

      await this.client.query(`
        CREATE INDEX IF NOT EXISTS idx_user_ip_history_display_name ON user_ip_history(display_name)
      `);

      return true;
    } catch (error) {
      console.error('Error creating PostgreSQL tables:', error);
      throw error;
    }
  }

  async getUsers() {
    try {
      const result = await this.client.query('SELECT * FROM users');
      const users = {};
      result.rows.forEach(row => {
        users[row.username] = {
          color: row.color,
          customMessage: row.custom_message,
          theme: row.theme,
          createdAt: row.created_at
        };
      });
      return users;
    } catch (error) {
      console.error('Error loading users:', error);
      return null;
    }
  }

  async upsertUser(username, data) {
    try {
      await this.client.query(`
        INSERT INTO users (username, color, custom_message, theme)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (username) DO UPDATE SET
          color = COALESCE($5, users.color),
          custom_message = COALESCE($6, users.custom_message),
          theme = COALESCE($7, users.theme)
      `, [username, data.color || '#000000', data.customMessage || '', data.theme || 'default',
          data.color, data.customMessage, data.theme]);
      return true;
    } catch (error) {
      console.error('Error upserting user:', error);
      return false;
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
    try {
      const isAdminName = this.config.adminUsers?.includes(username);
      
      const passwordHash = await bcrypt.hash(password, 10);
      const token = crypto.randomBytes(32).toString('hex');

      if (isAdminName) {
        await this.client.query(`
          INSERT INTO accounts (username, suffix, display_name, password_hash, is_admin, login_token, registration_ip)
          VALUES ($1, NULL, $2, $3, TRUE, $4, $5)
        `, [username, username, passwordHash, token, registrationIp]);
      } else {
        const suffixResult = await this.client.query(
          'SELECT COALESCE(MAX(suffix), 0) + 1 as next_suffix FROM accounts WHERE username = $1',
          [username]
        );
        const suffix = suffixResult.rows[0].next_suffix;
        const displayName = `${username}#${suffix}`;

        await this.client.query(`
          INSERT INTO accounts (username, suffix, display_name, password_hash, login_token, registration_ip)
          VALUES ($1, $2, $3, $4, $5, $6)
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
    } catch (error) {
      console.error('Signup error:', error);
      if (error.message.includes('duplicate') || error.message.includes('Duplicate')) {
        return { success: false, error: 'このユーザー名は既に使用されています' };
      }
      return { success: false, error: 'アカウント作成に失敗しました' };
    }
  }

  async login(username, password, currentIp) {
    try {
      const result = await this.client.query('SELECT * FROM accounts WHERE username = $1', [username]);

      if (result.rows.length === 0) {
        return { success: false, error: 'アカウントが見つかりません' };
      }

      for (const account of result.rows) {
        const isValid = await bcrypt.compare(password, account.password_hash);

        if (isValid) {
          const token = crypto.randomBytes(32).toString('hex');
          await this.client.query('UPDATE accounts SET login_token = $1, last_login = NOW() WHERE id = $2', [token, account.id]);

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
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'ログイン中にエラーが発生しました' };
    }
  }

  async addShadowBan(username, bannedBy) {
    try {
      await this.client.query(`
        INSERT INTO shadowbanned_users (username, banned_by) 
        VALUES ($1, $2) 
        ON CONFLICT (username) DO UPDATE SET banned_by = $2
      `, [username, bannedBy]);
      return true;
    } catch (error) {
      console.error('Error adding shadowban:', error);
      return false;
    }
  }

  async removeShadowBan(username) {
    try {
      await this.client.query('DELETE FROM shadowbanned_users WHERE username = $1', [username]);
      return true;
    } catch (error) {
      console.error('Error removing shadowban:', error);
      return false;
    }
  }

  async getShadowBannedUsers() {
    try {
      const result = await this.client.query('SELECT username FROM shadowbanned_users');
      return result.rows.map(row => row.username);
    } catch (error) {
      console.error('Error getting shadowbanned users:', error);
      return [];
    }
  }

  async seedAdminAccounts(adminUsers, privilegedPasswords, adminPassword) {
    try {
      for (const adminName of adminUsers) {
        const password = privilegedPasswords[adminName] || adminPassword;
        if (!password) continue;
        
        const passwordHash = await bcrypt.hash(password, 10);

        const exists = await this.client.query('SELECT id FROM accounts WHERE display_name = $1', [adminName]);
        if (exists.rows.length === 0) {
          await this.client.query(`
            INSERT INTO accounts (username, suffix, display_name, password_hash, is_admin)
            VALUES ($1, NULL, $2, $3, TRUE)
          `, [adminName, adminName, passwordHash]);
        }
      }
    } catch (error) {
      console.error('Error seeding admin accounts:', error);
    }
  }

  async updateUser(username, data) {
    try {
      const updates = [];
      const values = [];

      if (data.color !== undefined) {
        updates.push('color = $' + (values.length + 1));
        values.push(data.color);
      }
      if (data.customMessage !== undefined) {
        updates.push('custom_message = $' + (values.length + 1));
        values.push(data.customMessage);
      }
      if (data.theme !== undefined) {
        updates.push('theme = $' + (values.length + 1));
        values.push(data.theme);
      }

      if (updates.length === 0) return true;

      values.push(username);
      await this.client.query(
        `UPDATE users SET ${updates.join(', ')} WHERE username = $${values.length}`,
        values
      );
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  }

  async renameUser(oldUsername, newUsername) {
    try {
      await this.client.query('BEGIN');
      
      const oldUserResult = await this.client.query('SELECT * FROM users WHERE username = $1', [oldUsername]);
      if (oldUserResult.rows.length > 0) {
        const user = oldUserResult.rows[0];
        await this.client.query(`
          INSERT INTO users (username, color, custom_message, theme, created_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (username) DO UPDATE SET
            color = EXCLUDED.color, custom_message = EXCLUDED.custom_message, theme = EXCLUDED.theme
        `, [newUsername, user.color, user.custom_message, user.theme, user.created_at]);
      }

      await this.client.query('UPDATE messages SET username = $1 WHERE username = $2', [newUsername, oldUsername]);
      
      await this.client.query('COMMIT');
      return true;
    } catch (error) {
      await this.client.query('ROLLBACK');
      console.error('Error renaming user:', error);
      return false;
    }
  }

  async updateMessage(id, username, newMessage, isPrivilegedAdmin = false) {
    try {
      let query, params;
      
      if (isPrivilegedAdmin) {
        query = 'UPDATE messages SET message = $1, edited = true, edited_at = NOW() WHERE id = $2';
        params = [newMessage, id];
      } else {
        query = 'UPDATE messages SET message = $1, edited = true, edited_at = NOW() WHERE id = $2 AND username = $3';
        params = [newMessage, id, username];
      }

      const result = await this.client.query(query, params);

      if (result.rowCount === 0) {
        return { success: false, error: 'Message not found or no permission' };
      }

      const messageResult = await this.client.query('SELECT * FROM messages WHERE id = $1', [id]);
      if (messageResult.rows.length > 0) {
        const row = messageResult.rows[0];
        return {
          success: true,
          message: {
            id: row.id,
            username: row.username,
            message: row.message,
            color: row.color,
            timestamp: row.timestamp,
            edited: row.edited,
            editedAt: row.edited_at
          }
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating message:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteMessage(id, username, isPrivilegedAdmin = false) {
    try {
      let query, params;
      
      if (isPrivilegedAdmin) {
        query = 'DELETE FROM messages WHERE id = $1';
        params = [id];
      } else {
        query = 'DELETE FROM messages WHERE id = $1 AND username = $2';
        params = [id, username];
      }

      const result = await this.client.query(query, params);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  async deleteAllMessages() {
    try {
      await this.client.query('DELETE FROM messages');
      return true;
    } catch (error) {
      console.error('Error deleting all messages:', error);
      return false;
    }
  }

  async deleteAllPrivateMessages() {
    try {
      await this.client.query('DELETE FROM private_messages');
      return true;
    } catch (error) {
      console.error('Error deleting all private messages:', error);
      return false;
    }
  }

  async addPrivateMessage(messageData) {
    try {
      await this.client.query(`
        INSERT INTO private_messages (id, from_user, to_user, message, color, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        messageData.id,
        messageData.from,
        messageData.to,
        messageData.message,
        messageData.color || '#000000',
        messageData.timestamp || new Date()
      ]);
      return true;
    } catch (error) {
      console.error('Error adding private message:', error);
      return false;
    }
  }

  async getPrivateMessages(user1, user2, limit = 100) {
    try {
      const result = await this.client.query(`
        SELECT * FROM private_messages 
        WHERE (from_user = $1 AND to_user = $2) OR (from_user = $2 AND to_user = $1)
        ORDER BY timestamp DESC LIMIT $3
      `, [user1, user2, limit]);

      return result.rows.map(row => ({
        id: row.id,
        from: row.from_user,
        to: row.to_user,
        message: row.message,
        color: row.color,
        timestamp: row.timestamp
      })).reverse();
    } catch (error) {
      console.error('Error getting private messages:', error);
      return [];
    }
  }

  async getAllPrivateMessagesForUser(username, limit = 100) {
    try {
      const result = await this.client.query(`
        SELECT * FROM private_messages 
        WHERE from_user = $1 OR to_user = $1
        ORDER BY timestamp DESC LIMIT $2
      `, [username, limit]);

      return result.rows.map(row => ({
        id: row.id,
        from: row.from_user,
        to: row.to_user,
        message: row.message,
        color: row.color,
        timestamp: row.timestamp
      })).reverse();
    } catch (error) {
      console.error('Error getting all private messages for user:', error);
      return [];
    }
  }

  async getAllPrivateMessages(limit = 200) {
    try {
      const result = await this.client.query(`
        SELECT * FROM private_messages 
        ORDER BY timestamp DESC LIMIT $1
      `, [limit]);

      return result.rows.map(row => ({
        id: row.id,
        from: row.from_user,
        to: row.to_user,
        message: row.message,
        color: row.color,
        timestamp: row.timestamp
      })).reverse();
    } catch (error) {
      console.error('Error getting all private messages:', error);
      return [];
    }
  }

  async updatePrivateMessage(id, newMessage, isPrivilegedAdmin = false) {
    try {
      if (!isPrivilegedAdmin) {
        return { success: false, error: '権限がありません' };
      }

      const result = await this.client.query(
        'UPDATE private_messages SET message = $1, edited = true WHERE id = $2',
        [newMessage, id]
      );

      if (result.rowCount === 0) {
        return { success: false, error: 'メッセージが見つかりません' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating private message:', error);
      return { success: false, error: error.message };
    }
  }

  async deletePrivateMessage(id, username, isPrivilegedAdmin = false) {
    try {
      const checkResult = await this.client.query('SELECT from_user, to_user FROM private_messages WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return { success: false, error: 'メッセージが見つかりません' };
      }

      const msg = checkResult.rows[0];
      const isOwner = msg.from_user === username || msg.to_user === username;

      if (!isPrivilegedAdmin && !isOwner) {
        return { success: false, error: '権限がありません' };
      }

      const result = await this.client.query('DELETE FROM private_messages WHERE id = $1', [id]);
      return { success: true };
    } catch (error) {
      console.error('Error deleting private message:', error);
      return { success: false, error: error.message };
    }
  }

  async getPrivateMessageById(id) {
    try {
      const result = await this.client.query('SELECT * FROM private_messages WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        from: row.from_user,
        to: row.to_user,
        message: row.message,
        color: row.color,
        timestamp: row.timestamp,
        edited: row.edited || false,
        isPrivateMessage: true
      };
    } catch (error) {
      console.error('Error getting private message by id:', error);
      return null;
    }
  }

  async addIpBan(ipAddress, bannedBy, reason = '') {
    try {
      const normalizedIp = this.normalizeIpAddress(ipAddress);
      await this.client.query(
        'INSERT INTO ip_bans (ip_address, banned_by, reason) VALUES ($1, $2, $3) ON CONFLICT (ip_address) DO UPDATE SET reason = $3',
        [normalizedIp, bannedBy, reason]
      );
      return { success: true };
    } catch (error) {
      console.error('Error adding IP ban:', error);
      return { success: false, error: error.message };
    }
  }

  async removeIpBan(ipAddress) {
    try {
      const normalizedIp = this.normalizeIpAddress(ipAddress);
      const result = await this.client.query('DELETE FROM ip_bans WHERE ip_address = $1', [normalizedIp]);
      if (result.rowCount === 0) {
        return { success: false, error: 'このIPはバンされていません' };
      }
      return { success: true };
    } catch (error) {
      console.error('Error removing IP ban:', error);
      return { success: false, error: error.message };
    }
  }

  async isIpBanned(ipAddress) {
    try {
      const normalizedIp = this.normalizeIpAddress(ipAddress);
      const result = await this.client.query('SELECT id FROM ip_bans WHERE ip_address = $1', [normalizedIp]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking IP ban:', error);
      return false;
    }
  }

  async getAllIpBans() {
    try {
      const result = await this.client.query('SELECT * FROM ip_bans ORDER BY banned_at DESC');
      return result.rows;
    } catch (error) {
      console.error('Error getting IP bans:', error);
      return [];
    }
  }

  async saveUserIpHistory(displayName, ipAddress) {
    try {
      const normalizedIp = this.normalizeIpAddress(ipAddress);
      
      await this.client.query('DELETE FROM user_ip_history WHERE display_name = $1', [displayName]);

      await this.client.query(`
        INSERT INTO user_ip_history (display_name, ip_address, first_seen, last_seen)
        VALUES ($1, $2, NOW(), NOW())
      `, [displayName, normalizedIp]);
      console.log(`[IP History] Saved: ${displayName} -> ${normalizedIp}`);
      return true;
    } catch (error) {
      const normalizedIp = this.normalizeIpAddress(ipAddress);
      console.error(`[IP History] Error saving ${displayName} (${normalizedIp}):`, error.message);
      return false;
    }
  }

  async getAllUserIpHistory(limit = 500) {
    try {
      const result = await this.client.query(
        'SELECT display_name, ip_address, first_seen, last_seen FROM user_ip_history ORDER BY last_seen DESC LIMIT $1',
        [limit]
      );
      return result.rows.map(row => ({
        displayName: row.display_name,
        ipAddress: row.ip_address,
        firstSeen: row.first_seen,
        lastSeen: row.last_seen
      }));
    } catch (error) {
      console.error('Error getting user IP history:', error);
      return [];
    }
  }

  async addBannedUser(username, bannedBy, reason = '') {
    try {
      await this.client.query(`
        INSERT INTO banned_users (username, banned_by, reason)
        VALUES ($1, $2, $3)
        ON CONFLICT (username) DO UPDATE SET banned_by = $2, reason = $3
      `, [username, bannedBy, reason]);
      return true;
    } catch (error) {
      console.error('Error adding banned user:', error);
      return false;
    }
  }

  async removeBannedUser(username) {
    try {
      const result = await this.client.query('DELETE FROM banned_users WHERE username = $1', [username]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error removing banned user:', error);
      return false;
    }
  }

  async getBannedUsers() {
    try {
      const result = await this.client.query('SELECT username FROM banned_users');
      return result.rows.map(row => row.username);
    } catch (error) {
      console.error('Error getting banned users:', error);
      return [];
    }
  }

  async loginWithToken(token, currentIp) {
    try {
      const result = await this.client.query('SELECT * FROM accounts WHERE login_token = $1', [token]);

      if (result.rows.length === 0) {
        return { success: false, error: 'セッションが無効です' };
      }

      const account = result.rows[0];

      await this.client.query('UPDATE accounts SET last_login = NOW() WHERE id = $1', [account.id]);

      return {
        success: true,
        account: {
          displayName: account.display_name,
          isAdmin: account.is_admin,
          token: account.login_token,
          color: account.color,
          theme: account.theme,
          statusText: account.status_text
        }
      };
    } catch (error) {
      console.error('Token login error:', error);
      return { success: false, error: 'トークン認証中にエラーが発生しました' };
    }
  }

  async logout(token) {
    try {
      await this.client.query('UPDATE accounts SET login_token = NULL WHERE login_token = $1', [token]);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  async updateAccountProfile(displayName, data) {
    try {
      const updates = [];
      const values = [];

      if (data.color !== undefined) {
        updates.push('color = $' + (values.length + 1));
        values.push(data.color);
      }
      if (data.theme !== undefined) {
        updates.push('theme = $' + (values.length + 1));
        values.push(data.theme);
      }
      if (data.statusText !== undefined) {
        updates.push('status_text = $' + (values.length + 1));
        values.push(data.statusText);
      }

      if (updates.length === 0) return { success: true };

      values.push(displayName);
      const result = await this.client.query(
        `UPDATE accounts SET ${updates.join(', ')} WHERE display_name = $${values.length}`,
        values
      );

      if (result.rowCount === 0) {
        return { success: false, error: 'アカウントが見つかりません' };
      }

      const accountResult = await this.client.query('SELECT * FROM accounts WHERE display_name = $1', [displayName]);
      const account = accountResult.rows[0];
      return {
        success: true,
        account: {
          displayName: account.display_name,
          isAdmin: account.is_admin,
          color: account.color,
          theme: account.theme,
          statusText: account.status_text
        }
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'プロフィール更新に失敗しました' };
    }
  }

  async getAccountByDisplayName(displayName) {
    try {
      const result = await this.client.query('SELECT * FROM accounts WHERE display_name = $1', [displayName]);
      if (result.rows.length === 0) return null;

      const account = result.rows[0];
      return {
        displayName: account.display_name,
        isAdmin: account.is_admin,
        color: account.color,
        theme: account.theme,
        statusText: account.status_text
      };
    } catch (error) {
      console.error('Get account error:', error);
      return null;
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
    try {
      const normalizedIp = this.normalizeIpAddress(ipAddress);
      await this.client.query(`
        INSERT INTO ip_bans (ip_address, banned_by, reason, banned_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (ip_address) DO UPDATE SET
        banned_by = EXCLUDED.banned_by,
        reason = EXCLUDED.reason,
        banned_at = NOW()
      `, [normalizedIp, bannedBy, reason]);
    } catch (error) {
      console.error('Add IP ban error:', error);
      throw error;
    }
  }

  async removeBannedIP(ipAddress) {
    try {
      const normalizedIp = this.normalizeIpAddress(ipAddress);
      await this.client.query('DELETE FROM ip_bans WHERE ip_address = $1', [normalizedIp]);
    } catch (error) {
      console.error('Remove IP ban error:', error);
      throw error;
    }
  }

  async isIpBanned(ipAddress) {
    try {
      const normalizedIp = this.normalizeIpAddress(ipAddress);
      const result = await this.client.query('SELECT * FROM ip_bans WHERE ip_address = $1', [normalizedIp]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Check IP ban error:', error);
      return false;
    }
  }

  async getAllIpBans() {
    try {
      const result = await this.client.query('SELECT * FROM ip_bans ORDER BY banned_at DESC');
      return result.rows.map(row => ({
        ip: row.ip_address,
        bannedBy: row.banned_by,
        reason: row.reason || '',
        bannedAt: row.banned_at
      }));
    } catch (error) {
      console.error('Get all IP bans error:', error);
      return [];
    }
  }

  async getBannedIPs() {
    return this.getAllIpBans();
  }
}

module.exports = PostgreSQLAdapter;
