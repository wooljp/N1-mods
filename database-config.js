const { DatabaseFactory } = require('./database-adapters');

const MAX_HISTORY = 500;
const ADMIN_USERS = ['ばなな', 'ばななの左腕', 'チョコわかめ', 'ばななの右腕', 'woolisbest#plus', 'woolisbest', 'Yosshy#管理者もどき', 'アイルー'];
const PRIVILEGED_USERS = ['ばなな', 'チョコわかめ', 'ばななの左腕', 'ばななの右腕', 'woolisbest#plus', 'woolisbest', 'Yosshy#管理者もどき', 'アイルー'];
const PRIVILEGED_PASSWORDS = {
  'ばなな': process.env.PASS_BANANA,
  'チョコわかめ': process.env.PASS_CHOCOWAKAME,
  'ばななの左腕': process.env.PASS_BANANA_LEFT,
  'ばななの右腕': process.env.PASS_BANANA_RIGHT,
  'woolisbest#plus': process.env.PASS_WOOLISBEST_PLUS,
  'woolisbest': process.env.PASS_WOOLISBEST,
  'Yosshy#管理者もどき': process.env.PASS_YOSSHY,
  'アイルー': process.env.PASS_AIROU
};

function parseConnectionString(databaseUrl) {
  console.log('[Database] Parsing connection string...');
  
  try {
    const url = new URL(databaseUrl);
    
    const type = DatabaseFactory.detectDatabaseType(databaseUrl);
    if (!type) {
      throw new Error('Unsupported database type in connection string');
    }

    let config = {
      type,
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : getDefaultPort(type),
      user: decodeURIComponent(url.username || 'root'),
      password: decodeURIComponent(url.password || ''),
      database: url.pathname.replace(/^\//, '') || 'test'
    };

    if (type === 'mongodb') {
      config.uri = databaseUrl;
    }

    if (url.searchParams.has('sslmode') && url.searchParams.get('sslmode') === 'require') {
      config.ssl = { rejectUnauthorized: false };
    }

    console.log(`[Database] ✅ ${type.toUpperCase()} connection string parsed successfully:
      Host: ${config.host}
      Port: ${config.port}
      User: ${config.user}
      Database: ${config.database}`);

    return config;
  } catch (error) {
    console.error('[Database] ❌ Error parsing connection string:', error.message);
    throw error;
  }
}

function getDefaultPort(type) {
  switch (type) {
    case 'mysql': return 3306;
    case 'postgresql': return 5432;
    case 'mongodb': return 27017;
    default: return 3306;
  }
}

let adapter = null;
let useDatabase = false;
let dbError = null;

async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    dbError = {
      type: 'NO_DATABASE_URL',
      message: 'DATABASE_URLが設定されていません',
      cause: '環境変数DATABASE_URLが未設定です',
      solution: 'データベースのコネクション文字列をDATABASE_URLに設定してください。'
    };
    console.log('[Database] ❌ DATABASE_URL not set');
    return false;
  }

  try {
    const config = parseConnectionString(databaseUrl);
    config.adminUsers = ADMIN_USERS;
    config.privilegedPasswords = PRIVILEGED_PASSWORDS;
    config.adminPassword = process.env.ADMIN_PASSWORD;

    adapter = DatabaseFactory.createAdapter(config.type, config);
    
    console.log(`[Database] Connecting to ${config.type.toUpperCase()}...`);
    await adapter.connect();
    
    console.log(`[Database] ✅ Successfully connected to ${config.type.toUpperCase()}!`);

    await adapter.createTables();
    await adapter.seedAdminAccounts(ADMIN_USERS, PRIVILEGED_PASSWORDS, process.env.ADMIN_PASSWORD);

    useDatabase = true;
    dbError = null;
    return true;
  } catch (error) {
    console.error('[Database] ❌ Connection failed:', error.message);

    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      dbError = {
        type: 'HOST_NOT_FOUND',
        message: 'ホストが見つかりません',
        cause: error.message,
        solution: 'DATABASE_URL のホスト名を確認してください。'
      };
    } else if (error.message.includes('Access denied') || error.message.includes('authentication')) {
      dbError = {
        type: 'AUTH_FAILED',
        message: '認証に失敗しました',
        cause: 'ユーザー名またはパスワードが間違っています',
        solution: 'DATABASE_URL を確認してください。'
      };
    } else {
      dbError = {
        type: 'CONNECTION_ERROR',
        message: 'データベース接続エラー',
        cause: error.message,
        solution: 'DATABASE_URLと接続設定を確認してください。'
      };
    }

    return false;
  }
}

