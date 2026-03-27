// Message Handling Module
class MessageManager {
  constructor() {
    this.messages = [];
    this.replyToMessage = null;
    this.editingMessageId = null;
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Get appropriate message input based on user role
    const messageInput = window.uiManager ? window.uiManager.getMessageInputElement() : document.getElementById('message-input');
    const sendButton = window.uiManager ? window.uiManager.getSendButtonElement() : document.getElementById('send-button');

    if (messageInput && sendButton) {
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      sendButton.addEventListener('click', () => {
        this.sendMessage();
      });
    }

    // Cancel reply
    const cancelReplyBtn = document.getElementById('cancel-reply');
    if (cancelReplyBtn) {
      cancelReplyBtn.addEventListener('click', () => {
        this.cancelReply();
      });
    }
  }

  sendMessage() {
    const messageInput = window.uiManager ? window.uiManager.getMessageInputElement() : document.getElementById('message-input');
    const message = messageInput.value.trim();

    if (!message) return;

    // chat.htmlでの管理者コマンドをクライアント側で制限
    const isFromChat = window.location.pathname === '/' || window.location.pathname === '/chat';
    const adminCommands = ['/delete', '/prmdelete', '/rule', '/system', '/ban', '/unban', '/mute', '/unmute', '/mutelist', '/banlist', '/ipban', '/ipunban', '/ipbanlist'];
    
    if (isFromChat) {
      const command = message.split(' ')[0].toLowerCase();
      if (adminCommands.includes(command)) {
        alert('このコマンドは管理者ページ(/admin)で使用してください');
        return;
      }
    }

    if (window.socketManager && window.app.currentUser) {
      const messageData = {
        message: message,
        replyTo: this.replyToMessage
      };

      window.socketManager.emit('chatMessage', messageData, (response) => {
        if (response && response.success) {
          messageInput.value = '';
          this.cancelReply();
          messageInput.focus();
        } else {
          alert(response ? response.error : 'メッセージの送信に失敗しました');
        }
      });
    }
  }

  addMessage(data) {
    const isOwn = data.username === window.app?.currentUser;
    const isCommandResult = data.isCommandResult || false;
    const isSystemMessage = data.username === 'システム';
    const container = document.createElement('div');
    container.className = 'message-container' + (isOwn ? ' own-message' : '');
    if (isSystemMessage) {
      container.classList.add('system-message');
    }
    if (isCommandResult) {
      container.classList.add('command-result');
    }
    container.dataset.username = data.username;

    let replyHtml = '';
    if (data.replyTo) {
      replyHtml = `<div class="reply-quote">↩ ${this.escapeHtml(data.replyTo.username)}: ${this.escapeHtml(data.replyTo.message.substring(0, 30))}${data.replyTo.message.length > 30 ? '...' : ''}</div>`;
    }

    const editedMark = data.edited ? '<span class="edited-mark">(編集済み)</span>' : '';
    const linkedMessage = this.linkUrls(data.message);
    const messageTextHtml = linkedMessage.replace(/\n/g, '<br>');

    let statusHtml = '';
    const baseUsername = data.username;
    if (data.statusText) {
      statusHtml = `<span class="status-text">${this.escapeHtml(data.statusText)}</span>`;
    } else if (window.app?.userStatusMap && window.app.userStatusMap[baseUsername]) {
      statusHtml = `<span class="status-text">${this.escapeHtml(window.app.userStatusMap[baseUsername])}</span>`;
    }

    const showActionMenu = true;

    container.innerHTML = `
      ${replyHtml}
      <div class="message-name" style="color: ${data.color || '#333'}">${this.escapeHtml(data.username)}${statusHtml}</div>
      <div class="message-text">${messageTextHtml}</div>
      <div class="message-meta">
        <span class="message-time">${this.formatTime(data.timestamp)}</span>
        ${editedMark}
        ${showActionMenu ? '<div class="message-actions"><button class="action-button">⋮</button></div>' : ''}
      </div>
    `;

    const chatBox = document.getElementById('chat-box');
    if (chatBox) {
      chatBox.appendChild(container);
      this.scrollToBottom();

      // Add action menu functionality
      if (showActionMenu) {
        this.addActionMenu(container, data);
      }
    }
  }

