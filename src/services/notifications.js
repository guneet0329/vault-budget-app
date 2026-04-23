import notifee, { AndroidImportance, TriggerType } from '@notifee/react-native';
import { saveSetting, getSetting } from '../storage/store';

const DAILY_REMINDER_ID = 'vault_daily_reminder';

async function ensureChannel() {
  await notifee.createChannel({
    id: 'vault_alerts',
    name: 'Budget Alerts',
    importance: AndroidImportance.HIGH,
  });
}

export async function requestNotificationPermission() {
  try { await notifee.requestPermission(); } catch {}
}

export async function scheduleDailyReminder() {
  try {
    await ensureChannel();
    const existing = await notifee.getTriggerNotificationIds();
    if (existing.includes(DAILY_REMINDER_ID)) return;
    const date = new Date();
    date.setHours(20, 0, 0, 0);
    if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
    await notifee.createTriggerNotification(
      {
        id: DAILY_REMINDER_ID,
        title: '📊 Daily Budget Check',
        body: "Don't forget to log today's expenses in Vault",
        android: { channelId: 'vault_alerts', smallIcon: 'ic_launcher', pressAction: { id: 'default' } },
      },
      { type: TriggerType.TIMESTAMP, timestamp: date.getTime(), repeatFrequency: 1 }
    );
  } catch (e) { console.warn('[Notif] scheduleDailyReminder error:', e); }
}

// ── Persistent alert deduplication via SQLite settings ───────────────────────
// Stored as: notif_sent_YYYY-MM → JSON array of alertKey strings.
// getSetting() reads directly from the DB row — unlike loadSettings() which
// only returns a fixed whitelist of known keys and silently drops notif_sent_*.

function getMonthKey() {
  const now = new Date();
  return `notif_sent_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function loadSentAlerts() {
  try {
    const raw = getSetting(getMonthKey());
    if (!raw) return new Set();
    const arr = Array.isArray(raw) ? raw : JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr);
  } catch {}
  return new Set();
}

function markAlertSent(alertKey) {
  try {
    const sent = loadSentAlerts();
    sent.add(alertKey);
    saveSetting(getMonthKey(), JSON.stringify([...sent]));
  } catch {}
}

async function sendBudgetAlert(walletName, walletId, pct, sentAlerts) {
  const alertKey = `budget_${walletId}_${pct}`;
  if (sentAlerts.has(alertKey)) return;
  // Mark before displaying so a crash mid-send still won't re-fire next launch
  markAlertSent(alertKey);
  try {
    await ensureChannel();
    await notifee.displayNotification({
      id: alertKey,
      title: pct >= 100 ? '🚨 Over Budget!' : '⚠️ Budget Alert',
      body: pct >= 100
        ? `Your ${walletName} wallet is over its limit`
        : `You've used ${pct}% of your ${walletName} budget`,
      android: { channelId: 'vault_alerts', smallIcon: 'ic_launcher', pressAction: { id: 'default' } },
    });
  } catch (e) { console.warn('[Notif] sendBudgetAlert error:', e); }
}

async function sendUnusualSpendAlert(amount, walletName, walletId, avg, sentAlerts) {
  const alertKey = `unusual_${walletId}`;
  if (sentAlerts.has(alertKey)) return;
  markAlertSent(alertKey);
  try {
    await ensureChannel();
    await notifee.displayNotification({
      id: alertKey,
      title: '🔔 Unusual Spending',
      body: `$${amount.toFixed(0)} on ${walletName} is ${Math.round(amount / avg)}x your usual average`,
      android: { channelId: 'vault_alerts', smallIcon: 'ic_launcher', pressAction: { id: 'default' } },
    });
  } catch (e) { console.warn('[Notif] sendUnusualSpendAlert error:', e); }
}

export async function sendStreakNotification(days) {
  try {
    await ensureChannel();
    await notifee.displayNotification({
      id: 'vault_streak',
      title: '🔥 Spending Streak!',
      body: `You've stayed under budget for ${days} day${days > 1 ? 's' : ''} in a row`,
      android: { channelId: 'vault_alerts', smallIcon: 'ic_launcher', pressAction: { id: 'default' } },
    });
  } catch (e) { console.warn('[Notif] sendStreakNotification error:', e); }
}

export async function checkAndNotify(wallets, transactions) {
  try {
    const sentAlerts = loadSentAlerts();
    const parentIds  = new Set(wallets.filter(w => w.parentId != null).map(w => w.parentId));

    for (const wallet of wallets) {
      if (wallet.billType === 'fixed') continue;  // rent/phone always at 100% — expected
      if (parentIds.has(wallet.id))   continue;  // group wrapper — no direct spending
      if (!wallet.limit)              continue;

      const pct = Math.round((wallet.spent / wallet.limit) * 100);
      if      (pct >= 100) await sendBudgetAlert(wallet.name, wallet.id, 100, sentAlerts);
      else if (pct >= 90)  await sendBudgetAlert(wallet.name, wallet.id, 90,  sentAlerts);
      else if (pct >= 80)  await sendBudgetAlert(wallet.name, wallet.id, 80,  sentAlerts);

      const walletTxns = transactions.filter(t => t.walletId === wallet.id);
      if (walletTxns.length >= 3) {
        const avg    = walletTxns.reduce((s, t) => s + t.amount, 0) / walletTxns.length;
        const latest = [...walletTxns].sort((a, b) => b.date - a.date)[0];
        if (latest && latest.amount > avg * 2.5)
          await sendUnusualSpendAlert(latest.amount, wallet.name, wallet.id, avg, sentAlerts);
      }
    }
  } catch (e) { console.warn('[Notif] checkAndNotify error:', e); }
}
