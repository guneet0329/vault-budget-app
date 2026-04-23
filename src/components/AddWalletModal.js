import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Modal, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { radius, PALETTE, EMOJIS } from '../theme';

export default function AddWalletModal({ visible, onClose, onSave, onDelete, editWallet }) {
  const { colors, shadow } = useTheme();

  const [name,     setName]     = useState('');
  const [limit,    setLimit]    = useState('');
  const [emoji,    setEmoji]    = useState('🛒');
  const [color,    setColor]    = useState(PALETTE[0]);
  const [billType, setBillType] = useState('flexible');

  useEffect(() => {
    if (editWallet) {
      setName(editWallet.name);
      setLimit(String(editWallet.limit));
      setEmoji(editWallet.emoji);
      setColor(editWallet.color);
      setBillType(editWallet.billType ?? 'flexible');
    } else {
      setName(''); setLimit(''); setEmoji('🛒'); setColor(PALETTE[0]); setBillType('flexible');
    }
  }, [editWallet, visible]);

  function handleSave() {
    if (!name.trim()) return Alert.alert('Missing name', 'Please enter a wallet name.');
    const lim = parseFloat(limit);
    if (!lim || lim <= 0) return Alert.alert('Invalid limit', 'Please enter a valid monthly limit.');
    onSave({ name: name.trim(), limit: lim, emoji, color, billType });
    onClose();
  }

  function handleDelete() {
    Alert.alert('Delete Wallet', `Delete "${editWallet?.name}" and all its data?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { onDelete(editWallet.id); onClose(); } },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
          <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.drag} />
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: colors.text }]}>{editWallet ? 'Edit Wallet' : 'New Wallet'}</Text>
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.surface2 }]} onPress={onClose}>
                <Text style={[styles.closeText, { color: colors.text2 }]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {/* Preview */}
            <View style={[styles.preview, { backgroundColor: color + '22' }]}>
              <View style={[styles.previewIcon, { backgroundColor: color + '33' }]}>
                <Text style={styles.previewEmoji}>{emoji}</Text>
              </View>
              <View style={[styles.previewAccent, { backgroundColor: color }]} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.previewName, { color }]}>{name || 'Wallet Name'}</Text>
                  {billType === 'fixed' && (
                    <View style={{ backgroundColor: colors.amberLight, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: colors.amber }}>📌 FIXED</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.previewLimit, { color: colors.text3 }]}>${limit || '0'} / month</Text>
              </View>
            </View>

            <Text style={[styles.label, { color: colors.text3 }]}>Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={name} onChangeText={setName}
              placeholder="e.g. Rent" placeholderTextColor={colors.text3}
            />

            <Text style={[styles.label, { color: colors.text3 }]}>Monthly Limit ($)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={limit} onChangeText={setLimit}
              placeholder="e.g. 1200" placeholderTextColor={colors.text3}
              keyboardType="decimal-pad"
            />

            {/* Bill type toggle */}
            <Text style={[styles.label, { color: colors.text3 }]}>Wallet Type</Text>
            <View style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 4, marginBottom: 20, gap: 4 }}>
              {[
                { val: 'flexible', label: '🎯 Flexible',   sub: 'Daily spending (food, fun)'   },
                { val: 'fixed',    label: '📌 Fixed Bill', sub: 'Set recurring cost (rent, phone)' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.val}
                  style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', borderRadius: 8, backgroundColor: billType === opt.val ? colors.surface : 'transparent' }}
                  onPress={() => setBillType(opt.val)}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: billType === opt.val ? colors.teal : colors.text3 }}>
                    {opt.label}
                  </Text>
                  <Text style={{ fontSize: 10, color: billType === opt.val ? colors.teal : colors.text3, marginTop: 2, textAlign: 'center', opacity: 0.8 }}>
                    {opt.sub}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {billType === 'fixed' && (
              <View style={{ backgroundColor: colors.amberLight, borderRadius: radius.sm, padding: 12, marginBottom: 16, flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 14 }}>📌</Text>
                <Text style={{ fontSize: 12, color: colors.amber, flex: 1, lineHeight: 17 }}>
                  Fixed wallets won't show red over-budget warnings. The full amount auto-deducts each month on Reset.
                </Text>
              </View>
            )}

            <Text style={[styles.label, { color: colors.text3 }]}>Icon</Text>
            <View style={styles.emojiGrid}>
              {EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, { backgroundColor: colors.surface2, borderColor: emoji === e ? colors.teal : 'transparent' }, emoji === e && { backgroundColor: colors.tealLight }]}
                  onPress={() => setEmoji(e)}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.text3 }]}>Color</Text>
            <View style={styles.colorRow}>
              {PALETTE.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.teal }, shadow.sm]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Wallet</Text>
            </TouchableOpacity>

            {editWallet && (
              <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.border }]} onPress={handleDelete}>
                <Text style={[styles.deleteBtnText, { color: colors.red }]}>🗑  Delete Wallet</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  header:           { borderBottomWidth: 1, paddingBottom: 14 },
  drag:             { width: 40, height: 4, backgroundColor: '#dde5e2', borderRadius: 99, alignSelf: 'center', marginTop: 14 },
  headerRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, marginTop: 14 },
  title:            { fontSize: 22, fontWeight: '700' },
  closeBtn:         { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeText:        { fontSize: 14 },
  body:             { padding: 22, paddingBottom: 48 },
  label:            { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  input:            { borderWidth: 1.5, borderRadius: radius.sm, padding: 12, fontSize: 15, marginBottom: 16 },
  preview:          { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, padding: 16, marginBottom: 20, overflow: 'hidden' },
  previewAccent:    { width: 4, height: 40, borderRadius: 2 },
  previewIcon:      { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  previewEmoji:     { fontSize: 22 },
  previewName:      { fontSize: 16, fontWeight: '700' },
  previewLimit:     { fontSize: 12, marginTop: 2 },
  emojiGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  emojiBtn:         { width: 44, height: 44, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  emojiText:        { fontSize: 22 },
  colorRow:         { flexDirection: 'row', gap: 10, marginBottom: 24, flexWrap: 'wrap' },
  colorDot:         { width: 30, height: 30, borderRadius: 15 },
  colorDotSelected: { borderWidth: 3, borderColor: '#1a2520' },
  saveBtn:          { borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center' },
  saveBtnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn:        { marginTop: 10, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5 },
  deleteBtnText:    { fontSize: 15, fontWeight: '600' },
});
