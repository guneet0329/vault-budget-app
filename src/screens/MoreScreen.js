import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, Switch, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { radius, CURRENCIES } from '../theme';
import ManageWalletsScreen from './ManageWalletsScreen';

// ── Info data ──────────────────────────────────────────────────────────────────
const INFO_SECTIONS = [
  {
    title: '🏠 Home',
    body: 'Your monthly overview. Shows how much of your budget you\'ve used, what\'s remaining, and how many days are left in the month. Tap the 👁️ icon to hide all numbers. The + button logs a quick expense. Wallet alerts appear here when you\'re approaching a limit.',
  },
  {
    title: '👜 Wallets',
    body: 'Budget categories (Food, Rent, Transport, etc.). Each wallet has a monthly spending limit. Tap a wallet to see all its transactions for the month. Long-press to edit. Use "Manage" to add, edit, or delete wallets.\n\n📌 Fixed wallets (like Rent) won\'t show red over-budget warnings — they auto-deduct each month on Reset.',
  },
  {
    title: '📋 Transactions',
    body: 'Every expense you\'ve logged this month. Tap any transaction to edit the amount, description, or reassign it to a different wallet — or delete it. The wallet balance adjusts automatically. Use the filter chips to view by wallet, or search by description.',
  },
  {
    title: '📊 Analysis',
    body: 'Charts and breakdowns for the selected month. Includes a donut chart by category, weekly spending bars, spending velocity (projected total vs budget), and top expenses. The Tag Analysis tab lets you filter spending by custom tags.',
  },
  {
    title: '🧠 Insights',
    body: 'Smart suggestions based on your spending patterns. Shows net cashflow (income minus expenses), your budget streak, month-over-month comparisons, and unusual transactions. Budget suggestions can be applied with one tap.',
  },
  {
    title: '🎯 Goals',
    body: 'Savings goals with progress tracking. When you add progress to a goal, you can optionally deduct the amount from a wallet — this keeps your budget accurate. Each goal can have a default wallet set so you don\'t have to choose every time.',
  },
  {
    title: '💼 Income',
    body: 'Log your income sources (salary, freelance, investments, etc.) with a frequency. This feeds into the Insights net cashflow calculation and the salary allocation panel. Long-press an entry to delete it.',
  },
  {
    title: '🤝 Debts',
    body: 'Track money you\'ve lent or borrowed. For borrowed money, you can link a wallet — when you mark it as settled, the amount is automatically deducted from that wallet and logged as a transaction.',
  },
  {
    title: '🔄 Recurring',
    body: 'Expenses set to repeat daily, weekly, or monthly. They auto-deduct from your wallet when you open the app. Manage them in Settings → Recurring. Toggle individual rules on/off or delete them.',
  },
  {
    title: '📅 Month Switcher',
    body: 'Tap the month name in the Wallets header to switch months. All charts, transactions, and analysis views update to the selected month. Use this to review past spending.',
  },
  {
    title: '⚙️ Reset Month',
    body: 'Clears all spending for a fresh month start. Before clearing, the current spending is saved as "last month" data — this powers the month-over-month comparison in Insights. Use this at the start of each month.',
  },
  {
    title: '🔒 Biometric Lock',
    body: 'Vault locks itself each time you open the app. Unlock with your fingerprint or face ID. If biometrics aren\'t available on your device, the app opens directly.',
  },
];

function InfoScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  const [expanded, setExpanded] = useState(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <TouchableOpacity
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
          onPress={onBack}
        >
          <Text style={{ fontSize: 18, color: colors.text }}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>How Vault Works</Text>
          <Text style={{ fontSize: 12, color: colors.text3, marginTop: 1 }}>Tap any feature to learn more</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        {/* Intro */}
        <View style={[{ backgroundColor: colors.tealLight, borderRadius: radius.lg, padding: 16, marginBottom: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, shadow.sm]}>
          <Text style={{ fontSize: 28 }}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.teal, marginBottom: 4 }}>Vault — Offline Budget App</Text>
            <Text style={{ fontSize: 13, color: colors.teal, lineHeight: 19, opacity: 0.85 }}>
              Everything is stored locally on your phone. No accounts, no cloud, no ads. Your data never leaves your device.
            </Text>
          </View>
        </View>

        {INFO_SECTIONS.map((section, i) => {
          const isOpen = expanded === i;
          return (
            <TouchableOpacity
              key={i}
              style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: 8, overflow: 'hidden' }, shadow.sm]}
              onPress={() => setExpanded(isOpen ? null : i)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 }}>{section.title}</Text>
                <Text style={{ fontSize: 14, color: colors.text3, marginLeft: 8 }}>{isOpen ? '▲' : '▼'}</Text>
              </View>
              {isOpen && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ fontSize: 13, color: colors.text2, lineHeight: 21, marginTop: 12 }}>
                    {section.body}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Version */}
        <Text style={{ fontSize: 11, color: colors.text3, textAlign: 'center', marginTop: 16 }}>
          Vault Budget · All data stored locally on device
        </Text>
      </ScrollView>
    </View>
  );
}