  addActionMenu(container, data) {
    const actionButton = container.querySelector('.action-button');
    if (!actionButton) return;

    actionButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showActionMenu(e.target, data);
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      const existingMenu = document.querySelector('.action-menu');
      if (existingMenu && !existingMenu.contains(e.target)) {
        existingMenu.remove();
      }
    });
  }

  showActionMenu(button, data) {
    // Remove existing menu
    const existingMenu = document.querySelector('.action-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const cleanUsername = data.username;
    const isMyMessage = cleanUsername === window.app?.currentUser;
    const isPrivilegedAdmin = window.app?.isPrivilegedAdmin;

    let menuHtml = '';
    if (isMyMessage || isPrivilegedAdmin) {
      menuHtml += '<button class="edit-btn">編集</button>';
      menuHtml += '<button class="delete-btn delete">削除</button>';
    }
    menuHtml += `<button class="reply-btn">返信</button>`;

    const menu = document.createElement('div');
    menu.className = 'action-menu';
    menu.innerHTML = menuHtml;

    button.appendChild(menu);

    // Menu actions
    menu.querySelector('.edit-btn')?.addEventListener('click', () => {
      this.editMessage(data);
      menu.remove();
    });

    menu.querySelector('.delete-btn')?.addEventListener('click', () => {
      this.deleteMessage(data);
      menu.remove();
    });

    menu.querySelector('.reply-btn')?.addEventListener('click', () => {
      this.setReplyTo(data);
      menu.remove();
    });
  }

  editMessage(data) {
    const newText = prompt('メッセージを編集:', data.message);
    if (newText && newText.trim() && newText !== data.message) {
      if (window.socketManager) {
        window.socketManager.emit('editMessage', { id: data.id, message: newText.trim() }, (response) => {
          if (!response || !response.success) {
            alert(response ? response.error : 'メッセージの編集に失敗しました');
          }
        });
      }
    }
  }

  deleteMessage(data) {
    if (confirm('このメッセージを削除してもよろしいですか？')) {
      if (window.socketManager) {
        window.socketManager.emit('deleteMessage', { id: data.id }, (response) => {
          if (!response || !response.success) {
            alert(response ? response.error : 'メッセージの削除に失敗しました');
          }
        });
      }
    }
  }

  setReplyTo(data) {
    this.replyToMessage = {
      id: data.id,
      username: data.username,
      message: data.message
    };

    const replyPreview = document.getElementById('reply-preview');
    const replyToText = document.getElementById('reply-to-text');
    if (replyPreview && replyToText) {
      replyToText.textContent = `${data.username}に返信: ${data.message.substring(0, 30)}${data.message.length > 30 ? '...' : ''}`;
      replyPreview.classList.remove('hidden');
    }

    document.getElementById('message-input').focus();
  }

  cancelReply() {
    this.replyToMessage = null;
    const replyPreview = document.getElementById('reply-preview');
    if (replyPreview) {
      replyPreview.classList.add('hidden');
    }
  }

  updateMessage(data) {
    const messageElement = document.querySelector(`.message-container[data-id="${data.id}"] .message-text`);
    if (messageElement) {
      messageElement.textContent = data.message;
      
      // Add edited mark if not present
      const metaElement = messageElement.parentElement.querySelector('.message-meta');
      if (metaElement && !metaElement.querySelector('.edited-mark')) {
        const editedMark = document.createElement('span');
        editedMark.className = 'edited-mark';
        editedMark.textContent = '(編集済み)';
        metaElement.insertBefore(editedMark, metaElement.firstChild);
      }
    }
  }

  deleteMessageFromDOM(id) {
    const messageElement = document.querySelector(`.message-container[data-id="${id}"]`);
    if (messageElement) {
      messageElement.remove();
    }
  }

  clearAllMessages() {
    const chatBox = document.getElementById('chat-box');
    if (chatBox) {
      chatBox.innerHTML = '';
    }
  }

  scrollToBottom() {
    const chatBox = document.getElementById('chat-box');
    if (chatBox) {
      chatBox.scrollTop = chatBox.scrollHeight;
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

  linkUrls(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  }

  handleNewMessageNotice() {
    const chatBox = document.getElementById('chat-box');
    const notice = document.getElementById('new-message-notice');
    
    if (chatBox && notice) {
      const isAtBottom = chatBox.scrollHeight - chatBox.scrollTop <= chatBox.clientHeight + 50;
      
      if (!isAtBottom) {
        notice.classList.remove('hidden');
        notice.addEventListener('click', () => {
          this.scrollToBottom();
          notice.classList.add('hidden');
        });
      } else {
        notice.classList.add('hidden');
      }
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MessageManager;
} else {
  window.MessageManager = MessageManager;
}
