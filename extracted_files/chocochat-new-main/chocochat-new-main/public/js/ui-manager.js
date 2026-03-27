// UI Manager - Handles UI separation based on user roles and path
class UIManager {
  constructor() {
    this.currentUser = null;
    this.isAdmin = false;
    this.isPrivilegedAdmin = false;
    this.isAdminPage = window.location.pathname.startsWith('/admin');
    this.PRIVILEGED_USERS = ['ばなな', 'チョコわかめ', 'ばななの左腕', 'ばななの右腕', 'woolisbest#plus', 'woolisbest', 'Yosshy#管理者もどき', 'アイルー'];
  }

  initializeUI() {
    // Set initial body class based on path
    if (this.isAdminPage) {
      document.body.className = document.body.className.replace(/\s*(regular-user-show)/g, '');
      document.body.classList.add('admin-show');
    }
    
    this.hideAllInputAreas();
    this.hideAdminElements();
    this.hidePrivilegedAdminElements();
  }

  hideAllInputAreas() {
    const areas = ['regular-user-input', 'admin-input', 'privileged-admin-input'];
    areas.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.style.display = 'none';
    });
  }

  hideAdminElements() {
    const adminElements = [
      'admin-indicator',
      'admin-input',
      'admin-panel',
      'toggle-admin-panel'
    ];
    
    adminElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.classList.add('hidden');
    });
  }

  hidePrivilegedAdminElements() {
    const privilegedElements = [
      'privileged-admin-indicator',
      'privileged-admin-input',
      'ip-controls',
      'user-ip-list',
      'user-ip-history',
      'toggle-ip-controls'
    ];
    
    privilegedElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.classList.add('hidden');
    });
  }

  showRegularUserUI() {
    this.hideAllInputAreas();
    this.hideAdminElements();
    this.hidePrivilegedAdminElements();
    
    const regularInput = document.getElementById('regular-user-input');
    if (regularInput) {
      regularInput.style.display = 'block';
    }
    
    document.body.className = document.body.className.replace(/\s*(admin-show|privileged-admin-show)/g, '');
    document.body.classList.add('regular-user-show');
  }

  showAdminUI() {
    this.hideAllInputAreas();
    this.hidePrivilegedAdminElements();
    
    const adminInput = document.getElementById('admin-input');
    const adminIndicator = document.getElementById('admin-indicator');
    
    if (adminInput) {
      adminInput.style.display = 'block';
    }
    
    if (adminIndicator) {
      adminIndicator.classList.remove('hidden');
    }
    
    // On admin page, admin panel is always visible
    if (this.isAdminPage) {
      const adminPanel = document.getElementById('admin-panel');
      if (adminPanel) {
        adminPanel.classList.remove('hidden');
      }
    }
    
    document.body.className = document.body.className.replace(/\s*(regular-user-show|privileged-admin-show)/g, '');
    document.body.classList.add('admin-show');
  }

  showPrivilegedAdminUI() {
    this.hideAllInputAreas();
    
    const privilegedInput = document.getElementById('privileged-admin-input');
    const privilegedIndicator = document.getElementById('privileged-admin-indicator');
    
    if (privilegedInput) {
      privilegedInput.style.display = 'block';
    }
    
    if (privilegedIndicator) {
      privilegedIndicator.classList.remove('hidden');
    }
    
    // On admin page, admin panel and IP controls are always visible for privileged admin
    if (this.isAdminPage) {
      const adminPanel = document.getElementById('admin-panel');
      if (adminPanel) {
        adminPanel.classList.remove('hidden');
      }
      
      const ipControls = document.getElementById('ip-controls');
      if (ipControls) {
        ipControls.classList.remove('hidden');
      }
    }
    
    document.body.className = document.body.className.replace(/\s*(regular-user-show|admin-show)/g, '');
    document.body.classList.add('privileged-admin-show');
  }

  updateUserUI(username, isAdmin = false) {
    this.currentUser = username;
    this.isAdmin = isAdmin;
    this.isPrivilegedAdmin = this.PRIVILEGED_USERS.includes(username);
    
    // Update display name
    const displayNameElement = document.getElementById('current-display-name');
    if (displayNameElement) {
      displayNameElement.textContent = username;
    }
    
    // Show appropriate UI based on user role and path
    if (this.isAdminPage) {
      // Admin page - always show admin UI, but differentiate between regular admin and privileged admin
      if (this.isPrivilegedAdmin) {
        this.showPrivilegedAdminUI();
      } else {
        this.showAdminUI();
      }
    } else {
      // Regular page - show UI based on user role
      if (this.isPrivilegedAdmin) {
        this.showPrivilegedAdminUI();
      } else if (this.isAdmin) {
        this.showAdminUI();
      } else {
        this.showRegularUserUI();
      }
    }
  }

  toggleAdminPanel() {
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
      adminPanel.classList.toggle('hidden');
    }
  }

  toggleIPControls() {
    const ipControls = document.getElementById('ip-controls');
    if (ipControls) {
      ipControls.classList.toggle('hidden');
    }
  }

  toggleIPList() {
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

  toggleIPHistory() {
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

  setupEventListeners() {
    // Admin panel toggle
    ['toggle-admin-panel', 'toggle-admin-panel-admin', 'toggle-admin-panel-privileged'].forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('click', () => this.toggleAdminPanel());
      }
    });

    // IP controls toggle
    const ipControlsBtn = document.getElementById('toggle-ip-controls');
    if (ipControlsBtn) {
      ipControlsBtn.addEventListener('click', () => this.toggleIPControls());
    }

    // IP list toggle
    const ipListBtn = document.getElementById('toggleIpListBtn');
    if (ipListBtn) {
      ipListBtn.addEventListener('click', () => this.toggleIPList());
    }

    // IP history toggle
    const ipHistoryBtn = document.getElementById('toggleIpHistoryBtn');
    if (ipHistoryBtn) {
      ipHistoryBtn.addEventListener('click', () => this.toggleIPHistory());
    }
  }

  // Update message input based on current user type
  getMessageInputElement() {
    if (this.isPrivilegedAdmin) {
      return document.getElementById('message-input-privileged');
    } else if (this.isAdmin) {
      return document.getElementById('message-input-admin');
    } else {
      return document.getElementById('message-input');
    }
  }

  getCharCounterElement() {
    if (this.isPrivilegedAdmin) {
      return document.getElementById('char-counter-privileged');
    } else if (this.isAdmin) {
      return document.getElementById('char-counter-admin');
    } else {
      return document.getElementById('char-counter');
    }
  }

  getSendButtonElement() {
    if (this.isPrivilegedAdmin) {
      return document.getElementById('send-btn-privileged');
    } else if (this.isAdmin) {
      return document.getElementById('send-btn-admin');
    } else {
      return document.getElementById('send-btn');
    }
  }

  // Show/hide elements based on user permissions
  updatePermissionsDisplay() {
    const adminElements = document.querySelectorAll('.admin-only');
    const privilegedElements = document.querySelectorAll('.privileged-admin-only');
    
    adminElements.forEach(el => {
      el.style.display = this.isAdmin || this.isPrivilegedAdmin ? 'block' : 'none';
    });
    
    privilegedElements.forEach(el => {
      el.style.display = this.isPrivilegedAdmin ? 'block' : 'none';
    });
  }

  // Initialize UI when page loads
  initialize() {
    this.initializeUI();
    this.setupEventListeners();
    this.updatePermissionsDisplay();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIManager;
} else {
  window.UIManager = UIManager;
}
