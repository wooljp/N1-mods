class MultiStorageAuth {
  constructor() {
    this.AUTH_KEY = 'chatAuth';
    this.DB_NAME = 'ChatAuthDB';
    this.DB_VERSION = 1;
    this.STORE_NAME = 'auth';
  }

  // 認証データをすべてのストレージに保存
  async saveAuthData(authData) {
    try {
      // LocalStorageに保存
      localStorage.setItem(this.AUTH_KEY, JSON.stringify(authData));
      
      // Cookieに保存
      this.saveToCookie(authData);
      
      // IndexDBに保存
      await this.saveToIndexDB(authData);
      
      console.log('[Auth] ✅ Auth data saved to all storages');
      return true;
    } catch (error) {
      console.error('[Auth] ❌ Failed to save auth data:', error);
      return false;
    }
  }

  // Cookieに保存
  saveToCookie(authData) {
    const jsonStr = JSON.stringify(authData);
    const encoded = encodeURIComponent(jsonStr);
    const expires = new Date(authData.expiresAt).toUTCString();
    
    document.cookie = `${this.AUTH_KEY}=${encoded}; path=/; expires=${expires}; secure; samesite=strict`;
  }

  // IndexDBに保存
  async saveToIndexDB(authData) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        
        const putRequest = store.put(authData, 'userAuth');
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
    });
  }

  // すべてのストレージから認証データを取得
  async getAllAuthData() {
    try {
      const localData = this.getFromLocalStorage();
      const cookieData = this.getFromCookie();
      const indexData = await this.getFromIndexDB();
      
      return {
        local: localData,
        cookie: cookieData,
        index: indexData
      };
    } catch (error) {
      console.error('[Auth] ❌ Failed to get auth data:', error);
      return { local: null, cookie: null, index: null };
    }
  }

  // LocalStorageから取得
  getFromLocalStorage() {
    try {
      const data = localStorage.getItem(this.AUTH_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[Auth] LocalStorage error:', error);
      return null;
    }
  }

  // Cookieから取得
  getFromCookie() {
    try {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === this.AUTH_KEY) {
          return JSON.parse(decodeURIComponent(value));
        }
      }
      return null;
    } catch (error) {
      console.error('[Auth] Cookie error:', error);
      return null;
    }
  }

  // IndexDBから取得
  async getFromIndexDB() {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
        
        request.onsuccess = () => {
          const db = request.result;
          
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            resolve(null);
            return;
          }
          
          const transaction = db.transaction([this.STORE_NAME], 'readonly');
          const store = transaction.objectStore(this.STORE_NAME);
          
          const getRequest = store.get('userAuth');
          getRequest.onsuccess = () => resolve(getRequest.result || null);
          getRequest.onerror = () => resolve(null);
        };
        
        request.onerror = () => resolve(null);
      } catch (error) {
        console.error('[Auth] IndexDB error:', error);
        resolve(null);
      }
    });
  }

  // 3つのストレージのデータを比較検証
  async validateAuthData() {
    try {
      const { local, cookie, index } = await this.getAllAuthData();
      
      // いずれかのストレージにデータがない場合は無効
      if (!local || !cookie || !index) {
        console.log('[Auth] ❌ Missing auth data in one or more storages');
        return { valid: false, error: 'Incomplete auth data' };
      }
      
      // データの一致を検証
      const isValid = this.compareAuthData(local, cookie, index);
      
      if (!isValid) {
        console.log('[Auth] ❌ Auth data mismatch between storages');
        return { valid: false, error: 'Auth data mismatch' };
      }
      
      // トークンの有効期限を検証
      if (!this.isTokenValid(local.expiresAt)) {
        console.log('[Auth] ❌ Auth token expired');
        return { valid: false, error: 'Token expired' };
      }
      
      console.log('[Auth] ✅ Auth data validation successful');
      return { valid: true, data: local };
      
    } catch (error) {
      console.error('[Auth] ❌ Validation error:', error);
      return { valid: false, error: 'Validation error' };
    }
  }

  // 3つの認証データを比較
  compareAuthData(local, cookie, index) {
    return local.authToken === cookie.authToken &&
           local.authToken === index.authToken &&
           local.userId === cookie.userId &&
           local.userId === index.userId &&
           local.expiresAt === cookie.expiresAt &&
           local.expiresAt === index.expiresAt;
  }

  // トークンの有効期限を検証
  isTokenValid(expiresAt) {
    try {
      const expiryTime = new Date(expiresAt).getTime();
      const currentTime = new Date().getTime();
      return expiryTime > currentTime;
    } catch (error) {
      console.error('[Auth] Invalid expiry date:', error);
      return false;
    }
  }

  // すべてのストレージから認証データをクリア
  async clearAllAuthData() {
    try {
      // LocalStorageをクリア
      localStorage.removeItem(this.AUTH_KEY);
      
      // Cookieをクリア
      document.cookie = `${this.AUTH_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict`;
      
      // IndexDBをクリア
      await this.clearIndexDB();
      
      console.log('[Auth] ✅ All auth data cleared');
      return true;
    } catch (error) {
      console.error('[Auth] ❌ Failed to clear auth data:', error);
      return false;
    }
  }

  // IndexDBをクリア
  async clearIndexDB() {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
        
        request.onsuccess = () => {
          const db = request.result;
          
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            resolve();
            return;
          }
          
          const transaction = db.transaction([this.STORE_NAME], 'readwrite');
          const store = transaction.objectStore(this.STORE_NAME);
          
          const deleteRequest = store.delete('userAuth');
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => resolve();
        };
        
        request.onerror = () => resolve();
      } catch (error) {
        console.error('[Auth] IndexDB clear error:', error);
        resolve();
      }
    });
  }

  // 認証データの同期状態をチェック
  async checkSyncStatus() {
    const { local, cookie, index } = await this.getAllAuthData();
    
    const status = {
      hasLocalStorage: !!local,
      hasCookie: !!cookie,
      hasIndexDB: !!index,
      inSync: false,
      valid: false
    };
    
    if (status.hasLocalStorage && status.hasCookie && status.hasIndexDB) {
      status.inSync = this.compareAuthData(local, cookie, index);
      status.valid = status.inSync && this.isTokenValid(local.expiresAt);
    }
    
    return status;
  }

  // デバッグ用：現在の認証状態を表示
  async debugAuthState() {
    const status = await this.checkSyncStatus();
    const data = await this.getAllAuthData();
    
    console.group('[Auth] Debug Information');
    console.log('Sync Status:', status);
    console.log('LocalStorage Data:', data.local);
    console.log('Cookie Data:', data.cookie);
    console.log('IndexDB Data:', data.index);
    console.groupEnd();
    
    return { status, data };
  }
}

// グローバルインスタンスを作成
window.multiStorageAuth = new MultiStorageAuth();
