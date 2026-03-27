// Chat Functionality Module
class ChatManager {
  constructor() {
    this.typingUsers = new Set();
    this.typingTimeout = null;
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Typing indicators
    const messageInput = window.uiManager ? window.uiManager.getMessageInputElement() : document.getElementById('message-input');
    if (messageInput) {
      messageInput.addEventListener('input', () => {
        this.handleTyping();
      });

      messageInput.addEventListener('blur', () => {
        this.stopTyping();
      });
    }
  }

  handleTyping() {
    if (window.socketManager && window.app.currentUser) {
      // Clear existing timeout
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
      }

      // Send typing indicator
      window.socketManager.emit('typing');

      // Set timeout to stop typing indicator
      this.typingTimeout = setTimeout(() => {
        this.stopTyping();
      }, 3000);
    }
  }

  stopTyping() {
    if (window.socketManager) {
      window.socketManager.emit('stopTyping');
    }
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  showTypingIndicator(username) {
    this.typingUsers.add(username);
    this.updateTypingIndicator();
  }

  hideTypingIndicator(username) {
    this.typingUsers.delete(username);
    this.updateTypingIndicator();
  }

  updateTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (!indicator) return;

    if (this.typingUsers.size > 0) {
      const usernames = Array.from(this.typingUsers);
      if (usernames.length === 1) {
        indicator.textContent = `${usernames[0]}が入力中...`;
      } else if (usernames.length === 2) {
        indicator.textContent = `${usernames[0]}と${usernames[1]}が入力中...`;
      } else {
        indicator.textContent = `${usernames.length}人が入力中...`;
      }
      indicator.style.display = 'block';
    } else {
      indicator.style.display = 'none';
    }
  }

  updateUserList(users) {
    const userCount = document.getElementById('user-count');
    const userNames = document.getElementById('user-names');
    
    if (userCount) {
      userCount.textContent = `${users.length}人`;
    }
    
    if (userNames) {
      userNames.textContent = users.join(', ');
    }

    // Update private message user list
    if (window.privateMessageManager) {
      window.privateMessageManager.updateUserList(users);
    }
  }

  handleUserJoined(data) {
    this.addSystemMessage(`${data.username} がチャットに参加しました`);
    
    if (data.statuses && window.app) {
      Object.assign(window.app.userStatusMap, data.statuses);
    }

    // Play notification sound (if implemented)
    this.playNotificationSound();
  }

  handleUserLeft(data) {
    this.addSystemMessage(`${data.username} がチャットから退出しました`);
    
    if (data.statuses && window.app) {
      Object.assign(window.app.userStatusMap, data.statuses);
    }

    // Remove from typing users
    this.typingUsers.delete(data.username);
    this.updateTypingIndicator();
  }

  addSystemMessage(message) {
    const data = {
      id: this.generateId(),
      username: 'システム',
      message: message,
      timestamp: new Date().toISOString(),
      isCommandResult: true
    };

    if (window.messageManager) {
      window.messageManager.addMessage(data);
    }
  }

  handleNewMessageNotice() {
    if (window.messageManager) {
      window.messageManager.handleNewMessageNotice();
    }
  }

  handleAllMessagesDeleted() {
    if (window.messageManager) {
      window.messageManager.clearAllMessages();
    }
    this.addSystemMessage('管理者がすべてのメッセージを削除しました');
  }

  handleAllPrivateMessagesDeleted() {
    if (window.privateMessageManager) {
      window.privateMessageManager.clearAllPrivateMessages();
    }
    this.addSystemMessage('管理者がすべてのプライベートメッセージを削除しました');
  }

  handleCommandResult(message) {
    this.addSystemMessage(message);
  }

  handleFortuneResult(fortuneData) {
    const data = {
      id: this.generateId(),
      username: 'おみくじ',
      message: fortuneData.text,
      color: '#FF69B4',
      timestamp: new Date().toISOString(),
      isCommandResult: true
    };

    if (window.messageManager) {
      window.messageManager.addMessage(data);
    }
  }

  handleProfileUpdate(account) {
    // Update current user's color and theme
    if (window.app) {
      window.app.userStatusMap[account.displayName] = account.statusText;
      
      // Apply theme
      document.body.className = `theme-${account.theme}`;
      
      // Update color for existing messages
      const myMessages = document.querySelectorAll(`.message-container[data-username="${account.displayName}"] .message-name`);
      myMessages.forEach(el => {
        el.style.color = account.color;
      });
    }

    this.addSystemMessage('プロフィールを更新しました');
  }

  playNotificationSound() {
    // Create a simple notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Silently fail if audio is not supported
    }
  }

  generateId() {
    return require('crypto').randomUUID();
  }

  // Heartbeat for keeping connection alive
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (window.socketManager) {
        window.socketManager.emit('heartbeat');
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Handle connection events
  handleConnect() {
    console.log('Connected to server');
    this.addSystemMessage('サーバーに接続しました');
    this.startHeartbeat();
  }

  handleDisconnect(reason) {
    console.log('Disconnected from server:', reason);
    this.stopHeartbeat();
    if (window.app?.currentUser) {
      this.addSystemMessage('サーバーとの接続が切断されました。再接続中...');
    }
  }

  handleReconnect(attemptNumber) {
    console.log(`Reconnected after ${attemptNumber} attempts`);
    this.addSystemMessage('サーバーに再接続しました');
    this.startHeartbeat();
  }

  handleReconnectFailed() {
    this.addSystemMessage('再接続に失敗しました。ページをリロードしてください。');
  }

  handleConnectError(error) {
    console.log('Connection error:', error.message);
  }

  // Initialize chat after login
  initializeChat(data) {
    // Load messages
    if (data.messages && window.messageManager) {
      data.messages.forEach(message => {
        window.messageManager.addMessage(message);
      });
    }

    // Load private messages
    if (data.privateMessages && window.privateMessageManager) {
      data.privateMessages.forEach(pm => {
        window.privateMessageManager.addPrivateMessage(pm, window.app.currentUser);
      });
    }

    // Update user list
    if (data.onlineUsers) {
      this.updateUserList(data.onlineUsers);
    }

    // Set admin status
    if (window.adminManager) {
      window.adminManager.setAdminStatus(data.isAdmin, data.isPrivilegedAdmin);
      
      // Load admin data
      if (data.isAdmin) {
        window.adminManager.updateAdminPanel({
          users: data.onlineUsers,
          bannedUsers: data.ipBanList || [],
          ipList: data.ipBanList || []
        });
      }
    }

    // Load user status map
    if (data.users && window.app) {
      window.app.userStatusMap = {};
      Object.keys(data.users).forEach(username => {
        if (data.users[username].statusText) {
          window.app.userStatusMap[username] = data.users[username].statusText;
        }
      });
    }

    this.addSystemMessage('チャットに参加しました');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatManager;
} else {
  window.ChatManager = ChatManager;
}
