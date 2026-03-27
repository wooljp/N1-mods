// Authentication Module
class AuthManager {
  constructor() {
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Signup button
    document.getElementById('signupButton').addEventListener('click', () => {
      this.handleSignup();
    });

    // Login button
    document.getElementById('loginButton').addEventListener('click', () => {
      this.handleLogin();
    });

    // Auth toggle links
    document.getElementById('showSignup').addEventListener('click', (e) => {
      e.preventDefault();
      this.showSignupForm();
    });

    document.getElementById('showLogin').addEventListener('click', (e) => {
      e.preventDefault();
      this.showLoginForm();
    });

    // Admin login checkbox
    const adminLoginCheck = document.getElementById('adminLoginCheck');
    if (adminLoginCheck) {
      adminLoginCheck.addEventListener('change', (e) => {
        const adminPasswordContainer = document.getElementById('adminPasswordContainer');
        if (e.target.checked) {
          adminPasswordContainer.classList.remove('hidden');
        } else {
          adminPasswordContainer.classList.add('hidden');
        }
      });

      // Force admin login checkbox to be checked on admin page
      if (window.location.pathname.startsWith('/admin')) {
        adminLoginCheck.checked = true;
        const adminPasswordContainer = document.getElementById('adminPasswordContainer');
        if (adminPasswordContainer) {
          adminPasswordContainer.classList.remove('hidden');
        }
      }
    }

    // Enter key handlers
    this.setupEnterKeyHandlers();
  }

  // 自動ログインを試行（多重ストレージ認証）
  async attemptAutoLogin() {
    console.log('[Auth] Attempting auto login with multi-storage validation...');
    
    try {
      // 多重ストレージ認証を検証
      const validation = await window.multiStorageAuth.validateAuthData();
      
      if (validation.valid) {
        console.log('[Auth] ✅ Multi-storage auth validation successful');
        
        // 認証データを使用してSocket.IO接続
        this.connectWithToken(validation.data);
        return true;
      } else {
        console.log('[Auth] ❌ Multi-storage auth validation failed:', validation.error);
        
        // 不一致の場合は全ストレージをクリア
        await window.multiStorageAuth.clearAllAuthData();
        
        // 手動ログインを要求
        this.showLoginForm();
        return false;
      }
    } catch (error) {
      console.error('[Auth] ❌ Auto login attempt failed:', error);
      
      // エラー時もストレージをクリアして手動ログイン
      await window.multiStorageAuth.clearAllAuthData();
      this.showLoginForm();
      return false;
    }
  }

  // トークンを使用してSocket.IO接続
  connectWithToken(authData) {
    if (window.socketManager) {
      // 認証情報を付与して接続
      window.socketManager.auth = {
        token: authData.authToken,
        userId: authData.userId
      };
      
      window.socketManager.connect();
    }
  }

  // ログイン成功時の処理（多重ストレージ保存）
  async handleLoginSuccess(response) {
    console.log('[Auth] Login successful, saving to multi-storage...');
    
    // 認証データを作成
    const authData = {
      authToken: response.token || response.authToken,
      userId: response.userId || response.account?.id,
      expiresAt: response.expiresAt || this.calculateExpiryTime()
    };
    
    // すべてのストレージに保存
    const saved = await window.multiStorageAuth.saveAuthData(authData);
    
    if (saved) {
      console.log('[Auth] ✅ Auth data saved to all storages');
      
      // UIを更新
      this.hideAuthForms();
      this.showChatInterface();
      
      // Socket.IO接続
      this.connectWithToken(authData);
      
      // ユーザー情報を設定
      if (window.app) {
        window.app.handleLoginSuccess(response);
      }
    } else {
      console.error('[Auth] ❌ Failed to save auth data');
      this.showError('ログイン情報の保存に失敗しました');
    }
  }

  // トークンの有効期限を計算
  calculateExpiryTime() {
    const now = new Date();
    const expiry = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24時間後
    return expiry.toISOString();
  }

  // ログアウト処理（全ストレージクリア）
  async handleLogout() {
    console.log('[Auth] Logging out and clearing all storages...');
    
    // 全ストレージから認証データをクリア
    await window.multiStorageAuth.clearAllAuthData();
    
    // Socket.IOから切断
    if (window.socketManager) {
      window.socketManager.disconnect();
    }
    
    // UIをリセット
    this.showAuthForms();
    this.hideChatInterface();
    
    console.log('[Auth] ✅ Logout completed');
  }

