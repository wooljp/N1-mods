class CaptchaManager {
  constructor() {
    this.currentCaptcha = null;
    this.isLoading = false;
  }

  // CAPTCHAを取得
  async getCaptcha() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      const response = await fetch('/api/captcha');
      const data = await response.json();
      
      if (data.success) {
        this.currentCaptcha = data.captcha;
        this.displayCaptcha(data.captcha);
        return data.captcha;
      } else {
        throw new Error(data.error || 'CAPTCHAの取得に失敗しました');
      }
    } catch (error) {
      console.error('[CAPTCHA] Error:', error);
      this.showError(error.message);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  // CAPTCHAを検証
  async validateCaptcha(answer) {
    if (!this.currentCaptcha) {
      throw new Error('CAPTCHAがありません');
    }
    
    try {
      const response = await fetch('/api/captcha/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: this.currentCaptcha.id,
          answer: answer
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.currentCaptcha = null;
        this.clearCaptcha();
        return true;
      } else {
        throw new Error(data.error || 'CAPTCHAの検証に失敗しました');
      }
    } catch (error) {
      console.error('[CAPTCHA] Validation error:', error);
      throw error;
    }
  }

  // CAPTCHAを表示
  displayCaptcha(captcha) {
    const container = document.getElementById('captcha-container');
    const question = document.getElementById('captcha-question');
    const input = document.getElementById('captcha-input');
    const refreshBtn = document.getElementById('captcha-refresh');
    
    if (container && question && input) {
      question.textContent = captcha.question;
      input.value = '';
      input.focus();
      
      // リロードボタンのイベント設定
      if (refreshBtn) {
        refreshBtn.onclick = () => this.getCaptcha();
      }
      
      // Enterキーで検証
      input.onkeypress = (e) => {
        if (e.key === 'Enter') {
          this.handleCaptchaSubmit();
        }
      };
      
      container.classList.remove('hidden');
      container.classList.add('visible');
    }
  }

  // CAPTCHAをクリア
  clearCaptcha() {
    const container = document.getElementById('captcha-container');
    const input = document.getElementById('captcha-input');
    
    if (container) {
      container.classList.add('hidden');
      container.classList.remove('visible');
    }
    
    if (input) {
      input.value = '';
    }
    
    this.currentCaptcha = null;
  }

  // CAPTCHA送信処理
  async handleCaptchaSubmit() {
    const input = document.getElementById('captcha-input');
    const answer = input?.value?.trim();
    
    if (!answer) {
      this.showError('🍫を入力してください');
      return;
    }
    
    try {
      const isValid = await this.validateCaptcha(answer);
      
      if (isValid) {
        this.showSuccess('✅ 認証に成功しました');
        // 親コンポーネントに成功を通知
        if (this.onSuccess) {
          this.onSuccess();
        }
      }
    } catch (error) {
      this.showError(error.message);
      
      // 失敗時は新しいCAPTCHAを取得
      setTimeout(() => {
        this.getCaptcha();
      }, 1000);
    }
  }

  // エラー表示
  showError(message) {
    const errorElement = document.getElementById('captcha-error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
      errorElement.style.color = '#e74c3c';
      
      // 3秒後に非表示
      setTimeout(() => {
        errorElement.style.display = 'none';
      }, 3000);
    } else {
      alert(message);
    }
  }

  // 成功表示
  showSuccess(message) {
    const errorElement = document.getElementById('captcha-error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
      errorElement.style.color = '#2ecc71';
      
      // 2秒後に非表示
      setTimeout(() => {
        errorElement.style.display = 'none';
      }, 2000);
    }
  }

  // 初期化
  init() {
    // CAPTCHAコンテナが存在するか確認
    const container = document.getElementById('captcha-container');
    if (!container) {
      console.warn('[CAPTCHA] Container not found');
      return;
    }
    
    // CAPTCHAコンテナのHTML構造を作成
    container.innerHTML = `
      <div class="captcha-content">
        <div class="captcha-header">
          <h4>🛡️ ロボット確認</h4>
          <button id="captcha-refresh" class="captcha-refresh-btn" title="新しいCAPTCHA">🔄</button>
        </div>
        <div class="captcha-question" id="captcha-question">
          読み込み中...
        </div>
        <div class="captcha-input-container">
          <input 
            type="text" 
            id="captcha-input" 
            class="captcha-input"
            placeholder="ここに入力してください"
            maxlength="10"
            autocomplete="off"
          >
          <button id="captcha-submit" class="captcha-submit-btn">
            確認
          </button>
        </div>
        <div id="captcha-error" class="captcha-message"></div>
      </div>
    `;
    
    // 送信ボタンのイベント設定
    const submitBtn = document.getElementById('captcha-submit');
    if (submitBtn) {
      submitBtn.onclick = () => this.handleCaptchaSubmit();
    }
    
    console.log('[CAPTCHA] Initialized');
  }

  // 成功コールバック設定
  setOnSuccess(callback) {
    this.onSuccess = callback;
  }

  // リセット
  reset() {
    this.clearCaptcha();
    this.currentCaptcha = null;
    this.isLoading = false;
  }
}

// グローバルインスタンスを作成
window.captchaManager = new CaptchaManager();
