const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./database');

// Import modules
const auth = require('./server/auth');
const ipModule = require('./server/ip');
const messageModule = require('./server/message');
const commandModule = require('./server/command');
const captcha = require('./server/captcha');
const GeoIPBlocker = require('./server/geoip');

// Import admin and privileged user lists
const { ADMIN_USERS, PRIVILEGED_USERS } = require('./database-config');

// Initialize GeoIP blocker
const geoIPBlocker = new GeoIPBlocker();

// Set privileged admin list for GeoIP
geoIPBlocker.setPrivilegedAdmins(PRIVILEGED_USERS);

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 10000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  maxHttpBufferSize: 1e7,
  connectTimeout: 45000
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Trust proxy for IP detection
app.set('trust proxy', true);

// GeoIP blocking middleware
app.use((req, res, next) => {
  geoIPBlocker.checkAccess(req, res, next);
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    storage: db.isUsingDatabase() ? `${db.getDatabaseType()} (connected)` : 'not connected'
  });
});

// CAPTCHAエンドポイント
app.get('/api/captcha', (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    
    // IPベースのレート制限チェック
    const rateLimit = captcha.checkIpRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: rateLimit.error,
        nextRequestTime: rateLimit.nextRequestTime
      });
    }
    
    // CAPTCHA生成
    const captchaData = captcha.generateEmojiCaptcha();
    
    res.json({
      success: true,
      captcha: captchaData
    });
  } catch (error) {
    console.error('[CAPTCHA] Error generating captcha:', error);
    res.status(500).json({
      success: false,
      error: 'CAPTCHAの生成に失敗しました'
    });
  }
});

app.post('/api/captcha/validate', express.json(), (req, res) => {
  try {
    const { id, answer } = req.body;
    
    if (!id || !answer) {
      return res.status(400).json({
        success: false,
        error: 'CAPTCHA IDと回答が必要です'
      });
    }
    
    // CAPTCHA検証
    const validation = captcha.validateCaptcha(id, answer);
    
    res.json({
      success: validation.valid,
      error: validation.error || null
    });
  } catch (error) {
    console.error('[CAPTCHA] Error validating captcha:', error);
    res.status(500).json({
      success: false,
      error: 'CAPTCHAの検証に失敗しました'
    });
  }
});

// トークン検証API
app.post('/api/auth/validate', express.json(), async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        valid: false,
        error: 'トークンが必要です'
      });
    }
    
    // データベースでトークンを検証
    const result = await db.loginWithToken(token, req.ip);
    
    if (!result.success) {
      return res.json({
        valid: false,
        error: result.error || '無効なトークンです'
      });
    }
    
    // 管理者権限を確認
    const isAdmin = ADMIN_USERS.includes(result.account.displayName);
    const isPrivilegedAdmin = PRIVILEGED_USERS.includes(result.account.displayName);
    
    res.json({
      valid: true,
      displayName: result.account.displayName,
      isAdmin,
      isPrivilegedAdmin,
      account: result.account
    });
    
  } catch (error) {
    console.error('[Auth] Token validation error:', error);
    res.status(500).json({
      valid: false,
      error: 'トークン検証に失敗しました'
    });
  }
});

// GeoIP管理API
app.get('/api/geoip/stats', (req, res) => {
  try {
    const clientIP = geoIPBlocker.getClientIP(req);
    const isJapanese = geoIPBlocker.isJapaneseIP(clientIP);
    const stats = geoIPBlocker.getBlockStats();
    
    // 特権管理者IP情報を追加
    const privilegedAdminIPs = Array.from(geoIPBlocker.privilegedAdminIPs);
    
    // プロキシ・VPN IP情報を追加
    const allowedProxyVPNIPs = geoIPBlocker.getAllowedProxyVPNIPs();
    
    res.json({
      success: true,
      currentIP: clientIP,
      isJapaneseIP: isJapanese,
      stats: stats,
      privilegedAdminIPs: privilegedAdminIPs,
      privilegedAdminCount: privilegedAdminIPs.length,
      allowedProxyVPNIPs: allowedProxyVPNIPs,
      allowedProxyVPNCount: allowedProxyVPNIPs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[GeoIP] Stats error:', error);
    res.status(500).json({
      success: false,
      error: '統計情報の取得に失敗しました'
    });
  }
});

app.post('/api/geoip/allow-ip', express.json(), (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IPアドレスが必要です'
      });
    }
    
    geoIPBlocker.allowIP(ip);
    
    res.json({
      success: true,
      message: `IP ${ip} を許可リストに追加しました`,
      ip: ip
    });
  } catch (error) {
    console.error('[GeoIP] Allow IP error:', error);
    res.status(500).json({
      success: false,
      error: 'IPの許可に失敗しました'
    });
  }
});

