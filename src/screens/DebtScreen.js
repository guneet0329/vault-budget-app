import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { radius } from '../theme';

const SCREEN_H = Dimensions.get('window').height;

function BottomSheet({ visible, onClose, title, children }) {
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const anim   = React.useRef(new Animated.Value(SCREEN_H)).current;
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
          backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingBottom: insets.bottom + 8, maxHeight: SCREEN_H * 0.75,
          transform: [{ translateY: anim }], ...shadow.lg,
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

export default function DebtScreen({ debts, wallets, onAddDebt, onSettleDebt, onDeleteDebt, currency }) {
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  const sym = currency?.symbol || '$';

  const [modal,    setModal]    = useState(false);
  const [name,     setName]     = useState('');
  const [amount,   setAmount]   = useState('');
  const [type,     setType]     = useState('lent');
  const [note,     setNote]     = useState('');
  // wallet link — only meaningful for 'borrowed' (money you owe = future expense)
  const [linkedWalletId, setLinkedWalletId] = useState(null);
  const [walletPicker,   setWalletPicker]   = useState(false);

  const lent     = debts.filter(d => d.type === 'lent'     && !d.settled);
  const borrowed = debts.filter(d => d.type === 'borrowed' && !d.settled);
  const settled  = debts.filter(d => d.settled);

  const totalLent     = lent.reduce((s, d) => s + d.amount, 0);
  const totalBorrowed = borrowed.reduce((s, d) => s + d.amount, 0);

  function resetForm() {
    setName(''); setAmount(''); setType('lent'); setNote(''); setLinkedWalletId(null);
  }

  function save() {
    const amt = parseFloat(amount);
    if (!name.trim() || !amt) return Alert.alert('Fill in all fields');
    onAddDebt({
      id:       Date.now(),
      name:     name.trim(),
      amount:   amt,
      type,
      note,
      date:     Date.now(),
      settled:  false,
      walletId: type === 'borrowed' ? linkedWalletId : null,
    });
    resetForm();
    setModal(false);
  }

  function handleSettle(debt) {
    // For borrowed debts with a linked wallet, warn the user money will be deducted
    const w = wallets.find(w => w.id === debt.walletId);
    const walletNote = debt.type === 'borrowed' && w
      ? `\n\nThis will deduct ${sym}${debt.amount.toFixed(2)} from your "${w.name}" wallet.`
      : '';

    Alert.alert(
      'Settle Debt',
      `Mark ${debt.name}'s debt as settled?${walletNote}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Settle', onPress: () => onSettleDebt(debt.id) },
      ]
    );
  }

  const linkedWallet = wallets.find(w => w.id === linkedWalletId);

  function DebtCard({ debt }) {
    const isLent = debt.type === 'lent';
    const linkedW = wallets.find(w => w.id === debt.walletId);
    return (
      <View style={[{
        backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14,
        marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12,
        opacity: debt.settled ? 0.6 : 1,
      }, shadow.sm]}>
        <View style={{
          borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
          backgroundColor: isLent ? colors.blueLight : colors.redLight,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: isLent ? colors.blue : colors.red }}>
            {isLent ? 'LENT' : 'OWED'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{debt.name}</Text>
          {debt.note ? (
            <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>{debt.note}</Text>
          ) : null}
          {/* Show linked wallet for borrowed debts */}
          {!isLent && linkedW && !debt.settled && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Text style={{ fontSize: 11 }}>{linkedW.emoji}</Text>
              <Text style={{ fontSize: 11, color: colors.text3 }}>Charged to {linkedW.name}</Text>
            </View>
          )}
          <Text style={{ fontSize: 10, color: colors.text3, marginTop: 3 }}>
            {new Date(debt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: isLent ? colors.blue : colors.red }}>
            {isLent ? '+' : '-'}{sym}{debt.amount.toFixed(0)}
          </Text>
          {!debt.settled ? (
            <TouchableOpacity
              style={{ backgroundColor: colors.greenLight, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}
              onPress={() => handleSettle(debt)}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.green }}>Settle</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ fontSize: 11, color: colors.green, fontWeight: '600' }}>✓ Settled</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.surface, paddingHorizontal: 22, paddingVertical: 18,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <View>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>Debts</Text>
          <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>Money lent & borrowed</Text>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: colors.blueLight, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 7 }}
          onPress={() => setModal(true)}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.blue }}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
        {/* Summary cards */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: colors.blueLight, borderRadius: radius.lg, padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.blue }}>You're Owed</Text>
            <Text style={{ fontSize: 28, fontWeight: '700', color: colors.blue, marginTop: 4 }}>{sym}{totalLent.toFixed(0)}</Text>
            <Text style={{ fontSize: 11, color: colors.blue, marginTop: 2, opacity: 0.7 }}>{lent.length} people</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.redLight, borderRadius: radius.lg, padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.red }}>You Owe</Text>
            <Text style={{ fontSize: 28, fontWeight: '700', color: colors.red, marginTop: 4 }}>{sym}{totalBorrowed.toFixed(0)}</Text>
            <Text style={{ fontSize: 11, color: colors.red, marginTop: 2, opacity: 0.7 }}>{borrowed.length} people</Text>
          </View>
        </View>

        {lent.length > 0 && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10, marginTop: 4, paddingHorizontal: 4 }}>
              Money Lent
            </Text>
            {lent.map(d => <DebtCard key={d.id} debt={d} />)}
          </>
        )}
        {borrowed.length > 0 && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10, marginTop: 4, paddingHorizontal: 4 }}>
              Money Borrowed
            </Text>
            {borrowed.map(d => <DebtCard key={d.id} debt={d} />)}
          </>
        )}
        {settled.length > 0 && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10, marginTop: 4, paddingHorizontal: 4 }}>
              Settled
            </Text>
            {settled.map(d => <DebtCard key={d.id} debt={d} />)}
          </>
        )}

        {debts.length === 0 && (
          <View style={{ alignItems: 'center', padding: 50 }}>
            <Text style={{ fontSize: 52, marginBottom: 14 }}>🤝</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 }}>No debts tracked</Text>
            <Text style={{ fontSize: 14, color: colors.text3, textAlign: 'center' }}>
              Log money you lent to friends or borrowed from others
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Add debt modal ── */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 99, alignSelf: 'center', marginTop: 14 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>Log Debt</Text>
            <TouchableOpacity
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => { setModal(false); resetForm(); }}
            >
              <Text style={{ fontSize: 14, color: colors.text2 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {/* Type toggle */}
            <View style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 4, marginBottom: 20, gap: 4 }}>
              {[
                { val: 'lent',     label: '💸 I Lent Money' },
                { val: 'borrowed', label: '🤲 I Borrowed'   },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.val}
                  style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: type === opt.val ? colors.surface : 'transparent' }}
                  onPress={() => { setType(opt.val); setLinkedWalletId(null); }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: type === opt.val ? colors.teal : colors.text3 }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Person name */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Person's Name</Text>
            <TextInput
              style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 16 }}
              value={name} onChangeText={setName}
              placeholder="e.g. Alex" placeholderTextColor={colors.text3}
            />

            {/* Amount */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Amount ({sym})</Text>
            <TextInput
              style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 16 }}
              value={amount} onChangeText={setAmount}
              placeholder="0.00" placeholderTextColor={colors.text3}
              keyboardType="decimal-pad"
            />

            {/* Note */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Note (optional)</Text>
            <TextInput
              style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 16 }}
              value={note} onChangeText={setNote}
              placeholder="e.g. Dinner on Friday" placeholderTextColor={colors.text3}
            />

            {/* Wallet link — only for borrowed money */}
            {type === 'borrowed' && wallets.length > 0 && (
              <>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
                  Charge to Wallet (when settled)
                </Text>
                <Text style={{ fontSize: 12, color: colors.text3, marginBottom: 10, lineHeight: 17 }}>
                  When you settle this debt, the amount will be deducted from the chosen wallet automatically.
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: linkedWallet ? colors.teal : colors.border, borderRadius: radius.sm, padding: 14, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  onPress={() => setWalletPicker(true)}
                >
                  {linkedWallet ? (
                    <>
                      <Text style={{ fontSize: 18 }}>{linkedWallet.emoji}</Text>
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.teal }}>{linkedWallet.name}</Text>
                    </>
                  ) : (
                    <Text style={{ flex: 1, fontSize: 15, color: colors.text3 }}>Select a wallet (optional)</Text>
                  )}
                  <Text style={{ fontSize: 16, color: colors.text3 }}>›</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[{ backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center' }, shadow.sm]}
              onPress={save}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Log Debt</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Wallet picker bottom sheet ── */}
      <BottomSheet visible={walletPicker} onClose={() => setWalletPicker(false)} title="Charge to Wallet">
        <ScrollView contentContainerStyle={{ padding: 14 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: !linkedWalletId ? colors.tealLight : colors.surface, borderRadius: radius.md, marginBottom: 8, borderWidth: 1.5, borderColor: !linkedWalletId ? colors.teal : 'transparent' }}
            onPress={() => { setLinkedWalletId(null); setWalletPicker(false); }}
          >
            <Text style={{ fontSize: 18 }}>🚫</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: !linkedWalletId ? colors.teal : colors.text2 }}>No wallet</Text>
              <Text style={{ fontSize: 11, color: colors.text3, marginTop: 1 }}>Don't link to a wallet</Text>
            </View>
            {!linkedWalletId && <Text style={{ fontSize: 16, color: colors.teal }}>✓</Text>}
          </TouchableOpacity>
          {wallets.map(w => (
            <TouchableOpacity
              key={w.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: linkedWalletId === w.id ? colors.tealLight : colors.surface, borderRadius: radius.md, marginBottom: 8, borderWidth: 1.5, borderColor: linkedWalletId === w.id ? colors.teal : 'transparent' }}
              onPress={() => { setLinkedWalletId(w.id); setWalletPicker(false); }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: w.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>{w.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: linkedWalletId === w.id ? colors.teal : colors.text }}>{w.name}</Text>
                <Text style={{ fontSize: 12, color: colors.text3, marginTop: 1 }}>{sym}{(w.limit - w.spent).toFixed(0)} remaining</Text>
              </View>
              {linkedWalletId === w.id && <Text style={{ fontSize: 16, color: colors.teal }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}
