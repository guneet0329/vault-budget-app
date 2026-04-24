/**
 * SQLite store — op-sqlite v15+
 * Always use executeSync(). db.execute() returns a Promise.
 *
 * v4 additions:
 *   wallets.parent_id  — nested wallet support
 *   loadWallets returns parentId field
 *
 * v5 additions (Phase 1):
 *   accounts           — real money containers with balances
 *   transactions.account_id — every txn linked to an account
 *   transfer type      — moves money between accounts, no wallet
 *   netWorth()         — sum of all account balances
 */
import { open } from '@op-engineering/op-sqlite';

let db = null;
export function getDb() {
  if (!db) db = open({ name: 'vault.db' });
  return db;
}
function rows(r) { return r?.rows ?? []; }

export function initDb() {
  const d = getDb();

  d.executeSync(`CREATE TABLE IF NOT EXISTS wallets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    emoji      TEXT NOT NULL DEFAULT '💰',
    color      TEXT NOT NULL DEFAULT '#1a7f6e',
    lim        REAL NOT NULL DEFAULT 0,
    spent      REAL NOT NULL DEFAULT 0,
    bill_type  TEXT NOT NULL DEFAULT 'flexible',
    parent_id  INTEGER DEFAULT NULL,
    sort_order INTEGER NOT NULL DEFAULT -1
  )`);
  try { d.executeSync(`ALTER TABLE wallets ADD COLUMN bill_type TEXT NOT NULL DEFAULT 'flexible'`); } catch {}
  try { d.executeSync(`ALTER TABLE wallets ADD COLUMN parent_id INTEGER DEFAULT NULL`); } catch {}
  try { d.executeSync(`ALTER TABLE wallets ADD COLUMN sort_order INTEGER NOT NULL DEFAULT -1`); } catch {}
  // One-time backfill: set sort_order = id for wallets that have never been ordered.
  // We use -1 as the sentinel (never set) so that wallets the user moves to
  // position 0 (sort_order = 0) are not accidentally reset on next launch.
  // Also handle old installs where the column defaulted to 0 instead of -1:
  // if ALL wallets have sort_order=0, treat that as "never ordered" and backfill.
  try {
    const total   = Number(rows(d.executeSync(`SELECT COUNT(*) as c FROM wallets`))[0]?.c ?? 0);
    const atSentinel = Number(rows(d.executeSync(`SELECT COUNT(*) as c FROM wallets WHERE sort_order <= 0`))[0]?.c ?? 0);
    if (total > 0 && atSentinel === total) {
      // All wallets are at 0 or -1 — none have been explicitly ordered yet
      d.executeSync(`UPDATE wallets SET sort_order = id`);
    } else if (atSentinel > 0) {
      // Some wallets are un-ordered (newly added) — give them a high sort_order
      d.executeSync(`UPDATE wallets SET sort_order = id + (SELECT MAX(sort_order) FROM wallets WHERE sort_order > 0) WHERE sort_order <= 0`);
    }
  } catch {}

  d.executeSync(`CREATE TABLE IF NOT EXISTS transactions (
    id           TEXT PRIMARY KEY,
    wallet_id    INTEGER,
    amount       REAL NOT NULL,
    description  TEXT DEFAULT '',
    note         TEXT DEFAULT '',
    tags         TEXT DEFAULT '[]',
    photo        TEXT,
    frequency    TEXT DEFAULT 'once',
    is_recurring INTEGER DEFAULT 0,
    recurring_id TEXT,
    date         INTEGER NOT NULL
  )`);

  d.executeSync(`CREATE TABLE IF NOT EXISTS income (
    id     TEXT PRIMARY KEY,
    name   TEXT NOT NULL,
    amount REAL NOT NULL,
    type   TEXT DEFAULT '',
    emoji  TEXT DEFAULT '💼',
    repeat TEXT DEFAULT 'monthly',
    date   INTEGER NOT NULL
  )`);

  d.executeSync(`CREATE TABLE IF NOT EXISTS debts (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    amount    REAL NOT NULL,
    type      TEXT NOT NULL,
    note      TEXT DEFAULT '',
    settled   INTEGER DEFAULT 0,
    date      INTEGER NOT NULL,
    wallet_id INTEGER DEFAULT NULL
  )`);
  try { d.executeSync(`ALTER TABLE debts ADD COLUMN wallet_id INTEGER DEFAULT NULL`); } catch {}

  d.executeSync(`CREATE TABLE IF NOT EXISTS recurring (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    wallet_id    INTEGER,
    amount       REAL NOT NULL,
    frequency    TEXT NOT NULL,
    active       INTEGER DEFAULT 1,
    last_applied TEXT,
    tags         TEXT DEFAULT '[]'
  )`);

  d.executeSync(`CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  d.executeSync(`CREATE TABLE IF NOT EXISTS prev_month (
    wallet_id INTEGER PRIMARY KEY,
    spent     REAL NOT NULL DEFAULT 0
  )`);

  d.executeSync(`CREATE TABLE IF NOT EXISTS custom_tags (
    name       TEXT PRIMARY KEY,
    color      TEXT DEFAULT '#1a7f6e',
    created_at INTEGER NOT NULL
  )`);

  d.executeSync(`CREATE TABLE IF NOT EXISTS goals (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    emoji      TEXT NOT NULL DEFAULT '🎯',
    target     REAL NOT NULL DEFAULT 0,
    saved      REAL NOT NULL DEFAULT 0,
    wallet_id  INTEGER DEFAULT NULL,
    created_at INTEGER NOT NULL
  )`);

  d.executeSync(`CREATE TABLE IF NOT EXISTS goal_progress (
    id             TEXT PRIMARY KEY,
    goal_id        TEXT NOT NULL,
    amount         REAL NOT NULL,
    wallet_id      INTEGER DEFAULT NULL,
    transaction_id TEXT DEFAULT NULL,
    note           TEXT DEFAULT '',
    date           INTEGER NOT NULL
  )`);
  try { d.executeSync(`ALTER TABLE goal_progress ADD COLUMN transaction_id TEXT DEFAULT NULL`); } catch {}

  d.executeSync(`CREATE TABLE IF NOT EXISTS gift_cards (
    id         TEXT PRIMARY KEY,
    store      TEXT NOT NULL,
    emoji      TEXT NOT NULL DEFAULT '🎁',
    balance    REAL NOT NULL DEFAULT 0,
    original   REAL NOT NULL DEFAULT 0,
    expiry     TEXT DEFAULT NULL,
    note       TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  )`);

  // ── v5: Accounts ─────────────────────────────────────────────────────────────
  // Account types:
  //   chequing    — everyday spending account
  //   savings     — savings account
  //   credit      — credit card (liability — balance is what you OWE)
  //   investment  — TFSA, RRSP, ETFs (contributions build net worth)
  //   cash        — physical cash
  d.executeSync(`CREATE TABLE IF NOT EXISTS accounts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL DEFAULT 'chequing',
    emoji      TEXT NOT NULL DEFAULT '🏦',
    color      TEXT NOT NULL DEFAULT '#1a7f6e',
    balance    REAL NOT NULL DEFAULT 0,
    currency   TEXT NOT NULL DEFAULT 'CAD',
    is_default INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`);

  // Add account_id to transactions (safe migration — existing txns get NULL)
  try { d.executeSync(`ALTER TABLE transactions ADD COLUMN account_id INTEGER DEFAULT NULL`); } catch {}
  // Add transfer type support: transfer txns have a to_account_id instead of wallet_id
  try { d.executeSync(`ALTER TABLE transactions ADD COLUMN to_account_id INTEGER DEFAULT NULL`); } catch {}
  // transaction_type: 'expense' | 'income' | 'transfer'
  try { d.executeSync(`ALTER TABLE transactions ADD COLUMN transaction_type TEXT DEFAULT 'expense'`); } catch {}

  // Seed wallets if empty
  const cnt = rows(d.executeSync('SELECT COUNT(*) as c FROM wallets'))[0]?.c ?? 0;
  if (Number(cnt) === 0) {
    const defaults = [
      { name: 'Food',          emoji: '🍔', color: '#1a7f6e', lim: 400,  bt: 'flexible', pid: null },
      { name: 'Utilities',     emoji: '💡', color: '#1e4d8c', lim: 0,    bt: 'fixed',    pid: null },
      { name: 'Transport',     emoji: '🚗', color: '#d4820a', lim: 200,  bt: 'flexible', pid: null },
      { name: 'Entertainment', emoji: '🎬', color: '#7b3f9e', lim: 100,  bt: 'flexible', pid: null },
      { name: 'Investments',   emoji: '💰', color: '#2d7d3a', lim: 0,    bt: 'fixed',    pid: null },
    ];
    for (const w of defaults) {
      d.executeSync('INSERT INTO wallets (name,emoji,color,lim,spent,bill_type,parent_id) VALUES (?,?,?,?,0,?,?)',
        [w.name, w.emoji, w.color, w.lim, w.bt, w.pid]);
    }
  }
}

// ─── Wallets ──────────────────────────────────────────────────────────────────
export function loadWallets() {
  return rows(getDb().executeSync('SELECT * FROM wallets ORDER BY sort_order ASC, id ASC')).map(r => ({
    id:        r.id,
    name:      r.name,
    emoji:     r.emoji,
    color:     r.color,
    limit:     r.lim,
    spent:     r.spent,
    billType:  r.bill_type ?? 'flexible',
    parentId:  r.parent_id ?? null,
    sortOrder: r.sort_order ?? r.id,
  }));
}
export function insertWallet(w) {
  const d = getDb();
  const maxRow = rows(d.executeSync('SELECT MAX(sort_order) as m FROM wallets'))[0];
  const nextOrder = Math.max((maxRow?.m ?? 0) + 1, 1);
  d.executeSync(
    'INSERT INTO wallets (name,emoji,color,lim,spent,bill_type,parent_id,sort_order) VALUES (?,?,?,?,0,?,?,?)',
    [w.name, w.emoji, w.color, w.limit, w.billType ?? 'flexible', w.parentId ?? null, nextOrder]
  );
  return rows(d.executeSync('SELECT last_insert_rowid() as id'))[0]?.id;
}

/**
 * Persist a new ordering. orderedIds is the full wallet id array in the desired order.
 * Indices start at 1 so sort_order=0 is never used as a valid position
 * (0 is the old column default and would trigger the backfill migration).
 */
export function reorderWallets(orderedIds) {
  const d = getDb();
  orderedIds.forEach((id, index) => {
    d.executeSync('UPDATE wallets SET sort_order=? WHERE id=?', [index + 1, id]);
  });
}
export function updateWalletDetails(id, name, emoji, color, limit, billType, parentId) {
  getDb().executeSync(
    'UPDATE wallets SET name=?,emoji=?,color=?,lim=?,bill_type=?,parent_id=? WHERE id=?',
    [name, emoji, color, limit, billType ?? 'flexible', parentId ?? null, id]
  );
}
export function updateWalletSpent(id, spent) {
  getDb().executeSync('UPDATE wallets SET spent=? WHERE id=?', [spent, id]);
}
export function deleteWalletById(id) {
  // Also delete children
  getDb().executeSync('DELETE FROM transactions WHERE wallet_id=?', [id]);
  const children = rows(getDb().executeSync('SELECT id FROM wallets WHERE parent_id=?', [id]));
  for (const c of children) {
    getDb().executeSync('DELETE FROM transactions WHERE wallet_id=?', [c.id]);
    getDb().executeSync('DELETE FROM wallets WHERE id=?', [c.id]);
  }
  getDb().executeSync('DELETE FROM wallets WHERE id=?', [id]);
}
export function resetAllSpent() {
  const ws = loadWallets();
  for (const w of ws)
    getDb().executeSync('INSERT OR REPLACE INTO prev_month (wallet_id,spent) VALUES (?,?)', [w.id, w.spent]);
  getDb().executeSync('UPDATE wallets SET spent=0');
  getDb().executeSync('DELETE FROM transactions');
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export function loadTransactions() {
  return rows(getDb().executeSync('SELECT * FROM transactions ORDER BY date DESC')).map(r => ({
    id:              r.id,
    walletId:        r.wallet_id,
    accountId:       r.account_id ?? null,
    toAccountId:     r.to_account_id ?? null,
    transactionType: r.transaction_type ?? 'expense',
    amount:          r.amount,
    desc:            r.description,
    note:            r.note,
    tags:            parseJson(r.tags, []),
    photo:           r.photo,
    frequency:       r.frequency,
    isRecurring:     !!r.is_recurring,
    recurringId:     r.recurring_id,
    date:            r.date,
  }));
}
export function insertTransaction(t) {
  const id = String(t.id ?? `${Date.now()}_${Math.random()}`);
  getDb().executeSync(
    `INSERT OR REPLACE INTO transactions
     (id,wallet_id,account_id,amount,description,note,tags,photo,frequency,
      is_recurring,recurring_id,transaction_type,date)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, t.walletId ?? null, t.accountId ?? null, t.amount,
     t.desc ?? '', t.note ?? '', JSON.stringify(t.tags ?? []),
     t.photo ?? null, t.frequency ?? 'once',
     t.isRecurring ? 1 : 0, t.recurringId ?? null,
     t.transactionType ?? 'expense', t.date ?? Date.now()]
  );
  return id;
}

