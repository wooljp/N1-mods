// GeoIP管理モジュール
class GeoIPManager {
  constructor() {
    this.currentStats = null;
    this.refreshInterval = null;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadStats();
    this.startAutoRefresh();
  }

  setupEventListeners() {
    // GeoIP管理セクションが存在するか確認
    const geoipSection = document.getElementById('geoip-section');
    if (!geoipSection) {
      console.warn('[GeoIP] GeoIP section not found');
      return;
    }

    // 統計更新ボタン
    const refreshBtn = document.getElementById('geoip-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadStats());
    }

    // データ再読み込みボタン
    const reloadBtn = document.getElementById('geoip-reload-data');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => this.reloadData());
    }

    // IP許可フォーム
    const allowForm = document.getElementById('geoip-allow-form');
    if (allowForm) {
      allowForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.allowIP();
      });
    }

    // IP拒否フォーム
    const disallowForm = document.getElementById('geoip-disallow-form');
    if (disallowForm) {
      disallowForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.disallowIP();
      });
    }

    // ログクリアボタン
    const clearLogBtn = document.getElementById('geoip-clear-log');
    if (clearLogBtn) {
      clearLogBtn.addEventListener('click', () => this.clearLog());
    }
  }

  async loadStats() {
    try {
      const response = await fetch('/api/geoip/stats');
      const data = await response.json();

      if (data.success) {
        this.currentStats = data;
        this.updateUI(data);
      } else {
        this.showError('統計情報の読み込みに失敗しました');
      }
    } catch (error) {
      console.error('[GeoIP] Load stats error:', error);
      this.showError('通信エラーが発生しました');
    }
  }

  updateUI(data) {
    // 現在のIP情報
    this.updateCurrentIP(data);
    
    // 統計情報
    this.updateStatistics(data.stats);
    
    // 特権管理者IP情報
    this.updatePrivilegedAdminIPs(data);
    
    // プロキシ・VPN IP情報
    this.updateProxyVPNIPs(data);
    
    // ブロックされたIPリスト
    this.updateBlockedIPs(data.stats);
    
    // ブロック理由
    this.updateBlockReasons(data.stats);
  }

  updateCurrentIP(data) {
    const currentIPElement = document.getElementById('geoip-current-ip');
    const isJapaneseElement = document.getElementById('geoip-is-japanese');
    
    if (currentIPElement) {
      currentIPElement.textContent = data.currentIP || '不明';
    }
    
    if (isJapaneseElement) {
      const isJapanese = data.isJapaneseIP;
      isJapaneseElement.textContent = isJapanese ? '日本国内' : '日本国外';
      isJapaneseElement.className = isJapanese ? 'japanese-ip' : 'foreign-ip';
    }
  }

  updateStatistics(stats) {
    const elements = {
      'geoip-total-blocked': stats.totalBlocked,
      'geoip-recent-blocked': stats.recentBlocked,
      'geoip-currently-blocked': stats.currentlyBlocked,
      'geoip-allowed-ips': stats.allowedIPs
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value.toLocaleString();
      }
    });

    // プロキシ・VPNカウントを更新
    const proxyVpnCountElement = document.getElementById('geoip-proxy-vpn-count');
    if (proxyVpnCountElement) {
      proxyVpnCountElement.textContent = stats.allowedProxyVPNIPs || 0;
    }
  }

  updatePrivilegedAdminIPs(data) {
    const container = document.getElementById('geoip-privileged-admin-ips');
    if (!container) return;

    if (!data.privilegedAdminIPs || data.privilegedAdminIPs.length === 0) {
      container.innerHTML = '<p class="no-data">特権管理者IPはありません</p>';
      return;
    }

    const html = data.privilegedAdminIPs.map(ip => `
      <div class="privileged-admin-ip-item">
        <div class="ip-address">${ip}</div>
        <div class="ip-status">特権管理者</div>
        <button class="remove-privileged-ip-btn" data-ip="${ip}">
          削除
        </button>
      </div>
    `).join('');

    container.innerHTML = html;

    // 削除ボタンのイベント設定
    container.querySelectorAll('.remove-privileged-ip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ip = e.target.dataset.ip;
        this.removePrivilegedAdminIP(ip);
      });
    });
  }

  async removePrivilegedAdminIP(ip) {
    if (!confirm(`特権管理者IP ${ip} を削除してもよろしいですか？`)) {
      return;
    }

    try {
      const response = await fetch('/api/geoip/remove-privileged-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ip })
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess(data.message);
        await this.loadStats(); // 統計を更新
      } else {
        this.showError(data.error || 'IPの削除に失敗しました');
      }
    } catch (error) {
      console.error('[GeoIP] Remove privileged IP error:', error);
      this.showError('通信エラーが発生しました');
    }
  }

  updateProxyVPNIPs(data) {
    const container = document.getElementById('geoip-proxy-vpn-ips');
    if (!container) return;

    if (!data.allowedProxyVPNIPs || data.allowedProxyVPNIPs.length === 0) {
      container.innerHTML = '<p class="no-data">許可されたプロキシ・VPN IPはありません</p>';
      return;
    }

    const html = data.allowedProxyVPNIPs.map(ip => `
      <div class="proxy-vpn-ip-item">
        <div class="ip-address">${ip}</div>
        <div class="proxy-vpn-status">プロキシ/VPN</div>
        <button class="remove-proxy-vpn-btn" data-ip="${ip}">
          削除
        </button>
      </div>
    `).join('');

    container.innerHTML = html;

    // 削除ボタンのイベント設定
    container.querySelectorAll('.remove-proxy-vpn-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ip = e.target.dataset.ip;
        this.removeProxyVPNIP(ip);
      });
    });
  }

  async removeProxyVPNIP(ip) {
    if (!confirm(`プロキシ・VPN IP ${ip} を削除してもよろしいですか？`)) {
      return;
    }

    try {
      const response = await fetch('/api/geoip/disallow-proxy-vpn-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ip })
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess(data.message);
        await this.loadStats(); // 統計を更新
      } else {
        this.showError(data.error || 'プロキシ・VPN IPの削除に失敗しました');
      }
    } catch (error) {
      console.error('[GeoIP] Remove proxy/VPN IP error:', error);
      this.showError('通信エラーが発生しました');
    }
  }

  updateBlockedIPs(stats) {
    const container = document.getElementById('geoip-blocked-ips');
    if (!container) return;

    if (stats.topBlockedIPs.length === 0) {
      container.innerHTML = '<p class="no-data">ブロックされたIPはありません</p>';
      return;
    }

    const html = stats.topBlockedIPs.map(item => `
      <div class="blocked-ip-item">
        <div class="ip-address">${item.ip}</div>
        <div class="block-count">${item.count}回</div>
        <button class="allow-ip-btn" data-ip="${item.ip}">
          許可
        </button>
      </div>
    `).join('');

    container.innerHTML = html;

    // 許可ボタンのイベント設定
    container.querySelectorAll('.allow-ip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ip = e.target.dataset.ip;
        this.allowIP(ip);
      });
    });
  }

  updateBlockReasons(stats) {
    const container = document.getElementById('geoip-block-reasons');
    if (!container) return;

    const reasons = Object.entries(stats.blockReasons);
    if (reasons.length === 0) {
      container.innerHTML = '<p class="no-data">データがありません</p>';
      return;
    }

    const html = reasons.map(([reason, count]) => `
      <div class="reason-item">
        <div class="reason-text">${this.getReasonText(reason)}</div>
        <div class="reason-count">${count}回</div>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  getReasonText(reason) {
    const reasonTexts = {
      'Non-Japanese IP': '日本国外IP',
      'No IP address': 'IPアドレス不明',
      'Cached block': 'キャッシュされたブロック',
      'Manual block': '手動ブロック'
    };

    return reasonTexts[reason] || reason;
  }

  async allowIP(ip) {
    const ipToAllow = ip || document.getElementById('geoip-allow-input')?.value?.trim();
    
    if (!ipToAllow) {
      this.showError('IPアドレスを入力してください');
      return;
    }

    try {
      const response = await fetch('/api/geoip/allow-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ip: ipToAllow })
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess(data.message);
        document.getElementById('geoip-allow-input').value = '';
        await this.loadStats(); // 統計を更新
      } else {
        this.showError(data.error || 'IPの許可に失敗しました');
      }
    } catch (error) {
      console.error('[GeoIP] Allow IP error:', error);
      this.showError('通信エラーが発生しました');
    }
  }

  async disallowIP() {
    const ip = document.getElementById('geoip-disallow-input')?.value?.trim();
    
    if (!ip) {
      this.showError('IPアドレスを入力してください');
      return;
    }

    try {
      const response = await fetch('/api/geoip/disallow-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ip })
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess(data.message);
        document.getElementById('geoip-disallow-input').value = '';
        await this.loadStats(); // 統計を更新
      } else {
        this.showError(data.error || 'IPの拒否に失敗しました');
      }
    } catch (error) {
      console.error('[GeoIP] Disallow IP error:', error);
      this.showError('通信エラーが発生しました');
    }
  }

  async clearLog() {
    if (!confirm('ブロックログをクリアしてもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch('/api/geoip/clear-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess(data.message);
        await this.loadStats(); // 統計を更新
      } else {
        this.showError(data.error || 'ログのクリアに失敗しました');
      }
    } catch (error) {
      console.error('[GeoIP] Clear log error:', error);
      this.showError('通信エラーが発生しました');
    }
  }

  async reloadData() {
    try {
      const reloadBtn = document.getElementById('geoip-reload-data');
      if (reloadBtn) {
        reloadBtn.disabled = true;
        reloadBtn.textContent = '再読み込み中...';
      }

      const response = await fetch('/api/geoip/reload-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess(data.message);
        await this.loadStats(); // 統計を更新
        
        // データ情報を表示
        if (data.data) {
          console.log('[GeoIP] Reloaded data:', data.data);
        }
      } else {
        this.showError(data.error || 'データの再読み込みに失敗しました');
      }
    } catch (error) {
      console.error('[GeoIP] Reload data error:', error);
      this.showError('通信エラーが発生しました');
    } finally {
      const reloadBtn = document.getElementById('geoip-reload-data');
      if (reloadBtn) {
        reloadBtn.disabled = false;
        reloadBtn.textContent = 'データ再読み込み';
      }
    }
  }

  startAutoRefresh() {
    // 30秒ごとに自動更新
    this.refreshInterval = setInterval(() => {
      this.loadStats();
    }, 30000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showMessage(message, type) {
    // 既存のメッセージを削除
    const existingMessage = document.querySelector('.geoip-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // 新しいメッセージを作成
    const messageDiv = document.createElement('div');
    messageDiv.className = `geoip-message ${type}`;
    messageDiv.textContent = message;

    // コンテナに追加
    const container = document.getElementById('geoip-section');
    if (container) {
      container.insertBefore(messageDiv, container.firstChild);
      
      // 3秒後に自動削除
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.remove();
        }
      }, 3000);
    }
  }

  destroy() {
    this.stopAutoRefresh();
  }
}

// グローバルインスタンスを作成
window.geoIPManager = new GeoIPManager();
