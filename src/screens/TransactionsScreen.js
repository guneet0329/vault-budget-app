import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Animated, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { radius } from '../theme';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SCREEN_H = Dimensions.get('window').height;

function getMonthBounds(monthStr) {
  const [mName, yr] = (monthStr ?? '').split(' ');
  const mi = MONTH_NAMES.indexOf(mName);
  const y  = parseInt(yr);
  if (mi === -1 || isNaN(y)) return { start: 0, end: Date.now() };
  return { start: new Date(y, mi, 1).getTime(), end: new Date(y, mi + 1, 0, 23, 59, 59).getTime() };
}

// Custom bottom-sheet component — no system dialogs
function BottomSheet({ visible, onClose, children, title }) {
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 200 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingBottom: insets.bottom + 8,
          transform: [{ translateY: slideAnim }],
          ...shadow.lg,
        }}>
          {/* Handle */}
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 99, alignSelf: 'center', marginTop: 12, marginBottom: 4 }} />
          {title && (
            <View style={{ paddingHorizontal: 22, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{title}</Text>
            </View>
          )}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function TransactionsScreen({
  wallets, transactions, currentMonth, currency,
  onDeleteTransaction, onUpdateTransaction,
}) {
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  const sym = currency?.symbol || '$';

  const [filterWallet, setFilterWallet] = useState(null); // null = all
  const [search,       setSearch]       = useState('');
  const [selected,     setSelected]     = useState(null); // transaction being acted on
  const [actionSheet,  setActionSheet]  = useState(false);
  const [editSheet,    setEditSheet]    = useState(false);
  const [walletPicker, setWalletPicker] = useState(false);

  // Edit form state
  const [editAmount,   setEditAmount]   = useState('');
  const [editDesc,     setEditDesc]     = useState('');
  const [editNote,     setEditNote]     = useState('');
  const [editWalletId, setEditWalletId] = useState(null);

  const { start, end } = getMonthBounds(currentMonth);
  const monthTxns = useMemo(
    () => transactions.filter(t => t.date >= start && t.date <= end),
    [transactions, currentMonth]
  );

  const filtered = useMemo(() => {
    let list = [...monthTxns];
    if (filterWallet !== null) list = list.filter(t => t.walletId === filterWallet);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => (t.desc || '').toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q));
    }
    return list;
  }, [monthTxns, filterWallet, search]);

  const total = filtered.reduce((s, t) => s + t.amount, 0);

  function openAction(t) {
    setSelected(t);
    setActionSheet(true);
  }

  function openEdit() {
    setActionSheet(false);
    setTimeout(() => {
      setEditAmount(String(selected.amount));
      setEditDesc(selected.desc || '');
      setEditNote(selected.note || '');
      setEditWalletId(selected.walletId);
      setEditSheet(true);
    }, 280);
  }

  function confirmDelete() {
    setActionSheet(false);
    setTimeout(() => {
      onDeleteTransaction(selected.id, selected.walletId, selected.amount);
      setSelected(null);
    }, 280);
  }

  function saveEdit() {
    const amt = parseFloat(editAmount);
    if (!amt || amt <= 0) return;
    onUpdateTransaction(selected.id, {
      amount:   amt,
      desc:     editDesc,
      note:     editNote,
      walletId: editWalletId,
      date:     selected.date,
      tags:     selected.tags,
    });
    setEditSheet(false);
    setSelected(null);
  }

  const selectedWallet   = wallets.find(w => w.id === selected?.walletId);
  const editWalletObj    = wallets.find(w => w.id === editWalletId);

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>Transactions</Text>
          <Text style={{ fontSize: 13, color: colors.text3 }}>{currentMonth}</Text>
        </View>

        {/* Search bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface2, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, gap: 8, marginBottom: 10 }}>
          <Text style={{ fontSize: 14, color: colors.text3 }}>🔍</Text>
          <TextInput
            style={{ flex: 1, fontSize: 14, color: colors.text }}
            placeholder="Search transactions..."
            placeholderTextColor={colors.text3}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ fontSize: 13, color: colors.text3 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Wallet filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, flexDirection: 'row' }}>
          <TouchableOpacity
            style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, backgroundColor: filterWallet === null ? colors.teal : colors.surface2 }}
            onPress={() => setFilterWallet(null)}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: filterWallet === null ? '#fff' : colors.text2 }}>All</Text>
          </TouchableOpacity>
          {wallets.map(w => (
            <TouchableOpacity
              key={w.id}
              style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, backgroundColor: filterWallet === w.id ? w.color : colors.surface2, flexDirection: 'row', alignItems: 'center', gap: 5 }}
              onPress={() => setFilterWallet(prev => prev === w.id ? null : w.id)}
            >
              <Text style={{ fontSize: 12 }}>{w.emoji}</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: filterWallet === w.id ? '#fff' : colors.text2 }}>{w.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Total summary bar */}
      <View style={{ backgroundColor: colors.surface2, paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12, color: colors.text3 }}>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.red }}>-{sym}{total.toFixed(2)}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 50 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>📋</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 }}>No transactions</Text>
            <Text style={{ fontSize: 13, color: colors.text3, textAlign: 'center' }}>
              {search ? 'No results for your search' : `Nothing logged in ${currentMonth} yet`}
            </Text>
          </View>
        ) : (
          <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }, shadow.sm]}>
            {filtered.map((t, i) => {
              const w = wallets.find(w => w.id === t.walletId);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: i < filtered.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                  onPress={() => openAction(t)}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: w ? w.color + '22' : colors.surface2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Text style={{ fontSize: 17 }}>{w?.emoji || '💸'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{t.desc || 'Expense'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 11, color: colors.text3 }}>{w?.name || 'Unassigned'}</Text>
                      {t.tags?.slice(0, 2).map(tag => (
                        <View key={tag} style={{ backgroundColor: colors.tealLight, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 10, color: colors.teal, fontWeight: '600' }}>{tag}</Text>
                        </View>
                      ))}
                      {t.isRecurring && <Text style={{ fontSize: 11 }}>🔄</Text>}
                    </View>
                    {t.note ? <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2, fontStyle: 'italic' }} numberOfLines={1}>{t.note}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.red }}>-{sym}{t.amount.toFixed(2)}</Text>
                    <Text style={{ fontSize: 10, color: colors.text3, marginTop: 2 }}>{formatDate(t.date)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Action bottom sheet ── */}
      <BottomSheet visible={actionSheet} onClose={() => setActionSheet(false)} title={selected?.desc || 'Transaction'}>
        <View style={{ padding: 16 }}>
          {/* Transaction summary */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface2, borderRadius: radius.md, padding: 14, marginBottom: 16 }}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: (selectedWallet?.color ?? colors.teal) + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18 }}>{selectedWallet?.emoji || '💸'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{selected?.desc || 'Expense'}</Text>
              <Text style={{ fontSize: 12, color: colors.text3 }}>{selectedWallet?.name || 'Unassigned'} · {selected ? formatDate(selected.date) : ''}</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.red }}>-{sym}{selected?.amount.toFixed(2)}</Text>
          </View>

          {/* Actions */}
          {[
            { icon: '✏️', label: 'Edit transaction',   sub: 'Change amount, description or wallet', onPress: openEdit,      color: colors.text },
            { icon: '🗑',  label: 'Delete transaction', sub: 'Remove and restore wallet balance',   onPress: confirmDelete,  color: colors.red  },
          ].map((action, i) => (
            <TouchableOpacity
              key={i}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border }}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>{action.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: action.color }}>{action.label}</Text>
                <Text style={{ fontSize: 12, color: colors.text3, marginTop: 1 }}>{action.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>

      {/* ── Edit bottom sheet ── */}
      <BottomSheet visible={editSheet} onClose={() => setEditSheet(false)} title="Edit Transaction">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            {/* Amount */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Amount ({sym})</Text>
            <TextInput
              style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 14, textAlign: 'center' }}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.text3}
            />

            {/* Description */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Description</Text>
            <TextInput
              style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 14 }}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="What was this for?"
              placeholderTextColor={colors.text3}
            />

            {/* Note */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Note</Text>
            <TextInput
              style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 14 }}
              value={editNote}
              onChangeText={setEditNote}
              placeholder="Optional note"
              placeholderTextColor={colors.text3}
            />

            {/* Wallet picker */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Wallet</Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}
              onPress={() => setWalletPicker(true)}
            >
              {editWalletObj ? (
                <>
                  <Text style={{ fontSize: 18 }}>{editWalletObj.emoji}</Text>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.teal }}>{editWalletObj.name}</Text>
                </>
              ) : (
                <Text style={{ flex: 1, fontSize: 15, color: colors.text3 }}>Unassigned</Text>
              )}
              <Text style={{ color: colors.text3 }}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: 15, alignItems: 'center', marginBottom: 8 }}
              onPress={saveEdit}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </BottomSheet>

      {/* ── Wallet reassign picker ── */}
      <BottomSheet visible={walletPicker} onClose={() => setWalletPicker(false)} title="Choose Wallet">
        <ScrollView style={{ maxHeight: SCREEN_H * 0.5 }} contentContainerStyle={{ padding: 14 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: editWalletId === null ? colors.tealLight : 'transparent', borderRadius: radius.md, marginBottom: 6 }}
            onPress={() => { setEditWalletId(null); setWalletPicker(false); }}
          >
            <Text style={{ fontSize: 18 }}>🚫</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: editWalletId === null ? colors.teal : colors.text2 }}>Unassigned</Text>
          </TouchableOpacity>
          {wallets.map(w => (
            <TouchableOpacity
              key={w.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: editWalletId === w.id ? colors.tealLight : 'transparent', borderRadius: radius.md, marginBottom: 6 }}
              onPress={() => { setEditWalletId(w.id); setWalletPicker(false); }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: w.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 17 }}>{w.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: editWalletId === w.id ? colors.teal : colors.text }}>{w.name}</Text>
                <Text style={{ fontSize: 11, color: colors.text3 }}>{sym}{(w.limit - w.spent).toFixed(0)} remaining</Text>
              </View>
              {editWalletId === w.id && <Text style={{ color: colors.teal, fontSize: 16 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}