/**
 * Transfer money between two accounts.
 * Creates a single transaction record with transaction_type='transfer'.
 * Debits fromAccountId, credits toAccountId.
 * No wallet category — transfers are not spending.
 */
export function insertTransfer({ fromAccountId, toAccountId, amount, note, date }) {
  const d = getDb();
  const id = `transfer_${Date.now()}_${Math.random()}`;

  // Debit source account
  const from = rows(d.executeSync('SELECT balance FROM accounts WHERE id=?', [fromAccountId]))[0];
  if (from) d.executeSync('UPDATE accounts SET balance=? WHERE id=?',
    [Math.round((from.balance - amount) * 100) / 100, fromAccountId]);

  // Credit destination account
  const to = rows(d.executeSync('SELECT balance FROM accounts WHERE id=?', [toAccountId]))[0];
  if (to) d.executeSync('UPDATE accounts SET balance=? WHERE id=?',
    [Math.round((to.balance + amount) * 100) / 100, toAccountId]);

  // Record as a transaction for history
  d.executeSync(
    `INSERT INTO transactions
     (id,wallet_id,account_id,to_account_id,amount,description,note,tags,
      transaction_type,date)
     VALUES (?,NULL,?,?,?,?,?,?,?,?)`,
    [id, fromAccountId, toAccountId, amount,
     note ?? 'Transfer', note ?? '', '[]',
     'transfer', date ?? Date.now()]
  );
  return id;
}
export function updateTransaction(id, { amount, desc, note, walletId, date, tags }) {
  const d = getDb();
  const old = rows(d.executeSync('SELECT wallet_id,amount FROM transactions WHERE id=?', [String(id)]))[0];
  if (!old) return;
  if (old.wallet_id != null) {
    const ow = rows(d.executeSync('SELECT spent FROM wallets WHERE id=?', [old.wallet_id]))[0];
    if (ow) d.executeSync('UPDATE wallets SET spent=? WHERE id=?',
      [Math.max(0, Math.round((ow.spent - old.amount) * 100) / 100), old.wallet_id]);
  }
  const newWid = walletId ?? old.wallet_id;
  if (newWid != null) {
    const nw = rows(d.executeSync('SELECT spent FROM wallets WHERE id=?', [newWid]))[0];
    if (nw) d.executeSync('UPDATE wallets SET spent=? WHERE id=?',
      [Math.round((nw.spent + amount) * 100) / 100, newWid]);
  }
  d.executeSync(`UPDATE transactions SET wallet_id=?,amount=?,description=?,note=?,tags=?,date=? WHERE id=?`,
    [newWid ?? null, amount, desc ?? '', note ?? '', JSON.stringify(tags ?? []), date ?? Date.now(), String(id)]);
}
export function deleteTransactionById(id, walletId, amount) {
  const d = getDb();
  const txnId = String(id);
  if (walletId != null) {
    const r = rows(d.executeSync('SELECT spent FROM wallets WHERE id=?', [walletId]))[0];
    if (r) d.executeSync('UPDATE wallets SET spent=? WHERE id=?',
      [Math.max(0, Math.round((r.spent - amount) * 100) / 100), walletId]);
  }
  let progress = rows(d.executeSync('SELECT * FROM goal_progress WHERE transaction_id=?', [txnId]))[0];
  if (!progress) {
    const txnRow = rows(d.executeSync('SELECT description,tags FROM transactions WHERE id=?', [txnId]))[0];
    if (txnRow) {
      const tagsArr = parseJson(txnRow.tags, []);
      if (tagsArr.includes('#goals') && txnRow.description?.startsWith('Goal:')) {
        const candidates = rows(d.executeSync(
          'SELECT * FROM goal_progress WHERE ABS(amount - ?) < 0.01 AND transaction_id IS NULL ORDER BY date DESC LIMIT 1',
          [amount]
        ));
        if (candidates.length) progress = candidates[0];
      }
    }
  }
  if (progress) {
    const goal = rows(d.executeSync('SELECT saved FROM goals WHERE id=?', [String(progress.goal_id)]))[0];
    if (goal) d.executeSync('UPDATE goals SET saved=? WHERE id=?',
      [Math.max(0, goal.saved - progress.amount), String(progress.goal_id)]);
    d.executeSync('DELETE FROM goal_progress WHERE id=?', [String(progress.id)]);
  }
  d.executeSync('DELETE FROM transactions WHERE id=?', [txnId]);
}

