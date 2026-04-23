import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { radius } from '../theme';
import { calcStreak } from '../services/insights';
import AddExpenseModal from '../components/AddExpenseModal';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function getMonthBounds(monthStr) {
  const [mName, yr] = (monthStr ?? '').split(' ');
  const mi = MONTH_NAMES.indexOf(mName);
  const y  = parseInt(yr);
  if (mi === -1 || isNaN(y)) return { start: 0, end: Date.now() };
  return { start: new Date(y, mi, 1).getTime(), end: new Date(y, mi + 1, 0, 23, 59, 59).getTime() };
}

// A single row in the allocation breakdown
function FlowRow({ label, sub, value, color, bg, sym, hide, onPress, isLast }) {
  const { colors } = useTheme();
  const inner = (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 13, paddingHorizontal: 16,
      borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.border,
    }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{label}</Text>
        {sub ? <Text style={{ fontSize: 11, color: colors.text3, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      <Text style={{ fontSize: 15, fontWeight: '700', color }}>
        {hide ? '••••' : `${sym}${Math.abs(value).toFixed(0)}`}
      </Text>
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{inner}</TouchableOpacity>;
  return inner;
}

export default function HomeScreen({
  wallets, transactions, income, debts, goals, giftCards,
  currentMonth, onOpenDrawer, onNavigate, currency, isDark,
  onAddExpense, customTags, onCreateTag,
}) {
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  const sym = currency?.symbol || '$';

  const [expenseModal,  setExpenseModal]  = useState(false);
  // Income figure is hidden by default; user taps the eye next to it to reveal
  const [incomeVisible, setIncomeVisible] = useState(false);

  const { start, end } = getMonthBounds(currentMonth);
  const monthTxns = useMemo(
    () => transactions.filter(t => t.date >= start && t.date <= end),
    [transactions, currentMonth]
  );

  const now      = new Date();
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const streak   = useMemo(() => calcStreak(transactions, wallets), [transactions, wallets]);

  // ── Income ────────────────────────────────────────────────────────────────
  // Sum all income sources — this is the total paycheque
  function toMonthly(amount, repeat) {
    if (repeat === 'weekly')   return amount * 4.33;
    if (repeat === 'biweekly') return amount * 2.167;
    if (repeat === 'monthly')  return amount;
    return amount;
  }
  const totalIncome = useMemo(() => income.reduce((s, i) => s + toMonthly(i.amount, i.repeat), 0), [income]);

  // ── Leaf wallets only (exclude parent group wrappers whose children do the counting) ──
  const parentIds    = useMemo(() => new Set(wallets.filter(w => w.parentId != null).map(w => w.parentId)), [wallets]);
  const leafWallets  = useMemo(() => wallets.filter(w => !parentIds.has(w.id)), [wallets, parentIds]);

  // ── Bills (fixed leaf wallets) ────────────────────────────────────────────
  const fixedWallets   = leafWallets.filter(w => w.billType === 'fixed');
  const totalBills     = fixedWallets.reduce((s, w) => s + w.limit, 0);

  // ── Day-to-day spending (flexible leaf wallets only) ──────────────────────
  const flexWallets    = leafWallets.filter(w => w.billType !== 'fixed');
  const totalFlexBudget= flexWallets.reduce((s, w) => s + w.limit, 0);
  const totalFlexSpent = flexWallets.reduce((s, w) => s + w.spent, 0);
  const flexPct        = totalFlexBudget > 0
    ? Math.min(Math.round((totalFlexSpent / totalFlexBudget) * 100), 100)
    : 0;

  // ── Savings (goal contributions this month) ───────────────────────────────
  const savedThisMonth = useMemo(
    () => monthTxns.filter(t => t.tags?.includes('#goals')).reduce((s, t) => s + t.amount, 0),
    [monthTxns]
  );

  // ── Debt payments this month ──────────────────────────────────────────────
  const debtPaidMonth = useMemo(
    () => monthTxns.filter(t => t.tags?.includes('#debt')).reduce((s, t) => s + t.amount, 0),
    [monthTxns]
  );

  // ── Free cash: income − bills − flex spending − savings − debt payments ───
  // Only show if income is logged; otherwise just show spending vs budget
  const allocated  = totalBills + totalFlexSpent + savedThisMonth + debtPaidMonth;
  const freeCash   = totalIncome - allocated;
  const hasIncome  = totalIncome > 0;

  // ── Wallet alerts (flexible only, at 70%+) ────────────────────────────────
  const alertWallets = leafWallets.filter(w => w.billType !== 'fixed')
    .filter(w => w.limit > 0)
    .map(w => ({ ...w, pct: Math.round((w.spent / w.limit) * 100) }))
    .filter(w => w.pct >= 70)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  const fmt       = (n) => `${sym}${Math.abs(n).toFixed(0)}`;
  const fmtIncome = (n) => incomeVisible ? `${sym}${Math.abs(n).toFixed(0)}` : '••••••';

  // Spending bar colour
  const spendColor = flexPct >= 90 ? colors.red : flexPct >= 70 ? colors.amber : colors.teal;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

      {/* ── Top bar ── */}
      <View style={{
        backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <TouchableOpacity
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
          onPress={onOpenDrawer}
        >
          <Text style={{ fontSize: 18, color: colors.text }}>☰</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{currentMonth}</Text>
        {/* Spacer to keep month centred */}
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* ── Income allocation card ── */}
        {hasIncome ? (
          <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: 14, overflow: 'hidden' }, shadow.sm]}>
            {/* Header */}
            <View style={{ padding: 16, paddingBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {currentMonth.split(' ')[0]} Income
                  </Text>
                  {/* Income figure with inline eye toggle — hidden by default */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 32, fontWeight: '800', color: colors.text }}>
                      {fmtIncome(totalIncome)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setIncomeVisible(v => !v)}
                      style={{ paddingHorizontal: 6, paddingVertical: 4 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={{ fontSize: 16, opacity: 0.5 }}>{incomeVisible ? '👁️' : '🙈'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {/* Free cash pill */}
                <View style={{
                  backgroundColor: freeCash >= 0 ? colors.tealLight : colors.amberLight,
                  borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: freeCash >= 0 ? colors.teal : colors.amber, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    {freeCash >= 0 ? 'Free' : 'Overspent'}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: freeCash >= 0 ? colors.teal : colors.amber, textAlign: 'center' }}>
                    {fmt(freeCash)}
                  </Text>
                </View>
              </View>

              {/* Stacked allocation bar */}
              <View style={{ height: 8, backgroundColor: colors.surface2, borderRadius: 99, marginTop: 14, overflow: 'hidden', flexDirection: 'row' }}>
                {totalIncome > 0 && [
                  { val: totalBills,     color: colors.blue   },
                  { val: totalFlexSpent, color: colors.teal   },
                  { val: savedThisMonth, color: colors.purple },
                  { val: debtPaidMonth,  color: colors.amber  },
                ].map((seg, i) => {
                  const w = Math.min((seg.val / totalIncome) * 100, 100);
                  return w > 0 ? (
                    <View key={i} style={{ width: `${w}%`, height: '100%', backgroundColor: seg.color }} />
                  ) : null;
                })}
              </View>
            </View>

            {/* Allocation rows */}
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
              {totalBills > 0 && (
                <FlowRow
                  label="Bills & fixed costs"
                  sub={fixedWallets.map(w => w.name).join(', ')}
                  value={totalBills}
                  color={colors.blue}
                  sym={sym} hide={false}
                  onPress={() => onNavigate('Wallets')}
                />
              )}
              <FlowRow
                label="Day-to-day spending"
                sub={`${flexPct}% of ${fmt(totalFlexBudget)} budget · ${daysLeft}d left`}
                value={totalFlexSpent}
                color={spendColor}
                sym={sym} hide={false}
                onPress={() => onNavigate('Wallets')}
              />
              {savedThisMonth > 0 && (
                <FlowRow
                  label="Saved to goals"
                  sub="Contributed this month"
                  value={savedThisMonth}
                  color={colors.purple}
                  sym={sym} hide={false}
                  onPress={() => onNavigate('Goals')}
                />
              )}
              {debtPaidMonth > 0 && (
                <FlowRow
                  label="Debt payments"
                  sub="Settled this month"
                  value={debtPaidMonth}
                  color={colors.amber}
                  sym={sym} hide={false}
                  onPress={() => onNavigate('Debts')}
                  isLast
                />
              )}
            </View>
          </View>
        ) : (
          /* ── No income logged: just show spending vs budget ── */
          <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, marginBottom: 14 }, shadow.sm]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
              {currentMonth.split(' ')[0]} Spending
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
              <View>
                <Text style={{ fontSize: 11, color: colors.text3, marginBottom: 3 }}>Spent</Text>
                <Text style={{ fontSize: 32, fontWeight: '800', color: colors.text }}>{fmt(totalFlexSpent)}</Text>
                <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>of {fmt(totalFlexBudget)} budget</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, color: colors.text3, marginBottom: 3 }}>Remaining</Text>
                <Text style={{ fontSize: 24, fontWeight: '700', color: spendColor }}>
                  {fmt(Math.max(0, totalFlexBudget - totalFlexSpent))}
                </Text>
                <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2 }}>{daysLeft}d left</Text>
              </View>
            </View>
            <View style={{ height: 8, backgroundColor: colors.surface2, borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
              <View style={{ height: '100%', width: `${flexPct}%`, backgroundColor: spendColor, borderRadius: 99 }} />
            </View>
            <Text style={{ fontSize: 11, color: colors.text3 }}>{flexPct}% of daily budget used</Text>
            {/* Nudge to log income */}
            <TouchableOpacity
              style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              onPress={() => onNavigate('Income')}
            >
              <Text style={{ fontSize: 12, color: colors.teal, fontWeight: '600', flex: 1 }}>
                💼 Log your income to see your full money flow
              </Text>
              <Text style={{ fontSize: 14, color: colors.teal }}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Streak + quick stats ── */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <View style={[{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14 }, shadow.sm]}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Streak</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: streak >= 7 ? colors.amber : streak >= 1 ? colors.teal : colors.text3 }}>
              {streak > 0 ? `${streak}d` : '—'}
            </Text>
            <Text style={{ fontSize: 10, color: colors.text3, marginTop: 3 }}>
              {streak >= 30 ? '👑 Month master' : streak >= 7 ? '🏆 Week warrior' : streak >= 1 ? 'Under budget' : 'Log expenses daily'}
            </Text>
          </View>

          <TouchableOpacity
            style={[{ flex: 1, backgroundColor: colors.purpleLight, borderRadius: radius.lg, padding: 14 }, shadow.sm]}
            onPress={() => onNavigate('Goals')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.purple, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Goals</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.purple }}>
              {fmt(goals.reduce((s, g) => s + g.saved, 0))}
            </Text>
            <Text style={{ fontSize: 10, color: colors.purple, marginTop: 3, opacity: 0.8 }}>
              {goals.filter(g => g.saved >= g.target).length}/{goals.length} complete
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[{ flex: 1, backgroundColor: colors.blueLight, borderRadius: radius.lg, padding: 14 }, shadow.sm]}
            onPress={() => onNavigate('Debts')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.blue, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Debts</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.blue }}>
              {debts.filter(d => !d.settled).length}
            </Text>
            <Text style={{ fontSize: 10, color: colors.blue, marginTop: 3, opacity: 0.8 }}>open</Text>
          </TouchableOpacity>
        </View>

        {/* ── Gift card reminder (only shown when cards exist) ── */}
        {(() => {
          const activeCards = (giftCards ?? []).filter(c => {
            if (c.balance <= 0) return false;
            if (c.expiry) {
              const [y, m, d] = c.expiry.split('-').map(Number);
              const days = Math.round((new Date(y, m - 1, d) - new Date().setHours(0,0,0,0)) / 86400000);
              if (days < 0) return false;
            }
            return true;
          });
          if (activeCards.length === 0) return null;
          const totalGC    = activeCards.reduce((s, c) => s + c.balance, 0);
          const expiringSoon = activeCards.filter(c => {
            if (!c.expiry) return false;
            const [y, m, d] = c.expiry.split('-').map(Number);
            const days = Math.round((new Date(y, m - 1, d) - new Date().setHours(0,0,0,0)) / 86400000);
            return days >= 0 && days <= 7;
          });
          return (
            <TouchableOpacity
              style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }, shadow.sm]}
              onPress={() => onNavigate('GiftCards')}
              activeOpacity={0.8}
            >
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>🎁</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                  Gift Cards — {fmt(totalGC)} available
                </Text>
                <Text style={{ fontSize: 11, color: expiringSoon.length ? colors.amber : colors.text3, marginTop: 2 }}>
                  {expiringSoon.length
                    ? `⏰ ${expiringSoon.length} expiring this week!`
                    : `${activeCards.length} card${activeCards.length !== 1 ? 's' : ''} · tap to view`}
                </Text>
              </View>
              <Text style={{ fontSize: 16, color: colors.text3 }}>›</Text>
            </TouchableOpacity>
          );
        })()}

        {/* ── Wallet alerts (flexible only, 70%+) ── */}
        {alertWallets.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Needs attention
            </Text>
            {alertWallets.map(w => (
              <TouchableOpacity
                key={w.id}
                style={[{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }, shadow.sm]}
                onPress={() => onNavigate('Wallets')}
                activeOpacity={0.8}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: w.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 17 }}>{w.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{w.name}</Text>
                  <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 99, marginTop: 5, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${Math.min(w.pct, 100)}%`, backgroundColor: w.pct >= 100 ? colors.red : colors.amber, borderRadius: 99 }} />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: w.pct >= 100 ? colors.red : colors.amber }}>{w.pct}%</Text>
                  <Text style={{ fontSize: 10, color: colors.text3, marginTop: 2 }}>
                    {`${sym}${Math.max(0, w.limit - w.spent).toFixed(0)} left`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Recent transactions ── */}
        {monthTxns.length > 0 && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent</Text>
              <TouchableOpacity onPress={() => onNavigate('Transactions')}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.teal }}>See all ›</Text>
              </TouchableOpacity>
            </View>
            <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }, shadow.sm]}>
              {monthTxns.slice(0, 5).map((t, i) => {
                const w        = wallets.find(w => w.id === t.walletId);
                const isGoal   = t.tags?.includes('#goals');
                const isDebt   = t.tags?.includes('#debt');
                const label    = isGoal ? '🎯 ' : isDebt ? '🤝 ' : '';
                const rowColor = isGoal ? colors.purple : isDebt ? colors.amber : colors.red;
                return (
                  <View
                    key={t.id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: i < Math.min(monthTxns.length, 5) - 1 ? 1 : 0, borderBottomColor: colors.border }}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: w ? w.color + '22' : colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 15 }}>{isGoal ? '🎯' : isDebt ? '🤝' : w?.emoji || '💸'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                        {label}{t.desc || 'Expense'}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.text3, marginTop: 1 }}>
                        {w?.name || 'Unassigned'} · {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: rowColor }}>
                      {`${isGoal || isDebt ? '+' : '-'}${sym}${t.amount.toFixed(2)}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {monthTxns.length === 0 && alertWallets.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 50 }}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>✨</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
              {currentMonth.split(' ')[0]} is a fresh start
            </Text>
            <Text style={{ fontSize: 13, color: colors.text3, textAlign: 'center' }}>
              Tap + to log your first expense
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[{
          position: 'absolute', right: 20, bottom: 16,
          width: 60, height: 60, borderRadius: 30,
          backgroundColor: colors.teal,
          alignItems: 'center', justifyContent: 'center',
        }, shadow.lg]}
        onPress={() => setExpenseModal(true)}
        activeOpacity={0.85}
      >
        <Text style={{ fontSize: 28, color: '#fff', lineHeight: 32 }}>＋</Text>
      </TouchableOpacity>

      <AddExpenseModal
        visible={expenseModal}
        wallets={wallets}
        preWalletId={null}
        onClose={() => setExpenseModal(false)}
        onSubmit={onAddExpense}
        currency={currency}
        customTags={customTags || []}
        onCreateTag={onCreateTag || (() => {})}
      />
    </View>
  );
}
