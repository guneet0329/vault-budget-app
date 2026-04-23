// Pure JS logic — no RN imports

/**
 * Calculate how many consecutive days the user stayed under budget.
 * A day "passes" if total spending that day doesn't exceed daily safe limit.
 */
export function calcStreak(transactions, wallets) {
  const totalBudget = wallets.reduce((s, w) => s + w.limit, 0);
  const dailyLimit  = totalBudget / 30;

  // Group transactions by day string
  const byDay = {};
  transactions.forEach(t => {
    const day = new Date(t.date).toDateString();
    byDay[day] = (byDay[day] || 0) + t.amount;
  });

  // Walk backwards from today
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toDateString();
    const spent = byDay[key] || 0;
    if (i === 0 && !byDay[key]) { continue; } // today not yet logged
    if (spent <= dailyLimit) streak++;
    else break;
  }
  return streak;
}

/**
 * Suggest better budget limits based on actual spending.
 */
export function getBudgetSuggestions(wallets, prevMonthData = {}) {
  return wallets.map(w => {
    const prevSpent = prevMonthData[w.id] || 0;
    const avgSpent  = prevSpent > 0 ? (w.spent + prevSpent) / 2 : w.spent;
    const suggested = Math.ceil(avgSpent * 1.1 / 10) * 10; // round up to nearest $10 with 10% buffer
    const diff      = suggested - w.limit;
    if (Math.abs(diff) < 10) return null; // no meaningful change
    return {
      wallet: w,
      current: w.limit,
      suggested,
      diff,
      reason: diff > 0
        ? `You consistently spend more than your limit`
        : `You consistently spend less — you could free up $${Math.abs(diff)}`,
    };
  }).filter(Boolean);
}

/**
 * Month-over-month comparison per wallet.
 */
export function getMoMComparison(wallets, prevMonthData = {}) {
  return wallets.map(w => {
    const prev = prevMonthData[w.id] || 0;
    const curr = w.spent;
    const diff = curr - prev;
    return { wallet: w, prev, curr, diff };
  }).filter(r => r.prev > 0 || r.curr > 0);
}

/**
 * Detect unusual transactions (> 2.5x average for that wallet).
 */
export function getUnusualTransactions(transactions, wallets) {
  const unusual = [];
  wallets.forEach(w => {
    const txns = transactions.filter(t => t.walletId === w.id);
    if (txns.length < 3) return;
    const avg = txns.reduce((s, t) => s + t.amount, 0) / txns.length;
    txns.forEach(t => {
      if (t.amount > avg * 2.5) {
        unusual.push({ ...t, walletName: w.name, walletEmoji: w.emoji, avg });
      }
    });
  });
  return unusual.sort((a, b) => b.amount - a.amount).slice(0, 10);
}

/**
 * Net cashflow = total income - total expenses this month.
 */
export function getNetCashflow(income, wallets) {
  const totalIncome  = income.reduce((s, i) => s + i.amount, 0);
  const totalExpense = wallets.reduce((s, w) => s + w.spent, 0);
  return { totalIncome, totalExpense, net: totalIncome - totalExpense };
}