// ─── Income ───────────────────────────────────────────────────────────────────
export function loadIncome() {
  return rows(getDb().executeSync('SELECT * FROM income ORDER BY date DESC')).map(r => ({
    id: r.id, name: r.name, amount: r.amount,
    type: r.type, emoji: r.emoji, repeat: r.repeat, date: r.date,
  }));
}
export function insertIncome(item) {
  getDb().executeSync(
    'INSERT OR REPLACE INTO income (id,name,amount,type,emoji,repeat,date) VALUES (?,?,?,?,?,?,?)',
    [String(item.id), item.name, item.amount, item.type ?? '', item.emoji ?? '💼',
     item.repeat ?? 'monthly', item.date ?? Date.now()]
  );
}
export function deleteIncomeById(id) { getDb().executeSync('DELETE FROM income WHERE id=?', [String(id)]); }

// ─── Debts ────────────────────────────────────────────────────────────────────
export function loadDebts() {
  return rows(getDb().executeSync('SELECT * FROM debts ORDER BY date DESC')).map(r => ({
    id: r.id, name: r.name, amount: r.amount, type: r.type,
    note: r.note, settled: !!r.settled, date: r.date, walletId: r.wallet_id ?? null,
  }));
}
export function insertDebt(d) {
  getDb().executeSync(
    'INSERT OR REPLACE INTO debts (id,name,amount,type,note,settled,date,wallet_id) VALUES (?,?,?,?,?,0,?,?)',
    [String(d.id), d.name, d.amount, d.type, d.note ?? '', d.date ?? Date.now(), d.walletId ?? null]
  );
}
export function settleDebtById(id) { getDb().executeSync('UPDATE debts SET settled=1 WHERE id=?', [String(id)]); }
export function deleteDebtById(id) { getDb().executeSync('DELETE FROM debts WHERE id=?', [String(id)]); }