app.post('/api/geoip/disallow-ip', express.json(), (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IPアドレスが必要です'
      });
    }
    
    geoIPBlocker.disallowIP(ip);
    
    res.json({
      success: true,
      message: `IP ${ip} を許可リストから削除しました`,
      ip: ip
    });
  } catch (error) {
    console.error('[GeoIP] Disallow IP error:', error);
    res.status(500).json({
      success: false,
      error: 'IPの拒否に失敗しました'
    });
  }
});

app.post('/api/geoip/clear-log', (req, res) => {
  try {
    geoIPBlocker.clearBlockLog();
    
    res.json({
      success: true,
      message: 'ブロックログをクリアしました'
    });
  } catch (error) {
    console.error('[GeoIP] Clear log error:', error);
    res.status(500).json({
      success: false,
      error: 'ログのクリアに失敗しました'
    });
  }
});

app.post('/api/geoip/remove-privileged-ip', express.json(), (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IPアドレスが必要です'
      });
    }
    
    geoIPBlocker.unregisterPrivilegedAdminIP(ip);
    
    res.json({
      success: true,
      message: `特権管理者IP ${ip} を削除しました`,
      ip: ip
    });
  } catch (error) {
    console.error('[GeoIP] Remove privileged IP error:', error);
    res.status(500).json({
      success: false,
      error: '特権管理者IPの削除に失敗しました'
    });
  }
});

// プロキシ・VPN IP管理API
app.post('/api/geoip/allow-proxy-vpn-ip', express.json(), (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IPアドレスが必要です'
      });
    }
    
    geoIPBlocker.allowProxyVPNIP(ip);
    
    res.json({
      success: true,
      message: `プロキシ・VPN IP ${ip} を許可リストに追加しました`,
      ip: ip
    });
  } catch (error) {
    console.error('[GeoIP] Allow proxy/VPN IP error:', error);
    res.status(500).json({
      success: false,
      error: 'プロキシ・VPN IPの許可に失敗しました'
    });
  }
});

app.post('/api/geoip/disallow-proxy-vpn-ip', express.json(), (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IPアドレスが必要です'
      });
    }
    
    geoIPBlocker.disallowProxyVPNIP(ip);
    
    res.json({
      success: true,
      message: `プロキシ・VPN IP ${ip} を許可リストから削除しました`,
      ip: ip
    });
  } catch (error) {
    console.error('[GeoIP] Disallow proxy/VPN IP error:', error);
    res.status(500).json({
      success: false,
      error: 'プロキシ・VPN IPの拒否に失敗しました'
    });
  }
});

app.post('/api/geoip/allow-multiple-proxy-vpn-ips', express.json(), (req, res) => {
  try {
    const { ips } = req.body;
    
    if (!ips || !Array.isArray(ips)) {
      return res.status(400).json({
        success: false,
        error: 'IPアドレスの配列が必要です'
      });
    }
    
    geoIPBlocker.allowMultipleProxyVPNIPs(ips);
    
    res.json({
      success: true,
      message: `${ips.length}個のプロキシ・VPN IPを許可リストに追加しました`,
      count: ips.length,
      ips: ips
    });
  } catch (error) {
    console.error('[GeoIP] Allow multiple proxy/VPN IPs error:', error);
    res.status(500).json({
      success: false,
      error: 'プロキシ・VPN IPの一括許可に失敗しました'
    });
  }
});

