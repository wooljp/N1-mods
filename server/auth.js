const db = require('../database');

// Username validation: letters, numbers, hiragana, katakana, kanji, and common symbols allowed
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'ユーザー名は必須です' };
  }
  
  // Length check (1-20 characters)
  if (username.length < 1 || username.length > 20) {
    return { valid: false, error: 'ユーザー名は1文字以上20文字以下で入力してください' };
  }
  
  // Character validation: allow letters, numbers, hiragana, katakana, kanji, and common symbols
  // Exclude only whitespace and control characters
  // Regex explanation:
  // ^[^\s\u0000-\u001F\u007F-\u009F]+$ - Allow any characters except whitespace and control characters
  const validUsernameRegex = /^[^\s\u0000-\u001F\u007F-\u009F]+$/;
  
  if (!validUsernameRegex.test(username)) {
    return { 
      valid: false, 
      error: 'ユーザー名にスペースや制御文字は使用できません。' 
    };
  }
  
  return { valid: true };
}

async function signup(username, password, registrationIp) {
  // Validate username first
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return { success: false, error: usernameValidation.error };
  }
  
  return await db.signup(username, password, registrationIp);
}

async function login(username, password, currentIp) {
  return await db.login(username, password, currentIp);
}

async function loginWithToken(token, currentIp) {
  return await db.loginWithToken(token, currentIp);
}

async function logout(token) {
  return await db.logout(token);
}

async function updateAccountProfile(displayName, data) {
  return await db.updateAccountProfile(displayName, data);
}

async function getAccountByDisplayName(displayName) {
  return await db.getAccountByDisplayName(displayName);
}

function generateId() {
  return require('crypto').randomUUID();
}

module.exports = {
  signup,
  login,
  loginWithToken,
  logout,
  updateAccountProfile,
  getAccountByDisplayName,
  generateId,
  validateUsername
};