// ─── Recurring ────────────────────────────────────────────────────────────────
export function loadRecurring() {
  return rows(getDb().executeSync('SELECT * FROM recurring')).map(r => ({
    id: r.id, name: r.name, walletId: r.wallet_id,
    amount: r.amount, frequency: r.frequency,
    active: !!r.active, lastApplied: r.last_applied,
    tags: parseJson(r.tags, []),
  }));
}
export function insertRecurring(r) {
  getDb().executeSync(
    `INSERT OR REPLACE INTO recurring (id,name,wallet_id,amount,frequency,active,last_applied,tags)
     VALUES (?,?,?,?,?,1,?,?)`,
    [String(r.id), r.name, r.walletId ?? null, r.amount, r.frequency,
     r.lastApplied ?? null, JSON.stringify(r.tags ?? [])]
  );
}
export function updateRecurringLastApplied(id, ts) {
  const dateStr = new Date(ts).toISOString().slice(0, 10);
  getDb().executeSync('UPDATE recurring SET last_applied=? WHERE id=?', [dateStr, String(id)]);
}
export function toggleRecurringActive(id) {
  getDb().executeSync('UPDATE recurring SET active=CASE WHEN active=1 THEN 0 ELSE 1 END WHERE id=?', [String(id)]);
}
export function deleteRecurringById(id) { getDb().executeSync('DELETE FROM recurring WHERE id=?', [String(id)]); }

