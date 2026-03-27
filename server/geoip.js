/**
 * GeoIP制限モジュール
 * 日本国外からのアクセスを制限
 */

const fs = require('fs');
const path = require('path');

class GeoIPBlocker {
  constructor() {
    // データファイルのパス
    this.japanIPRangesFile = path.join(__dirname, '../data/japan-ip-ranges.json');
    this.proxyVPNIPsFile = path.join(__dirname, '../data/proxy-vpn-ips.json');
    
    // 日本のIPアドレス範囲（JSONファイルから読み込み）
    this.japanIPRanges = [];
    
    // 許可されたIP（管理者用など）
    this.allowedIPs = new Set();
    
    // 特権管理者のIP（制限除外）
    this.privilegedAdminIPs = new Set();
    
    // ブロックされたIPのキャッシュ
    this.blockedIPs = new Map();
    
    // 許可された国コード
    this.allowedCountries = ['JP'];
    
    // 検証をスキップするパス
    this.skipPaths = ['/health', '/api/auth/validate'];
    
    // ブロックログ
    this.blockLog = [];
    
    // 特権管理者リスト（外部から設定）
    this.privilegedAdmins = [];
    
    // 許可されたプロキシ・VPN IP（JSONファイルから読み込み）
    this.allowedProxyVPNIPs = new Set();
    
    // 初期化
    this.init();
  }

  // 初期化処理
  init() {
    try {
      this.loadJapanIPRanges();
      this.loadProxyVPNIPs();
      console.log('[GeoIP] Loaded IP data from JSON files');
    } catch (error) {
      console.error('[GeoIP] Failed to load IP data:', error);
      // フォールバックとして基本的なIP範囲を設定
      this.loadFallbackData();
    }
  }

  // 日本IP範囲を読み込み
  loadJapanIPRanges() {
    try {
      if (!fs.existsSync(this.japanIPRangesFile)) {
        throw new Error('Japan IP ranges file not found');
      }
      
      const data = fs.readFileSync(this.japanIPRangesFile, 'utf8');
      const config = JSON.parse(data);
      
      // 全ての範囲をフラットな配列に変換
      this.japanIPRanges = [];
      config.ranges.forEach(provider => {
        this.japanIPRanges.push(...provider.ranges);
      });
      
      console.log(`[GeoIP] Loaded ${this.japanIPRanges.length} Japanese IP ranges from ${config.ranges.length} providers`);
    } catch (error) {
      console.error('[GeoIP] Failed to load Japan IP ranges:', error);
      throw error;
    }
  }

  // プロキシ・VPN IPを読み込み
  loadProxyVPNIPs() {
    try {
      if (!fs.existsSync(this.proxyVPNIPsFile)) {
        throw new Error('Proxy/VPN IPs file not found');
      }
      
      const data = fs.readFileSync(this.proxyVPNIPsFile, 'utf8');
      const config = JSON.parse(data);
      
      // 全てのIPをセットに追加
      this.allowedProxyVPNIPs.clear();
      Object.values(config.services).forEach(service => {
        service.ips.forEach(ip => {
          this.allowedProxyVPNIPs.add(ip);
        });
      });
      
      console.log(`[GeoIP] Loaded ${this.allowedProxyVPNIPs.size} proxy/VPN IPs from ${Object.keys(config.services).length} services`);
    } catch (error) {
      console.error('[GeoIP] Failed to load proxy/VPN IPs:', error);
      throw error;
    }
  }

  // フォールバックデータを読み込み
  loadFallbackData() {
    console.log('[GeoIP] Using fallback IP data');
    
    // 基本的な日本IP範囲
    this.japanIPRanges = [
      '43.0.0.0/8', '49.0.0.0/8', '58.0.0.0/7', '60.0.0.0/8',
      '61.0.0.0/8', '106.0.0.0/8', '110.0.0.0/8', '111.0.0.0/8',
      '112.0.0.0/5', '118.0.0.0/7', '119.0.0.0/8', '120.0.0.0/6',
      '124.0.0.0/8', '125.0.0.0/8', '126.0.0.0/8',
      '133.0.0.0/8', '150.0.0.0/7', '152.0.0.0/6', '157.0.0.0/8',
      '202.0.0.0/7', '203.0.0.0/8', '210.0.0.0/7', '211.0.0.0/8',
      '218.0.0.0/8', '219.0.0.0/8', '220.0.0.0/8', '221.0.0.0/8',
      '222.0.0.0/8', '223.0.0.0/8'
    ];
    
    // 基本的なプロキシ・VPN IP
    this.allowedProxyVPNIPs = new Set([
      '104.243.37.85', '159.54.169.0', '141.148.134.230',
      '167.86.103.140', '198.251.90.4', '66.179.254.164'
    ]);
  }

