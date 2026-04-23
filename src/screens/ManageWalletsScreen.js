import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { radius, PALETTE } from '../theme';
import EmojiPicker from '../components/EmojiPicker';

export default function ManageWalletsScreen({
  wallets, onAddWallet, onEditWallet, onDeleteWallet, onReorderWallets, onBack,
}) {
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();

  const [reorderMode,  setReorderMode]  = useState(false);
  const [modal,        setModal]        = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [name,         setName]         = useState('');
  const [limit,        setLimit]        = useState('');
  const [emoji,        setEmoji]        = useState('🛒');
  const [color,        setColor]        = useState(PALETTE[0]);
  const [billType,     setBillType]     = useState('flexible');
  const [parentId,     setParentId]     = useState(null);
  const [parentPicker, setParentPicker] = useState(false);

  const topLevel     = wallets.filter(w => w.parentId == null);
  const parentOptions= topLevel.filter(w => editTarget ? w.id !== editTarget.id : true);
  const selectedParent = wallets.find(w => w.id === parentId);

  const childMap = {};
  wallets.filter(w => w.parentId != null).forEach(w => {
    if (!childMap[w.parentId]) childMap[w.parentId] = [];
    childMap[w.parentId].push(w);
  });

  function openAdd() {
    setEditTarget(null);
    setName(''); setLimit(''); setEmoji('🛒');
    setColor(PALETTE[0]); setBillType('flexible'); setParentId(null);
    setModal(true);
  }
  function openEdit(w) {
    setEditTarget(w);
    setName(w.name); setLimit(String(w.limit));
    setEmoji(w.emoji); setColor(w.color);
    setBillType(w.billType ?? 'flexible');
    setParentId(w.parentId ?? null);
    setModal(true);
  }
  function handleSave() {
    const trimmed = name.trim();
    const lim     = parseFloat(limit) || 0;
    const hasChildren = wallets.some(w => w.parentId === editTarget?.id);
    if (!trimmed) return Alert.alert('Missing name', 'Please enter a wallet name.');
    if (!hasChildren && lim <= 0)
      return Alert.alert('Invalid limit', 'Please enter a monthly limit greater than 0.');
    if (editTarget) {
      onEditWallet(editTarget.id, { name: trimmed, limit: lim, emoji, color, billType, parentId });
    } else {
      onAddWallet({ name: trimmed, limit: lim, emoji, color, billType, parentId });
    }
    setModal(false);
  }
  function handleDelete(w) {
    const children = wallets.filter(c => c.parentId === w.id);
    const msg = children.length > 0
      ? `Delete "${w.name}" and its ${children.length} sub-wallet${children.length > 1 ? 's' : ''}? All transactions will be removed.`
      : `Delete "${w.name}"? All its transactions will be removed.`;
    Alert.alert('Delete Wallet', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDeleteWallet(w.id) },
    ]);
  }

  // Move top-level wallet up or down, children follow their parent automatically
  function moveWallet(index, direction) {
    const list   = [...topLevel];
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= list.length) return;
    [list[index], list[newIdx]] = [list[newIdx], list[index]];
    const fullOrder = [];
    list.forEach(parent => {
      fullOrder.push(parent.id);
      (childMap[parent.id] ?? []).forEach(child => fullOrder.push(child.id));
    });
    onReorderWallets(fullOrder);
  }

  function WalletRow({ w, index, totalCount }) {
    const isFixed  = w.billType === 'fixed';
    const isParent = !!(childMap[w.id]?.length);
    const children = childMap[w.id] ?? [];
    const showLim  = isParent ? children.reduce((s, c) => s + c.limit, 0) : w.limit;
    const showSpent= isParent ? children.reduce((s, c) => s + c.spent, 0) : w.spent;
    const showPct  = showLim > 0 ? Math.min(Math.round((showSpent / showLim) * 100), 100) : 0;
    const barColor = isFixed
      ? (showPct >= 100 ? colors.amber : w.color)
      : (showPct >= 90 ? colors.red : showPct >= 70 ? colors.amber : w.color);

    return (
      <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: 10, overflow: 'hidden', flexDirection: 'row' }, shadow.sm]}>
        <View style={{ width: 4, backgroundColor: w.color }} />
        <View style={{ flex: 1, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: w.color + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18 }}>{w.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{w.name}</Text>
                {isFixed && (
                  <View style={{ backgroundColor: colors.amberLight, borderRadius: 99, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 8, fontWeight: '700', color: colors.amber }}>FIXED</Text>
                  </View>
                )}
                {isParent && (
                  <View style={{ backgroundColor: colors.surface2, borderRadius: 99, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 8, fontWeight: '700', color: colors.text3 }}>GROUP · {children.length}</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 11, color: colors.text3, marginTop: 1 }}>
                ${showSpent.toFixed(0)} of ${showLim} · {showPct}%
              </Text>
            </View>

            {reorderMode ? (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: index === 0 ? colors.surface2 : colors.tealLight, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => moveWallet(index, -1)}
                  disabled={index === 0}
                >
                  <Text style={{ fontSize: 18, color: index === 0 ? colors.text3 : colors.teal }}>↑</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: index === totalCount - 1 ? colors.surface2 : colors.tealLight, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => moveWallet(index, 1)}
                  disabled={index === totalCount - 1}
                >
                  <Text style={{ fontSize: 18, color: index === totalCount - 1 ? colors.text3 : colors.teal }}>↓</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity onPress={() => openEdit(w)} style={{ backgroundColor: colors.blueLight, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.blue }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(w)} style={{ backgroundColor: colors.redLight, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.red }}>Del</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${showPct}%`, backgroundColor: barColor, borderRadius: 99 }} />
          </View>

          {!reorderMode && isParent && children.map(child => (
            <View key={child.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: colors.border }}>
              <Text style={{ fontSize: 14 }}>{child.emoji}</Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text2, flex: 1 }}>{child.name}</Text>
              <TouchableOpacity onPress={() => openEdit(child)} style={{ backgroundColor: colors.blueLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.blue }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(child)} style={{ backgroundColor: colors.redLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.red }}>Del</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 22, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <TouchableOpacity
          onPress={reorderMode ? () => setReorderMode(false) : onBack}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 18, color: colors.text }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, flex: 1 }}>
          {reorderMode ? 'Reorder Wallets' : 'Manage Wallets'}
        </Text>
        {!reorderMode && (
          <TouchableOpacity
            style={{ backgroundColor: colors.surface2, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 7, marginRight: 6 }}
            onPress={() => setReorderMode(true)}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2 }}>⇅ Reorder</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{ backgroundColor: colors.tealLight, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 7 }}
          onPress={reorderMode ? () => setReorderMode(false) : openAdd}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.teal }}>
            {reorderMode ? 'Done' : '+ New'}
          </Text>
        </TouchableOpacity>
      </View>

      {reorderMode && (
        <View style={{ backgroundColor: colors.tealLight, paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 14 }}>↕️</Text>
          <Text style={{ fontSize: 13, color: colors.teal, fontWeight: '500' }}>Tap ↑ ↓ to move wallets up or down</Text>
        </View>
      )}

      {wallets.length === 0 ? (
        <View style={{ alignItems: 'center', padding: 60 }}>
          <Text style={{ fontSize: 52, marginBottom: 14 }}>👜</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 24 }}>No wallets yet</Text>
          <TouchableOpacity style={{ backgroundColor: colors.teal, borderRadius: radius.full, paddingHorizontal: 24, paddingVertical: 12 }} onPress={openAdd}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>+ Create First Wallet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
          {topLevel.map((w, index) => (
            <WalletRow key={w.id} w={w} index={index} totalCount={topLevel.length} />
          ))}
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 99, alignSelf: 'center', marginTop: 14 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{editTarget ? 'Edit Wallet' : 'New Wallet'}</Text>
              <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }} onPress={() => setModal(false)}>
                <Text style={{ fontSize: 14, color: colors.text2 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color + '22', borderRadius: radius.lg, padding: 16, marginBottom: 22, borderLeftWidth: 4, borderLeftColor: color }}>
                <Text style={{ fontSize: 28 }}>{emoji}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color }}>{name || 'Wallet Name'}</Text>
                    {billType === 'fixed' && <View style={{ backgroundColor: colors.amberLight, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, fontWeight: '700', color: colors.amber }}>📌 FIXED</Text></View>}
                    {parentId && <View style={{ backgroundColor: colors.tealLight, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, fontWeight: '700', color: colors.teal }}>nested</Text></View>}
                  </View>
                  <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>
                    {parentId ? `inside ${selectedParent?.name ?? ''}` : limit ? `$${limit} / month` : 'no limit set'}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Group (optional)</Text>
              <TouchableOpacity style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: parentId ? colors.teal : colors.border, borderRadius: radius.sm, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => setParentPicker(true)}>
                {selectedParent ? <><Text style={{ fontSize: 18 }}>{selectedParent.emoji}</Text><Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.teal }}>{selectedParent.name}</Text></> : <Text style={{ flex: 1, fontSize: 15, color: colors.text3 }}>No group — standalone</Text>}
                <Text style={{ color: colors.text3 }}>›</Text>
              </TouchableOpacity>

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Name</Text>
              <TextInput style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 16 }} value={name} onChangeText={setName} placeholder={parentId ? 'e.g. WiFi' : 'e.g. Utilities'} placeholderTextColor={colors.text3} />

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Monthly Limit ($)</Text>
              {parentId && <Text style={{ fontSize: 12, color: colors.text3, marginBottom: 8 }}>The group total auto-sums from its members.</Text>}
              <TextInput style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 16 }} value={limit} onChangeText={setLimit} placeholder={parentId ? 'e.g. 60' : 'e.g. 300'} placeholderTextColor={colors.text3} keyboardType="decimal-pad" />

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Wallet Type</Text>
              <View style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 4, marginBottom: 8, gap: 4 }}>
                {[{ val: 'flexible', label: '🎯 Flexible', desc: 'Day-to-day spending' }, { val: 'fixed', label: '📌 Fixed', desc: 'Set recurring cost' }].map(opt => (
                  <TouchableOpacity key={opt.val} style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', borderRadius: 8, backgroundColor: billType === opt.val ? colors.surface : 'transparent' }} onPress={() => setBillType(opt.val)}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: billType === opt.val ? colors.teal : colors.text3 }}>{opt.label}</Text>
                    <Text style={{ fontSize: 9, color: billType === opt.val ? colors.teal : colors.text3, marginTop: 2, opacity: 0.85 }}>{opt.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {billType === 'fixed' && (
                <View style={{ backgroundColor: colors.amberLight, borderRadius: radius.sm, padding: 10, marginBottom: 16, flexDirection: 'row', gap: 8 }}>
                  <Text>📌</Text>
                  <Text style={{ fontSize: 12, color: colors.amber, flex: 1, lineHeight: 17 }}>Fixed wallets won't show red over-budget warnings.</Text>
                </View>
              )}

              <EmojiPicker selected={emoji} onSelect={setEmoji} />

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Color</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
                {PALETTE.map(c => (
                  <TouchableOpacity key={c} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: colors.text }} onPress={() => setColor(c)} />
                ))}
              </View>

              <TouchableOpacity style={{ backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center', marginBottom: 10 }} onPress={handleSave}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{editTarget ? 'Save Changes' : 'Create Wallet'}</Text>
              </TouchableOpacity>
              {editTarget && (
                <TouchableOpacity style={{ borderWidth: 1.5, borderColor: colors.red, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center' }} onPress={() => { setModal(false); setTimeout(() => handleDelete(editTarget), 300); }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.red }}>🗑  Delete This Wallet</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Parent picker */}
      <Modal visible={parentPicker} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setParentPicker(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 99, alignSelf: 'center', marginTop: 14 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Choose Group</Text>
            <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }} onPress={() => setParentPicker(false)}>
              <Text style={{ fontSize: 14, color: colors.text2 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 14 }}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: parentId === null ? colors.tealLight : colors.surface, borderRadius: radius.md, marginBottom: 8, borderWidth: 1.5, borderColor: parentId === null ? colors.teal : 'transparent' }} onPress={() => { setParentId(null); setParentPicker(false); }}>
              <Text style={{ fontSize: 18 }}>🚫</Text>
              <View style={{ flex: 1 }}><Text style={{ fontSize: 15, fontWeight: '600', color: parentId === null ? colors.teal : colors.text2 }}>No group</Text><Text style={{ fontSize: 11, color: colors.text3 }}>Standalone wallet</Text></View>
              {parentId === null && <Text style={{ color: colors.teal }}>✓</Text>}
            </TouchableOpacity>
            {parentOptions.map(w => (
              <TouchableOpacity key={w.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: parentId === w.id ? colors.tealLight : colors.surface, borderRadius: radius.md, marginBottom: 8, borderWidth: 1.5, borderColor: parentId === w.id ? colors.teal : 'transparent' }} onPress={() => { setParentId(w.id); setParentPicker(false); }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: w.color + '22', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 18 }}>{w.emoji}</Text></View>
                <View style={{ flex: 1 }}><Text style={{ fontSize: 15, fontWeight: '600', color: parentId === w.id ? colors.teal : colors.text }}>{w.name}</Text><Text style={{ fontSize: 11, color: colors.text3 }}>Group wallet</Text></View>
                {parentId === w.id && <Text style={{ color: colors.teal }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
