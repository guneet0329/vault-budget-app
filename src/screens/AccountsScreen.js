import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Modal, Animated, Dimensions,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { radius } from '../theme';
import EmojiPicker from '../components/EmojiPicker';

const SCREEN_H = Dimensions.get('window').height;

// ── Account type definitions ──────────────────────────────────────────────────
const ACCOUNT_TYPES = [
  { val: 'chequing',   label: 'Chequing',   emoji: '🏦', desc: 'Everyday spending',      color: '#1a7f6e' },
  { val: 'savings',    label: 'Savings',     emoji: '🐖', desc: 'Emergency fund, savings', color: '#2d7d3a' },
  { val: 'credit',     label: 'Credit Card', emoji: '💳', desc: 'What you owe',            color: '#c0392b' },
  { val: 'investment', label: 'Investment',  emoji: '📈', desc: 'TFSA, RRSP, ETFs',        color: '#7b3f9e' },
  { val: 'cash',       label: 'Cash',        emoji: '💵', desc: 'Physical cash',           color: '#d4820a' },
];

function typeInfo(type) {
  return ACCOUNT_TYPES.find(t => t.val === type) ?? ACCOUNT_TYPES[0];
}

// ── Bottom sheet ──────────────────────────────────────────────────────────────
function BottomSheet({ visible, onClose, title, children, maxH }) {
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const anim   = useRef(new Animated.Value(SCREEN_H)).current;

  React.useEffect(() => {
    Animated.spring(anim, {
      toValue: visible ? 0 : SCREEN_H,
      useNativeDriver: true, damping: 24, stiffness: 200,
    }).start();
  }, [visible]);

  if (!visible) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingBottom: insets.bottom + 8,
          maxHeight: maxH ?? SCREEN_H * 0.92,
          transform: [{ translateY: anim }],
          ...shadow.lg,
        }}>
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

