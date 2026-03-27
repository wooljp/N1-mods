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

    // SSL設定の処理
    if (url.searchParams.has('ssl')) {
      try {
        const sslConfig = JSON.parse(url.searchParams.get('ssl'));
        config.ssl = sslConfig;
      } catch (e) {
        config.ssl = { rejectUnauthorized: true };
      }
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

// 複数データベースアダプター
let accountAdapter = null;
let messageAdapter = null;
let useDatabase = false;
let dbError = null;

async function initDatabase() {
  const accountDbUrl = process.env.ACCOUNT_DATABASE_URL || 
    'mysql://3RuJearhG6mBc5U.root:I9Zv1Xm2CJPdkU9v@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}';
  
  const messageDbUrl = process.env.MESSAGE_DATABASE_URL || process.env.DATABASE_URL;

  if (!accountDbUrl && !messageDbUrl) {
    console.log('[Database] ❌ No database URLs set, using memory fallback for messages');
    // メッセージのみメモリフォールバック
    useDatabase = true;
    return true;
  }

  try {
    // アカウント管理用データベース（TiDB MySQL）
    if (accountDbUrl) {
      console.log('[Database] Initializing account database...');
      const accountConfig = parseConnectionString(accountDbUrl);
      accountConfig.adminUsers = ADMIN_USERS;
      accountConfig.privilegedPasswords = PRIVILEGED_PASSWORDS;
      accountConfig.adminPassword = process.env.ADMIN_PASSWORD;

      accountAdapter = DatabaseFactory.createAdapter(accountConfig.type, accountConfig);
      
      console.log(`[Database] Connecting to account database (${accountConfig.type.toUpperCase()})...`);
      await accountAdapter.connect();
      
      console.log(`[Database] ✅ Account database connected!`);

      await accountAdapter.createTables();
      await accountAdapter.seedAdminAccounts(ADMIN_USERS, PRIVILEGED_PASSWORDS, process.env.ADMIN_PASSWORD);
    }

    // メッセージ管理用データベース（Render PostgreSQL）
    if (messageDbUrl && messageDbUrl !== accountDbUrl) {
      console.log('[Database] Initializing message database...');
      const messageConfig = parseConnectionString(messageDbUrl);
      messageConfig.adminUsers = ADMIN_USERS;
      messageConfig.privilegedPasswords = PRIVILEGED_PASSWORDS;
      messageConfig.adminPassword = process.env.ADMIN_PASSWORD;

      messageAdapter = DatabaseFactory.createAdapter(messageConfig.type, messageConfig);
      
      console.log(`[Database] Connecting to message database (${messageConfig.type.toUpperCase()})...`);
      await messageAdapter.connect();
      
      console.log(`[Database] ✅ Message database connected!`);

      await messageAdapter.createTables();
    } else if (messageDbUrl === accountDbUrl) {
      // 同じデータベースを使用する場合
      messageAdapter = accountAdapter;
      console.log('[Database] Using same database for both accounts and messages');
    } else if (!messageDbUrl && accountAdapter) {
      // メッセージDBがない場合、アカウントDBを使用
      messageAdapter = accountAdapter;
      console.log('[Database] No message database specified, using account database for messages');
    }

    useDatabase = true;
    dbError = null;
    return true;
  } catch (error) {
    console.error('[Database] ❌ Connection failed:', error.message);

    // メッセージDB接続失敗時のフォールバック
    if (error.message.includes('message') || !messageAdapter) {
      console.log('[Database] ⚠️ Message database failed, using memory fallback for messages');
      if (accountAdapter) {
        messageAdapter = accountAdapter;
        console.log('[Database] Using account database for messages as fallback');
      }
    }

    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      dbError = {
        type: 'HOST_NOT_FOUND',
        message: 'ホストが見つかりません',
        cause: error.message,
        solution: 'データベースURLのホスト名を確認してください。'
      };
    } else if (error.message.includes('Access denied') || error.message.includes('authentication')) {
      dbError = {
        type: 'AUTH_FAILED',
        message: '認証に失敗しました',
        cause: 'ユーザー名またはパスワードが間違っています',
        solution: 'データベースURLを確認してください。'
      };
    } else {
      dbError = {
        type: 'CONNECTION_ERROR',
        message: 'データベース接続エラー',
        cause: error.message,
        solution: 'データベースURLと接続設定を確認してください。'
      };
    }

    // 少なくともアカウントDBが接続できていれば成功とする
    if (accountAdapter) {
      console.log('[Database] ⚠️ Some databases failed but account DB is available');
      useDatabase = true;
      return true;
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
  const types = [];
  if (accountAdapter) types.push(`Account: ${accountAdapter.config?.type}`);
  if (messageAdapter) types.push(`Message: ${messageAdapter.config?.type}`);
  return types.join(', ') || null;
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
  if (accountAdapter && accountAdapter !== messageAdapter) {
    await accountAdapter.disconnect();
  }
  if (messageAdapter) {
    await messageAdapter.disconnect();
  }
  accountAdapter = null;
  messageAdapter = null;
  useDatabase = false;
}

function safeCall(adapter, func, ...args) {
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

// アカウント管理用関数
function accountCall(func, ...args) {
  return safeCall(accountAdapter, func, ...args);
}

// メッセージ管理用関数
function messageCall(func, ...args) {
  return safeCall(messageAdapter || accountAdapter, func, ...args);
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
  
  // アカウント管理
  getUsers: () => accountCall('getUsers'),
  upsertUser: (...args) => accountCall('upsertUser', ...args),
  updateUser: (...args) => accountCall('updateUser', ...args),
  renameUser: (...args) => accountCall('renameUser', ...args),
  signup: (...args) => accountCall('signup', ...args),
  login: (...args) => accountCall('login', ...args),
  loginWithToken: (...args) => accountCall('loginWithToken', ...args),
  logout: (...args) => accountCall('logout', ...args),
  updateAccountProfile: (...args) => accountCall('updateAccountProfile', ...args),
  getAccountByDisplayName: (...args) => accountCall('getAccountByDisplayName', ...args),
  
  // メッセージ管理
  getMessages: (...args) => messageCall('getMessages', ...args),
  addMessage: (...args) => messageCall('addMessage', ...args),
  updateMessage: (...args) => messageCall('updateMessage', ...args),
  deleteMessage: (...args) => messageCall('deleteMessage', ...args),
  deleteAllMessages: () => messageCall('deleteAllMessages'),
  
  // プライベートメッセージ
  addPrivateMessage: (...args) => messageCall('addPrivateMessage', ...args),
  getPrivateMessages: (...args) => messageCall('getPrivateMessages', ...args),
  getAllPrivateMessagesForUser: (...args) => messageCall('getAllPrivateMessagesForUser', ...args),
  getAllPrivateMessages: (...args) => messageCall('getAllPrivateMessages', ...args),
  updatePrivateMessage: (...args) => messageCall('updatePrivateMessage', ...args),
  deletePrivateMessage: (...args) => messageCall('deletePrivateMessage', ...args),
  deleteAllPrivateMessages: () => messageCall('deleteAllPrivateMessages'),
  getPrivateMessageById: (...args) => messageCall('getPrivateMessageById', ...args),
  
  // BAN管理
  getShadowBannedUsers: () => accountCall('getShadowBannedUsers'),
  addShadowBan: (...args) => accountCall('addShadowBan', ...args),
  removeShadowBan: (...args) => accountCall('removeShadowBan', ...args),
  addBannedUser: (...args) => accountCall('addBannedUser', ...args),
  removeBannedUser: (...args) => accountCall('removeBannedUser', ...args),
  getBannedUsers: () => accountCall('getBannedUsers'),
  
  // IP管理
  addIpBan: (...args) => accountCall('addIpBan', ...args),
  removeIpBan: (...args) => accountCall('removeIpBan', ...args),
  isIpBanned: (...args) => accountCall('isIpBan', ...args),
  getAllIpBans: () => accountCall('getAllIpBans'),
  saveUserIpHistory: (...args) => accountCall('saveUserIpHistory', ...args),
  getAllUserIpHistory: (...args) => accountCall('getAllUserIpHistory', ...args)
};

// エクスポート
module.exports = {
  ADMIN_USERS,
  PRIVILEGED_USERS,
  PRIVILEGED_PASSWORDS,
  initAccountDatabase,
  initMessageDatabase,
  initDatabases,
  parseConnectionString,
  getDefaultPort,
  safeCall,
  accountCall
};
