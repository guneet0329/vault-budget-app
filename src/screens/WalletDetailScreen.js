import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { radius } from '../theme';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getMonthBounds(monthStr) {
  const [mName, yr] = (monthStr ?? '').split(' ');
  const mi = MONTH_NAMES.indexOf(mName);
  const y  = parseInt(yr);
  if (mi === -1 || isNaN(y)) return { start: 0, end: Date.now() };
  return { start: new Date(y, mi, 1).getTime(), end: new Date(y, mi + 1, 0, 23, 59, 59).getTime() };
}

export default function WalletDetailScreen({ wallet, transactions, currentMonth, currency, onBack, onAddExpense }) {
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  const sym = currency?.symbol || '$';

  const { start, end } = getMonthBounds(currentMonth);
  const walletTxns = useMemo(
    () => transactions.filter(t => t.walletId === wallet.id && t.date >= start && t.date <= end),
    [transactions, wallet.id, currentMonth]
  );

  const isFixed   = wallet.billType === 'fixed';
  const pct       = wallet.limit ? Math.min(Math.round((wallet.spent / wallet.limit) * 100), 100) : 0;
  const rem       = wallet.limit - wallet.spent;
  const barColor  = isFixed
    ? (pct >= 100 ? colors.amber : wallet.color)
    : (pct >= 90 ? colors.red : pct >= 70 ? colors.amber : wallet.color);

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // Daily spending breakdown
  const byDay = useMemo(() => {
    const map = {};
    walletTxns.forEach(t => {
      const day = new Date(t.date).toDateString();
      if (!map[day]) map[day] = [];
      map[day].push(t);
    });
    return Object.entries(map).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [walletTxns]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
            onPress={onBack}
          >
            <Text style={{ fontSize: 18, color: colors.text }}>‹</Text>
          </TouchableOpacity>
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: wallet.color + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 22 }}>{wallet.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{wallet.name}</Text>
              {isFixed && (
                <View style={{ backgroundColor: colors.amberLight, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.amber }}>📌 FIXED</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 12, color: colors.text3, marginTop: 1 }}>{currentMonth}</Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: colors.teal, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 7 }}
            onPress={() => onAddExpense(wallet.id)}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Budget bar */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <View>
              <Text style={{ fontSize: 11, color: colors.text3, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 }}>Spent</Text>
              <Text style={{ fontSize: 26, fontWeight: '700', color: barColor }}>{sym}{wallet.spent.toFixed(0)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: colors.text3, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 }}>Remaining</Text>
              <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>{sym}{rem.toFixed(0)}</Text>
            </View>
          </View>
          <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: 99 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: colors.text3 }}>{pct}% used</Text>
            <Text style={{ fontSize: 11, color: colors.text3 }}>Limit {sym}{wallet.limit}</Text>
          </View>
        </View>
      </View>

      {/* Transaction list grouped by day */}
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        {byDay.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 50 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>{wallet.emoji}</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 }}>No expenses yet</Text>
            <Text style={{ fontSize: 13, color: colors.text3, textAlign: 'center' }}>
              Tap "+ Add" to log your first expense in {wallet.name}
            </Text>
          </View>
        ) : byDay.map(([dayStr, dayTxns]) => (
          <View key={dayStr} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3 }}>
                {new Date(dayStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.red }}>
                -{sym}{dayTxns.reduce((s, t) => s + t.amount, 0).toFixed(2)}
              </Text>
            </View>
            <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }, shadow.sm]}>
              {dayTxns.map((t, i) => (
                <View
                  key={t.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: i < dayTxns.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{t.desc || 'Expense'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      {t.tags?.slice(0, 2).map(tag => (
                        <View key={tag} style={{ backgroundColor: colors.tealLight, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 10, color: colors.teal, fontWeight: '600' }}>{tag}</Text>
                        </View>
                      ))}
                      {t.isRecurring && <Text style={{ fontSize: 11 }}>🔄</Text>}
                    </View>
                    {t.note ? <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2, fontStyle: 'italic' }} numberOfLines={1}>{t.note}</Text> : null}
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.red }}>-{sym}{t.amount.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