  // データを再読み込み
  reloadData() {
    try {
      this.loadJapanIPRanges();
      this.loadProxyVPNIPs();
      console.log('[GeoIP] Successfully reloaded IP data');
      return true;
    } catch (error) {
      console.error('[GeoIP] Failed to reload IP data:', error);
      return false;
    }
  }

  // 日本IP範囲情報を取得
  getJapanIPRangesInfo() {
    try {
      if (!fs.existsSync(this.japanIPRangesFile)) {
        return null;
      }
      
      const data = fs.readFileSync(this.japanIPRangesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[GeoIP] Failed to get Japan IP ranges info:', error);
      return null;
    }
  }

  // プロキシ・VPN情報を取得
  getProxyVPNIPsInfo() {
    try {
      if (!fs.existsSync(this.proxyVPNIPsFile)) {
        return null;
      }
      
      const data = fs.readFileSync(this.proxyVPNIPsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[GeoIP] Failed to get proxy/VPN IPs info:', error);
      return null;
    }
  }

  // 特権管理者リストを設定
  setPrivilegedAdmins(admins) {
    this.privilegedAdmins = admins;
    console.log('[GeoIP] Set privileged admins:', admins);
  }

  // 特権管理者のIPを登録
  registerPrivilegedAdminIP(ip, username) {
    if (this.privilegedAdmins.includes(username)) {
      const normalizedIP = this.normalizeIP(ip);
      if (normalizedIP) {
        this.privilegedAdminIPs.add(normalizedIP);
        console.log(`[GeoIP] Registered privileged admin IP: ${normalizedIP} (${username})`);
      }
    }
  }

  // 特権管理者のIPを削除
  unregisterPrivilegedAdminIP(ip) {
    const normalizedIP = this.normalizeIP(ip);
    if (normalizedIP) {
      this.privilegedAdminIPs.delete(normalizedIP);
      console.log(`[GeoIP] Unregistered privileged admin IP: ${normalizedIP}`);
    }
  }

  // IPアドレスを正規化
  normalizeIP(ip) {
    if (!ip) return null;
    
    // IPv4マッピングされたIPv6アドレスを変換
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    
    // ループバックアドレス
    if (ip === '::1') {
      return '127.0.0.1';
    }
    
    return ip;
  }

  // CIDR範囲チェック
  isIPInRange(ip, cidr) {
    const [network, prefix] = cidr.split('/');
    const prefixLength = parseInt(prefix);
    
    const ipToNumber = (ip) => {
      return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
    };
    
    const ipNum = ipToNumber(ip);
    const networkNum = ipToNumber(network);
    const mask = (0xFFFFFFFF << (32 - prefixLength)) >>> 0;
    
    return (ipNum & mask) === (networkNum & mask);
  }

  // 日本IPかチェック
  isJapaneseIP(ip) {
    const normalizedIP = this.normalizeIP(ip);
    if (!normalizedIP) return false;
    
    // プライベートIPは許可
    if (this.isPrivateIP(normalizedIP)) {
      return true;
    }
    
    // 許可リストにあれば許可
    if (this.allowedIPs.has(normalizedIP)) {
      return true;
    }
    
    // 特権管理者IPは無条件で許可
    if (this.privilegedAdminIPs.has(normalizedIP)) {
      return true;
    }
    
    // プロキシ・VPN IPは許可
    if (this.allowedProxyVPNIPs.has(normalizedIP)) {
      return true;
    }
    
    // 日本IP範囲をチェック
    return this.japanIPRanges.some(range => this.isIPInRange(normalizedIP, range));
  }

  // プロキシ・VPN IPを許可リストに追加
  allowProxyVPNIP(ip) {
    const normalizedIP = this.normalizeIP(ip);
    if (normalizedIP) {
      this.allowedProxyVPNIPs.add(normalizedIP);
      console.log(`[GeoIP] Allowed proxy/VPN IP: ${normalizedIP}`);
    }
  }

  // プロキシ・VPN IPを許可リストから削除
  disallowProxyVPNIP(ip) {
    const normalizedIP = this.normalizeIP(ip);
    if (normalizedIP) {
      this.allowedProxyVPNIPs.delete(normalizedIP);
      console.log(`[GeoIP] Disallowed proxy/VPN IP: ${normalizedIP}`);
    }
  }

  // 複数のプロキシ・VPN IPを一括で追加
  allowMultipleProxyVPNIPs(ips) {
    ips.forEach(ip => {
      this.allowProxyVPNIP(ip);
    });
  }

  // 許可されているプロキシ・VPN IPのリストを取得
  getAllowedProxyVPNIPs() {
    return Array.from(this.allowedProxyVPNIPs);
  }

  // プライベートIPかチェック
  isPrivateIP(ip) {
    const privateRanges = [
      '10.0.0.0/8',
      '172.16.0.0/12',
      '192.168.0.0/16',
      '127.0.0.0/8'
    ];
    
    return privateRanges.some(range => this.isIPInRange(ip, range));
  }

  // IPを許可リストに追加
  allowIP(ip) {
    const normalizedIP = this.normalizeIP(ip);
    if (normalizedIP) {
      this.allowedIPs.add(normalizedIP);
      console.log(`[GeoIP] Allowed IP: ${normalizedIP}`);
    }
  }

  // IPを許可リストから削除
  disallowIP(ip) {
    const normalizedIP = this.normalizeIP(ip);
    if (normalizedIP) {
      this.allowedIPs.delete(normalizedIP);
      console.log(`[GeoIP] Disallowed IP: ${normalizedIP}`);
    }
  }

  // アクセスをチェック
  checkAccess(req, res, next) {
    const clientIP = this.getClientIP(req);
    const path = req.path;
    
    // スキップパスは許可
    if (this.skipPaths.includes(path)) {
      return next();
    }
    
    // IPがなければ拒否
    if (!clientIP) {
      this.logBlock(clientIP, 'No IP address');
      return this.blockAccess(res, 'IPアドレスが検出できません');
    }
    
    const normalizedIP = this.normalizeIP(clientIP);
    
    // キャッシュチェック
    if (this.blockedIPs.has(normalizedIP)) {
      const blockInfo = this.blockedIPs.get(normalizedIP);
      if (Date.now() - blockInfo.timestamp < 3600000) { // 1時間キャッシュ
        this.logBlock(normalizedIP, 'Cached block');
        return this.blockAccess(res, 'アクセスが制限されています');
      } else {
        this.blockedIPs.delete(normalizedIP);
      }
    }
    
    // 日本IPチェック
    if (this.isJapaneseIP(normalizedIP)) {
      return next();
    }
    
    // ブロック処理
    this.blockedIPs.set(normalizedIP, {
      timestamp: Date.now(),
      reason: 'Non-Japanese IP'
    });
    
    this.logBlock(normalizedIP, 'Non-Japanese IP');
    return this.blockAccess(res, '日本国外からのアクセスは制限されています');
  }

  // クライアントIPを取得
  getClientIP(req) {
    return req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.headers['x-client-ip'] ||
           req.headers['cf-connecting-ip'] || // Cloudflare
           req.headers['x-cluster-client-ip']; // AWS
  }

  // アクセスをブロック
  blockAccess(res, message) {
    res.status(403).json({
      success: false,
      error: message,
      code: 'GEO_BLOCKED',
      timestamp: new Date().toISOString()
    });
  }

  // ブロックログを記録
  logBlock(ip, reason) {
    const logEntry = {
      ip,
      reason,
      timestamp: new Date().toISOString(),
      userAgent: this.getLastUserAgent()
    };
    
    this.blockLog.push(logEntry);
    
    // ログが多すぎたら古いものを削除
    if (this.blockLog.length > 1000) {
      this.blockLog = this.blockLog.slice(-500);
    }
    
    console.log(`[GeoIP] Blocked ${ip}: ${reason}`);
  }

  // 最後のUserAgentを取得（簡易実装）
  getLastUserAgent() {
    // 実際の実装ではリクエストからUserAgentを取得
    return 'Unknown';
  }

  // ブロック統計を取得
  getBlockStats() {
    const recentBlocks = this.blockLog.filter(
      entry => Date.now() - new Date(entry.timestamp).getTime() < 86400000 // 24時間
    );
    
    const stats = {
      totalBlocked: this.blockLog.length,
      recentBlocked: recentBlocks.length,
      currentlyBlocked: this.blockedIPs.size,
      allowedIPs: this.allowedIPs.size,
      allowedProxyVPNIPs: this.allowedProxyVPNIPs.size,
      privilegedAdminIPs: this.privilegedAdminIPs.size,
      topBlockedIPs: this.getTopBlockedIPs(recentBlocks),
      blockReasons: this.getBlockReasons(recentBlocks)
    };
    
    return stats;
  }

  // ブロックされたIPのトップ10
  getTopBlockedIPs(blocks) {
    const ipCounts = {};
    blocks.forEach(block => {
      ipCounts[block.ip] = (ipCounts[block.ip] || 0) + 1;
    });
    
    return Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));
  }

  // ブロック理由の統計
  getBlockReasons(blocks) {
    const reasons = {};
    blocks.forEach(block => {
      reasons[block.reason] = (reasons[block.reason] || 0) + 1;
    });
    
    return reasons;
  }

  // ブロックログをクリア
  clearBlockLog() {
    this.blockLog = [];
    console.log('[GeoIP] Block log cleared');
  }

  // 設定を更新
  updateSettings(settings) {
    if (settings.allowedIPs) {
      this.allowedIPs = new Set(settings.allowedIPs);
    }
    
    if (settings.skipPaths) {
      this.skipPaths = settings.skipPaths;
    }
    
    console.log('[GeoIP] Settings updated');
  }
}

module.exports = GeoIPBlocker;
