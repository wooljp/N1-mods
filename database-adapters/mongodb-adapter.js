const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const BaseAdapter = require('./base-adapter');

class MongoDBAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      const uri = this.config.uri || `mongodb://${this.config.host}:${this.config.port}`;
      this.client = new MongoClient(uri, {
        ssl: this.config.ssl || false
      });

      await this.client.connect();
      this.db = this.client.db(this.config.database);
      this.connected = true;
      return true;
    } catch (error) {
      this.lastError = error;
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
    this.connected = false;
  }

  async createTables() {
    try {
      await this.db.createCollection('banned_users');
      await this.db.createCollection('shadowbanned_users');
      await this.db.createCollection('accounts');
      await this.db.createCollection('users');
      await this.db.createCollection('ip_bans');
      await this.db.createCollection('user_ip_history');

      await this.db.collection('accounts').createIndex({ display_name: 1 }, { unique: true });
      await this.db.collection('accounts').createIndex({ username: 1, suffix: 1 });
      await this.db.collection('accounts').createIndex({ login_token: 1 });
      await this.db.collection('ip_bans').createIndex({ ip_address: 1 }, { unique: true });
      await this.db.collection('user_ip_history').createIndex({ display_name: 1, ip_address: 1 }, { unique: true });

      return true;
    } catch (error) {
      console.error('Error creating MongoDB collections:', error);
      throw error;
    }
  }

  async getUsers() {
    try {
      const cursor = this.db.collection('users').find({});
      const users = {};
      await cursor.forEach(row => {
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
      await this.db.collection('users').updateOne(
        { username },
        { 
          $set: {
            color: data.color || '#000000',
            custom_message: data.customMessage || '',
            theme: data.theme || 'default'
          },
          $setOnInsert: { created_at: new Date() }
        },
        { upsert: true }
      );
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

      let displayName, suffix;
      if (isAdminName) {
        displayName = username;
        suffix = null;
      } else {
        const lastAccount = await this.db.collection('accounts')
          .find({ username })
          .sort({ suffix: -1 })
          .limit(1)
          .toArray();
        
        suffix = lastAccount.length > 0 ? (lastAccount[0].suffix || 0) + 1 : 1;
        displayName = `${username}#${suffix}`;
      }

      await this.db.collection('accounts').insertOne({
        username,
        suffix,
        display_name: displayName,
        password_hash: passwordHash,
        is_admin: isAdminName,
        login_token: token,
        registration_ip: registrationIp,
        created_at: new Date(),
        color: '#000000',
        theme: 'default',
        status_text: ''
      });

      return { 
        success: true, 
        account: { 
          displayName, 
          isAdmin: isAdminName, 
          token,
          color: '#000000',
          theme: 'default',
          statusText: ''
        } 
      };
    } catch (error) {
      console.error('Signup error:', error);
      if (error.code === 11000) {
        return { success: false, error: 'このユーザー名は既に使用されています' };
      }
      return { success: false, error: 'アカウント作成に失敗しました' };
    }
  }

  async login(username, password, currentIp) {
    try {
      const accounts = await this.db.collection('accounts').find({ username }).toArray();

      if (accounts.length === 0) {
        return { success: false, error: 'アカウントが見つかりません' };
      }

      for (const account of accounts) {
        const isValid = await bcrypt.compare(password, account.password_hash);

        if (isValid) {
          const token = crypto.randomBytes(32).toString('hex');
          await this.db.collection('accounts').updateOne(
            { _id: account._id },
            { $set: { login_token: token, last_login: new Date() } }
          );

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
      await this.db.collection('shadowbanned_users').updateOne(
        { username },
        { $set: { banned_by, banned_at: new Date() } },
        { upsert: true }
      );
      return true;
    } catch (error) {
      console.error('Error adding shadowban:', error);
      return false;
    }
  }

  async removeShadowBan(username) {
    try {
      await this.db.collection('shadowbanned_users').deleteOne({ username });
      return true;
    } catch (error) {
      console.error('Error removing shadowban:', error);
      return false;
    }
  }

  async getShadowBannedUsers() {
    try {
      const cursor = this.db.collection('shadowbanned_users').find({});
      const users = [];
      await cursor.forEach(row => {
        users.push(row.username);
      });
      return users;
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

        const exists = await this.db.collection('accounts').findOne({ display_name: adminName });
        if (!exists) {
          await this.db.collection('accounts').insertOne({
            username: adminName,
            suffix: null,
            display_name: adminName,
            password_hash: passwordHash,
            is_admin: true,
            created_at: new Date(),
            color: '#000000',
            theme: 'default',
            status_text: ''
          });
        }
      }
    } catch (error) {
      console.error('Error seeding admin accounts:', error);
    }
  }

  async updateUser(username, data) {
    try {
      const updates = { $set: {} };
      
      if (data.color !== undefined) {
        updates.$set.color = data.color;
      }
      if (data.customMessage !== undefined) {
        updates.$set.custom_message = data.customMessage;
      }
      if (data.theme !== undefined) {
        updates.$set.theme = data.theme;
      }

      if (Object.keys(updates.$set).length === 0) return true;

      await this.db.collection('users').updateOne({ username }, updates);
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  }

  async renameUser(oldUsername, newUsername) {
    try {
      const oldUser = await this.db.collection('users').findOne({ username: oldUsername });
      if (oldUser) {
        await this.db.collection('users').updateOne(
          { username: newUsername },
          { 
            $set: {
              color: oldUser.color,
              custom_message: oldUser.custom_message,
              theme: oldUser.theme,
              created_at: oldUser.created_at
            }
          },
          { upsert: true }
        );
      }

      await this.db.collection('messages').updateMany(
        { username: oldUsername },
        { $set: { username: newUsername } }
      );
      
      return true;
    } catch (error) {
      console.error('Error renaming user:', error);
      return false;
    }
  }

  async updateMessage(id, username, newMessage, isPrivilegedAdmin = false) {
    try {
      let filter;
      
      if (isPrivilegedAdmin) {
        filter = { id };
      } else {
        filter = { id, username };
      }

      const updateDoc = {
        $set: {
          message: newMessage,
          edited: true,
          edited_at: new Date()
        }
      };

      const result = await this.db.collection('messages').updateOne(filter, updateDoc);

      if (result.matchedCount === 0) {
        return { success: false, error: 'Message not found or no permission' };
      }

      const message = await this.db.collection('messages').findOne({ id });
      if (message) {
        return {
          success: true,
          message: {
            id: message.id,
            username: message.username,
            message: message.message,
            color: message.color,
            timestamp: message.timestamp,
            edited: message.edited,
            editedAt: message.edited_at
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
      let filter;
      
      if (isPrivilegedAdmin) {
        filter = { id };
      } else {
        filter = { id, username };
      }

      const result = await this.db.collection('messages').deleteOne(filter);
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  async deleteAllMessages() {
    try {
      await this.db.collection('messages').deleteMany({});
      return true;
    } catch (error) {
      console.error('Error deleting all messages:', error);
      return false;
    }
  }

  async deleteAllPrivateMessages() {
    try {
      await this.db.collection('private_messages').deleteMany({});
      return true;
    } catch (error) {
      console.error('Error deleting all private messages:', error);
      return false;
    }
  }

  async getPrivateMessageById(id) {
    try {
      const message = await this.db.collection('private_messages').findOne({ id });
      if (!message) return null;

      return {
        id: message.id,
        from: message.from_user,
        to: message.to_user,
        message: message.message,
        color: message.color,
        timestamp: message.timestamp,
        edited: message.edited || false,
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
      await this.db.collection('ip_bans').updateOne(
        { ip_address: normalizedIp },
        { 
          $set: { 
            ip_address: normalizedIp,
            banned_by: bannedBy, 
            reason: reason,
            banned_at: new Date()
          }
        },
        { upsert: true }
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
      const result = await this.db.collection('ip_bans').deleteOne({ ip_address: normalizedIp });
      if (result.deletedCount === 0) {
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
      const result = await this.db.collection('ip_bans').findOne({ ip_address: normalizedIp });
      return result !== null;
    } catch (error) {
      console.error('Error checking IP ban:', error);
      return false;
    }
  }

  async getAllIpBans() {
    try {
      const cursor = this.db.collection('ip_bans').find({}).sort({ banned_at: -1 });
      const bans = [];
      await cursor.forEach(row => bans.push(row));
      return bans;
    } catch (error) {
      console.error('Error getting IP bans:', error);
      return [];
    }
  }

  async saveUserIpHistory(displayName, ipAddress) {
    try {
      const normalizedIp = this.normalizeIpAddress(ipAddress);
      
      await this.db.collection('user_ip_history').deleteMany({ display_name });

      await this.db.collection('user_ip_history').insertOne({
        display_name: displayName,
        ip_address: normalizedIp,
        first_seen: new Date(),
        last_seen: new Date()
      });
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
      const cursor = this.db.collection('user_ip_history')
        .find({})
        .sort({ last_seen: -1 })
        .limit(limit);
      
      const history = [];
      await cursor.forEach(row => {
        history.push({
          displayName: row.display_name,
          ipAddress: row.ip_address,
          firstSeen: row.first_seen,
          lastSeen: row.last_seen
        });
      });
      return history;
    } catch (error) {
      console.error('Error getting user IP history:', error);
      return [];
    }
  }

  async addBannedUser(username, bannedBy, reason = '') {
    try {
      await this.db.collection('banned_users').updateOne(
        { username },
        { 
          $set: { 
            username,
            banned_by: bannedBy, 
            reason: reason,
            banned_at: new Date()
          }
        },
        { upsert: true }
      );
      return true;
    } catch (error) {
      console.error('Error adding banned user:', error);
      return false;
    }
  }

  async removeBannedUser(username) {
    try {
      const result = await this.db.collection('banned_users').deleteOne({ username });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error removing banned user:', error);
      return false;
    }
  }

  async getBannedUsers() {
    try {
      const cursor = this.db.collection('banned_users').find({});
      const users = [];
      await cursor.forEach(row => users.push(row.username));
      return users;
    } catch (error) {
      console.error('Error getting banned users:', error);
      return [];
    }
  }

  async loginWithToken(token, currentIp) {
    try {
      const account = await this.db.collection('accounts').findOne({ login_token: token });

      if (!account) {
        return { success: false, error: 'セッションが無効です' };
      }

      await this.db.collection('accounts').updateOne(
        { _id: account._id },
        { $set: { last_login: new Date() } }
      );

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
      await this.db.collection('accounts').updateOne(
        { login_token: token },
        { $set: { login_token: null } }
      );
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  async updateAccountProfile(displayName, data) {
    try {
      const updates = { $set: {} };

      if (data.color !== undefined) {
        updates.$set.color = data.color;
      }
      if (data.theme !== undefined) {
        updates.$set.theme = data.theme;
      }
      if (data.statusText !== undefined) {
        updates.$set.status_text = data.statusText;
      }

      if (Object.keys(updates.$set).length === 0) return { success: true };

      const result = await this.db.collection('accounts').updateOne({ display_name }, updates);

      if (result.matchedCount === 0) {
        return { success: false, error: 'アカウントが見つかりません' };
      }

      const account = await this.db.collection('accounts').findOne({ display_name });
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
      const account = await this.db.collection('accounts').findOne({ display_name });
      if (!account) return null;

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
}

module.exports = MongoDBAdapter;
