const db = require('../database');

function normalizeIpAddress(ip) {
  if (!ip) return ip;
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  if (ip === '::1') {
    return '127.0.0.1';
  }
  return ip;
}

function getClientIp(socket) {
  let ip;
  const forwardedFor = socket.handshake.headers['x-forwarded-for'];
  if (forwardedFor) {
    ip = forwardedFor.split(',')[0].trim();
  } else {
    ip = socket.handshake.address;
  }
  return normalizeIpAddress(ip);
}

async function addIpBan(ipAddress, bannedBy, reason = '') {
  return await db.addIpBan(ipAddress, bannedBy, reason);
}

async function removeIpBan(ipAddress) {
  return await db.removeIpBan(ipAddress);
}

async function isIpBanned(ipAddress) {
  return await db.isIpBanned(ipAddress);
}

async function getAllIpBans() {
  return await db.getAllIpBans();
}

async function saveUserIpHistory(displayName, ipAddress) {
  return await db.saveUserIpHistory(displayName, ipAddress);
}

async function getAllUserIpHistory(limit = 500) {
  return await db.getAllUserIpHistory(limit);
}

async function addBannedUser(username, bannedBy, reason = '') {
  return await db.addBannedUser(username, bannedBy, reason);
}

async function removeBannedUser(username) {
  return await db.removeBannedUser(username);
}

async function getBannedUsers() {
  return await db.getBannedUsers();
}

async function getShadowBannedUsers() {
  return await db.getShadowBannedUsers();
}

async function addShadowBan(username, bannedBy) {
  return await db.addShadowBan(username, bannedBy);
}

async function removeShadowBan(username) {
  return await db.removeShadowBan(username);
}

module.exports = {
  normalizeIpAddress,
  getClientIp,
  addIpBan,
  removeIpBan,
  isIpBanned,
  getAllIpBans,
  saveUserIpHistory,
  getAllUserIpHistory,
  addBannedUser,
  removeBannedUser,
  getBannedUsers,
  getShadowBannedUsers,
  addShadowBan,
  removeShadowBan
};