// ─── Settings ─────────────────────────────────────────────────────────────────
export function loadSettings() {
  const map = {};
  for (const r of rows(getDb().executeSync('SELECT key,value FROM settings')))
    map[r.key] = parseJson(r.value, r.value);
  return {
    currency:      map.currency      ?? { code: 'USD', symbol: '$', name: 'US Dollar' },
    biometric:     map.biometric     ?? true,
    notifications: map.notifications ?? true,
    theme:         map.theme         ?? 'system',
    hideNumbers:   map.hideNumbers   ?? false,
  };
}
export function saveSetting(key, value) {
  const v = typeof value === 'string' ? value : JSON.stringify(value);
  getDb().executeSync('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)', [key, v]);
}
/** Read any single setting key directly from DB — bypasses loadSettings fixed whitelist */
export function getSetting(key) {
  const r = rows(getDb().executeSync('SELECT value FROM settings WHERE key=?', [key]))[0];
  if (!r) return null;
  return parseJson(r.value, r.value);
}

// ─── Prev month ───────────────────────────────────────────────────────────────
export function loadPrevMonth() {
  const map = {};
  for (const r of rows(getDb().executeSync('SELECT wallet_id,spent FROM prev_month')))
    map[r.wallet_id] = r.spent;
  return map;
}

