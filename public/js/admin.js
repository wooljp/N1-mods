// Admin Module
class AdminManager {
  constructor() {
    this.isAdmin = false;
    this.isPrivilegedAdmin = false;
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Update profile button
    const updateProfileBtn = document.getElementById('updateProfileButton');
    if (updateProfileBtn) {
      updateProfileBtn.addEventListener('click', () => {
        this.updateProfile();
      });
    }

    // Theme selector
    document.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', () => {
        this.selectTheme(option);
      });
    });

    // Color picker
    document.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('click', () => {
        this.selectColor(option);
      });
    });

    // Admin buttons
    this.setupAdminButtons();

    // Toggle buttons
    this.setupToggleButtons();
  }

  setupAdminButtons() {
    // Ban user button
    const banUserBtn = document.getElementById('ban-user');
    if (banUserBtn) {
      banUserBtn.addEventListener('click', () => {
        this.banUser();
      });
    }

    // Shadow ban button
    const shadowBanBtn = document.getElementById('shadow-ban');
    if (shadowBanBtn) {
      shadowBanBtn.addEventListener('click', () => {
        this.shadowBanUser();
      });
    }

    // Mute user button
    const muteUserBtn = document.getElementById('mute-user');
    if (muteUserBtn) {
      muteUserBtn.addEventListener('click', () => {
        this.muteUser();
      });
    }

    // Delete all messages button
    const deleteAllBtn = document.getElementById('delete-all-messages');
    if (deleteAllBtn) {
      deleteAllBtn.addEventListener('click', () => {
        this.deleteAllMessages();
      });
    }

    // Delete all PMs button
    const deleteAllPmBtn = document.getElementById('delete-all-pms');
    if (deleteAllPmBtn) {
      deleteAllPmBtn.addEventListener('click', () => {
        this.deleteAllPrivateMessages();
      });
    }

    // System info button
    const systemInfoBtn = document.getElementById('system-info');
    if (systemInfoBtn) {
      systemInfoBtn.addEventListener('click', () => {
        this.showSystemInfo();
      });
    }
  }

  setupToggleButtons() {
    // Toggle IP list button
    const toggleIpBtn = document.getElementById('toggleIpListBtn');
    if (toggleIpBtn) {
      toggleIpBtn.addEventListener('click', () => {
        this.toggleIpList();
      });
    }

    // Toggle IP history button
    const toggleHistoryBtn = document.getElementById('toggleIpHistoryBtn');
    if (toggleHistoryBtn) {
      toggleHistoryBtn.addEventListener('click', () => {
        this.toggleIpHistory();
      });
    }
  }

  toggleIpList() {
    const ipList = document.getElementById('user-ip-list');
    const btn = document.getElementById('toggleIpListBtn');
    
    if (ipList && btn) {
      if (ipList.classList.contains('hidden')) {
        ipList.classList.remove('hidden');
        btn.textContent = 'オンラインユーザーIPを非表示';
        btn.classList.add('active');
      } else {
        ipList.classList.add('hidden');
        btn.textContent = 'オンラインユーザーIPを表示';
        btn.classList.remove('active');
      }
    }
  }

  toggleIpHistory() {
    const ipHistory = document.getElementById('user-ip-history');
    const btn = document.getElementById('toggleIpHistoryBtn');
    
    if (ipHistory && btn) {
      if (ipHistory.classList.contains('hidden')) {
        ipHistory.classList.remove('hidden');
        btn.textContent = '全ユーザーIP履歴を非表示';
        btn.classList.add('active');
      } else {
        ipHistory.classList.add('hidden');
        btn.textContent = '全ユーザーIP履歴を表示';
        btn.classList.remove('active');
      }
    }
  }

  updateProfile() {
    const displayName = document.getElementById('profile-display-name').value.trim();
    const statusText = document.getElementById('profile-status-text').value.trim();
    const selectedTheme = document.querySelector('.theme-option.selected');
    const selectedColor = document.querySelector('.color-option.selected');

    if (!displayName) {
      alert('表示名を入力してください');
      return;
    }

    const data = {
      displayName,
      statusText,
      theme: selectedTheme ? selectedTheme.dataset.theme : 'default',
      color: selectedColor ? selectedColor.dataset.color : '#000000'
    };

    if (window.socketManager) {
      window.socketManager.emit('updateAccountProfile', data, (response) => {
        if (response && response.success) {
          alert('プロフィールを更新しました');
          if (window.app) {
            window.app.handleProfileUpdate(response.account);
          }
        } else {
          alert(response ? response.error : 'プロフィールの更新に失敗しました');
        }
      });
    }
  }

  selectTheme(option) {
    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    option.classList.add('selected');

    // Apply theme immediately
    const theme = option.dataset.theme;
    document.body.className = `theme-${theme}`;
  }

  selectColor(option) {
    document.querySelectorAll('.color-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    option.classList.add('selected');
  }

  banUser() {
    const username = prompt('BANするユーザー名を入力してください:');
    if (!username) return;

    const reason = prompt('BANの理由を入力してください (任意):') || '';

    if (window.socketManager) {
      window.socketManager.emit('banUser', { username, reason }, (response) => {
        if (response && response.success) {
          alert(`${username}をBANしました`);
        } else {
          alert(response ? response.error : 'BANに失敗しました');
        }
      });
    }
  }

  shadowBanUser() {
    const username = prompt('シャドウBANするユーザー名を入力してください:');
    if (!username) return;

    if (window.socketManager) {
      window.socketManager.emit('shadowBanUser', { username }, (response) => {
        if (response && response.success) {
          alert(`${username}をシャドウBANしました`);
        } else {
          alert(response ? response.error : 'シャドウBANに失敗しました');
        }
      });
    }
  }

  muteUser() {
    const username = prompt('ミュートするユーザー名を入力してください:');
    if (!username) return;

    const duration = prompt('ミュート時間を秒で入力してください (例: 60):');
    if (!duration || isNaN(duration)) return;

    if (window.socketManager) {
      window.socketManager.emit('muteUser', { username, duration: parseInt(duration) }, (response) => {
        if (response && response.success) {
          alert(`${username}を${duration}秒間ミュートしました`);
        } else {
          alert(response ? response.error : 'ミュートに失敗しました');
        }
      });
    }
  }

  deleteAllMessages() {
    if (confirm('すべてのメッセージを削除してもよろしいですか？この操作は元に戻せません。')) {
      if (window.socketManager) {
        window.socketManager.emit('command', '/delete', (response) => {
          if (!response || !response.success) {
            alert('メッセージの削除に失敗しました');
          }
        });
      }
    }
  }

  deleteAllPrivateMessages() {
    if (confirm('すべてのプライベートメッセージを削除してもよろしいですか？この操作は元に戻せません。')) {
      if (window.socketManager) {
        window.socketManager.emit('command', '/prmdelete', (response) => {
          if (!response || !response.success) {
            alert('プライベートメッセージの削除に失敗しました');
          }
        });
      }
    }
  }

  showSystemInfo() {
    if (window.socketManager) {
      window.socketManager.emit('command', '/system', (response) => {
        if (!response || !response.success) {
          alert('システム情報の取得に失敗しました');
        }
      });
    }
  }

  updateAdminPanel(data) {
    // Update user list
    const userList = document.getElementById('admin-user-list');
    if (userList && data.users) {
      userList.innerHTML = '';
      data.users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'admin-user-item';
        userItem.innerHTML = `
          <span class="admin-user-name">${this.escapeHtml(user)}</span>
          <div class="admin-user-actions">
            <button class="admin-button danger" onclick="window.adminManager.banSpecificUser('${this.escapeHtml(user)}')">BAN</button>
            <button class="admin-button" onclick="window.adminManager.muteSpecificUser('${this.escapeHtml(user)}')">ミュート</button>
          </div>
        `;
        userList.appendChild(userItem);
      });
    }

    // Update ban list
    const banList = document.getElementById('ban-list');
    if (banList && data.bannedUsers) {
      banList.innerHTML = '';
      data.bannedUsers.forEach(user => {
        const banItem = document.createElement('div');
        banItem.className = 'ban-item';
        banItem.innerHTML = `
          <span class="ban-username">${this.escapeHtml(user.username)}</span>
          <button class="admin-button" onclick="window.adminManager.unbanUser('${this.escapeHtml(user.username)}')">解除</button>
        `;
        banList.appendChild(banItem);
      });
    }

    // Update IP list
    const ipList = document.getElementById('ip-list-content');
    if (ipList && data.ipList) {
      ipList.innerHTML = '';
      data.ipList.forEach(item => {
        const ipItem = document.createElement('div');
        ipItem.className = 'ip-list-item';
        ipItem.innerHTML = `
          <span class="ip-list-username">${this.escapeHtml(item.username)}</span>
          <span class="ip-list-ip">${this.escapeHtml(item.ip_address)}</span>
          <span class="ip-list-time">${this.formatTime(item.banned_at)}</span>
        `;
        ipList.appendChild(ipItem);
      });
    }
  }

  banSpecificUser(username) {
    const reason = prompt(`${username}をBANします。理由を入力してください (任意):`) || '';
    this.banUserWithReason(username, reason);
  }

  muteSpecificUser(username) {
    const duration = prompt(`${username}をミュートします。時間を秒で入力してください:`, '60');
    if (duration && !isNaN(duration)) {
      this.muteUserWithDuration(username, parseInt(duration));
    }
  }

  unbanUser(username) {
    if (confirm(`${username}のBANを解除してもよろしいですか？`)) {
      if (window.socketManager) {
        window.socketManager.emit('unbanUser', { username }, (response) => {
          if (response && response.success) {
            alert(`${username}のBANを解除しました`);
          } else {
            alert(response ? response.error : 'BAN解除に失敗しました');
          }
        });
      }
    }
  }

  banUserWithReason(username, reason) {
    if (window.socketManager) {
      window.socketManager.emit('banUser', { username, reason }, (response) => {
        if (response && response.success) {
          alert(`${username}をBANしました`);
        } else {
          alert(response ? response.error : 'BANに失敗しました');
        }
      });
    }
  }

  muteUserWithDuration(username, duration) {
    if (window.socketManager) {
      window.socketManager.emit('muteUser', { username, duration }, (response) => {
        if (response && response.success) {
          alert(`${username}を${duration}秒間ミュートしました`);
        } else {
          alert(response ? response.error : 'ミュートに失敗しました');
        }
      });
    }
  }

  setAdminStatus(isAdmin, isPrivilegedAdmin) {
    this.isAdmin = isAdmin;
    this.isPrivilegedAdmin = isPrivilegedAdmin;

    // Show/hide admin panel
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
      adminPanel.style.display = isAdmin ? 'block' : 'none';
    }
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminManager;
} else {
  window.AdminManager = AdminManager;
}
