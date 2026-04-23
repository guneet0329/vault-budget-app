import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Modal, Animated, Dimensions, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { radius } from '../theme';
import EmojiPicker from '../components/EmojiPicker';

const SCREEN_H = Dimensions.get('window').height;

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
          maxHeight: maxH ?? SCREEN_H * 0.9,
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const exp  = new Date(y, m - 1, d);
  const now  = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((exp - now) / (1000 * 60 * 60 * 24));
}

function expiryLabel(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return null;
  if (days < 0)  return { text: 'Expired', color: 'red' };
  if (days === 0) return { text: 'Expires today!', color: 'red' };
  if (days <= 7)  return { text: `Expires in ${days}d`, color: 'amber' };
  if (days <= 30) return { text: `Expires in ${days}d`, color: 'amber' };
  return { text: `Expires ${dateStr}`, color: 'text3' };
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function GiftCardsScreen({ giftCards, currency, onAddCard, onUseCard, onDeleteCard }) {
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  const sym = currency?.symbol || '$';

  // Add card form
  const [addSheet,   setAddSheet]   = useState(false);
  const [gStore,     setGStore]     = useState('');
  const [gAmount,    setGAmount]    = useState('');
  const [gEmoji,     setGEmoji]     = useState('🎁');
  const [gExpiry,    setGExpiry]    = useState(''); // YYYY-MM-DD
  const [gNote,      setGNote]      = useState('');

  // Use card form
  const [useSheet,   setUseSheet]   = useState(false);
  const [useCard,    setUseCard]    = useState(null);
  const [useAmount,  setUseAmount]  = useState('');

  const active  = giftCards.filter(c => c.balance > 0 && daysUntil(c.expiry) !== null
    ? daysUntil(c.expiry) >= 0 : c.balance > 0);
  const expired = giftCards.filter(c => c.balance <= 0 || (c.expiry && daysUntil(c.expiry) < 0));

  const totalValue = active.reduce((s, c) => s + c.balance, 0);

  // Expiry alerts — cards expiring within 7 days
  const expiringSoon = active.filter(c => {
    const d = daysUntil(c.expiry);
    return d !== null && d >= 0 && d <= 7;
  });

  function saveCard() {
    const amt = parseFloat(gAmount);
    if (!gStore.trim() || !amt || amt <= 0) return;
    onAddCard({
      id:      `gc_${Date.now()}`,
      store:   gStore.trim(),
      emoji:   gEmoji,
      balance: amt,
      original: amt,
      expiry:  gExpiry || null,
      note:    gNote,
      createdAt: Date.now(),
    });
    setGStore(''); setGAmount(''); setGEmoji('🎁'); setGExpiry(''); setGNote('');
    setAddSheet(false);
  }

  function submitUse() {
    const amt = parseFloat(useAmount);
    if (!amt || amt <= 0 || !useCard) return;
    if (amt > useCard.balance) {
      Alert.alert('Too much', `Only ${sym}${useCard.balance.toFixed(2)} remaining on this card.`);
      return;
    }
    onUseCard(useCard.id, amt);
    setUseAmount('');
    setUseSheet(false);
  }

  function confirmDelete(card) {
    Alert.alert('Delete Card', `Remove "${card.store}" gift card?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDeleteCard(card.id) },
    ]);
  }

  function CardRow({ card }) {
    const pct     = card.original > 0 ? Math.round((card.balance / card.original) * 100) : 0;
    const expInfo = expiryLabel(card.expiry);
    const expColor = expInfo?.color === 'red'   ? colors.red
                   : expInfo?.color === 'amber' ? colors.amber
                   : colors.text3;
    const isExpired = card.balance <= 0 || (card.expiry && daysUntil(card.expiry) < 0);

    return (
      <View style={[{
        backgroundColor: colors.surface, borderRadius: radius.lg,
        marginBottom: 10, overflow: 'hidden', opacity: isExpired ? 0.55 : 1,
      }, shadow.sm]}>
        {/* Left colour bar — teal for active, grey for used/expired */}
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 4, backgroundColor: isExpired ? colors.border : colors.teal }} />
          <View style={{ flex: 1, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              {/* Emoji */}
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>{card.emoji}</Text>
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{card.store}</Text>
                {expInfo && (
                  <Text style={{ fontSize: 11, color: expColor, marginTop: 2, fontWeight: expInfo.color !== 'text3' ? '600' : '400' }}>
                    {expInfo.color === 'red' ? '⚠️ ' : expInfo.color === 'amber' ? '⏰ ' : ''}{expInfo.text}
                  </Text>
                )}
                {card.note ? <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2, fontStyle: 'italic' }}>{card.note}</Text> : null}
              </View>

              {/* Balance + actions */}
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: isExpired ? colors.text3 : colors.teal }}>
                  {sym}{card.balance.toFixed(0)}
                </Text>
                <Text style={{ fontSize: 10, color: colors.text3 }}>of {sym}{card.original.toFixed(0)}</Text>
                {!isExpired && (
                  <TouchableOpacity
                    style={{ backgroundColor: colors.tealLight, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4 }}
                    onPress={() => { setUseCard(card); setUseAmount(''); setUseSheet(true); }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.teal }}>Use</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Progress bar */}
            <View style={{ height: 5, backgroundColor: colors.border, borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${pct}%`, backgroundColor: isExpired ? colors.border : colors.teal, borderRadius: 99 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 10, color: colors.text3 }}>{pct}% remaining</Text>
              <TouchableOpacity onPress={() => confirmDelete(card)}>
                <Text style={{ fontSize: 10, color: colors.text3 }}>🗑 Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>Gift Cards</Text>
          <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>Don't let them go to waste</Text>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: colors.tealLight, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 7 }}
          onPress={() => setAddSheet(true)}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.teal }}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>

        {/* Total value card */}
        {giftCards.length > 0 && (
          <View style={[{ backgroundColor: colors.teal, borderRadius: radius.lg, padding: 18, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, shadow.sm]}>
            <View>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Available Balance</Text>
              <Text style={{ fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 4 }}>{sym}{totalValue.toFixed(0)}</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{active.length} active card{active.length !== 1 ? 's' : ''}</Text>
            </View>
            <Text style={{ fontSize: 48 }}>🎁</Text>
          </View>
        )}

        {/* Expiry warning banner */}
        {expiringSoon.length > 0 && (
          <View style={{ backgroundColor: colors.amberLight, borderLeftWidth: 3, borderLeftColor: colors.amber, borderRadius: radius.sm, padding: 12, marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.amber, marginBottom: 3 }}>
              ⏰ Use soon!
            </Text>
            <Text style={{ fontSize: 12, color: colors.amber }}>
              {expiringSoon.map(c => `${c.emoji} ${c.store} (${sym}${c.balance.toFixed(0)})`).join(' · ')}
            </Text>
          </View>
        )}

        {/* Active cards */}
        {active.length > 0 && (
          <>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingHorizontal: 4 }}>
              Active
            </Text>
            {active.map(c => <CardRow key={c.id} card={c} />)}
          </>
        )}

        {/* Used / expired */}
        {expired.length > 0 && (
          <>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 8, paddingHorizontal: 4 }}>
              Used / Expired
            </Text>
            {expired.map(c => <CardRow key={c.id} card={c} />)}
          </>
        )}

        {/* Empty state */}
        {giftCards.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 56, marginBottom: 16 }}>🎁</Text>
            <Text style={{ fontSize: 19, fontWeight: '700', color: colors.text, marginBottom: 8 }}>No gift cards yet</Text>
            <Text style={{ fontSize: 14, color: colors.text3, textAlign: 'center', lineHeight: 21, paddingHorizontal: 20 }}>
              Add cards so you never forget about them. Track the balance and get expiry reminders.
            </Text>
            <TouchableOpacity
              style={{ marginTop: 24, backgroundColor: colors.teal, borderRadius: radius.full, paddingHorizontal: 24, paddingVertical: 12 }}
              onPress={() => setAddSheet(true)}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>+ Add First Card</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Add Card sheet ── */}
      <BottomSheet visible={addSheet} onClose={() => setAddSheet(false)} title="Add Gift Card">
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <EmojiPicker selected={gEmoji} onSelect={setGEmoji} />

          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Store / Brand</Text>
          <TextInput
            style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 14 }}
            value={gStore} onChangeText={setGStore}
            placeholder="e.g. Amazon, Tim Hortons" placeholderTextColor={colors.text3}
          />

          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Balance ({sym})</Text>
          <TextInput
            style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 14, textAlign: 'center' }}
            value={gAmount} onChangeText={setGAmount}
            keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.text3}
            autoFocus
          />

          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Expiry Date <Text style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>(optional)</Text>
          </Text>
          <TextInput
            style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 14 }}
            value={gExpiry} onChangeText={setGExpiry}
            placeholder="YYYY-MM-DD  e.g. 2026-12-31" placeholderTextColor={colors.text3}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Note <Text style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>(optional)</Text>
          </Text>
          <TextInput
            style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 20 }}
            value={gNote} onChangeText={setGNote}
            placeholder="e.g. Birthday gift from Mom" placeholderTextColor={colors.text3}
          />

          <TouchableOpacity
            style={{ backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: 15, alignItems: 'center' }}
            onPress={saveCard}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save Gift Card</Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>

      {/* ── Use Card sheet ── */}
      <BottomSheet visible={useSheet} onClose={() => setUseSheet(false)} title={`Use — ${useCard?.store}`} maxH={SCREEN_H * 0.55}>
        <View style={{ padding: 20 }}>
          {/* Remaining balance */}
          <View style={{ backgroundColor: colors.tealLight, borderRadius: radius.md, padding: 14, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: colors.teal, fontWeight: '600' }}>Remaining balance</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.teal }}>{sym}{useCard?.balance.toFixed(2)}</Text>
          </View>

          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Amount spent ({sym})</Text>
          <TextInput
            style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 20, textAlign: 'center' }}
            value={useAmount} onChangeText={setUseAmount}
            keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.text3}
            autoFocus
          />

          {/* Quick: use full amount */}
          <TouchableOpacity
            style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center', marginBottom: 10 }}
            onPress={() => setUseAmount(String(useCard?.balance ?? ''))}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2 }}>
              Use full balance ({sym}{useCard?.balance.toFixed(2)})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: 15, alignItems: 'center' }}
            onPress={submitUse}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Record Use</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  );
}
