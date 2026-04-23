/**
 * Check recurring expenses and return any that are due today.
 * frequency: 'daily' | 'weekly' | 'monthly'
 */
export function getDueRecurring(recurring) {
  const now   = new Date();
  const today = now.toDateString();
  return recurring.filter(r => {
    if (!r.active) return false;
    const last = r.lastApplied ? new Date(r.lastApplied) : null;
    if (last && last.toDateString() === today) return false; // already applied today
    if (r.frequency === 'daily') return true;
    if (r.frequency === 'weekly') {
      if (!last) return true;
      const diff = (now - last) / (1000 * 60 * 60 * 24);
      return diff >= 7;
    }
    if (r.frequency === 'monthly') {
      if (!last) return true;
      return now.getMonth() !== last.getMonth() || now.getFullYear() !== last.getFullYear();
    }
    return false;
  });
}

export function buildRecurringTransaction(item) {
  return {
    id: Date.now() + Math.random(),
    walletId: item.walletId,
    amount: item.amount,
    desc: `🔄 ${item.name}`,
    date: Date.now(),
    tags: item.tags || [],
    isRecurring: true,
    recurringId: item.id,
  };
}