  // 既存のログイン処理を更新
  async handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const isAdminLogin = document.getElementById('adminLoginCheck')?.checked || false;
    const adminPassword = isAdminLogin ? document.getElementById('adminPassword').value : '';

    if (!username || !password) {
      this.showError('ユーザー名とパスワードを入力してください');
      return;
    }

    if (isAdminLogin && !adminPassword) {
      this.showError('管理者パスワードを入力してください');
      return;
    }

    this.showLoading(true);

    try {
      const response = await this.sendLoginRequest(username, password, adminPassword);
      
      if (response.success) {
        await this.handleLoginSuccess(response);
      } else {
        this.showError(response.error || 'ログインに失敗しました');
      }
    } catch (error) {
      console.error('[Auth] Login error:', error);
      this.showError('ログイン中にエラーが発生しました');
    } finally {
      this.showLoading(false);
    }
  }

  // 既存のサインアップ処理を更新
  async handleSignup() {
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    if (!username || !password) {
      this.showError('ユーザー名とパスワードを入力してください');
      return;
    }

    if (password !== confirmPassword) {
      this.showError('パスワードが一致しません');
      return;
    }

    if (password.length < 6) {
      this.showError('パスワードは6文字以上にしてください');
      return;
    }

    // CAPTCHAを表示して検証
    await this.showCaptchaAndSignup(username, password);
  }

  // CAPTCHA表示とサインアップ処理
  async showCaptchaAndSignup(username, password) {
    // CAPTCHAを初期化
    window.captchaManager.init();
    
    // 成功コールバックを設定
    window.captchaManager.setOnSuccess(async () => {
      await this.performSignup(username, password);
    });
    
    // CAPTCHAを取得して表示
    await window.captchaManager.getCaptcha();
  }

  // 実際のサインアップ処理
  async performSignup(username, password) {
    this.showLoading(true);

    try {
      const response = await this.sendSignupRequest(username, password);
      
      if (response.success) {
        await this.handleLoginSuccess(response);
      } else {
        this.showError(response.error || 'サインアップに失敗しました');
        // 失敗時はCAPTCHAをリセット
        window.captchaManager.reset();
      }
    } catch (error) {
      console.error('[Auth] Signup error:', error);
      this.showError('サインアップ中にエラーが発生しました');
      // エラー時はCAPTCHAをリセット
      window.captchaManager.reset();
    } finally {
      this.showLoading(false);
    }
  }

  // Enter key handlers
  setupEnterKeyHandlers() {
    document.getElementById('signupUsername').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('signupButton').click();
      }
    });

    document.getElementById('signupPassword').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('signupConfirmPassword').focus();
      }
    });

    document.getElementById('signupConfirmPassword').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('signupButton').click();
      }
    });

    document.getElementById('loginUsername').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('loginPassword').focus();
      }
    });

    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('loginButton').click();
      }
    });

    const adminPassword = document.getElementById('adminPassword');
    if (adminPassword) {
      adminPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          document.getElementById('loginButton').click();
        }
      });
    }
  }

  handleSignup() {
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;

    if (!username) {
      this.showAuthError('ユーザー名を入力してください');
      return;
    }

    if (username.length < 1 || username.length > 20) {
      this.showAuthError('ユーザー名は1〜20文字で入力してください');
      return;
    }

    // Username validation: allow letters, numbers, hiragana, katakana, kanji, and symbols
    // Exclude only whitespace and control characters
    const validUsernameRegex = /^[^\s\u0000-\u001F\u007F-\u009F]+$/;
    if (!validUsernameRegex.test(username)) {
      this.showAuthError('ユーザー名にスペースや制御文字は使用できません。');
      return;
    }

    if (!password || password.length < 4) {
      this.showAuthError('パスワードは4文字以上で入力してください');
      return;
    }

    if (password !== passwordConfirm) {
      this.showAuthError('パスワードが一致しません');
      return;
    }

    // Emit signup event to socket
    if (window.socketManager) {
      window.socketManager.emit('signup', { username, password }, (response) => {
        if (response && response.success) {
          this.showAuthSuccess(`アカウントを作成しました！表示名: ${response.account.displayName}`);
          document.getElementById('loginDisplayName').value = username;
          document.getElementById('signupUsername').value = '';
          document.getElementById('signupPassword').value = '';
          document.getElementById('signupPasswordConfirm').value = '';
          setTimeout(() => {
            this.showLoginForm();
          }, 2000);
        } else {
          this.showAuthError(response ? response.error : 'アカウント作成に失敗しました');
        }
      });
    }
  }

  handleLogin() {
    const username = document.getElementById('loginDisplayName').value.trim();
    const password = document.getElementById('loginPassword').value;
    const isAdminLogin = document.getElementById('adminLoginCheck').checked;
    const adminPassword = document.getElementById('adminPassword').value;

    // Force admin login on admin page
    const forceAdminLogin = window.location.pathname.startsWith('/admin');

    if (!username) {
      this.showAuthError('名前を入力してください');
      return;
    }

    // Username validation: allow letters, numbers, hiragana, katakana, kanji, and symbols
    // Exclude only whitespace and control characters
    const validUsernameRegex = /^[^\s\u0000-\u001F\u007F-\u009F]+$/;
    if (!validUsernameRegex.test(username)) {
      this.showAuthError('ユーザー名にスペースや制御文字は使用できません。');
      return;
    }

    if (!password) {
      this.showAuthError('パスワードを入力してください');
      return;
    }

    // On admin page, require admin login
    if (forceAdminLogin && !isAdminLogin) {
      this.showAuthError('管理者ページでは管理者としてログインする必要があります');
      return;
    }

    if ((isAdminLogin || forceAdminLogin) && !adminPassword) {
      this.showAuthError('管理者パスワードを入力してください');
      return;
    }

    // Emit login event to socket
    if (window.socketManager) {
      window.socketManager.emit('accountLogin', { 
        username, 
        password, 
        adminLogin: isAdminLogin || forceAdminLogin, 
        adminPassword: adminPassword 
      }, (response) => {
        if (response && response.success) {
          this.handleLoginSuccess(response);
        } else {
          this.showAuthError(response ? response.error : 'ログインに失敗しました');
        }
      });
    }
  }

  handleLoginSuccess(response) {
    // Store token and display name
    localStorage.setItem('chatToken', response.token);
    localStorage.setItem('chatDisplayName', response.account.displayName);

    // Hide auth section and show chat
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('chat-container').classList.remove('hidden');

    // Set current user globally
    if (window.app) {
      window.app.setCurrentUser(response.account.displayName);
      window.app.handleLoginSuccess(response);
    }

    // Clear form
    document.getElementById('loginDisplayName').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminLoginCheck').checked = false;
    document.getElementById('adminPasswordContainer').classList.add('hidden');
  }

  showSignupForm() {
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('signup-form').classList.add('active');
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('auth-success').classList.add('hidden');
    document.getElementById('signupUsername').focus();
  }

  showLoginForm() {
    document.getElementById('signup-form').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('auth-success').classList.add('hidden');
    document.getElementById('loginDisplayName').focus();
  }

  showAuthError(message) {
    const errorElement = document.getElementById('auth-error');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    document.getElementById('auth-success').classList.add('hidden');
  }

  showAuthSuccess(message) {
    const successElement = document.getElementById('auth-success');
    successElement.textContent = message;
    successElement.classList.remove('hidden');
    document.getElementById('auth-error').classList.add('hidden');
  }

  // Auto-login with stored token
  attemptAutoLogin() {
    const token = localStorage.getItem('chatToken');
    const displayName = localStorage.getItem('chatDisplayName');

    if (token && displayName) {
      if (window.socketManager) {
        window.socketManager.emit('loginWithToken', { token, displayName }, (response) => {
          if (response && response.success) {
            this.handleLoginSuccess(response);
          } else {
            // Clear invalid token
            localStorage.removeItem('chatToken');
            localStorage.removeItem('chatDisplayName');
          }
        });
      }
    }
  }

  // Logout
  logout() {
    const token = localStorage.getItem('chatToken');
    if (token && window.socketManager) {
      window.socketManager.emit('logout', { token }, () => {
        localStorage.removeItem('chatToken');
        localStorage.removeItem('chatDisplayName');
        window.location.reload();
      });
    } else {
      localStorage.removeItem('chatToken');
      localStorage.removeItem('chatDisplayName');
      window.location.reload();
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
} else {
  window.AuthManager = AuthManager;
}
