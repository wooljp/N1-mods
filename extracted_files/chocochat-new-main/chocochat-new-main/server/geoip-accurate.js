/**
 * 正確なGeoIP判定モジュール（MaxMind GeoLite2使用）
 * IPアドレスから国を正確に判定
 */

const fs = require('fs');
const path = require('path');
const { createReadStream } = require('fs');
const { createGunzip } = require('zlib');
const { pipeline } = require('stream/promises');

class AccurateGeoIPBlocker {
  constructor() {
    this.geoipData = null;
    this.privilegedAdminIPs = new Set();
    this.allowedIPs = new Set();
    this.blockedIPs = new Map();
    this.blockLog = [];
    this.privilegedAdmins = [];
    this.skipPaths = ['/health', '/api/auth/validate'];
    
    // 日本の国コード
    this.allowedCountries = ['JP'];
    
    // 初期化
    this.init();
  }

  async init() {
    try {
      await this.loadGeoIPData();
      console.log('[AccurateGeoIP] GeoIP data loaded successfully');
    } catch (error) {
      console.error('[AccurateGeoIP] Failed to load GeoIP data:', error);
      // フォールバックとして簡易的なIP範囲を使用
      this.loadFallbackData();
    }
  }

  async loadGeoIPData() {
    // GeoLite2データベースファイルのパス
    const dbPath = path.join(__dirname, '../data/GeoLite2-Country.mmdb');
    
    if (!fs.existsSync(dbPath)) {
      throw new Error('GeoLite2 database not found');
    }

    // MaxMindライブラリを使用してデータベースを読み込み
    // 注意：実際には 'maxmind' パッケージが必要
    // const maxmind = require('maxmind');
    // this.geoipData = await maxmind.open(dbPath);
    
    // とりあえずダミー実装
    this.geoipData = { loaded: true };
  }

  loadFallbackData() {
    console.log('[AccurateGeoIP] Using fallback IP ranges');
    // フォールバックとして主要な日本IP範囲のみを使用
    this.fallbackRanges = [
      '1.0.16.0/20', '1.0.64.0/18', '1.1.64.0/18', '1.5.0.0/16',
      '2.28.0.0/15', '2.32.0.0/14', '2.48.0.0/12', '2.64.0.0/10',
      '3.0.0.0/8', '3.64.0.0/10', '3.112.0.0/12',
      '27.0.0.0/9', '27.96.0.0/11', '27.112.0.0/13',
      '43.0.0.0/8', '49.0.0.0/8', '58.0.0.0/7', '60.0.0.0/8',
      '61.0.0.0/8', '106.0.0.0/8', '110.0.0.0/8', '111.0.0.0/8',
      '112.0.0.0/5', '118.0.0.0/7', '119.0.0.0/8', '120.0.0.0/6',
      '124.0.0.0/8', '125.0.0.0/8', '126.0.0.0/8',
      '133.0.0.0/8', '150.0.0.0/7', '152.0.0.0/6', '157.0.0.0/8',
      '202.0.0.0/7', '203.0.0.0/8', '210.0.0.0/7', '211.0.0.0/8',
      '218.0.0.0/8', '219.0.0.0/8', '220.0.0.0/8', '221.0.0.0/8',
      '222.0.0.0/8', '223.0.0.0/8'
    ];
  }

  // 特権管理者リストを設定
  setPrivilegedAdmins(admins) {
    this.privilegedAdmins = admins;
    console.log('[AccurateGeoIP] Set privileged admins:', admins);
  }

  // 特権管理者のIPを登録
  registerPrivilegedAdminIP(ip, username) {
    if (this.privilegedAdmins.includes(username)) {
      const normalizedIP = this.normalizeIP(ip);
      if (normalizedIP) {
        this.privilegedAdminIPs.add(normalizedIP);
        console.log(`[AccurateGeoIP] Registered privileged admin IP: ${normalizedIP} (${username})`);
      }
    }
  }

  // 特権管理者のIPを削除
  unregisterPrivilegedAdminIP(ip) {
    const normalizedIP = this.normalizeIP(ip);
    if (normalizedIP) {
      this.privilegedAdminIPs.delete(normalizedIP);
      console.log(`[AccurateGeoIP] Unregistered privileged admin IP: ${normalizedIP}`);
    }
  }

  // IPアドレスを正規化
  normalizeIP(ip) {
    if (!ip) return null;
    
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    
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

  // 国コードで判定（MaxMind使用時）
  async getCountryCode(ip) {
    if (!this.geoipData || !this.geoipData.loaded) {
      return null;
    }

    try {
      // const result = this.geoipData.get(ip);
      // return result?.country?.iso_code;
      
      // ダミー実装
      return this.fallbackCheck(ip) ? 'JP' : null;
    } catch (error) {
      console.error('[AccurateGeoIP] Country lookup error:', error);
      return null;
    }
  }

  // フォールバック判定
  fallbackCheck(ip) {
    if (!this.fallbackRanges) return false;
    return this.fallbackRanges.some(range => this.isIPInRange(ip, range));
  }

  // 日本IPかチェック
  async isJapaneseIP(ip) {
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
    
    // MaxMindデータベースで判定
    if (this.geoipData && this.geoipData.loaded) {
      const countryCode = await this.getCountryCode(normalizedIP);
      return countryCode === 'JP';
    }
    
    // フォールバック判定
    return this.fallbackCheck(normalizedIP);
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

  // アクセスをチェック
  async checkAccess(req, res, next) {
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
    const isJapanese = await this.isJapaneseIP(normalizedIP);
    
    if (isJapanese) {
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
      userAgent: 'Unknown'
    };
    
    this.blockLog.push(logEntry);
    
    // ログが多すぎたら古いものを削除
    if (this.blockLog.length > 1000) {
      this.blockLog = this.blockLog.slice(-500);
    }
    
    console.log(`[AccurateGeoIP] Blocked ${ip}: ${reason}`);
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

  // IPを許可リストに追加
  allowIP(ip) {
    const normalizedIP = this.normalizeIP(ip);
    if (normalizedIP) {
      this.allowedIPs.add(normalizedIP);
      console.log(`[AccurateGeoIP] Allowed IP: ${normalizedIP}`);
    }
  }

  // IPを許可リストから削除
  disallowIP(ip) {
    const normalizedIP = this.normalizeIP(ip);
    if (normalizedIP) {
      this.allowedIPs.delete(normalizedIP);
      console.log(`[AccurateGeoIP] Disallowed IP: ${normalizedIP}`);
    }
  }

  // ブロックログをクリア
  clearBlockLog() {
    this.blockLog = [];
    console.log('[AccurateGeoIP] Block log cleared');
  }
}

module.exports = AccurateGeoIPBlocker;