// ─── Goals ────────────────────────────────────────────────────────────────────
export function loadGoals() {
  return rows(getDb().executeSync('SELECT * FROM goals ORDER BY created_at ASC')).map(r => ({
    id: r.id, name: r.name, emoji: r.emoji,
    target: r.target, saved: r.saved,
    walletId: r.wallet_id ?? null, createdAt: r.created_at,
  }));
}
export function insertGoal(g) {
  getDb().executeSync(
    'INSERT OR REPLACE INTO goals (id,name,emoji,target,saved,wallet_id,created_at) VALUES (?,?,?,?,?,?,?)',
    [String(g.id), g.name, g.emoji ?? '🎯', g.target, g.saved ?? 0,
     g.walletId ?? null, g.createdAt ?? Date.now()]
  );
}
export function updateGoalSaved(id, saved) {
  getDb().executeSync('UPDATE goals SET saved=? WHERE id=?', [saved, String(id)]);
}
export function updateGoalDetails(id, name, emoji, target, walletId) {
  getDb().executeSync('UPDATE goals SET name=?,emoji=?,target=?,wallet_id=? WHERE id=?',
    [name, emoji, target, walletId ?? null, String(id)]);
}
export function deleteGoalById(id) {
  const d = getDb();
  const progRows = rows(d.executeSync('SELECT transaction_id FROM goal_progress WHERE goal_id=?', [String(id)]));
  for (const p of progRows) {
    if (p.transaction_id) {
      const txn = rows(d.executeSync('SELECT wallet_id,amount FROM transactions WHERE id=?', [p.transaction_id]))[0];
      if (txn?.wallet_id) {
        const w = rows(d.executeSync('SELECT spent FROM wallets WHERE id=?', [txn.wallet_id]))[0];
        if (w) d.executeSync('UPDATE wallets SET spent=? WHERE id=?',
          [Math.max(0, Math.round((w.spent - txn.amount) * 100) / 100), txn.wallet_id]);
      }
      d.executeSync('DELETE FROM transactions WHERE id=?', [p.transaction_id]);
    }
  }
  d.executeSync('DELETE FROM goal_progress WHERE goal_id=?', [String(id)]);
  d.executeSync('DELETE FROM goals WHERE id=?', [String(id)]);
}
export function insertGoalProgress(p) {
  getDb().executeSync(
    'INSERT INTO goal_progress (id,goal_id,amount,wallet_id,transaction_id,note,date) VALUES (?,?,?,?,?,?,?)',
    [String(p.id), String(p.goalId), p.amount, p.walletId ?? null,
     p.transactionId ?? null, p.note ?? '', p.date ?? Date.now()]
  );
}
export function loadGoalProgress(goalId) {
  return rows(getDb().executeSync(
    'SELECT * FROM goal_progress WHERE goal_id=? ORDER BY date DESC', [String(goalId)]
  )).map(r => ({
    id: r.id, goalId: r.goal_id, amount: r.amount,
    walletId: r.wallet_id, transactionId: r.transaction_id,
    note: r.note, date: r.date,
  }));
}
export function deleteGoalProgressEntry(progressId) {
  const d = getDb();
  const p = rows(d.executeSync('SELECT * FROM goal_progress WHERE id=?', [String(progressId)]))[0];
  if (!p) return;
  const goal = rows(d.executeSync('SELECT saved FROM goals WHERE id=?', [String(p.goal_id)]))[0];
  if (goal) d.executeSync('UPDATE goals SET saved=? WHERE id=?',
    [Math.max(0, goal.saved - p.amount), String(p.goal_id)]);
  if (p.transaction_id) {
    const txn = rows(d.executeSync('SELECT wallet_id,amount FROM transactions WHERE id=?', [p.transaction_id]))[0];
    if (txn?.wallet_id) {
      const w = rows(d.executeSync('SELECT spent FROM wallets WHERE id=?', [txn.wallet_id]))[0];
      if (w) d.executeSync('UPDATE wallets SET spent=? WHERE id=?',
        [Math.max(0, Math.round((w.spent - txn.amount) * 100) / 100), txn.wallet_id]);
    }
    d.executeSync('DELETE FROM transactions WHERE id=?', [p.transaction_id]);
  } else if (p.wallet_id) {
    const w = rows(d.executeSync('SELECT spent FROM wallets WHERE id=?', [p.wallet_id]))[0];
    if (w) d.executeSync('UPDATE wallets SET spent=? WHERE id=?',
      [Math.max(0, Math.round((w.spent - p.amount) * 100) / 100), p.wallet_id]);
  }
  d.executeSync('DELETE FROM goal_progress WHERE id=?', [String(progressId)]);
}

