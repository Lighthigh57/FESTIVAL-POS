/**
 * store_urls.json から QRコードを一括生成するスクリプト
 *
 * 管理画面の「全URL JSON出力」で生成した store_urls.json を使って、
 * 各出店の客画面URLのQRコードを一括生成します。
 *
 * 使い方:
 *   node generate_qr_from_json.js                        → store_urls.json を自動検索
 *   node generate_qr_from_json.js path/to/store_urls.json → ファイルを指定
 *
 * 出力先: data/qr/[storeId]_customer.png
 *          data/qr/[storeId]_staff.png
 *          data/qr/[storeId]_backyard.png
 */

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const QR_DIR = path.join(__dirname, 'data', 'qr');
const QR_OPTIONS = {
  width: 300,
  margin: 2,
  color: { dark: '#000000', light: '#FFFFFF' },
  errorCorrectionLevel: 'M',
};

if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));
if (!fs.existsSync(QR_DIR)) fs.mkdirSync(QR_DIR);

// JSONファイルのパスを決定
let jsonFile = process.argv[2];
if (!jsonFile) {
  // 自動検索
  const candidates = [
    path.join(__dirname, 'store_urls.json'),
    path.join(__dirname, 'data', 'store_urls.json'),
    path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'store_urls.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) { jsonFile = c; break; }
  }
}

if (!jsonFile || !fs.existsSync(jsonFile)) {
  console.error('\nstore_urls.json が見つかりません。');
  console.error('管理画面の「全URL JSON出力」ボタンでダウンロードしてから実行してください。');
  console.error('\n使い方:');
  console.error('  node generate_qr_from_json.js                          (Downloadsを自動検索)');
  console.error('  node generate_qr_from_json.js C:\\Users\\...\\store_urls.json');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
} catch (e) {
  console.error('JSONの読み込みに失敗しました: ' + e.message);
  process.exit(1);
}

const entries = Object.entries(data);
if (!entries.length) {
  console.error('JSONに出店データがありません。');
  process.exit(1);
}

console.log('\nQRコード一括生成（store_urls.json より）');
console.log('入力: ' + jsonFile);
console.log('━'.repeat(50));

// 生成するURLの種別
const KINDS = [
  { key: 'customer', label: '客画面' },
  { key: 'staff',    label: '店員画面' },
  { key: 'backyard', label: 'バックヤード' },
];

async function generateAll() {
  let count = 0;
  for (const [storeId, info] of entries) {
    console.log('\n[' + storeId + '] ' + info.name);
    for (const kind of KINDS) {
      const url = info[kind.key];
      if (!url) continue;
      const outFile = path.join(QR_DIR, storeId + '_' + kind.key + '.png');
      try {
        await QRCode.toFile(outFile, url, QR_OPTIONS);
        console.log('  ✓ ' + kind.label + ' → ' + path.basename(outFile));
        count++;
      } catch (e) {
        console.error('  ✗ ' + kind.label + ' 生成失敗: ' + e.message);
      }
    }
  }
  console.log('\n━'.repeat(50));
  console.log('完了: ' + count + '枚のQRコードを data/qr/ に生成しました。\n');
}

generateAll();
