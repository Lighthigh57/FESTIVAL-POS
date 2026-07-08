/**
 * reset_stock.js
 *
 * stores_master.json の初期在庫を stores.json に反映します。
 * 売上データ・出店名・テーマ・PayPay URLは保持されます。
 *
 * 使い方:
 *   node reset_stock.js           → 全出店・両日リセット
 *   node reset_stock.js 1         → 全出店・1日目のみ
 *   node reset_stock.js 2         → 全出店・2日目のみ
 *   node reset_stock.js 1 c1-1    → 特定出店・1日目のみ
 *   node reset_stock.js both c1-1 → 特定出店・両日
 *
 * ※サーバー停止中に実行してください。
 */

const fs = require('fs');
const path = require('path');

const MASTER_FILE = path.join(__dirname, 'data', 'stores_master.json');
const LIVE_FILE   = path.join(__dirname, 'data', 'stores.json');

const dayArg     = process.argv[2] || 'both';  // '1', '2', 'both'
const storeArg   = process.argv[3] || null;     // storeId or null(all)

const resetDay1 = dayArg === '1'    || dayArg === 'both';
const resetDay2 = dayArg === '2'    || dayArg === 'both';

if (!['1','2','both'].includes(dayArg)) {
  console.error('引数エラー: 第1引数は 1, 2, both のいずれかを指定してください');
  process.exit(1);
}

// ─ 読み込み ─────────────────────────────────────────────────
let master, live;
try {
  master = JSON.parse(fs.readFileSync(MASTER_FILE, 'utf8'));
} catch(e) {
  console.error('stores_master.json の読み込みに失敗:', e.message);
  process.exit(1);
}
try {
  live = JSON.parse(fs.readFileSync(LIVE_FILE, 'utf8'));
} catch(e) {
  console.error('stores.json の読み込みに失敗:', e.message);
  process.exit(1);
}

// ─ リセット処理 ───────────────────────────────────────────────
const storeIds = Object.keys(live).filter(k => k !== '__currentDay');
const targets  = storeArg ? [storeArg] : storeIds;

let count = 0;
for (const sid of targets) {
  if (!live[sid]) { console.warn('SKIP: ' + sid + ' は stores.json に存在しません'); continue; }
  if (!master[sid]) { console.warn('SKIP: ' + sid + ' は stores_master.json に存在しません'); continue; }

  const masterProds = {};
  for (const p of master[sid].products) masterProds[p.id] = p;

  live[sid].products = live[sid].products.map(p => {
    const mp = masterProds[p.id];
    if (!mp) return p; // masterにない商品はそのまま
    const np = {...p};
    if (resetDay1) { np.stock1 = mp.stock1; np.active1 = mp.active1; np.overCount1 = 0; }
    if (resetDay2) { np.stock2 = mp.stock2; np.active2 = mp.active2; np.overCount2 = 0; }
    np.overStock = false;
    return np;
  });

  const dayLabel = dayArg === 'both' ? '両日' : dayArg + '日目';
  console.log('✓ ' + sid + ' (' + live[sid].name + ') ' + dayLabel + ' 在庫リセット完了');
  count++;
}

// ─ 保存 ────────────────────────────────────────────────────
fs.writeFileSync(LIVE_FILE, JSON.stringify(live, null, 2), 'utf8');
console.log('\n完了: ' + count + '出店をリセットしました → stores.json 保存済み');
console.log('※サーバーを再起動すると反映されます');