// ─── Gift Cards ───────────────────────────────────────────────────────────────
export function loadGiftCards() {
  return rows(getDb().executeSync('SELECT * FROM gift_cards ORDER BY created_at DESC')).map(r => ({
    id:        r.id,
    store:     r.store,
    emoji:     r.emoji,
    balance:   r.balance,
    original:  r.original,
    expiry:    r.expiry ?? null,
    note:      r.note,
    createdAt: r.created_at,
  }));
}
export function insertGiftCard(c) {
  getDb().executeSync(
    'INSERT OR REPLACE INTO gift_cards (id,store,emoji,balance,original,expiry,note,created_at) VALUES (?,?,?,?,?,?,?,?)',
    [String(c.id), c.store, c.emoji ?? '🎁', c.balance, c.original ?? c.balance,
     c.expiry ?? null, c.note ?? '', c.createdAt ?? Date.now()]
  );
}
export function updateGiftCardBalance(id, balance) {
  getDb().executeSync('UPDATE gift_cards SET balance=? WHERE id=?', [balance, String(id)]);
}
export function deleteGiftCardById(id) {
  getDb().executeSync('DELETE FROM gift_cards WHERE id=?', [String(id)]);
}

// ─── Accounts ─────────────────────────────────────────────────────────────────
export function loadAccounts() {
  return rows(getDb().executeSync(
    'SELECT * FROM accounts ORDER BY sort_order ASC, id ASC'
  )).map(r => ({
    id:        r.id,
    name:      r.name,
    type:      r.type,
    emoji:     r.emoji,
    color:     r.color,
    balance:   r.balance,
    currency:  r.currency,
    isDefault: !!r.is_default,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  }));
}

