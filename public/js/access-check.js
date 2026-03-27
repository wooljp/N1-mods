// 管理者ページアクセスチェック
class AccessChecker {
  constructor() {
    this.authManager = window.multiStorageAuth || null;
    this.init();
  }

  async init() {
    // アクセスチェックを実行
    await this.checkAccess();
  }

  async checkAccess() {
    try {
      // 1. トークンが全ストレージに存在するか確認
      const hasValidToken = await this.validateTokenStorage();
      
      if (!hasValidToken) {
        this.showAccessError('認証トークンが見つかりません。先に一般チャットでログインしてください。');
        return;
      }

      // 2. トークンの有効性をサーバーで確認
      const tokenValidation = await this.validateTokenWithServer();
      
      if (!tokenValidation.valid) {
        this.showAccessError('トークンが無効です。再度ログインしてください。');
        return;
      }

      // 3. 管理者権限の確認
      if (!tokenValidation.isAdmin && !tokenValidation.isPrivilegedAdmin) {
        this.showAccessError('管理者権限がありません。このページは管理者専用です。');
        return;
      }

      // 4. アクセス許可 - 認証セクションを表示
      this.grantAccess(tokenValidation);

    } catch (error) {
      console.error('[AccessCheck] Error:', error);
      this.showAccessError('アクセス確認中にエラーが発生しました。');
    }
  }

  async validateTokenStorage() {
    if (!this.authManager) {
      console.error('[AccessCheck] MultiStorageAuth not found');
      return false;
    }

    try {
      // 全ストレージからトークンを取得
      const localToken = localStorage.getItem('authToken');
      const cookieToken = this.getCookie('authToken');
      const indexedDBToken = await this.getIndexedDBToken();

      // 全てのストレージに同一トークンが存在するか確認
      if (!localToken || !cookieToken || !indexedDBToken) {
        return false;
      }

      if (localToken !== cookieToken || cookieToken !== indexedDBToken) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('[AccessCheck] Token validation error:', error);
      return false;
    }
  }

  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
  }

  async getIndexedDBToken() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ChocochatAuth', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['auth'], 'readonly');
        const store = transaction.objectStore('auth');
        const getRequest = store.get('authData');
        
        getRequest.onerror = () => reject(getRequest.error);
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          resolve(result ? result.authToken : null);
        };
      };
    });
  }

  async validateTokenWithServer() {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        throw new Error('Server validation failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[AccessCheck] Server validation error:', error);
      return { valid: false };
    }
  }

  showAccessError(message) {
    document.getElementById('access-status').style.display = 'none';
    document.getElementById('access-error').style.display = 'block';
    document.getElementById('error-message').textContent = message;
  }

  grantAccess(tokenData) {
    // アクセスチェックを非表示
    document.getElementById('access-check').style.display = 'none';
    
    // 認証セクションを表示
    document.getElementById('auth-section').style.display = 'block';
    
    // 既にログインしている場合は直接管理者画面へ
    if (tokenData.valid && (tokenData.isAdmin || tokenData.isPrivilegedAdmin)) {
      // 自動ログイン処理を開始
      this.autoLoginToAdmin(tokenData);
    }
  }

  autoLoginToAdmin(tokenData) {
    // 認証情報を設定
    if (window.app) {
      window.app.setCurrentUser(tokenData.displayName);
      window.app.isAdmin = tokenData.isAdmin;
      window.app.isPrivilegedAdmin = tokenData.isPrivilegedAdmin;
    }

    // 認証フォームを非表示
    document.getElementById('auth-section').style.display = 'none';
    
    // 管理者画面を表示
    document.getElementById('chat-container').classList.remove('hidden');
    
    // Socket.IO接続を開始
    if (window.app && window.app.initializeSocket) {
      window.app.initializeSocket();
    }
  }
}

// ページ読み込み時にアクセスチェックを実行
document.addEventListener('DOMContentLoaded', () => {
  new AccessChecker();
});
