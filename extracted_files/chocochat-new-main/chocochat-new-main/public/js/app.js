// Main Application
class ChatApp {
  constructor() {
    this.currentUser = null;
    this.socket = null;
    this.userStatusMap = {};
    this.isPrivilegedAdmin = false;
    this.PRIVILEGED_USERS = ['ばなな', 'チョコわかめ', 'ばななの左腕', 'ばななの右腕', 'woolisbest#plus', 'woolisbest', 'Yosshy#管理者もどき', 'アイルー'];
    
    this.initializeManagers();
    this.initializeSocket();
  }

  initializeManagers() {
    // Initialize UI manager first
    this.uiManager = new UIManager();
    this.uiManager.initialize();
    
    // Initialize other managers
    this.authManager = new AuthManager();
    this.messageManager = new MessageManager();
    this.privateMessageManager = new PrivateMessageManager();
    this.adminManager = new AdminManager();
    this.chatManager = new ChatManager();

    // Make managers globally accessible
    window.authManager = this.authManager;
    window.messageManager = this.messageManager;
    window.privateMessageManager = this.privateMessageManager;
    window.adminManager = this.adminManager;
    window.chatManager = this.chatManager;
    window.uiManager = this.uiManager;
    window.app = this;
  }

  initializeSocket() {
    // Get server URL
    const serverUrl = this.getServerUrl();
    
    // Initialize socket
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    // Make socket globally accessible
    window.socketManager = this.socket;

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.chatManager.handleConnect();
      // 多重ストレージ認証で自動ログインを試行
      this.authManager.attemptAutoLogin();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.chatManager.handleDisconnect(reason);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      this.chatManager.handleReconnect(attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.log('Failed to reconnect');
      this.chatManager.handleReconnectFailed();
    });

    this.socket.on('connect_error', (error) => {
      console.log('Connection error:', error);
      this.chatManager.handleConnectError(error);
    });

    // Authentication events
    this.socket.on('loginSuccess', (data) => {
      this.handleLoginSuccess(data);
    });

    // Message events
    this.socket.on('message', (data) => {
      this.messageManager.addMessage(data);
      this.chatManager.handleNewMessageNotice();
    });

    this.socket.on('messageUpdated', (data) => {
      this.messageManager.updateMessage(data);
    });

    this.socket.on('messageDeleted', (data) => {
      this.messageManager.deleteMessageFromDOM(data.id);
    });

    this.socket.on('allMessagesDeleted', () => {
      this.chatManager.handleAllMessagesDeleted();
    });

    this.socket.on('clearMessages', () => {
      if (this.messageManager) {
        this.messageManager.clearAllMessages();
      }
    });

    // Private message events
    this.socket.on('privateMessage', (data) => {
      this.privateMessageManager.addPrivateMessage(data, this.currentUser);
    });

    this.socket.on('privateMessageDeleted', (data) => {
      this.privateMessageManager.deletePrivateMessageFromDOM(data.id);
    });

    this.socket.on('allPrivateMessagesDeleted', () => {
      this.chatManager.handleAllPrivateMessagesDeleted();
    });

    // User events
    this.socket.on('userJoined', (data) => {
      this.chatManager.handleUserJoined(data);
    });

    this.socket.on('userLeft', (data) => {
      this.chatManager.handleUserLeft(data);
    });

    this.socket.on('updateUserList', (users) => {
      this.chatManager.updateUserList(users);
    });

    this.socket.on('userTyping', (data) => {
      this.chatManager.showTypingIndicator(data.username);
    });

    this.socket.on('userStopTyping', (data) => {
      this.chatManager.hideTypingIndicator(data.username);
    });

    // Admin events
    this.socket.on('adminDataUpdate', (data) => {
      this.adminManager.updateAdminPanel(data);
    });

    // System events
    this.socket.on('systemMessage', (message) => {
      this.chatManager.addSystemMessage(message);
    });

    this.socket.on('commandResult', (message) => {
      this.chatManager.handleCommandResult(message);
    });

    this.socket.on('fortuneResult', (fortuneData) => {
      this.chatManager.handleFortuneResult(fortuneData);
    });

    // Profile events
    this.socket.on('profileUpdated', (account) => {
      this.chatManager.handleProfileUpdate(account);
    });
  }

  getServerUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const serverParam = urlParams.get('server');
    
    if (serverParam) {
      // If server parameter is provided, use it
      return serverParam.startsWith('http') ? serverParam : `http://${serverParam}`;
    }
    
    // Default to current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
  }

  setCurrentUser(username) {
    this.currentUser = username;
    this.isPrivilegedAdmin = this.PRIVILEGED_USERS.includes(username);
  }

  handleLoginSuccess(data) {
    this.setCurrentUser(data.account.displayName);
    
    // Update UI based on user role
    if (this.uiManager) {
      this.uiManager.updateUserUI(data.account.displayName, data.isAdmin);
    }
    
    // Show/hide admin panel
    if (this.adminManager) {
      this.adminManager.setAdminStatus(data.isAdmin, this.isPrivilegedAdmin);
    }

    // Initialize chat
    this.chatManager.initializeChat(data);

    // Focus message input
    const messageInput = this.uiManager.getMessageInputElement();
    if (messageInput) {
      messageInput.focus();
    }
  }

  handleProfileUpdate(account) {
    // Update user status map
    if (account.statusText) {
      this.userStatusMap[account.displayName] = account.statusText;
    }

    // Apply theme
    document.body.className = `theme-${account.theme}`;

    // Update color for existing messages
    const myMessages = document.querySelectorAll(`.message-container[data-username="${account.displayName}"] .message-name`);
    myMessages.forEach(el => {
      el.style.color = account.color;
    });
  }

  // Utility functions
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  generateId() {
    // Simple ID generator for client-side use
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ChatApp();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatApp;
} else {
  window.ChatApp = ChatApp;
}