function getDbError() {
  return dbError;
}

function isUsingDatabase() {
  return useDatabase;
}

function getDatabaseType() {
  return adapter ? adapter.config?.type : null;
}

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

async function closeDatabase() {
  if (adapter) {
    await adapter.disconnect();
    adapter = null;
  }
  useDatabase = false;
}

function safeCall(func, ...args) {
  if (!adapter || !useDatabase) {
    console.warn('[Database] Database not available, skipping operation');
    return null;
  }
  
  try {
    return adapter[func](...args);
  } catch (error) {
    console.error(`[Database] Error in ${func}:`, error.message);
    return null;
  }
}

module.exports = {
  initDatabase,
  isUsingDatabase,
  getDbError,
  getDatabaseType,
  normalizeIpAddress,
  closeDatabase,
  MAX_HISTORY,
  ADMIN_USERS,
  
  getUsers: () => safeCall('getUsers'),
  upsertUser: (...args) => safeCall('upsertUser', ...args),
  updateUser: (...args) => safeCall('updateUser', ...args),
  renameUser: (...args) => safeCall('renameUser', ...args),
  getMessages: (...args) => safeCall('getMessages', ...args),
  addMessage: (...args) => safeCall('addMessage', ...args),
  updateMessage: (...args) => safeCall('updateMessage', ...args),
  deleteMessage: (...args) => safeCall('deleteMessage', ...args),
  deleteAllMessages: () => safeCall('deleteAllMessages'),
  deleteAllPrivateMessages: () => safeCall('deleteAllPrivateMessages'),
  getShadowBannedUsers: () => safeCall('getShadowBannedUsers'),
  addShadowBan: (...args) => safeCall('addShadowBan', ...args),
  removeShadowBan: (...args) => safeCall('removeShadowBan', ...args),
  signup: (...args) => safeCall('signup', ...args),
  login: (...args) => safeCall('login', ...args),
  loginWithToken: (...args) => safeCall('loginWithToken', ...args),
  logout: (...args) => safeCall('logout', ...args),
  updateAccountProfile: (...args) => safeCall('updateAccountProfile', ...args),
  getAccountByDisplayName: (...args) => safeCall('getAccountByDisplayName', ...args),
  addPrivateMessage: (...args) => safeCall('addPrivateMessage', ...args),
  getPrivateMessages: (...args) => safeCall('getPrivateMessages', ...args),
  getAllPrivateMessagesForUser: (...args) => safeCall('getAllPrivateMessagesForUser', ...args),
  getAllPrivateMessages: (...args) => safeCall('getAllPrivateMessages', ...args),
  updatePrivateMessage: (...args) => safeCall('updatePrivateMessage', ...args),
  deletePrivateMessage: (...args) => safeCall('deletePrivateMessage', ...args),
  getPrivateMessageById: (...args) => safeCall('getPrivateMessageById', ...args),
  addIpBan: (...args) => safeCall('addIpBan', ...args),
  removeIpBan: (...args) => safeCall('removeIpBan', ...args),
  isIpBanned: (...args) => safeCall('isIpBanned', ...args),
  getAllIpBans: () => safeCall('getAllIpBans'),
  saveUserIpHistory: (...args) => safeCall('saveUserIpHistory', ...args),
  getAllUserIpHistory: (...args) => safeCall('getAllUserIpHistory', ...args),
  addBannedUser: (...args) => safeCall('addBannedUser', ...args),
  removeBannedUser: (...args) => safeCall('removeBannedUser', ...args),
  getBannedUsers: () => safeCall('getBannedUsers')
};

// エクスポート
module.exports = {
  ADMIN_USERS,
  PRIVILEGED_USERS,
  PRIVILEGED_PASSWORDS,
  initDatabase,
  parseConnectionString,
  getDefaultPort,
  safeCall
};
