/**
 * PayPay QRコード一括生成スクリプト
 *
 * 使い方:
 *   node generate_qr.js paypay_urls.csv
 *
 * CSVフォーマット（1行1エントリ）:
 *   金額,URL
 *   50,https://qr.paypay.ne.jp/xxxx
 *   100,https://qr.paypay.ne.jp/yyyy
 *
 * - BOM付きUTF-8でも動作（Excelで保存したファイル対応）
 * - #で始まる行はコメントとして無視
 * - 空行は無視
 */

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const QR_DIR = path.join(__dirname, 'data', 'qr');

const inputFile = process.argv[2];

if (!inputFile) {
  console.error('\n使い方: node generate_qr.js [CSVファイル名]');
  console.error('例:     node generate_qr.js paypay_urls.csv\n');
  console.error('CSVフォーマット:');
  console.error('  50,https://qr.paypay.ne.jp/xxxx');
  console.error('  100,https://qr.paypay.ne.jp/yyyy\n');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error('ファイルが見つかりません: ' + inputFile);
  process.exit(1);
}

// CSV読み込み・BOM除去
let raw = fs.readFileSync(inputFile, 'utf8').replace(/^\uFEFF/, '');

const entries = [];
const errors = [];

raw.split(/\r?\n/).forEach((line, i) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;

  const commaIdx = trimmed.indexOf(',');
  if (commaIdx === -1) { errors.push('行' + (i+1) + ': カンマがありません → ' + trimmed); return; }

  const amount = parseInt(trimmed.slice(0, commaIdx).trim(), 10);
  const url = trimmed.slice(commaIdx + 1).trim();

  if (isNaN(amount) || amount <= 0) { errors.push('行' + (i+1) + ': 金額が不正 → ' + trimmed.slice(0, commaIdx)); return; }
  if (!url.startsWith('http')) { errors.push('行' + (i+1) + ': URLが不正 → ' + url); return; }

  entries.push({ amount, url });
});

if (errors.length) {
  console.error('\n⚠️  エラー行:');
  errors.forEach(e => console.error('  ' + e));
  if (!entries.length) { console.error('\n有効なエントリがありません。'); process.exit(1); }
  console.error('\nエラー行を除いた ' + entries.length + ' 件を生成します。\n');
}

if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));
if (!fs.existsSync(QR_DIR)) fs.mkdirSync(QR_DIR);

const QR_OPTIONS = { width: 300, margin: 2, color: { dark: '#000000', light: '#FFFFFF' }, errorCorrectionLevel: 'M' };

console.log('\n🎪 PayPay QRコード一括生成');
console.log('━'.repeat(44));
console.log('入力: ' + inputFile);
console.log('生成数: ' + entries.length + '枚');
console.log('出力先: ' + QR_DIR);
console.log('━'.repeat(44) + '\n');

async function generateAll() {
  let success = 0, failed = 0;
  for (const entry of entries) {
    try {
      await QRCode.toFile(path.join(QR_DIR, entry.amount + '.png'), entry.url, QR_OPTIONS);
      success++;
      process.stdout.write('\r  ' + (success + failed) + '/' + entries.length + ' - ¥' + entry.amount + ' ✓');
    } catch(e) {
      failed++;
      console.error('\n❌ ¥' + entry.amount + ' 失敗: ' + e.message);
    }
  }
  console.log('\n\n━'.repeat(44));
  console.log('✅ 完了: ' + success + '枚成功' + (failed ? ', ' + failed + '枚失敗' : ''));
  console.log('━'.repeat(44) + '\n');
}

generateAll().catch(e => { console.error('エラー:', e); process.exit(1); });
