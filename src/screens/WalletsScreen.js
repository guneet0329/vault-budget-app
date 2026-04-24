import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StatusBar, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import WalletCard, { ParentWalletCard } from '../components/WalletCard';
import AddExpenseModal from '../components/AddExpenseModal';
import ManageWalletsScreen from './ManageWalletsScreen';
import WalletDetailScreen from './WalletDetailScreen';
import { radius } from '../theme';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function WalletsScreen({
  wallets, transactions, accounts,
  onAddExpense, onAddWallet, onEditWallet, onDeleteWallet, onReorderWallets,
  currentMonth, onMonthChange, onOpenDrawer, currency,
  customTags, onCreateTag,
}) {
  const insets = useSafeAreaInsets();
  const { colors, shadow, isDark } = useTheme();
  const sym = currency?.symbol || '$';

  const [expenseModal,  setExpenseModal]  = useState(false);
  const [manageVisible, setManageVisible] = useState(false);
  const [monthPicker,   setMonthPicker]   = useState(false);
  const [preWalletId,   setPreWalletId]   = useState(null);
  const [detailWallet,  setDetailWallet]  = useState(null);
  // Track which parent groups are collapsed
  const [collapsed, setCollapsed] = useState({});

  const now = new Date();
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  // ── Group wallets ────────────────────────────────────────────────────────
  // Parents: wallets with no parentId that have children
  // Children: wallets with a parentId
  // Standalone: wallets with no parentId and no children
  // Build child map and a single ordered list of top-level wallets
  // wallets is already sorted by sort_order from loadWallets()
  const { childrenByParent, topLevelWallets } = useMemo(() => {
    const childMap = {};
    wallets.forEach(w => {
      if (w.parentId != null) {
        if (!childMap[w.parentId]) childMap[w.parentId] = [];
        childMap[w.parentId].push(w);
      }
    });
    // Top-level = no parentId, already in sort_order from DB
    const topLevel = wallets.filter(w => w.parentId == null);
    return { childrenByParent: childMap, topLevelWallets: topLevel };
  }, [wallets]);

  // For totals: only count leaf wallets (children + standalone, not parent group wrappers)
  const leafWallets = useMemo(() => {
    const parentIds = new Set(Object.keys(childrenByParent).map(Number));
    return wallets.filter(w => !parentIds.has(w.id));
  }, [wallets, childrenByParent]);

  const totalBudget = leafWallets.reduce((s, w) => s + w.limit, 0);
  const totalSpent  = leafWallets.reduce((s, w) => s + w.spent, 0);
  const totalRem    = totalBudget - totalSpent;
  const overallPct  = totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const overWallets = leafWallets.filter(w => w.spent >= w.limit && w.billType !== 'fixed');

  const badgeText = overWallets.length ? '⚠️ Over limit' : overallPct >= 70 ? '⚡ Watch out' : '✓ On track';
  const badgeBg   = overWallets.length ? colors.redLight  : overallPct >= 70 ? colors.amberLight : colors.tealLight;
  const badgeColor= overWallets.length ? colors.red       : overallPct >= 70 ? colors.amber      : colors.teal;

  function openExpense(walletId = null) { setPreWalletId(walletId); setExpenseModal(true); }
  function applyMonth() { onMonthChange(`${MONTHS[selectedMonth]} ${selectedYear}`); setMonthPicker(false); }
  function toggleCollapse(id) { setCollapsed(prev => ({ ...prev, [id]: !prev[id] })); }

  if (detailWallet) {
    const liveWallet = wallets.find(w => w.id === detailWallet.id) ?? detailWallet;
    // For a parent wallet detail, also gather children transactions
    const childIds = (childrenByParent[liveWallet.id] ?? []).map(c => c.id);
    return (
      <WalletDetailScreen
        wallet={liveWallet}
        childWallets={childrenByParent[liveWallet.id] ?? []}
        transactions={transactions}
        currentMonth={currentMonth}
        currency={currency}
        onBack={() => setDetailWallet(null)}
        onAddExpense={(wid) => { setDetailWallet(null); setTimeout(() => openExpense(wid), 50); }}
      />
    );
  }

  if (manageVisible) {
    return (
      <ManageWalletsScreen
        wallets={wallets}
        onAddWallet={onAddWallet}
        onEditWallet={onEditWallet}
        onDeleteWallet={onDeleteWallet}
        onReorderWallets={onReorderWallets}
        onBack={() => setManageVisible(false)}
      />
    );
  }

  const hasWallets = wallets.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10, gap: 10 }}>
          <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }} onPress={onOpenDrawer}>
            <Text style={{ fontSize: 18, color: colors.text }}>☰</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setMonthPicker(true)}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.teal }}>{currentMonth} ▾</Text>
          </TouchableOpacity>
          <View style={{ borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: badgeBg }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: badgeColor }}>{badgeText}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 8 }}>Wallets</Text>

        {hasWallets && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.teal, borderRadius: radius.sm, padding: 14, marginTop: 10 }}>
              <View>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 }}>Remaining</Text>
                <Text style={{ fontSize: 26, fontWeight: '700', color: '#fff', marginTop: 1 }}>{sym}{totalRem.toFixed(0)}</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>of {sym}{totalBudget} budget</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 }}>Spent</Text>
                <Text style={{ fontSize: 26, fontWeight: '700', color: '#fff', marginTop: 1 }}>{sym}{totalSpent.toFixed(0)}</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>{overallPct}% used</Text>
              </View>
            </View>
            <View style={{ height: 4, backgroundColor: 'rgba(26,127,110,0.15)', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.min(overallPct, 100)}%`, backgroundColor: colors.teal, borderRadius: 99 }} />
            </View>
          </>
        )}
      </View>

      {/* Over-budget alert (flexible leaf wallets only) */}
      {overWallets.length > 0 && (
        <View style={{ backgroundColor: colors.redLight, borderLeftWidth: 3, borderLeftColor: colors.red, marginHorizontal: 14, marginTop: 10, borderRadius: 8, padding: 10 }}>
          <Text style={{ fontSize: 12, color: colors.red, fontWeight: '500' }}>
            ⚠️ Over budget: {overWallets.map(w => w.name).join(', ')}
          </Text>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={() => setManageVisible(true)}>
            <Text style={{ fontSize: 13, color: colors.teal, fontWeight: '600' }}>Manage ›</Text>
          </TouchableOpacity>
        </View>

        {!hasWallets ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 30 }}>
            <Text style={{ fontSize: 52, marginBottom: 16 }}>👜</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Create your first wallet</Text>
            <Text style={{ fontSize: 14, color: colors.text3, textAlign: 'center', marginBottom: 28, lineHeight: 20 }}>
              Wallets are budget categories. Set a monthly limit and track spending.
            </Text>
            <TouchableOpacity style={{ backgroundColor: colors.teal, borderRadius: radius.full, paddingHorizontal: 28, paddingVertical: 14 }} onPress={() => setManageVisible(true)}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>+ Add Wallet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Single ordered list — sort_order is preserved from DB */}
            {topLevelWallets.map(w => {
              const children = childrenByParent[w.id];
              if (children?.length) {
                return (
                  <ParentWalletCard
                    key={w.id}
                    wallet={w}
                    children={children}
                    sym={sym}
                    collapsed={!!collapsed[w.id]}
                    onToggleCollapse={() => toggleCollapse(w.id)}
                    onChildPress={(child) => setDetailWallet(child)}
                    onPress={() => setDetailWallet(w)}
                  />
                );
              }
              return (
                <WalletCard
                  key={w.id}
                  wallet={w}
                  sym={sym}
                  onPress={() => setDetailWallet(w)}
                  onLongPress={() => setManageVisible(true)}
                />
              );
            })}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[{ position: 'absolute', right: 20, bottom: 16, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }, shadow.lg]}
        onPress={() => openExpense(null)}
        activeOpacity={0.85}
      >
        <Text style={{ fontSize: 28, color: '#fff', lineHeight: 32 }}>＋</Text>
      </TouchableOpacity>

      {/* Month Picker */}
      <Modal visible={monthPicker} transparent animationType="fade" onRequestClose={() => setMonthPicker(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 }} activeOpacity={1} onPress={() => setMonthPicker(false)}>
          <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 22, width: '100%' }, shadow.lg]}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' }}>Select Month</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
              <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, borderRadius: 18 }}>
                <Text style={{ fontSize: 22, color: colors.teal, fontWeight: '700' }}>‹</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{selectedYear}</Text>
              <TouchableOpacity onPress={() => setSelectedYear(y => y + 1)} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, borderRadius: 18 }}>
                <Text style={{ fontSize: 22, color: colors.teal, fontWeight: '700' }}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {MONTHS.map((m, i) => (
                <TouchableOpacity key={m} style={{ width: '22%', paddingVertical: 10, borderRadius: radius.sm, backgroundColor: selectedMonth === i ? colors.teal : colors.surface2, alignItems: 'center' }} onPress={() => setSelectedMonth(i)}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: selectedMonth === i ? '#fff' : colors.text2 }}>{m.slice(0, 3)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={{ backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center' }} onPress={applyMonth}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Apply</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <AddExpenseModal
        visible={expenseModal}
        wallets={leafWallets}
        preWalletId={preWalletId}
        onClose={() => setExpenseModal(false)}
        onSubmit={onAddExpense}
        currency={currency}
        customTags={customTags || []}
        onCreateTag={onCreateTag || (() => {})}
        accounts={accounts || []}
      />
    </View>
  );
}
