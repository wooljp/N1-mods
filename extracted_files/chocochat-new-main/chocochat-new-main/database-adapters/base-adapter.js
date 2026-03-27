class BaseAdapter {
  constructor(config) {
    this.config = config;
    this.connected = false;
    this.client = null;
  }

  async connect() {
    throw new Error('connect() must be implemented by subclass');
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass');
  }

  async createTables() {
    throw new Error('createTables() must be implemented by subclass');
  }

  async getUsers() {
    throw new Error('getUsers() must be implemented by subclass');
  }

  async upsertUser(username, data) {
    throw new Error('upsertUser() must be implemented by subclass');
  }

  async updateUser(username, data) {
    throw new Error('updateUser() must be implemented by subclass');
  }

  async renameUser(oldUsername, newUsername) {
    throw new Error('renameUser() must be implemented by subclass');
  }

  async getMessages(limit = 500) {
    throw new Error('getMessages() must be implemented by subclass');
  }

  async addMessage(messageData) {
    throw new Error('addMessage() must be implemented by subclass');
  }

  async updateMessage(id, username, newMessage, isPrivilegedAdmin = false) {
    throw new Error('updateMessage() must be implemented by subclass');
  }

  async deleteMessage(id, username, isPrivilegedAdmin = false) {
    throw new Error('deleteMessage() must be implemented by subclass');
  }

  async deleteAllMessages() {
    throw new Error('deleteAllMessages() must be implemented by subclass');
  }

  async deleteAllPrivateMessages() {
    throw new Error('deleteAllPrivateMessages() must be implemented by subclass');
  }

  async getShadowBannedUsers() {
    throw new Error('getShadowBannedUsers() must be implemented by subclass');
  }

  async addShadowBan(username, bannedBy) {
    throw new Error('addShadowBan() must be implemented by subclass');
  }

  async removeShadowBan(username) {
    throw new Error('removeShadowBan() must be implemented by subclass');
  }

  async signup(username, password, registrationIp) {
    throw new Error('signup() must be implemented by subclass');
  }

  async login(username, password, currentIp) {
    throw new Error('login() must be implemented by subclass');
  }

  async loginWithToken(token, currentIp) {
    throw new Error('loginWithToken() must be implemented by subclass');
  }

  async logout(token) {
    throw new Error('logout() must be implemented by subclass');
  }

  async updateAccountProfile(displayName, data) {
    throw new Error('updateAccountProfile() must be implemented by subclass');
  }

  async getAccountByDisplayName(displayName) {
    throw new Error('getAccountByDisplayName() must be implemented by subclass');
  }

  async addPrivateMessage(messageData) {
    throw new Error('addPrivateMessage() must be implemented by subclass');
  }

  async getPrivateMessages(user1, user2, limit = 100) {
    throw new Error('getPrivateMessages() must be implemented by subclass');
  }

  async getAllPrivateMessagesForUser(username, limit = 100) {
    throw new Error('getAllPrivateMessagesForUser() must be implemented by subclass');
  }

  async getAllPrivateMessages(limit = 200) {
    throw new Error('getAllPrivateMessages() must be implemented by subclass');
  }

  async updatePrivateMessage(id, newMessage, isPrivilegedAdmin = false) {
    throw new Error('updatePrivateMessage() must be implemented by subclass');
  }

  async deletePrivateMessage(id, username, isPrivilegedAdmin = false) {
    throw new Error('deletePrivateMessage() must be implemented by subclass');
  }

  async getPrivateMessageById(id) {
    throw new Error('getPrivateMessageById() must be implemented by subclass');
  }

  async addIpBan(ipAddress, bannedBy, reason = '') {
    throw new Error('addIpBan() must be implemented by subclass');
  }

  async removeIpBan(ipAddress) {
    throw new Error('removeIpBan() must be implemented by subclass');
  }

  async isIpBanned(ipAddress) {
    throw new Error('isIpBanned() must be implemented by subclass');
  }

  async getAllIpBans() {
    throw new Error('getAllIpBans() must be implemented by subclass');
  }

  async saveUserIpHistory(displayName, ipAddress) {
    throw new Error('saveUserIpHistory() must be implemented by subclass');
  }

  async getAllUserIpHistory(limit = 500) {
    throw new Error('getAllUserIpHistory() must be implemented by subclass');
  }

  async addBannedUser(username, bannedBy, reason = '') {
    throw new Error('addBannedUser() must be implemented by subclass');
  }

  async removeBannedUser(username) {
    throw new Error('removeBannedUser() must be implemented by subclass');
  }

  async getBannedUsers() {
    throw new Error('getBannedUsers() must be implemented by subclass');
  }

  async seedAdminAccounts(adminUsers, privilegedPasswords, adminPassword) {
    throw new Error('seedAdminAccounts() must be implemented by subclass');
  }

  isUsingDatabase() {
    return this.connected;
  }

  getError() {
    return this.lastError;
  }
}

module.exports = BaseAdapter;