export default function MoreScreen({
  wallets, transactions, recurring, currentMonth,
  onResetMonth, onDeleteRecurring, onToggleRecurring,
  currency, onChangeCurrency,
  onAddWallet, onEditWallet, onDeleteWallet, onReorderWallets,
  onDeleteTransaction,
}) {
  const insets = useSafeAreaInsets();
  const { colors, shadow, setTheme, override } = useTheme();
  const sym = currency?.symbol || '$';

  const [currencyModal,  setCurrencyModal]  = useState(false);
  const [recurringModal, setRecurringModal] = useState(false);
  const [manageWallets,  setManageWallets]  = useState(false);
  const [showInfo,       setShowInfo]       = useState(false);

  function handleReset() {
    // Custom styled confirmation using state instead of system Alert
    setResetConfirm(true);
  }
  const [resetConfirm, setResetConfirm] = useState(false);

  if (showInfo)      return <InfoScreen onBack={() => setShowInfo(false)} />;
  if (manageWallets) return (
    <ManageWalletsScreen
      wallets={wallets}
      onAddWallet={onAddWallet}
      onEditWallet={onEditWallet}
      onDeleteWallet={onDeleteWallet}
      onReorderWallets={onReorderWallets}
      onBack={() => setManageWallets(false)}
    />
  );

  const Row = ({ icon, iconBg, title, sub, onPress, last, rightEl }) => (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
        <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{title}</Text>
          {sub ? <Text style={{ fontSize: 12, color: colors.text3, marginTop: 1 }}>{sub}</Text> : null}
        </View>
      </View>
      {rightEl ?? <Text style={{ fontSize: 18, color: colors.text3 }}>›</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>

        {/* Appearance */}
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text3, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, paddingHorizontal: 4 }}>Appearance</Text>
        <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16 }, shadow.sm]}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 12 }}>Theme</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[{ label: '🌞 Light', val: 'light' }, { label: '🌙 Dark', val: 'dark' }, { label: '⚙️ System', val: null }].map(opt => (
              <TouchableOpacity
                key={String(opt.val)}
                style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.sm, backgroundColor: override === opt.val ? colors.tealLight : colors.surface2, borderWidth: 1.5, borderColor: override === opt.val ? colors.teal : 'transparent' }}
                onPress={() => setTheme(opt.val)}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: override === opt.val ? colors.teal : colors.text2 }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Wallets */}
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text3, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, marginTop: 18, paddingHorizontal: 4 }}>Wallets</Text>
        <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }, shadow.sm]}>
          <Row icon="👜" iconBg={colors.tealLight} title="Manage Wallets" sub={`${wallets.length} wallet${wallets.length !== 1 ? 's' : ''}`} onPress={() => setManageWallets(true)} last />
        </View>

        {/* Currency */}
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text3, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, marginTop: 18, paddingHorizontal: 4 }}>Currency</Text>
        <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }, shadow.sm]}>
          <Row icon="💱" iconBg={colors.amberLight} title="Base Currency" sub={`${currency?.name || 'US Dollar'} (${sym})`} onPress={() => setCurrencyModal(true)} last />
        </View>

        {/* Recurring */}
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text3, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, marginTop: 18, paddingHorizontal: 4 }}>Recurring</Text>
        <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }, shadow.sm]}>
          <Row icon="🔄" iconBg={colors.blueLight} title="Manage Recurring" sub={`${(recurring || []).length} rule${(recurring || []).length !== 1 ? 's' : ''}`} onPress={() => setRecurringModal(true)} last />
        </View>

        {/* Tools */}
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text3, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, marginTop: 18, paddingHorizontal: 4 }}>Tools</Text>
        <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }, shadow.sm]}>
          <Row icon="🗓️" iconBg={colors.tealLight} title="Reset Month" sub="Archive spending and start fresh" onPress={() => setResetConfirm(true)} />
          <Row icon="ℹ️" iconBg={colors.purpleLight} title="How Vault Works" sub="Feature guide & help" onPress={() => setShowInfo(true)} last />
        </View>

      </ScrollView>

      {/* ── Reset confirmation (custom, no system dialog) ── */}
      <Modal visible={resetConfirm} transparent animationType="fade" onRequestClose={() => setResetConfirm(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 24, width: '100%' }, shadow.lg]}>
            <Text style={{ fontSize: 28, textAlign: 'center', marginBottom: 12 }}>🗓️</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8 }}>Reset Month?</Text>
            <Text style={{ fontSize: 14, color: colors.text3, textAlign: 'center', lineHeight: 21, marginBottom: 24 }}>
              This will archive your current spending as last month's data, then clear all transactions and wallet balances for a fresh start.{'\n\n'}This cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: radius.sm, backgroundColor: colors.surface2, alignItems: 'center' }}
                onPress={() => setResetConfirm(false)}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text2 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: radius.sm, backgroundColor: colors.red, alignItems: 'center' }}
                onPress={() => { setResetConfirm(false); onResetMonth(); }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Currency Modal ── */}
      <Modal visible={currencyModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCurrencyModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 99, alignSelf: 'center', marginTop: 14 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>Select Currency</Text>
            <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }} onPress={() => setCurrencyModal(false)}>
              <Text style={{ fontSize: 14, color: colors.text2 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={CURRENCIES}
            keyExtractor={item => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: currency?.code === item.code ? colors.tealLight : 'transparent' }}
                onPress={() => { onChangeCurrency(item); setCurrencyModal(false); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{item.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.text3, marginTop: 1 }}>{item.code}</Text>
                </View>
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text2, marginRight: 8 }}>{item.symbol}</Text>
                {currency?.code === item.code && <Text style={{ fontSize: 18, color: colors.teal }}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* ── Recurring Modal ── */}
      <Modal visible={recurringModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRecurringModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 99, alignSelf: 'center', marginTop: 14 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>Recurring Expenses</Text>
            <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }} onPress={() => setRecurringModal(false)}>
              <Text style={{ fontSize: 14, color: colors.text2 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {!recurring?.length ? (
              <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 30, alignItems: 'center' }, shadow.sm]}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>🔄</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 }}>No recurring expenses</Text>
                <Text style={{ fontSize: 13, color: colors.text3, textAlign: 'center' }}>
                  When you log an expense, set the Repeat field to daily, weekly, or monthly.
                </Text>
              </View>
            ) : recurring.map(r => {
              const w = wallets.find(w => w.id === r.walletId);
              return (
                <View key={r.id} style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }, shadow.sm]}>
                  <Text style={{ fontSize: 22 }}>{w?.emoji || '💸'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{r.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2, textTransform: 'capitalize' }}>
                      {sym}{r.amount} · {r.frequency} · {w?.name || 'Unassigned'}
                    </Text>
                    {r.lastApplied && (
                      <Text style={{ fontSize: 10, color: colors.text3, marginTop: 1 }}>Last applied: {r.lastApplied}</Text>
                    )}
                  </View>
                  <Switch
                    value={r.active}
                    onValueChange={() => onToggleRecurring(r.id)}
                    trackColor={{ false: colors.border, true: colors.tealLight }}
                    thumbColor={r.active ? colors.teal : colors.text3}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      // custom delete confirmation
                      onDeleteRecurring(r.id);
                    }}
                  >
                    <Text style={{ fontSize: 18, marginLeft: 4 }}>🗑</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}