export function insertAccount(a) {
  const d = getDb();
  const maxRow = rows(d.executeSync('SELECT MAX(sort_order) as m FROM accounts'))[0];
  const nextOrder = (maxRow?.m ?? 0) + 1;
  // Only one default account allowed — clear others if this is default
  if (a.isDefault) d.executeSync('UPDATE accounts SET is_default=0');
  d.executeSync(
    `INSERT INTO accounts (name,type,emoji,color,balance,currency,is_default,sort_order,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [a.name, a.type ?? 'chequing', a.emoji ?? '🏦', a.color ?? '#1a7f6e',
     a.balance ?? 0, a.currency ?? 'CAD', a.isDefault ? 1 : 0,
     nextOrder, Date.now()]
  );
  return rows(d.executeSync('SELECT last_insert_rowid() as id'))[0]?.id;
}

export function updateAccount(id, a) {
  if (a.isDefault) getDb().executeSync('UPDATE accounts SET is_default=0');
  getDb().executeSync(
    `UPDATE accounts SET name=?,type=?,emoji=?,color=?,currency=?,is_default=? WHERE id=?`,
    [a.name, a.type ?? 'chequing', a.emoji ?? '🏦', a.color ?? '#1a7f6e',
     a.currency ?? 'CAD', a.isDefault ? 1 : 0, id]
  );
}

export function updateAccountBalance(id, balance) {
  getDb().executeSync('UPDATE accounts SET balance=? WHERE id=?', [balance, id]);
}

/**
 * Credit account balances represent what you OWE (liability).
 * Net worth = sum of non-credit balances MINUS sum of credit balances.
 * Investment accounts are included as assets.
 */
export function netWorth() {
  const accounts = loadAccounts();
  return accounts.reduce((total, a) => {
    if (a.type === 'credit') return total - Math.abs(a.balance);
    return total + a.balance;
  }, 0);
}

export function deleteAccountById(id) {
  // Null out account_id on transactions from this account rather than deleting them
  getDb().executeSync('UPDATE transactions SET account_id=NULL WHERE account_id=?', [id]);
  getDb().executeSync('DELETE FROM accounts WHERE id=?', [id]);
}

// ─── Custom Tags ──────────────────────────────────────────────────────────────
export function loadCustomTags() {
  return rows(getDb().executeSync('SELECT name,color FROM custom_tags ORDER BY name ASC'))
    .map(r => ({ name: r.name, color: r.color }));
}
export function insertCustomTag(name, color) {
  getDb().executeSync('INSERT OR IGNORE INTO custom_tags (name,color,created_at) VALUES (?,?,?)',
    [name.trim(), color || '#1a7f6e', Date.now()]);
}
export function deleteCustomTag(name) { getDb().executeSync('DELETE FROM custom_tags WHERE name=?', [name]); }

// ─── Util ─────────────────────────────────────────────────────────────────────
function parseJson(str, fallback) {
  if (str == null) return fallback;
  if (typeof str !== 'string') return str;
  try { return JSON.parse(str); } catch { return fallback; }
}
