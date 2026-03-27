// Private Message Module
class PrivateMessageManager {
  constructor() {
    this.privateMessages = [];
    this.isOpen = false;
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Toggle private messages
    const toggleBtn = document.getElementById('toggle-private-messages');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.togglePrivateMessages();
      });
    }

    // Close private messages
    const closeBtn = document.getElementById('close-private-messages');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closePrivateMessages();
      });
    }

    // Private message input
    const pmInput = document.getElementById('private-message-input');
    const pmSendBtn = document.getElementById('private-message-send');
    const pmToInput = document.getElementById('private-message-to');

    if (pmInput && pmSendBtn) {
      pmInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendPrivateMessage();
        }
      });

      pmSendBtn.addEventListener('click', () => {
        this.sendPrivateMessage();
      });
    }

    if (pmToInput) {
      pmToInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          pmInput.focus();
        }
      });
    }
  }

  togglePrivateMessages() {
    const container = document.getElementById('private-messages-container');
    if (container) {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        container.classList.add('active');
        this.loadPrivateMessages();
      } else {
        container.classList.remove('active');
      }
    }
  }

  closePrivateMessages() {
    const container = document.getElementById('private-messages-container');
    if (container) {
      container.classList.remove('active');
      this.isOpen = false;
    }
  }

  sendPrivateMessage() {
    const toInput = document.getElementById('private-message-to');
    const messageInput = document.getElementById('private-message-input');
    
    const to = toInput.value.trim();
    const message = messageInput.value.trim();

    if (!to) {
      alert('送信先ユーザー名を入力してください');
      return;
    }

    if (!message) {
      alert('メッセージを入力してください');
      return;
    }

    if (window.socketManager && window.app.currentUser) {
      window.socketManager.emit('privateMessage', { to, message }, (response) => {
        if (response && response.success) {
          messageInput.value = '';
          messageInput.focus();
        } else {
          alert(response ? response.error : 'プライベートメッセージの送信に失敗しました');
        }
      });
    }
  }

  addPrivateMessage(data, myUsername) {
    this.privateMessages.push(data);
    
    if (this.isOpen) {
      this.renderPrivateMessage(data);
    } else {
      this.showNotification(data, myUsername);
    }
  }

  renderPrivateMessage(data) {
    const content = document.getElementById('private-messages-content');
    if (!content) return;

    const isSent = data.from === window.app?.currentUser;
    const pmDiv = document.createElement('div');
    pmDiv.className = 'private-message-container' + (isSent ? ' sent' : ' received');
    pmDiv.dataset.id = data.id;

    pmDiv.innerHTML = `
      <div class="private-message-header">
        <span class="private-message-sender">${this.escapeHtml(data.from)}</span>
        <span class="private-message-time">${this.formatTime(data.timestamp)}</span>
      </div>
      <div class="private-message-text">${this.escapeHtml(data.message).replace(/\n/g, '<br>')}</div>
      <div class="private-message-actions">
        <button class="private-message-delete">削除</button>
      </div>
    `;

    content.appendChild(pmDiv);
    this.scrollToBottom();

    // Add delete functionality
    const deleteBtn = pmDiv.querySelector('.private-message-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.deletePrivateMessage(data.id);
      });
    }
  }

  deletePrivateMessage(id) {
    if (confirm('このプライベートメッセージを削除してもよろしいですか？')) {
      if (window.socketManager) {
        window.socketManager.emit('deletePrivateMessage', { id }, (response) => {
          if (!response || !response.success) {
            alert(response ? response.error : 'プライベートメッセージの削除に失敗しました');
          }
        });
      }
    }
  }

  deletePrivateMessageFromDOM(id) {
    const pmElement = document.querySelector(`.private-message-container[data-id="${id}"]`);
    if (pmElement) {
      pmElement.remove();
    }
  }

  loadPrivateMessages() {
    const content = document.getElementById('private-messages-content');
    if (!content) return;

    content.innerHTML = '';
    
    this.privateMessages.forEach(pm => {
      this.renderPrivateMessage(pm);
    });

    this.scrollToBottom();
  }

  showNotification(data, myUsername) {
    // Only show notification for received messages
    if (data.from !== myUsername) {
      const notification = document.createElement('div');
      notification.className = 'private-message-notification';
      notification.innerHTML = `
        ${this.escapeHtml(data.from)}からのプライベートメッセージ: ${this.escapeHtml(data.message.substring(0, 50))}${data.message.length > 50 ? '...' : ''}
      `;

      document.body.appendChild(notification);

      notification.addEventListener('click', () => {
        this.togglePrivateMessages();
        notification.remove();
      });

      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 5000);
    }
  }

  updateUserList(users) {
    const userList = document.getElementById('private-user-list');
    if (!userList) return;

    userList.innerHTML = '';
    
    users.forEach(user => {
      const userItem = document.createElement('div');
      userItem.className = 'private-user-item';
      userItem.innerHTML = `
        <span class="private-user-name">${this.escapeHtml(user)}</span>
        <span class="private-user-status online">オンライン</span>
      `;

      userItem.addEventListener('click', () => {
        const toInput = document.getElementById('private-message-to');
        if (toInput) {
          toInput.value = user;
          document.getElementById('private-message-input').focus();
        }
      });

      userList.appendChild(userItem);
    });
  }

  clearAllPrivateMessages() {
    this.privateMessages = [];
    const content = document.getElementById('private-messages-content');
    if (content) {
      content.innerHTML = '<div class="private-messages-empty">プライベートメッセージはありません</div>';
    }
  }

  scrollToBottom() {
    const content = document.getElementById('private-messages-content');
    if (content) {
      content.scrollTop = content.scrollHeight;
    }
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PrivateMessageManager;
} else {
  window.PrivateMessageManager = PrivateMessageManager;
}
