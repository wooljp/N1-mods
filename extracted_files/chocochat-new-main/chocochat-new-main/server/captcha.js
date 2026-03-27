const { generateId } = require('./auth');

// CAPTCHAストア（本番環境ではRedisなどを使用）
const captchaStore = new Map();

// 🍫絵文字CAPTCHA生成
function generateEmojiCaptcha() {
  const count = Math.floor(Math.random() * 4) + 2; // 2-5回
  const question = `🍫を${count}回入力してください`;
  const answer = '🍫'.repeat(count);
  const id = generateId();
  const expiresAt = Date.now() + (5 * 60 * 1000); // 5分有効
  
  const captcha = {
    id,
    question,
    answer,
    expiresAt,
    attempts: 0,
    maxAttempts: 3
  };
  
  // CAPTCHAをストアに保存
  captchaStore.set(id, captcha);
  
  // 有効期限切れのCAPTCHAをクリーンアップ
  cleanupExpiredCaptchas();
  
  console.log(`[CAPTCHA] Generated: ${question} (ID: ${id})`);
  
  return {
    id,
    question,
    expiresIn: 300 // 5分
  };
}

// CAPTCHA検証
function validateCaptcha(id, userInput) {
  const captcha = captchaStore.get(id);
  
  if (!captcha) {
    return {
      valid: false,
      error: 'CAPTCHAが見つかりません。もう一度お試しください。'
    };
  }
  
  // 有効期限チェック
  if (Date.now() > captcha.expiresAt) {
    captchaStore.delete(id);
    return {
      valid: false,
      error: 'CAPTCHAの有効期限が切れました。もう一度お試しください。'
    };
  }
  
  // 試行回数チェック
  captcha.attempts++;
  if (captcha.attempts > captcha.maxAttempts) {
    captchaStore.delete(id);
    return {
      valid: false,
      error: '試行回数が上限に達しました。新しいCAPTCHAを取得してください。'
    };
  }
  
  // 回答の検証
  const normalizedInput = userInput.replace(/\s/g, ''); // 空白を削除
  const isValid = normalizedInput === captcha.answer;
  
  if (isValid) {
    // 検証成功後にCAPTCHAを削除
    captchaStore.delete(id);
    console.log(`[CAPTCHA] ✅ Validated successfully (ID: ${id})`);
    return { valid: true };
  } else {
    console.log(`[CAPTCHA] ❌ Validation failed (ID: ${id}, Attempt: ${captcha.attempts})`);
    return {
      valid: false,
      error: `回答が正しくありません。残り${captcha.maxAttempts - captcha.attempts}回試行できます。`
    };
  }
}

// 有効期限切れのCAPTCHAをクリーンアップ
function cleanupExpiredCaptchas() {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [id, captcha] of captchaStore.entries()) {
    if (now > captcha.expiresAt) {
      captchaStore.delete(id);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`[CAPTCHA] Cleaned up ${cleanedCount} expired captchas`);
  }
}

// CAPTCHA情報取得（デバッグ用）
function getCaptchaInfo(id) {
  const captcha = captchaStore.get(id);
  if (!captcha) return null;
  
  return {
    id: captcha.id,
    question: captcha.question,
    attempts: captcha.attempts,
    maxAttempts: captcha.maxAttempts,
    expiresIn: Math.max(0, Math.floor((captcha.expiresAt - Date.now()) / 1000))
  };
}

// 全CAPTCHA情報取得（管理用）
function getAllCaptchaInfo() {
  const captchas = [];
  const now = Date.now();
  
  for (const [id, captcha] of captchaStore.entries()) {
    captchas.push({
      id,
      question: captcha.question,
      attempts: captcha.attempts,
      maxAttempts: captcha.maxAttempts,
      expiresIn: Math.max(0, Math.floor((captcha.expiresAt - now) / 1000)),
      isExpired: now > captcha.expiresAt
    });
  }
  
  return captchas;
}

// IPベースのレート制限
const ipRateLimit = new Map();

function checkIpRateLimit(ip, maxPerHour = 5) {
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  
  if (!ipRateLimit.has(ip)) {
    ipRateLimit.set(ip, []);
  }
  
  const requests = ipRateLimit.get(ip);
  
  // 1時間以上前のリクエストを削除
  const validRequests = requests.filter(time => time > hourAgo);
  ipRateLimit.set(ip, validRequests);
  
  // レート制限チェック
  if (validRequests.length >= maxPerHour) {
    return {
      allowed: false,
      error: 'CAPTCHAのリクエスト回数が上限に達しました。しばらくお待ちください。',
      nextRequestTime: Math.min(...validRequests) + (60 * 60 * 1000)
    };
  }
  
  // 新しいリクエストを記録
  validRequests.push(now);
  
  return { allowed: true };
}

// 定期的なクリーンアップ（1時間ごと）
setInterval(cleanupExpiredCaptchas, 60 * 60 * 1000);

module.exports = {
  generateEmojiCaptcha,
  validateCaptcha,
  getCaptchaInfo,
  getAllCaptchaInfo,
  checkIpRateLimit,
  cleanupExpiredCaptchas
};
