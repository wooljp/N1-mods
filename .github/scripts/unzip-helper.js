#!/usr/bin/env node

/**
 * GitHub Actions用ZIP展開ヘルパースクリプト
 * より高度な展開処理を行う場合に使用
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class UnzipHelper {
  constructor() {
    this.extractedDir = 'extracted_files';
  }

  // ZIPファイルを検索
  findZipFiles(baseDir = '.') {
    const zipFiles = [];
    
    function search(dir) {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          search(fullPath);
        } else if (item.endsWith('.zip') && !item.includes('extracted')) {
          zipFiles.push(fullPath);
        }
      }
    }
    
    search(baseDir);
    return zipFiles;
  }

  // ZIPファイルを展開
  async extractZip(zipPath, outputDir) {
    try {
      console.log(`📦 Extracting: ${zipPath}`);
      
      // 出力ディレクトリ作成
      fs.mkdirSync(outputDir, { recursive: true });
      
      // 展開実行
      execSync(`unzip -q "${zipPath}" -d "${outputDir}"`, { stdio: 'inherit' });
      
      // 展開結果を確認
      const extractedFiles = this.getExtractedFiles(outputDir);
      
      console.log(`✅ Extracted ${extractedFiles.length} files`);
      return {
        success: true,
        fileCount: extractedFiles.length,
        files: extractedFiles
      };
      
    } catch (error) {
      console.error(`❌ Failed to extract ${zipPath}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 展開されたファイル一覧を取得
  getExtractedFiles(dir) {
    const files = [];
    
    function walk(currentDir) {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walk(fullPath);
        } else {
          files.push({
            path: fullPath,
            relativePath: path.relative(dir, fullPath),
            size: stat.size,
            modified: stat.mtime
          });
        }
      }
    }
    
    walk(dir);
    return files;
  }

  // 展開結果のサマリーを作成
  createSummary(extractionResults) {
    const summary = {
      totalZips: extractionResults.length,
      successful: extractionResults.filter(r => r.success).length,
      failed: extractionResults.filter(r => !r.success).length,
      totalFiles: extractionResults.reduce((sum, r) => sum + (r.fileCount || 0), 0),
      details: []
    };
    
    for (const result of extractionResults) {
      if (result.success) {
        summary.details.push({
          zipFile: result.zipFile,
          fileCount: result.fileCount,
          status: '✅ Success'
        });
      } else {
        summary.details.push({
          zipFile: result.zipFile,
          error: result.error,
          status: '❌ Failed'
        });
      }
    }
    
    return summary;
  }

  // メイン処理
  async run() {
    console.log('🔍 Searching for zip files...');
    
    const zipFiles = this.findZipFiles();
    console.log(`Found ${zipFiles.length} zip file(s):`);
    zipFiles.forEach(file => console.log(`  - ${file}`));
    
    if (zipFiles.length === 0) {
      console.log('No zip files found.');
      return;
    }
    
    // メイン展開ディレクトリ作成
    fs.mkdirSync(this.extractedDir, { recursive: true });
    
    const results = [];
    
    // 各ZIPファイルを展開
    for (const zipFile of zipFiles) {
      const zipName = path.basename(zipFile, '.zip');
      const outputDir = path.join(this.extractedDir, zipName);
      
      const result = await this.extractZip(zipFile, outputDir);
      result.zipFile = zipFile;
      results.push(result);
    }
    
    // サマリー表示
    const summary = this.createSummary(results);
    
    console.log('\n📊 Extraction Summary:');
    console.log(`Total ZIP files: ${summary.totalZips}`);
    console.log(`Successful: ${summary.successful}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Total extracted files: ${summary.totalFiles}`);
    
    console.log('\n📋 Details:');
    summary.details.forEach(detail => {
      console.log(`  ${detail.status} ${detail.zipFile}`);
      if (detail.fileCount) {
        console.log(`    Files: ${detail.fileCount}`);
      }
      if (detail.error) {
        console.log(`    Error: ${detail.error}`);
      }
    });
    
    // GitHub Actions用のJSON出力
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::set-output name=summary::${JSON.stringify(summary)}`);
    }
    
    return summary;
  }
}

// スクリプト実行
if (require.main === module) {
  const helper = new UnzipHelper();
  helper.run().catch(console.error);
}

module.exports = UnzipHelper;
