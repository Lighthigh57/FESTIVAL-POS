/**
 * PayPay QRコード生成スクリプト（店舗別QR版）
 *
 * data/stores.json に保存されている全出店のPayPay URLを読み込み、
 * 各出店ごとに data/qr/[storeId].png を生成します。
 *
 * 使い方:
 *   node generate_qr.js              → 全出店のQRを一括生成
 *   node generate_qr.js takoyaki     → 指定した出店IDのみ生成
 */

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const QR_DIR = path.join(__dirname, 'data', 'qr');
const STORES_FILE = path.join(__dirname, 'data', 'stores.json');

const QR_OPTIONS = {
  width: 300,
  margin: 2,
  color: { dark: '#000000', light: '#FFFFFF' },
  errorCorrectionLevel: 'M',
};

if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));
if (!fs.existsSync(QR_DIR)) fs.mkdirSync(QR_DIR);

// stores.json 読み込み
let stores;
try {
  stores = JSON.parse(fs.readFileSync(STORES_FILE, 'utf8'));
} catch (e) {
  console.error('stores.json が読み込めません: ' + e.message);
  console.error('先にサーバーを起動して出店を作成してください。');
  process.exit(1);
}

// 対象の出店IDを決定
const targetId = process.argv[2] || null;
const targets = targetId
  ? (stores[targetId] ? { [targetId]: stores[targetId] } : null)
  : stores;

if (!targets) {
  console.error('出店ID "' + targetId + '" が見つかりません。');
  console.error('存在する出店: ' + Object.keys(stores).join(', '));
  process.exit(1);
}

const entries = Object.entries(targets);
if (!entries.length) {
  console.error('出店が登録されていません。管理画面で出店を作成してください。');
  process.exit(1);
}

console.log('\nPayPay QRコード生成（店舗別）');
console.log('━'.repeat(50));

let successCount = 0;
let skipCount = 0;

async function generateAll() {
  for (const [storeId, store] of entries) {
    const url = store.paypayUrl || null;
    const outputFile = path.join(QR_DIR, storeId + '.png');

    if (!url) {
      console.log('⚠  ' + storeId + ' (' + store.name + ') : PayPay URL未設定 → スキップ');
      skipCount++;
      continue;
    }
    if (!url.startsWith('http')) {
      console.log('⚠  ' + storeId + ' (' + store.name + ') : URLの形式が不正 → スキップ');
      skipCount++;
      continue;
    }

    try {
      await QRCode.toFile(outputFile, url, QR_OPTIONS);
      console.log('✓  ' + storeId + ' (' + store.name + ')');
      console.log('   URL : ' + url);
      console.log('   出力: ' + outputFile);
      successCount++;
    } catch (e) {
      console.error('✗  ' + storeId + ' : 生成失敗 - ' + e.message);
    }
  }

  console.log('━'.repeat(50));
  console.log('完了: ' + successCount + '件生成, ' + skipCount + '件スキップ');
  if (skipCount > 0) {
    console.log('※ スキップされた出店は管理画面の「PayPay設定」でURLを設定してください。');
  }
  console.log('');
}

generateAll();