app.get('/api/geoip/proxy-vpn-ips', (req, res) => {
  try {
    const allowedProxyVPNIPs = geoIPBlocker.getAllowedProxyVPNIPs();
    
    res.json({
      success: true,
      proxyVPNIPs: allowedProxyVPNIPs,
      count: allowedProxyVPNIPs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[GeoIP] Get proxy/VPN IPs error:', error);
    res.status(500).json({
      success: false,
      error: 'プロキシ・VPN IPリストの取得に失敗しました'
    });
  }
});

// データ再読み込みAPI
app.post('/api/geoip/reload-data', (req, res) => {
  try {
    const success = geoIPBlocker.reloadData();
    
    if (success) {
      const japanInfo = geoIPBlocker.getJapanIPRangesInfo();
      const proxyVpnInfo = geoIPBlocker.getProxyVPNIPsInfo();
      
      res.json({
        success: true,
        message: 'IPデータを再読み込みしました',
        data: {
          japanIPRanges: japanInfo?.totalRanges || 0,
          proxyVPNIPs: proxyVpnInfo?.statistics?.totalIPs || 0,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'IPデータの再読み込みに失敗しました'
      });
    }
  } catch (error) {
    console.error('[GeoIP] Reload data error:', error);
    res.status(500).json({
      success: false,
      error: 'データ再読み込み中にエラーが発生しました'
    });
  }
});

// データ情報取得API
app.get('/api/geoip/data-info', (req, res) => {
  try {
    const japanInfo = geoIPBlocker.getJapanIPRangesInfo();
    const proxyVpnInfo = geoIPBlocker.getProxyVPNIPsInfo();
    
    res.json({
      success: true,
      data: {
        japanIPRanges: japanInfo || null,
        proxyVPNIPs: proxyVpnInfo || null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[GeoIP] Get data info error:', error);
    res.status(500).json({
      success: false,
      error: 'データ情報の取得に失敗しました'
    });
  }
});

// Global state
let users = {};
const onlineUsers = new Map();
const userSockets = new Map();
const adminUsers = new Set();
const mutedUsers = new Map();
const userStatusMap = new Map();
const shadowBannedUsers = new Set();

// Helper functions
function addUserSocket(displayName, socketId) {
  if (!userSockets.has(displayName)) {
    userSockets.set(displayName, new Set());
  }
  userSockets.get(displayName).add(socketId);
}

function removeUserSocket(displayName, socketId) {
  if (userSockets.has(displayName)) {
    userSockets.get(displayName).delete(socketId);
    if (userSockets.get(displayName).size === 0) {
      userSockets.delete(displayName);
      return true;
    }
  }
  return false;
}

function getUniqueOnlineUsers() {
  return Array.from(userSockets.keys());
}

// Initialize shadowbanned users from database
(async () => {
  const dbShadowBanned = await ipModule.getShadowBannedUsers();
  dbShadowBanned.forEach(u => shadowBannedUsers.add(u));
  console.log(`Loaded ${shadowBannedUsers.size} shadowbanned users from database`);
})();

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    
    if (!token) {
      console.log('[Auth] ❌ Connection rejected: No token provided');
      return next(new Error('Authentication required'));
    }
    
    // トークンの検証（ここでデータベースやJWT検証を行う）
    // 簡単な検証として、トークンの形式をチェック
    if (typeof token !== 'string' || token.length < 10) {
      console.log('[Auth] ❌ Connection rejected: Invalid token format');
      return next(new Error('Invalid token'));
    }
    
    console.log('[Auth] ✅ Authentication successful for socket');
    socket.authenticated = true;
    socket.authToken = token;
    next();
  } catch (error) {
    console.error('[Auth] ❌ Authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  // 認証されていない場合は接続を拒否（ミドルウェアで処理済み）
  if (!socket.authenticated) {
    console.log('[Auth] ❌ Unauthorized connection attempt');
    return;
  }
  
  let currentUser = null;

  // Helper functions for this socket
  socket.mutedUsers = mutedUsers;
  socket.userSockets = userSockets;
  socket.getUniqueOnlineUsers = getUniqueOnlineUsers;

  // Get client IP for GeoIP
  const clientIP = ipModule.getClientIp(socket);
  
  socket.on('login', async (data, callback) => {
    if (typeof callback !== 'function') callback = () => {};
    
    const { username, password, token } = data;
    const currentIp = ipModule.getClientIp(socket);
    
    // Check if user is privileged admin and register IP
    const isPrivilegedAdmin = PRIVILEGED_USERS.includes(username);
    if (isPrivilegedAdmin && clientIP) {
      geoIPBlocker.registerPrivilegedAdminIP(clientIP, username);
      console.log(`[GeoIP] Registered privileged admin IP: ${username} -> ${clientIP}`);
    }

    // Check if IP is banned
    if (await ipModule.isIpBanned(currentIp)) {
      return callback({ success: false, error: 'IPアドレスがBANされています' });
    }

    // Check if user is banned
    const bannedUsers = await ipModule.getBannedUsers();
    if (bannedUsers.includes(username)) {
      return callback({ success: false, error: 'ユーザーがBANされています' });
    }

    let result;
    if (token) {
      result = await auth.loginWithToken(token, currentIp);
    } else if (username && password) {
      result = await auth.login(username, password, currentIp);
    } else {
      return callback({ success: false, error: 'ログイン情報が不足しています' });
    }

    if (result.success) {
      currentUser = result.account.displayName;
      socket.currentUser = currentUser;

      // Check for shadowban
      if (shadowBannedUsers.has(currentUser)) {
        console.log(`Shadowbanned user attempted login: ${currentUser}`);
        // Allow login but messages won't be delivered
      }

      addUserSocket(currentUser, socket.id);

      if (result.account.isAdmin || db.ADMIN_USERS.includes(currentUser)) {
        adminUsers.add(socket.id);
      }

      if (result.account.statusText) {
        userStatusMap.set(currentUser, result.account.statusText);
      }

      let currentMessages = [];
      currentMessages = messageModule.getMessages();

      let privateMessages = [];
      // Filter private messages for current user (in-memory)
      privateMessages = messageModule.getAllPrivateMessagesForUser(currentUser);

      let monitorPMs = [];
      const canMonitorPM = db.ADMIN_USERS.includes(currentUser);
      if (canMonitorPM) {
        // Use all private messages from memory for monitoring
        monitorPMs = messageModule.getAllPrivateMessages();
      }

      let ipBanList = [];
      let userIpHistory = [];
      const isAdminUser = result.account.isAdmin || db.ADMIN_USERS.includes(currentUser);
      if (isAdminUser) {
        try {
          ipBanList = await ipModule.getAllIpBans();
          userIpHistory = await ipModule.getAllUserIpHistory();
        } catch (adminDataError) {
          console.error('Error fetching admin data:', adminDataError.message);
        }
      }

      const uniqueOnlineUsers = getUniqueOnlineUsers();

      callback({
        success: true,
        account: result.account,
        messages: currentMessages,
        privateMessages: privateMessages,
        monitorPMs: monitorPMs,
        onlineUsers: uniqueOnlineUsers,
        ipBanList: ipBanList,
        userIpHistory: userIpHistory,
        isAdmin: isAdminUser
      });

      socket.broadcast.emit('userJoined', {
        username: currentUser,
        color: result.account.color,
        statusText: result.account.statusText
      });

    } else {
      callback(result);
    }
  });

  socket.on('signup', async (data, callback) => {
    if (typeof callback !== 'function') callback = () => {};
    
    const { username, password } = data;
    const currentIp = ipModule.getClientIp(socket);

    // Check if IP is banned
    if (await ipModule.isIpBanned(currentIp)) {
      return callback({ success: false, error: 'IPアドレスがBANされています' });
    }

    const result = await auth.signup(username, password, currentIp);
    callback(result);
  });

  socket.on('chatMessage', async (data, callback) => {
    if (typeof callback !== 'function') callback = () => {};
    if (!currentUser) return callback({ success: false, error: 'ログインしてください' });

    const { message, replyTo } = data;

    // Check for shadowban
    if (shadowBannedUsers.has(currentUser)) {
      // Pretend message was sent successfully, but don't actually send it
      return callback({ success: true });
    }

    // Check mute status
    const muteStatus = messageModule.checkMuted(currentUser, mutedUsers);
    if (muteStatus.muted) {
      return callback({ success: false, error: `ミュートされています。残り時間: ${muteStatus.remaining}秒` });
    }

    // Rate limiting
    if (!messageModule.checkRateLimit(currentUser)) {
      return callback({ success: false, error: 'メッセージの送信レートが制限されています（1秒に1回まで）' });
    }

    // Anti-spam check
    if (messageModule.addSpamCheck(currentUser, message)) {
      return callback({ success: false, error: 'スパムと判定されました。同じメッセージの連投はお控えください。' });
    }

    const messageData = {
      id: auth.generateId(),
      username: currentUser,
      message: message.trim(),
      color: users[currentUser]?.color || '#000000',
      timestamp: new Date().toISOString(),
      replyTo: replyTo || null
    };

    messageModule.addMessage(messageData);
    io.emit('message', messageData);
    callback({ success: true });
  });

  socket.on('privateMessage', async (data, callback) => {
    if (typeof callback !== 'function') callback = () => {};
    if (!currentUser) return callback({ success: false, error: 'ログインしてください' });

    const { to: prmTarget, message: prmMessage } = data;

    if (!prmTarget || !prmMessage) {
      return callback({ success: false, error: '送信先とメッセージを指定してください' });
    }

    if (!userSockets.has(prmTarget)) {
      return callback({ success: false, error: 'そのユーザーはオンラインではありません' });
    }
    if (prmTarget === currentUser) {
      return callback({ success: false, error: '自分自身にプライベートメッセージは送れません' });
    }

    const prmTimestamp = new Date().toISOString();
    const prmColor = users[currentUser]?.color || '#000000';
    const prmId = auth.generateId();

    // Add private message to in-memory storage
    const prmData = {
      id: prmId,
      from: currentUser,
      to: prmTarget,
      message: prmMessage,
      color: prmColor,
      timestamp: prmTimestamp
    };
    messageModule.addPrivateMessage(prmData);

    const prmTargetSocketSet = userSockets.get(prmTarget);
    for (const sid of prmTargetSocketSet) {
      const prmTargetSocketObj = io.sockets.sockets.get(sid);
      if (prmTargetSocketObj) {
        prmTargetSocketObj.emit('privateMessage', prmData);
      }
    }

    socket.emit('privateMessage', prmData);

    // Send to admin monitoring
    for (const adminName of db.ADMIN_USERS) {
      if (adminName === 'ばななの右腕') continue; // 「ばななの右腕」は除外
      const adminSocketSet = userSockets.get(adminName);
      if (adminSocketSet) {
        for (const sid of adminSocketSet) {
          const adminSocketObj = io.sockets.sockets.get(sid);
          if (adminSocketObj) {
            adminSocketObj.emit('privateMessage', prmData);
          }
        }
      }
    }

    callback({ success: true });
  });

  socket.on('editMessage', async ({ id, message }, callback) => {
    if (typeof callback !== 'function') callback = () => {};
    if (!currentUser) return callback({ success: false, error: 'ログインしてください' });

    const muteStatus = messageModule.checkMuted(currentUser, mutedUsers);
    if (muteStatus.muted) {
      return callback({ success: false, error: `ミュートされています。残り時間: ${muteStatus.remaining}秒` });
    }

    const isPrivilegedAdmin = db.ADMIN_USERS.includes(currentUser);
    
    // Find message in memory and check permissions
    const messageIndex = messageModule.getMessages().findIndex(m => m.id === id);
    if (messageIndex === -1) {
      return callback({ success: false, error: 'メッセージが見つかりません' });
    }
    
    const messageObj = messageModule.getMessages()[messageIndex];
    const isOwner = messageObj.username === currentUser;
    
    if (!isOwner && !isPrivilegedAdmin) {
      return callback({ success: false, error: '編集権限がありません' });
    }

    // Update message in memory
    const updatedMessage = messageModule.updateMessage(id, message);

    io.emit('messageUpdated', updatedMessage);
    callback({ success: true });
  });

  socket.on('deleteMessage', async (data, callback) => {
    if (typeof callback !== 'function') callback = () => {};
    if (!currentUser) return callback({ success: false, error: 'ログインしてください' });

    const id = (typeof data === 'object' && data !== null) ? data.id : data;
    if (!id) return callback({ success: false, error: 'IDが指定されていません' });

    const isPrivilegedAdmin = db.ADMIN_USERS.includes(currentUser);
    
    // メッセージの所有者確認（メモリ上のキャッシュを確認）
    const msg = messageModule.findMessage(id);
    const isOwner = msg && msg.username === currentUser;

    if (!isOwner && !isPrivilegedAdmin) {
      return callback({ success: false, error: '削除権限がありません' });
    }

    // Remove from in-memory storage
    messageModule.deleteMessage(id);
    io.emit('messageDeleted', { id });
    callback({ success: true });
  });

  socket.on('deletePrivateMessage', async (data, callback) => {
    if (typeof callback !== 'function') callback = () => {};
    if (!currentUser) return callback({ success: false, error: 'ログインしてください' });

    const id = (typeof data === 'object' && data !== null) ? data.id : data;
    if (!id) return callback({ success: false, error: 'IDが指定されていません' });

    const isPrivilegedAdmin = db.ADMIN_USERS.includes(currentUser);
    
    // PMの権限チェック（送信者本人のみ削除可能、または特権管理者）
    const pm = messageModule.findPrivateMessage(id);
    if (!pm) return callback({ success: false, error: 'メッセージが見つかりません' });
    
    const isSender = pm.from === currentUser;
    if (!isSender && !isPrivilegedAdmin) {
      return callback({ success: false, error: '削除権限がありません' });
    }

    // Remove from in-memory storage
    messageModule.deletePrivateMessage(id);

    // Notify all clients about the deletion
    io.emit('privateMessageDeleted', { id });

    callback({ success: true });
  });

  socket.on('updateAccountProfile', async (data, callback) => {
    if (typeof callback !== 'function') callback = () => {};
    if (!currentUser) return callback({ success: false, error: 'ログインしてください' });

    const result = await auth.updateAccountProfile(currentUser, data);
    if (result.success) {
      if (data.statusText !== undefined) {
        userStatusMap.set(currentUser, data.statusText);
      }
      callback({ success: true, account: result.account });
    } else {
      callback(result);
    }
  });

  socket.on('command', async (command, callback) => {
    if (typeof callback !== 'function') callback = () => {};
    if (!currentUser) return callback({ success: false, error: 'ログインしてください' });

    const isAdmin = adminUsers.has(socket.id) || db.ADMIN_USERS.includes(currentUser);
    const isPrivilegedAdmin = PRIVILEGED_ADMIN_USERS.includes(currentUser);
    const result = await commandModule.processCommand(command, currentUser, socket, io, users, isAdmin, isPrivilegedAdmin);
    
    if (result.type === 'silent') {
      callback({ success: true });
    } else if (result.type === 'error') {
      callback({ success: false, error: result.message });
    } else if (result.type === 'system') {
      socket.emit('systemMessage', result.message);
      callback({ success: true });
    } else if (result.type === 'private') {
      socket.emit('systemMessage', result.message);
      callback({ success: true });
    } else {
      callback({ success: true });
    }
  });

  socket.on('typing', () => {
    if (currentUser) {
      socket.broadcast.emit('userTyping', { username: currentUser });
    }
  });

  socket.on('stopTyping', () => {
    if (currentUser) {
      socket.broadcast.emit('userStopTyping', { username: currentUser });
    }
  });

  socket.on('disconnect', async () => {
    if (currentUser) {
      const userLeft = removeUserSocket(currentUser, socket.id);
      
      // Check if user is privileged admin and unregister IP
      const isPrivilegedAdmin = PRIVILEGED_USERS.includes(currentUser);
      if (isPrivilegedAdmin && clientIP) {
        // Check if this is the last socket for this user
        const remainingSockets = socket.userSockets.get(currentUser);
        if (!remainingSockets || remainingSockets.size === 0) {
          geoIPBlocker.unregisterPrivilegedAdminIP(clientIP);
          console.log(`[GeoIP] Unregistered privileged admin IP: ${currentUser} -> ${clientIP}`);
        }
      }
      
      if (userLeft) {
        socket.broadcast.emit('userLeft', {
          username: currentUser,
          statusText: userStatusMap.get(currentUser) || ''
        });
      }
    }
  });
});

// Start server
async function startServer() {
  try {
    const isConnected = await db.initDatabase();
    if (isConnected) {
      const dbUsers = await db.getUsers();
      if (dbUsers) users = dbUsers;

      // Messages are stored in-memory only, don't load from database

      // BAN済みユーザーをロード
      const dbBannedUsers = await ipModule.getBannedUsers();
      if (dbBannedUsers) {
        dbBannedUsers.forEach(u => bannedUsers.add(u));
      }

      console.log(`Loaded ${Object.keys(users).length} users, ${messageModule.getMessages().length} messages (in-memory), and ${bannedUsers.size} banned users from database`);
    } else {
      console.log('Server will start but database features will not work');
      const dbError = db.getDbError();
      if (dbError) {
        console.error('Database error:', dbError);
      }
    }

    const PORT = process.env.PORT || 5000;
    if (server.listening) {
      console.log('Server already listening, skipping listen().');
      return;
    }
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Storage: ${db.isUsingDatabase() ? `${db.getDatabaseType()} (users only)` : 'Not connected'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');
  server.close(async () => {
    await db.closeDatabase();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server gracefully...');
  server.close(async () => {
    await db.closeDatabase();
    process.exit(0);
  });
});

// Start the server
startServer();
