# GitHub Actions Workflows

このディレクトリにはプロジェクトのGitHub Actionsワークフローが含まれています。

## 🚀 Auto Unzip Workflow

### 概要
リポジトリにZIPファイルがアップロードされたときに自動で展開するワークフローです。

### トリガー
- **自動**: `.zip`ファイルがプッシュされたとき
- **手動**: GitHub Actionsの「Run workflow」から実行可能

### 機能
- 🔍 リポジトリ内の全ZIPファイルを検索
- 📦 `extracted_files/`ディレクトリに自動展開
- 📝 展開されたファイルを自動コミット
- 📊 展開結果のサマリーを表示
- 🧹 オプションで元のZIPファイルを削除

### 使用方法

#### 自動実行（プッシュ時）
```bash
# ZIPファイルをリポジトリにプッシュ
git add my-files.zip
git commit -m "Add zip file"
git push
# → 自動で展開ワークフローが実行される
```

#### 手動実行
1. GitHubリポジトリの「Actions」タブに移動
2. 「Auto Unzip Uploaded Files」ワークフローを選択
3. 「Run workflow」をクリック
4. 展開したいZIPファイルのパスを入力
5. 「Run workflow」をクリックして実行

### 展開構造
```
repository/
├── my-files.zip          # 元のZIPファイル
├── extracted_files/      # 展開ディレクトリ
│   ├── my-files/        # ZIP名と同名のサブディレクトリ
│   │   ├── file1.txt
│   │   ├── image.png
│   │   └── docs/
│   │       └── manual.pdf
│   └── another-zip/
│       └── ...
```

### 設定オプション

#### ワークフローのカスタマイズ
`.github/workflows/auto-unzip.yml` を編集して設定を変更できます：

```yaml
# 展開先ディレクトリの変更
extract_dir: "my-extracted-files"

# ZIPファイルの除外パターン
exclude_patterns:
  - "*.tmp.zip"
  - "backup-*"

# ファイルサイズ制限（MB）
max_file_size: 100
```

#### クリーンアップの無効化
元のZIPファイルを保持したい場合：
```yaml
# このステップをコメントアウト
# - name: Clean up original zip files
```

### セキュリティ考慮事項
- 🔒 展開されるファイルはリポジトリ内の全員が閲覧可能
- 🚫 機密情報を含むZIPファイルはアップロードしないでください
- 📋 展開結果はGitHub Actionsのログに記録されます

### トラブルシューティング

#### 展開が失敗する場合
1. ZIPファイルが破損していないか確認
2. パスワード保護されたZIPは展開できません
3. 非常に大きなファイルはタイムアウトする可能性があります

#### 手動で再実行する場合
```bash
# GitHub CLIを使用
gh workflow run "Auto Unzip Uploaded Files" -f zip_file="path/to/file.zip"
```

### 関連ファイル
- `.github/workflows/auto-unzip.yml` - メインワークフロー
- `.github/scripts/unzip-helper.js` - 展開ヘルパースクリプト

---

## 📝 その他のワークフロー

今後追加される可能性のあるワークフロー：
- 🧪 CI/CDパイプライン
- 📦 デプロイ自動化
- 🔍 コード品質チェック
- 📊 リリース管理
