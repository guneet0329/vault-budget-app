import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { radius } from '../theme';
import { calcStreak, getBudgetSuggestions, getMoMComparison, getUnusualTransactions, getNetCashflow } from '../services/insights';

export default function InsightsScreen({ wallets, transactions, income, prevMonthData, onApplySuggestion, currency }) {
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  const sym = currency?.symbol || '$';

  const streak      = calcStreak(transactions, wallets);
  const suggestions = getBudgetSuggestions(wallets, prevMonthData);
  const mom         = getMoMComparison(wallets, prevMonthData);
  const unusual     = getUnusualTransactions(transactions, wallets);
  const { totalIncome, totalExpense, net } = getNetCashflow(income, wallets);

  const Card = ({ children }) => (
    <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, marginBottom: 12 }, shadow.sm]}>
      {children}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>Insights</Text>
        <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>Smart analysis of your spending</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>

        {/* Net cashflow */}
        <View style={[{ backgroundColor: net >= 0 ? colors.greenLight : colors.redLight, borderRadius: radius.lg, padding: 18, marginBottom: 12 }, shadow.sm]}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: net >= 0 ? colors.green : colors.red, marginBottom: 4 }}>Net Cashflow</Text>
          <Text style={{ fontSize: 44, fontWeight: '800', color: net >= 0 ? colors.green : colors.red, marginVertical: 8 }}>
            {net >= 0 ? '+' : ''}{sym}{net.toFixed(0)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.green }}>↑ Income: {sym}{totalIncome.toFixed(0)}</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.red }}>↓ Spent: {sym}{totalExpense.toFixed(0)}</Text>
          </View>
        </View>

        {/* Streak */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Text style={{ fontSize: 40 }}>{streak >= 3 ? '🔥' : streak >= 1 ? '✨' : '💤'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Spending Streak</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 4 }}>
                {streak > 0 ? `${streak} day${streak > 1 ? 's' : ''} under budget!` : 'Start your streak today'}
              </Text>
              {streak >= 7  && <Text style={{ fontSize: 13, color: colors.amber, fontWeight: '600', marginTop: 4 }}>🏆 Week warrior</Text>}
              {streak >= 30 && <Text style={{ fontSize: 13, color: colors.amber, fontWeight: '600', marginTop: 4 }}>👑 Month master</Text>}
            </View>
          </View>
        </Card>

        {/* Budget suggestions */}
        {suggestions.length > 0 && (
          <Card>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 }}>💡 Budget Suggestions</Text>
            <Text style={{ fontSize: 12, color: colors.text3, marginBottom: 12 }}>Based on your spending history</Text>
            {suggestions.map((sug, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={{ fontSize: 22 }}>{sug.wallet.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{sug.wallet.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2 }}>{sug.reason}</Text>
                  <Text style={{ fontSize: 13, color: colors.text2, marginTop: 4 }}>
                    {sym}{sug.current} → <Text style={{ color: sug.diff > 0 ? colors.amber : colors.green, fontWeight: '700' }}>{sym}{sug.suggested}</Text>
                  </Text>
                </View>
                <TouchableOpacity style={{ backgroundColor: colors.tealLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 }} onPress={() => Alert.alert('Apply Suggestion', `Set ${sug.wallet.name} to ${sym}${sug.suggested}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Apply', onPress: () => onApplySuggestion(sug.wallet.id, sug.suggested) }])}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.teal }}>Apply</Text>
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        )}

        {/* MoM comparison */}
        {mom.some(r => r.prev > 0) && (
          <Card>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>📅 Month vs Last Month</Text>
            {mom.filter(r => r.prev > 0 || r.curr > 0).map((r, i) => {
              const isUp = r.diff > 0;
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ fontSize: 20 }}>{r.wallet.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{r.wallet.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.text3, marginTop: 1 }}>Last month: {sym}{r.prev.toFixed(0)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{sym}{r.curr.toFixed(0)}</Text>
                    {r.prev > 0 && <Text style={{ fontSize: 11, fontWeight: '600', marginTop: 2, color: isUp ? colors.red : colors.green }}>{isUp ? '▲' : '▼'} {sym}{Math.abs(r.diff).toFixed(0)}</Text>}
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* Unusual */}
        {unusual.length > 0 && (
          <Card>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 }}>🔔 Unusual Transactions</Text>
            <Text style={{ fontSize: 12, color: colors.text3, marginBottom: 12 }}>Significantly higher than your average</Text>
            {unusual.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={{ fontSize: 20 }}>{t.walletEmoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{t.desc}</Text>
                  <Text style={{ fontSize: 11, color: colors.text3, marginTop: 1 }}>{t.walletName} · avg {sym}{t.avg.toFixed(0)}</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.red }}>{sym}{t.amount.toFixed(0)}</Text>
              </View>
            ))}
          </Card>
        )}

        {suggestions.length === 0 && unusual.length === 0 && !mom.some(r => r.prev > 0) && (
          <View style={{ alignItems: 'center', padding: 50 }}>
            <Text style={{ fontSize: 52, marginBottom: 14 }}>🧠</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 }}>Keep logging expenses</Text>
            <Text style={{ fontSize: 14, color: colors.text3, textAlign: 'center' }}>Insights will appear as you build up history</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}
