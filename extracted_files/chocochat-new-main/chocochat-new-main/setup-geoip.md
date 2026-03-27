# GeoIPデータベースセットアップ手順

## 🎯 正確な国別IP判定のためのセットアップ

### 現状の問題点
現在のIPリストは正確性に欠け、以下の問題があります：
- 多くの海外IPを日本IPとして誤判定
- JPNIC割り当ての正確な情報が不足
- メンテナンスが困難

### 解決策：MaxMind GeoLite2使用

#### ステップ1：パッケージインストール
```bash
npm install maxmind
```

#### ステップ2：GeoLite2データベースのダウンロード
```bash
# データディレクトリ作成
mkdir -p data

# GeoLite2-Countryデータベースをダウンロード
wget https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-Country.mmdb -O data/GeoLite2-Country.mmdb

# またはcurlを使用
curl -L https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-Country.mmdb -o data/GeoLite2-Country.mmdb
```

#### ステップ3：サーバーコードの更新
```javascript
// index.jsで既存のGeoIPを置き換え
const AccurateGeoIPBlocker = require('./server/geoip-accurate');
const geoIPBlocker = new AccurateGeoIPBlocker();
```

#### ステップ4：環境変数設定（オプション）
```bash
# .envファイルに追加
GEOIP_DATABASE_PATH=./data/GeoLite2-Country.mmdb
GEOIP_UPDATE_INTERVAL=7 # 7日ごとに更新
```

### 🔄 自動更新スクリプト
```bash
# update-geoip.sh
#!/bin/bash
echo "Updating GeoIP database..."
wget -q https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-Country.mmdb -O data/GeoLite2-Country.mmdb
echo "GeoIP database updated successfully"
```

### 📊 正確性の比較

| 方法 | 正確性 | メンテナンス | パフォーマンス |
|------|--------|------------|---------------|
| 現在のIPリスト | 低 | 困難 | 高速 |
| GeoLite2 | 高 | 自動 | 中速 |
| 有料版GeoIP2 | 最高 | 自動 | 高速 |

### 🚨 注意点

1. **ライセンス**: GeoLite2はCC BY-SA 4.0ライセンス
2. **ファイルサイズ**: 約50MBのデータベースファイル
3. **更新頻度**: 毎週更新が推奨
4. **メモリ使用**: 約100MBのメモリを消費

### 🛠️ 代替案

#### 1. 簡易的な改善（推奨）
現在のリストを主要ISPのみに絞る：
```javascript
// 主要な日本ISPのみを保持
const majorJapanIPs = [
  '1.0.16.0/20', '1.0.64.0/18', // NTT
  '2.28.0.0/15', '2.32.0.0/14', // KDDI
  '3.0.0.0/8',                  // SoftBank
  '43.0.0.0/8',                 // JPNIC
  // ... 主要な範囲のみ
];
```

#### 2. 外部API使用
```javascript
// ip-api.comなどの外部サービスを利用
async function checkCountry(ip) {
  const response = await fetch(`http://ip-api.com/json/${ip}`);
  const data = await response.json();
  return data.countryCode === 'JP';
}
```

### 📋 推奨する対応

1. **短期**: 現在のリストを主要ISPのみに絞って改善
2. **中期**: GeoLite2データベースを導入
3. **長期**: 有料版GeoIP2または専用サービスの検討

### 🔧 実装例

#### 簡易的な改善版
```javascript
// 主要な日本ISPの正確な範囲のみ
const accurateJapanIPs = [
  // NTT Communications
  '1.0.16.0/20', '1.0.64.0/18', '1.1.64.0/18', '1.5.0.0/16',
  '1.21.128.0/17', '1.72.0.0/13', '1.160.0.0/11', '1.174.0.0/15',
  
  // KDDI/au
  '2.28.0.0/15', '2.32.0.0/14', '2.48.0.0/12', '2.64.0.0/10',
  '2.128.0.0/9', '2.176.0.0/12',
  
  // SoftBank/Y!mobile
  '3.0.0.0/8', '3.64.0.0/10', '3.112.0.0/12',
  
  // 主要なJPNIC割り当て
  '43.0.0.0/8', '49.0.0.0/8', '58.0.0.0/7', '60.0.0.0/8',
  '61.0.0.0/8', '106.0.0.0/8', '110.0.0.0/8', '111.0.0.0/8',
  '112.0.0.0/5', '118.0.0.0/7', '119.0.0.0/8', '120.0.0.0/6',
  '124.0.0.0/8', '125.0.0.0/8', '126.0.0.0/8',
  '133.0.0.0/8', '150.0.0.0/7', '152.0.0.0/6', '157.0.0.0/8',
  '202.0.0.0/7', '203.0.0.0/8', '210.0.0.0/7', '211.0.0.0/8',
  '218.0.0.0/8', '219.0.0.0/8', '220.0.0.0/8', '221.0.0.0/8',
  '222.0.0.0/8', '223.0.0.0/8'
];
```

これにより、現在の問題を大幅に改善できます。
