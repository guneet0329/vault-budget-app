import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useTheme } from '../ThemeContext';
import { radius, CHART_COLORS } from '../theme';

const W = Dimensions.get('window').width - 28;
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMonthBounds(monthStr) {
  // monthStr like "April 2025"
  const parts = monthStr.split(' ');
  const monthIdx = MONTH_NAMES.indexOf(parts[0]);
  const year = parseInt(parts[1]);
  if (monthIdx === -1 || isNaN(year)) return { start: 0, end: Date.now() };
  const start = new Date(year, monthIdx, 1).getTime();
  const end   = new Date(year, monthIdx + 1, 0, 23, 59, 59).getTime();
  return { start, end };
}

function filterByMonth(transactions, currentMonth) {
  const { start, end } = getMonthBounds(currentMonth);
  return transactions.filter(t => t.date >= start && t.date <= end);
}

// ── Donut ─────────────────────────────────────────────────────────────────────
function DonutChart({ wallets, txns, colors }) {
  const byWallet = {};
  txns.forEach(t => {
    if (t.walletId) byWallet[t.walletId] = (byWallet[t.walletId] || 0) + t.amount;
  });
  const total = Object.values(byWallet).reduce((s, v) => s + v, 0) || 1;
  const slices = wallets.filter(w => byWallet[w.id] > 0).map((w, i) => {
    return { name: w.name, emoji: w.emoji, color: CHART_COLORS[i % CHART_COLORS.length], amount: byWallet[w.id], pct: Math.round((byWallet[w.id] / total) * 100) };
  });

  const cx = 80, cy = 80, r = 60, sw = 22;
  let startAngle = -Math.PI / 2;
  const paths = slices.map((s, i) => {
    const frac = s.amount / total;
    const angle = frac * 2 * Math.PI;
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(startAngle + angle), y2 = cy + r * Math.sin(startAngle + angle);
    const lg = angle > Math.PI ? 1 : 0;
    const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${lg},1 ${x2},${y2} Z`;
    startAngle += angle;
    return { ...s, d };
  });

  if (!slices.length) return <Text style={{ fontSize: 14, color: colors.text3, textAlign: 'center', padding: 20 }}>No spending this month</Text>;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Svg width={160} height={160} viewBox="0 0 160 160">
        {paths.map((s, i) => <Path key={i} d={s.d} fill={s.color} opacity={0.92} />)}
        <Circle cx={cx} cy={cy} r={r - sw} fill={colors.surface} />
      </Svg>
      <View style={{ flex: 1, gap: 8 }}>
        {slices.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
            <Text style={{ flex: 1, fontSize: 12, color: colors.text2 }} numberOfLines={1}>{s.emoji} {s.name}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{s.pct}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Weekly bar chart ──────────────────────────────────────────────────────────
function WeeklyBars({ txns, colors }) {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const now = new Date();
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const weekData = days.map((label, i) => {
    const dayIndex = (i + 1) % 7;
    const total = txns.filter(t => new Date(t.date).getDay() === dayIndex).reduce((s, t) => s + t.amount, 0);
    return { label, total };
  });
  const maxVal = Math.max(...weekData.map(d => d.total), 1);
  const chartH = 80;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: chartH + 36 }}>
      {weekData.map((d, i) => {
        const barH = d.total > 0 ? Math.max((d.total / maxVal) * chartH, 6) : 3;
        const isToday = i === todayIdx;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: chartH + 36 }}>
            {d.total > 0 && <Text style={{ fontSize: 9, color: colors.text2, fontWeight: '600', marginBottom: 2 }}>${d.total.toFixed(0)}</Text>}
            <View style={{ width: '100%', height: barH, borderRadius: 6, backgroundColor: isToday ? colors.teal : colors.tealLight, opacity: isToday ? 1 : 0.8 }} />
            <Text style={{ fontSize: 10, color: isToday ? colors.teal : colors.text3, marginTop: 5, fontWeight: isToday ? '700' : '500' }}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Tag Analysis ──────────────────────────────────────────────────────────────
function TagAnalysis({ transactions, customTags, currentMonth, colors }) {
  const [selectedTags, setSelectedTags] = useState([]);
  const [period,       setPeriod]       = useState('month'); // 'week' | 'month'

  const allTags = customTags.map(t => t.name);

  function toggleTag(tag) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  // Filter transactions by period
  const periodTxns = useMemo(() => {
    if (period === 'month') return filterByMonth(transactions, currentMonth);
    // week = last 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return transactions.filter(t => t.date >= weekAgo);
  }, [transactions, period, currentMonth]);

  // Filter by selected tags (OR logic — any matching tag)
  const tagTxns = useMemo(() => {
    if (!selectedTags.length) return [];
    return periodTxns.filter(t => t.tags?.some(tag => selectedTags.includes(tag)));
  }, [periodTxns, selectedTags]);

  const totalSpend  = tagTxns.reduce((s, t) => s + t.amount, 0);
  const avgPerDay   = period === 'month' ? totalSpend / 30 : totalSpend / 7;
  const txnCount    = tagTxns.length;
  const avgPerTxn   = txnCount > 0 ? totalSpend / txnCount : 0;
  const mostExpensive = tagTxns.reduce((max, t) => t.amount > (max?.amount ?? 0) ? t : max, null);

  // Daily breakdown for bar chart
  const dayLabels = period === 'week'
    ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    : Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (29 - i)); return d.getDate().toString(); });

  const dayTotals = useMemo(() => {
    if (period === 'week') {
      return dayLabels.map((_, i) => {
        const dayIdx = (i + 1) % 7;
        return tagTxns.filter(t => new Date(t.date).getDay() === dayIdx).reduce((s, t) => s + t.amount, 0);
      });
    } else {
      return dayLabels.map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (29 - i)); d.setHours(0,0,0,0);
        const next = new Date(d); next.setDate(d.getDate() + 1);
        return tagTxns.filter(t => t.date >= d.getTime() && t.date < next.getTime()).reduce((s, t) => s + t.amount, 0);
      });
    }
  }, [tagTxns, period]);

  const maxDay = Math.max(...dayTotals, 1);
  const chartH = 70;

  // Per-tag breakdown
  const perTagBreakdown = selectedTags.map(tag => {
    const tagSpecificTxns = periodTxns.filter(t => t.tags?.includes(tag));
    return { tag, total: tagSpecificTxns.reduce((s, t) => s + t.amount, 0), count: tagSpecificTxns.length };
  });

  return (
    <View>
      {/* Tag selector */}
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Select tags to analyze</Text>
        {allTags.length === 0 ? (
          <View style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: colors.text3 }}>No tags yet — create tags when logging expenses</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {allTags.map(tag => {
              const tagObj = customTags.find(t => t.name === tag);
              const isSelected = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: isSelected ? (tagObj?.color || colors.teal) : colors.surface2, borderWidth: 1.5, borderColor: isSelected ? (tagObj?.color || colors.teal) : colors.border }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: isSelected ? '#fff' : colors.text2 }}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {selectedTags.length === 0 && (
        <View style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 32, marginBottom: 10 }}>🏷️</Text>
          <Text style={{ fontSize: 14, color: colors.text2, fontWeight: '600', marginBottom: 4 }}>Select tags above</Text>
          <Text style={{ fontSize: 12, color: colors.text3, textAlign: 'center' }}>Choose one or more tags to see combined spending analysis</Text>
        </View>
      )}

      {selectedTags.length > 0 && (
        <>
          {/* Period toggle */}
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 4, marginBottom: 16, gap: 4 }}>
            {[{ id: 'week', label: 'This Week' }, { id: 'month', label: 'This Month' }].map(p => (
              <TouchableOpacity key={p.id} style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8, backgroundColor: period === p.id ? colors.surface : 'transparent' }} onPress={() => setPeriod(p.id)}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: period === p.id ? colors.teal : colors.text3 }}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary header */}
          <View style={{ backgroundColor: colors.teal, borderRadius: radius.lg, padding: 18, marginBottom: 12 }}>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {selectedTags.join(' + ')} · {period === 'week' ? 'Last 7 days' : currentMonth}
            </Text>
            <Text style={{ fontSize: 40, fontWeight: '800', color: '#fff', marginTop: 4 }}>${totalSpend.toFixed(2)}</Text>
            <View style={{ flexDirection: 'row', gap: 20, marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{txnCount} transactions</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>${avgPerDay.toFixed(2)}/day avg</Text>
            </View>
          </View>

          {/* Metrics row */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            {[
              { label: 'Avg per txn',    val: `$${avgPerTxn.toFixed(2)}`,         color: colors.text },
              { label: 'Biggest spend',  val: mostExpensive ? `$${mostExpensive.amount.toFixed(2)}` : '—', color: colors.red },
              { label: 'Transactions',   val: String(txnCount),                    color: colors.teal },
            ].map((m, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: m.color }}>{m.val}</Text>
                <Text style={{ fontSize: 10, color: colors.text3, marginTop: 3, textAlign: 'center', fontWeight: '500' }}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* Spending bar chart */}
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text2, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Daily Spending
            </Text>
            {totalSpend === 0 ? (
              <Text style={{ fontSize: 13, color: colors.text3, textAlign: 'center' }}>No tagged expenses in this period</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: chartH + 30 }}>
                  {dayTotals.map((val, i) => {
                    const barH = val > 0 ? Math.max((val / maxDay) * chartH, 5) : 2;
                    return (
                      <View key={i} style={{ alignItems: 'center', justifyContent: 'flex-end', height: chartH + 30, width: period === 'week' ? 44 : 22 }}>
                        {val > 0 && <Text style={{ fontSize: 8, color: colors.text2, marginBottom: 2 }}>${val.toFixed(0)}</Text>}
                        <View style={{ width: '80%', height: barH, borderRadius: 4, backgroundColor: colors.teal, opacity: val > 0 ? 1 : 0.2 }} />
                        <Text style={{ fontSize: 9, color: colors.text3, marginTop: 4 }}>{dayLabels[i]}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Per-tag breakdown (when multiple tags selected) */}
          {selectedTags.length > 1 && (
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text2, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Per Tag Breakdown</Text>
              {perTagBreakdown.map((b, i) => {
                const pct = totalSpend > 0 ? (b.total / totalSpend) * 100 : 0;
                const tagObj = customTags.find(t => t.name === b.tag);
                const tagColor = tagObj?.color || CHART_COLORS[i % CHART_COLORS.length];
                return (
                  <View key={b.tag} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{b.tag}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: tagColor }}>${b.total.toFixed(2)}</Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: tagColor, borderRadius: 99 }} />
                    </View>
                    <Text style={{ fontSize: 10, color: colors.text3, marginTop: 3 }}>{b.count} transactions · {pct.toFixed(0)}% of combined</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Recent tagged transactions */}
          {tagTxns.length > 0 && (
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text2, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tagged Transactions</Text>
              {[...tagTxns].reverse().slice(0, 8).map((t, i, arr) => (
                <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{t.desc || 'Expense'}</Text>
                    <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2 }}>
                      {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {t.tags?.length ? ' · ' + t.tags.filter(tag => selectedTags.includes(tag)).join(', ') : ''}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.red }}>-${t.amount.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AnalysisScreen({ wallets, transactions, currentMonth, customTags = [] }) {
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  const [tab, setTab] = useState('overview'); // 'overview' | 'tags'

  const monthTxns = useMemo(() => filterByMonth(transactions, currentMonth), [transactions, currentMonth]);

  const totalBudget = wallets.reduce((s, w) => s + w.limit, 0);
  const totalSpent  = monthTxns.reduce((s, t) => s + t.amount, 0);
  const topWallet   = [...wallets].sort((a, b) => b.spent - a.spent)[0] || {};
  const safeCount   = wallets.filter(w => w.spent / w.limit < 0.7).length;

  // Velocity
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  const dailyRate = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0;
  const projected = dailyRate * daysInMonth;
  const willOverrun = projected > totalBudget;
  const safeDaily = daysLeft > 0 ? (totalBudget - totalSpent) / daysLeft : 0;

  const Card = ({ children, style }) => (
    <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, marginBottom: 12 }, shadow.sm, style]}>
      {children}
    </View>
  );

  const SectionTitle = ({ children }) => (
    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text2, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>{children}</Text>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 22, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18 }}>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>Analysis</Text>
          <Text style={{ fontSize: 13, color: colors.text3, fontWeight: '500' }}>{currentMonth}</Text>
        </View>
        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 0 }}>
          {[{ id: 'overview', label: 'Overview' }, { id: 'tags', label: '🏷️ Tag Analysis' }].map(t => (
            <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={{ paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 2.5, borderBottomColor: tab === t.id ? colors.teal : 'transparent' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: tab === t.id ? colors.teal : colors.text3 }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>

        {tab === 'overview' && (
          <>
            {/* Stat cards */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              {[
                { label: 'Total Budget', value: `$${totalBudget}`,           sub: 'This month',    subColor: colors.text3 },
                { label: 'Total Spent',  value: `$${totalSpent.toFixed(0)}`, sub: `$${(totalBudget - totalSpent).toFixed(0)} left`, subColor: colors.teal },
                { label: 'Top Wallet',   value: topWallet?.emoji || '—',     sub: topWallet?.name || '—', subColor: colors.text3 },
                { label: 'Safe Wallets', value: `${safeCount}/${wallets.length}`, sub: 'Under 70%', subColor: colors.green },
              ].map((s, i) => (
                <View key={i} style={[{ flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16 }, shadow.sm]}>
                  <Text style={{ fontSize: 11, color: colors.text3, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</Text>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 4 }}>{s.value}</Text>
                  <Text style={{ fontSize: 11, marginTop: 3, color: s.subColor }}>{s.sub}</Text>
                </View>
              ))}
            </View>

            {/* Weekly */}
            <Card>
              <SectionTitle>This Week's Spending</SectionTitle>
              <WeeklyBars txns={monthTxns} colors={colors} />
            </Card>

            {/* Velocity */}
            <Card>
              <SectionTitle>Spending Velocity</SectionTitle>
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                {[
                  { label: 'Daily avg',      val: `$${dailyRate.toFixed(1)}`,    color: colors.text },
                  { label: 'Projected total',val: `$${projected.toFixed(0)}`,    color: willOverrun ? colors.red : colors.green },
                  { label: 'Safe daily',     val: `$${safeDaily.toFixed(1)}`,    color: colors.teal },
                ].map((s, i) => (
                  <View key={i} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: colors.border, paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: s.color }}>{s.val}</Text>
                    <Text style={{ fontSize: 10, color: colors.text3, textAlign: 'center', marginTop: 3, fontWeight: '500' }}>{s.label}</Text>
                  </View>
                ))}
              </View>
              {willOverrun && (
                <View style={{ marginTop: 12, backgroundColor: colors.redLight, borderRadius: radius.sm, padding: 10 }}>
                  <Text style={{ fontSize: 12, color: colors.red, fontWeight: '500' }}>⚠️ At this rate you'll overspend by ${(projected - totalBudget).toFixed(0)} this month</Text>
                </View>
              )}
            </Card>

            {/* Donut */}
            <Card>
              <SectionTitle>Spending by Category</SectionTitle>
              <DonutChart wallets={wallets} txns={monthTxns} colors={colors} />
            </Card>

            {/* Budget bars */}
            <Card>
              <SectionTitle>Budget Usage</SectionTitle>
              {wallets.map((w, i) => {
                const pct = w.limit ? Math.min(Math.round((w.spent / w.limit) * 100), 100) : 0;
                const barColor = pct >= 90 ? colors.red : pct >= 70 ? colors.amber : CHART_COLORS[i % CHART_COLORS.length];
                return (
                  <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Text style={{ fontSize: 12, color: colors.text2, width: 86, flexShrink: 0 }} numberOfLines={1}>{w.emoji} {w.name}</Text>
                    <View style={{ flex: 1, height: 10, backgroundColor: colors.surface2, borderRadius: 99, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: 99 }} />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: barColor, width: 32, textAlign: 'right', flexShrink: 0 }}>{pct}%</Text>
                  </View>
                );
              })}
            </Card>

            {/* Top expenses */}
            {monthTxns.length > 0 && (
              <Card>
                <SectionTitle>Top Expenses This Month</SectionTitle>
                {[...monthTxns].sort((a, b) => b.amount - a.amount).slice(0, 5).map((t, i) => {
                  const w = wallets.find(w => w.id === t.walletId);
                  return (
                    <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ fontSize: 11, color: colors.text3, width: 20, fontWeight: '600' }}>#{i + 1}</Text>
                      <Text style={{ fontSize: 16 }}>{w?.emoji || '💸'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }} numberOfLines={1}>{t.desc || 'Expense'}</Text>
                        <Text style={{ fontSize: 10, color: colors.text3, marginTop: 1 }}>
                          {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.red }}>-${t.amount.toFixed(2)}</Text>
                    </View>
                  );
                })}
              </Card>
            )}
          </>
        )}

        {tab === 'tags' && (
          <TagAnalysis
            transactions={transactions}
            customTags={customTags}
            currentMonth={currentMonth}
            colors={colors}
          />
        )}

      </ScrollView>
    </View>
  );
}