// ── Single account card ───────────────────────────────────────────────────────
function AccountCard({ account, sym, onPress, onLongPress }) {
  const { colors, shadow } = useTheme();
  const info     = typeInfo(account.type);
  const isCredit = account.type === 'credit';
  const balColor = isCredit ? colors.red : account.balance >= 0 ? colors.text : colors.red;

  return (
    <TouchableOpacity
      style={[{
        backgroundColor: colors.surface, borderRadius: radius.lg,
        marginBottom: 10, overflow: 'hidden', flexDirection: 'row',
      }, shadow.sm]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
    >
      {/* Left accent */}
      <View style={{ width: 4, backgroundColor: account.color ?? info.color }} />

      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Icon */}
          <View style={{ width: 42, height: 42, borderRadius: 12,
            backgroundColor: (account.color ?? info.color) + '22',
            alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20 }}>{account.emoji}</Text>
          </View>

          {/* Name + type */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{account.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <View style={{ backgroundColor: (account.color ?? info.color) + '22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: account.color ?? info.color }}>
                  {info.label.toUpperCase()}
                </Text>
              </View>
              {account.isDefault && (
                <View style={{ backgroundColor: colors.tealLight, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.teal }}>DEFAULT</Text>
                </View>
              )}
            </View>
          </View>

          {/* Balance */}
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: balColor }}>
              {isCredit ? '-' : ''}{sym}{Math.abs(account.balance).toFixed(0)}
            </Text>
            {isCredit && (
              <Text style={{ fontSize: 10, color: colors.text3, marginTop: 2 }}>outstanding</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AccountsScreen({
  accounts, transactions, currency,
  onAddAccount, onEditAccount, onDeleteAccount, onTransfer,
}) {
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  const sym = currency?.symbol || '$';

  // ── Add / Edit state ───────────────────────────────────────────────────────
  const [addSheet,    setAddSheet]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [aName,       setAName]       = useState('');
  const [aType,       setAType]       = useState('chequing');
  const [aEmoji,      setAEmoji]      = useState('🏦');
  const [aColor,      setAColor]      = useState('#1a7f6e');
  const [aBalance,    setABalance]    = useState('');
  const [aDefault,    setADefault]    = useState(false);

  // ── Transfer state ─────────────────────────────────────────────────────────
  const [transferSheet, setTransferSheet] = useState(false);
  const [fromId,        setFromId]        = useState(null);
  const [toId,          setToId]          = useState(null);
  const [tAmount,       setTAmount]       = useState('');
  const [tNote,         setTNote]         = useState('');

  // ── Net worth ──────────────────────────────────────────────────────────────
  const { netWorth, totalAssets, totalLiabilities } = useMemo(() => {
    const assets      = accounts.filter(a => a.type !== 'credit').reduce((s, a) => s + a.balance, 0);
    const liabilities = accounts.filter(a => a.type === 'credit').reduce((s, a) => s + Math.abs(a.balance), 0);
    return { netWorth: assets - liabilities, totalAssets: assets, totalLiabilities: liabilities };
  }, [accounts]);

  // Group accounts by type for display
  const grouped = useMemo(() => {
    const order = ['chequing', 'savings', 'investment', 'cash', 'credit'];
    return order
      .map(type => ({ type, items: accounts.filter(a => a.type === type) }))
      .filter(g => g.items.length > 0);
  }, [accounts]);

  function openAdd() {
    setEditTarget(null);
    setAName(''); setAType('chequing'); setAEmoji('🏦');
    setAColor('#1a7f6e'); setABalance(''); setADefault(false);
    setAddSheet(true);
  }

  function openEdit(account) {
    setEditTarget(account);
    setAName(account.name); setAType(account.type);
    setAEmoji(account.emoji); setAColor(account.color);
    setABalance(String(Math.abs(account.balance))); setADefault(account.isDefault);
    setAddSheet(true);
  }

  function handleSave() {
    if (!aName.trim()) return Alert.alert('Missing name', 'Please enter an account name.');
    const bal = parseFloat(aBalance) || 0;
    // Credit cards store balance as positive (what you owe) — we display with minus sign
    const finalBalance = aType === 'credit' ? Math.abs(bal) : bal;
    if (editTarget) {
      onEditAccount(editTarget.id, {
        name: aName.trim(), type: aType, emoji: aEmoji,
        color: aColor, balance: finalBalance, isDefault: aDefault,
      });
    } else {
      onAddAccount({
        name: aName.trim(), type: aType, emoji: aEmoji,
        color: aColor, balance: finalBalance, isDefault: aDefault,
      });
    }
    setAddSheet(false);
  }

  function handleDelete(account) {
    Alert.alert(
      'Delete Account',
      `Delete "${account.name}"? Transactions from this account won't be deleted but will lose their account link.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDeleteAccount(account.id) },
      ]
    );
  }

  function handleTransfer() {
    const amt = parseFloat(tAmount);
    if (!fromId || !toId) return Alert.alert('Select both accounts');
    if (fromId === toId) return Alert.alert('Pick different accounts');
    if (!amt || amt <= 0) return Alert.alert('Enter a valid amount');
    onTransfer({ fromAccountId: fromId, toAccountId: toId, amount: amt, note: tNote });
    setTAmount(''); setTNote(''); setFromId(null); setToId(null);
    setTransferSheet(false);
  }

  // Auto-set emoji and color when type changes
  function selectType(type) {
    setAType(type);
    const info = typeInfo(type);
    setAEmoji(info.emoji);
    setAColor(info.color);
  }

  const nwColor = netWorth >= 0 ? colors.teal : colors.red;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>

      {/* ── Header ── */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>Accounts</Text>
          <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>Your real money</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{ backgroundColor: colors.surface2, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 7 }}
            onPress={() => setTransferSheet(true)}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2 }}>⇄ Transfer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor: colors.tealLight, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 7 }}
            onPress={openAdd}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.teal }}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>

        {/* ── Net Worth Card ── */}
        <View style={[{ borderRadius: radius.lg, padding: 20, marginBottom: 16, overflow: 'hidden' }, shadow.sm, { backgroundColor: colors.surface }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Net Worth
          </Text>
          <Text style={{ fontSize: 42, fontWeight: '800', color: nwColor, marginBottom: 14 }}>
            {netWorth < 0 ? '-' : ''}{sym}{Math.abs(netWorth).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>

          {/* Assets vs Liabilities bar */}
          <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
            {totalAssets + totalLiabilities > 0 && (
              <View style={{
                height: '100%',
                width: `${Math.min((totalAssets / (totalAssets + totalLiabilities)) * 100, 100)}%`,
                backgroundColor: colors.teal, borderRadius: 99,
              }} />
            )}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 11, color: colors.text3 }}>Assets</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.teal }}>
                {sym}{totalAssets.toLocaleString('en-CA', { minimumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: colors.text3 }}>Liabilities</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.red }}>
                -{sym}{totalLiabilities.toLocaleString('en-CA', { minimumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Empty state ── */}
        {accounts.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 52, marginBottom: 16 }}>🏦</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>No accounts yet</Text>
            <Text style={{ fontSize: 14, color: colors.text3, textAlign: 'center', lineHeight: 21, paddingHorizontal: 20, marginBottom: 24 }}>
              Add your real bank accounts, credit cards, and investments to track your complete financial picture
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.teal, borderRadius: radius.full, paddingHorizontal: 24, paddingVertical: 12 }}
              onPress={openAdd}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>+ Add First Account</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Grouped account list ── */}
        {grouped.map(group => {
          const info = typeInfo(group.type);
          return (
            <View key={group.type} style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingHorizontal: 4 }}>
                {info.label}s
              </Text>
              {group.items.map(account => (
                <AccountCard
                  key={account.id}
                  account={account}
                  sym={sym}
                  onPress={() => openEdit(account)}
                  onLongPress={() => handleDelete(account)}
                />
              ))}
            </View>
          );
        })}

      </ScrollView>

      {/* ── Add / Edit Sheet ── */}
      <BottomSheet
        visible={addSheet}
        onClose={() => setAddSheet(false)}
        title={editTarget ? `Edit ${editTarget.name}` : 'New Account'}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">

            {/* Account type selector */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Account Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ACCOUNT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.val}
                    style={{
                      paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md,
                      backgroundColor: aType === t.val ? t.color + '22' : colors.surface2,
                      borderWidth: 1.5, borderColor: aType === t.val ? t.color : 'transparent',
                      alignItems: 'center', minWidth: 80,
                    }}
                    onPress={() => selectType(t.val)}
                  >
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>{t.emoji}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: aType === t.val ? t.color : colors.text3 }}>{t.label}</Text>
                    <Text style={{ fontSize: 9, color: aType === t.val ? t.color : colors.text3, opacity: 0.8, textAlign: 'center', marginTop: 2 }}>{t.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Credit card info */}
            {aType === 'credit' && (
              <View style={{ backgroundColor: colors.redLight, borderRadius: radius.sm, padding: 12, marginBottom: 16, flexDirection: 'row', gap: 8 }}>
                <Text>💳</Text>
                <Text style={{ fontSize: 12, color: colors.red, flex: 1, lineHeight: 17 }}>
                  Enter your current outstanding balance. This is what you owe — it will be shown as a liability and subtracted from your net worth.
                </Text>
              </View>
            )}

            {/* Investment info */}
            {aType === 'investment' && (
              <View style={{ backgroundColor: colors.purpleLight, borderRadius: radius.sm, padding: 12, marginBottom: 16, flexDirection: 'row', gap: 8 }}>
                <Text>📈</Text>
                <Text style={{ fontSize: 12, color: colors.purple, flex: 1, lineHeight: 17 }}>
                  Investment accounts build your net worth. Contributions are not counted as spending in your budget.
                </Text>
              </View>
            )}

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Account Name</Text>
            <TextInput
              style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 16 }}
              value={aName} onChangeText={setAName}
              placeholder={typeInfo(aType).label + ' Account'}
              placeholderTextColor={colors.text3}
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              {aType === 'credit' ? 'Outstanding Balance (what you owe)' : 'Current Balance'} ({sym})
            </Text>
            <TextInput
              style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' }}
              value={aBalance} onChangeText={setABalance}
              keyboardType="decimal-pad" placeholder="0.00"
              placeholderTextColor={colors.text3}
            />

            {/* Emoji picker */}
            <EmojiPicker selected={aEmoji} onSelect={setAEmoji} label="Icon" />

            {/* Default account toggle */}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 14, marginBottom: 20 }}
              onPress={() => setADefault(v => !v)}
            >
              <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: aDefault ? colors.teal : colors.border, alignItems: 'center', justifyContent: 'center' }}>
                {aDefault && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Default account</Text>
                <Text style={{ fontSize: 11, color: colors.text3, marginTop: 1 }}>New expenses will use this account by default</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center', marginBottom: 10 }}
              onPress={handleSave}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                {editTarget ? 'Save Changes' : 'Add Account'}
              </Text>
            </TouchableOpacity>

            {editTarget && (
              <TouchableOpacity
                style={{ borderWidth: 1.5, borderColor: colors.red, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center' }}
                onPress={() => { setAddSheet(false); setTimeout(() => handleDelete(editTarget), 300); }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.red }}>🗑 Delete Account</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </BottomSheet>

      {/* ── Transfer Sheet ── */}
      <BottomSheet visible={transferSheet} onClose={() => setTransferSheet(false)} title="Transfer Between Accounts" maxH={SCREEN_H * 0.75}>
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">

          {/* From account */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>From</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {accounts.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: fromId === a.id ? colors.tealLight : colors.surface2, borderWidth: 1.5, borderColor: fromId === a.id ? colors.teal : 'transparent', alignItems: 'center', minWidth: 90 }}
                  onPress={() => setFromId(a.id)}
                >
                  <Text style={{ fontSize: 18 }}>{a.emoji}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: fromId === a.id ? colors.teal : colors.text, marginTop: 3 }} numberOfLines={1}>{a.name}</Text>
                  <Text style={{ fontSize: 10, color: colors.text3, marginTop: 1 }}>{sym}{Math.abs(a.balance).toFixed(0)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* To account */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>To</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {accounts.filter(a => a.id !== fromId).map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: toId === a.id ? colors.tealLight : colors.surface2, borderWidth: 1.5, borderColor: toId === a.id ? colors.teal : 'transparent', alignItems: 'center', minWidth: 90 }}
                  onPress={() => setToId(a.id)}
                >
                  <Text style={{ fontSize: 18 }}>{a.emoji}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: toId === a.id ? colors.teal : colors.text, marginTop: 3 }} numberOfLines={1}>{a.name}</Text>
                  <Text style={{ fontSize: 10, color: colors.text3, marginTop: 1 }}>{sym}{Math.abs(a.balance).toFixed(0)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Amount ({sym})</Text>
          <TextInput
            style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' }}
            value={tAmount} onChangeText={setTAmount}
            keyboardType="decimal-pad" placeholder="0.00"
            placeholderTextColor={colors.text3}
          />

          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Note (optional)</Text>
          <TextInput
            style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 20 }}
            value={tNote} onChangeText={setTNote}
            placeholder="e.g. Pay credit card bill"
            placeholderTextColor={colors.text3}
          />

          {/* Summary */}
          {fromId && toId && tAmount ? (
            <View style={{ backgroundColor: colors.tealLight, borderRadius: radius.sm, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 13 }}>{accounts.find(a => a.id === fromId)?.emoji}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.teal }}>{accounts.find(a => a.id === fromId)?.name}</Text>
              <Text style={{ fontSize: 16, color: colors.teal }}>→</Text>
              <Text style={{ fontSize: 13 }}>{accounts.find(a => a.id === toId)?.emoji}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.teal, flex: 1 }}>{accounts.find(a => a.id === toId)?.name}</Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.teal }}>{sym}{parseFloat(tAmount).toFixed(2)}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={{ backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center' }}
            onPress={handleTransfer}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Transfer</Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>

    </View>
  );
}
