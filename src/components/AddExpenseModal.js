import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Modal, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Image, Alert,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useTheme } from '../ThemeContext';
import SplitPanel from './SplitPanel';
import { QUICK_AMOUNTS, radius } from '../theme';

const NUMPAD = [['7','8','9'],['4','5','6'],['1','2','3'],['.','0','⌫']];

const RECURRENCE_OPTIONS = [
  { value: 'once',    label: 'One-time',  desc: 'Log once, no repeat' },
  { value: 'daily',   label: 'Daily',     desc: 'Auto-deduct every day' },
  { value: 'weekly',  label: 'Weekly',    desc: 'Auto-deduct every week' },
  { value: 'monthly', label: 'Monthly',   desc: 'Auto-deduct every month' },
];

// Format a Date to "Wed, Apr 2" style
function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Simple inline date picker (no native dependency needed)
function InlineDatePicker({ selectedDate, onSelect, colors }) {
  const today = new Date();
  // Build last 30 days options
  const options = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    options.push(d);
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 2, paddingVertical: 4 }}>
        {options.map((d, i) => {
          const isSelected = d.toDateString() === selectedDate.toDateString();
          const isToday = i === 0;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => onSelect(d)}
              style={{
                alignItems: 'center',
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: radius.sm,
                backgroundColor: isSelected ? colors.teal : colors.surface2,
                borderWidth: 1.5,
                borderColor: isSelected ? colors.teal : 'transparent',
                minWidth: 64,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '600', color: isSelected ? 'rgba(255,255,255,0.8)' : colors.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: isSelected ? '#fff' : colors.text, marginTop: 2 }}>
                {d.getDate()}
              </Text>
              <Text style={{ fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.7)' : colors.text3, marginTop: 1 }}>
                {d.toLocaleDateString('en-US', { month: 'short' })}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// Custom tag creator + picker
function TagSection({ selectedTags, onTagsChange, customTags, onCreateTag, colors }) {
  const [creating, setCreating]   = useState(false);
  const [newTag,   setNewTag]     = useState('');
  const TAG_COLORS = ['#1a7f6e','#1e4d8c','#2d7d3a','#7b3f9e','#c0392b','#d4820a','#0d7ebe'];
  const [tagColor, setTagColor]   = useState(TAG_COLORS[0]);

  function toggleTag(tag) {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  }

  function handleCreate() {
    const name = newTag.trim().replace(/^#/, '');
    if (!name) return;
    const fullTag = `#${name}`;
    onCreateTag(fullTag, tagColor);
    onTagsChange([...selectedTags, fullTag]);
    setNewTag('');
    setCreating(false);
  }

  const allTags = customTags.map(t => t.name);

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase' }}>Tags</Text>
        <TouchableOpacity onPress={() => setCreating(v => !v)}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.teal }}>+ New Tag</Text>
        </TouchableOpacity>
      </View>

      {creating && (
        <View style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, marginBottom: 10 }}>
          <TextInput
            style={{ backgroundColor: colors.surface, borderRadius: 8, padding: 10, fontSize: 14, color: colors.text, marginBottom: 8 }}
            value={newTag}
            onChangeText={setNewTag}
            placeholder="Tag name (e.g. dinner)"
            placeholderTextColor={colors.text3}
            autoFocus
          />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            {TAG_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setTagColor(c)}
                style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c, borderWidth: tagColor === c ? 3 : 0, borderColor: colors.text }}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: colors.teal, borderRadius: 8, paddingVertical: 9, alignItems: 'center' }}
              onPress={handleCreate}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
              onPress={() => { setCreating(false); setNewTag(''); }}
            >
              <Text style={{ color: colors.text2, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {allTags.length === 0 && !creating ? (
        <View style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: colors.text3 }}>No tags yet — tap "+ New Tag" to create one</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {allTags.map(tag => {
            const tagObj = customTags.find(t => t.name === tag);
            const isSelected = selectedTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag)}
                style={{
                  paddingVertical: 7, paddingHorizontal: 12,
                  borderRadius: 99,
                  backgroundColor: isSelected ? (tagObj?.color || colors.teal) + '22' : colors.surface2,
                  borderWidth: 1.5,
                  borderColor: isSelected ? (tagObj?.color || colors.teal) : 'transparent',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? (tagObj?.color || colors.teal) : colors.text2 }}>
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function AddExpenseModal({
  visible, wallets, onClose, onSubmit, preWalletId, currency, customTags = [], onCreateTag,
}) {
  const { colors, shadow } = useTheme();

  const [amountStr,  setAmountStr]  = useState('0');
  const [desc,       setDesc]       = useState('');
  const [mode,       setMode]       = useState('single');
  const [selectedId, setSelectedId] = useState(preWalletId || null);
  const [splits,     setSplits]     = useState([]);
  const [tags,       setTags]       = useState([]);
  const [photo,      setPhoto]      = useState(null);
  const [recurrence, setRecurrence] = useState('once');
  const [note,       setNote]       = useState('');
  const [useTyping,  setUseTyping]  = useState(false);
  const [txnDate,    setTxnDate]    = useState(new Date());
  const amountRef = useRef(null);

  const total = parseFloat(amountStr) || 0;
  const sym   = currency?.symbol || '$';

  function numPress(key) {
    if (key === '⌫') { setAmountStr(s => s.length > 1 ? s.slice(0, -1) : '0'); return; }
    if (key === '.' && amountStr.includes('.')) return;
    const parts = amountStr.split('.');
    if (parts[1] && parts[1].length >= 2) return;
    setAmountStr(s => s === '0' && key !== '.' ? key : s + key);
  }

  function handleTypedAmount(text) {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmountStr(cleaned || '0');
  }

  function pickPhoto() {
    Alert.alert('Attach Receipt', 'Choose source', [
      { text: '📷  Camera', onPress: () => launchCamera({ mediaType: 'photo', quality: 0.7, saveToPhotos: false }, r => { if (r.assets?.[0]?.uri) setPhoto(r.assets[0].uri); else if (r.errorCode) Alert.alert('Camera Error', 'Check camera permission in Settings.'); }) },
      { text: '🖼️  Gallery', onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, r => { if (r.assets?.[0]?.uri) setPhoto(r.assets[0].uri); }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function reset() {
    setAmountStr('0'); setDesc(''); setMode('single');
    setSelectedId(preWalletId || null); setSplits([]);
    setTags([]); setPhoto(null); setRecurrence('once');
    setNote(''); setUseTyping(false); setTxnDate(new Date());
  }

  function handleClose() { reset(); onClose(); }

  function handleSubmit() {
    if (total <= 0) { Alert.alert('Enter an amount'); return; }
    // Use the selected date but keep current time
    const dateTs = new Date(txnDate);
    dateTs.setHours(new Date().getHours(), new Date().getMinutes(), new Date().getSeconds());
    const extra = { tags, note, photo, frequency: recurrence, date: dateTs.getTime() };

    if (mode === 'single') {
      onSubmit([{ walletId: selectedId, amount: total }], desc, extra);
    } else {
      const valid = splits.filter(s => s.amount > 0);
      if (!valid.length) { Alert.alert('Set split amounts'); return; }
      const allocated = valid.reduce((s, r) => s + r.amount, 0);
      if (Math.abs(allocated - total) > 0.01) { Alert.alert('Split mismatch', `Allocated ${sym}${allocated.toFixed(2)} of ${sym}${total.toFixed(2)}`); return; }
      onSubmit(valid, desc, extra);
    }
    reset(); onClose();
  }

  const canSubmit = total > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Header */}
          <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 14 }}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 99, alignSelf: 'center', marginTop: 14 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, marginTop: 14 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>Add Expense</Text>
              <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }} onPress={handleClose}>
                <Text style={{ fontSize: 14, color: colors.text2 }}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 22, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

            {/* Amount */}
            <TouchableOpacity
              style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, paddingVertical: 18, marginBottom: 6, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
              onPress={() => { setUseTyping(v => !v); setTimeout(() => amountRef.current?.focus(), 100); }}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 22, color: colors.text3 }}>{sym}</Text>
              {useTyping ? (
                <TextInput
                  ref={amountRef}
                  style={{ fontSize: 48, fontWeight: '700', color: colors.text, letterSpacing: -1, minWidth: 60 }}
                  value={amountStr === '0' ? '' : amountStr}
                  onChangeText={handleTypedAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.text3}
                  autoFocus
                />
              ) : (
                <Text style={{ fontSize: 48, fontWeight: '700', color: colors.text, letterSpacing: -1 }}>{amountStr}</Text>
              )}
              <Text style={{ fontSize: 36, color: colors.teal, marginLeft: 2 }}>|</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setUseTyping(v => !v); }} style={{ alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 11, color: colors.teal, fontWeight: '600' }}>
                {useTyping ? '🔢  Switch to numpad' : '⌨️  Type amount'}
              </Text>
            </TouchableOpacity>

            {/* Quick amounts */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {QUICK_AMOUNTS.map(amt => (
                <TouchableOpacity key={amt} style={{ flex: 1, backgroundColor: colors.tealLight, borderRadius: radius.sm, paddingVertical: 8, alignItems: 'center' }} onPress={() => setAmountStr(String(amt))}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.teal }}>{sym}{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Date picker ── */}
            <View style={{ marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase' }}>Date</Text>
                <View style={{ backgroundColor: colors.tealLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.teal }}>{formatDate(txnDate)}</Text>
                </View>
              </View>
              <InlineDatePicker selectedDate={txnDate} onSelect={setTxnDate} colors={colors} />
            </View>

            {/* Description */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Description</Text>
            <TextInput style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 14 }} value={desc} onChangeText={setDesc} placeholder="What did you spend on?" placeholderTextColor={colors.text3} />

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Note (optional)</Text>
            <TextInput style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 14, minHeight: 60 }} value={note} onChangeText={setNote} placeholder="Add a note..." placeholderTextColor={colors.text3} multiline />

            {/* Mode toggle */}
            <View style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 4, marginBottom: 16, gap: 4 }}>
              {[{ id: 'single', label: '💳  Single' }, { id: 'split', label: '✂️  Split' }].map(m => (
                <TouchableOpacity key={m.id} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: mode === m.id ? colors.surface : 'transparent' }} onPress={() => setMode(m.id)}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: mode === m.id ? colors.teal : colors.text3 }}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Wallet chips */}
            {mode === 'single' && (
              <>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Wallet</Text>
                {wallets.length === 0 ? (
                  <View style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 14, marginBottom: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: colors.text3 }}>No wallets — expense will be unassigned</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    <TouchableOpacity style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, backgroundColor: selectedId === null ? colors.tealLight : colors.surface2, borderWidth: 1.5, borderColor: selectedId === null ? colors.teal : 'transparent' }} onPress={() => setSelectedId(null)}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: selectedId === null ? colors.teal : colors.text2 }}>Unassigned</Text>
                    </TouchableOpacity>
                    {wallets.map(w => (
                      <TouchableOpacity key={w.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, backgroundColor: selectedId === w.id ? colors.tealLight : colors.surface2, borderWidth: 1.5, borderColor: selectedId === w.id ? colors.teal : 'transparent' }} onPress={() => setSelectedId(w.id)}>
                        <Text style={{ fontSize: 15 }}>{w.emoji}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '500', color: selectedId === w.id ? colors.teal : colors.text2 }}>{w.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {mode === 'split' && wallets.length > 0 && total > 0 && <SplitPanel total={total} wallets={wallets} onChange={setSplits} currency={currency} />}
            {mode === 'split' && total <= 0 && (
              <View style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 20, alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 13, color: colors.text3 }}>Enter an amount above to configure the split</Text>
              </View>
            )}

            {/* Tags */}
            <TagSection
              selectedTags={tags}
              onTagsChange={setTags}
              customTags={customTags}
              onCreateTag={onCreateTag}
              colors={colors}
            />

            {/* Receipt */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Receipt Photo</Text>
            <TouchableOpacity style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 16, alignItems: 'center', marginBottom: photo ? 8 : 16 }} onPress={pickPhoto}>
              {photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: 160, borderRadius: radius.sm }} /> : <Text style={{ fontSize: 14, color: colors.text2, fontWeight: '500' }}>📷  Attach Receipt</Text>}
            </TouchableOpacity>
            {photo && <TouchableOpacity onPress={() => setPhoto(null)} style={{ alignItems: 'center', marginBottom: 14 }}><Text style={{ fontSize: 12, color: colors.red, fontWeight: '600' }}>Remove photo</Text></TouchableOpacity>}

            {/* Recurrence */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Repeat</Text>
            <Text style={{ fontSize: 12, color: colors.text3, marginBottom: 10 }}>Set this if the expense recurs — it will auto-deduct on future app opens.</Text>
            <View style={{ gap: 8, marginBottom: 20 }}>
              {RECURRENCE_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.value} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.sm, backgroundColor: recurrence === opt.value ? colors.tealLight : colors.surface2, borderWidth: 1.5, borderColor: recurrence === opt.value ? colors.teal : 'transparent' }} onPress={() => setRecurrence(opt.value)}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: recurrence === opt.value ? colors.teal : colors.text3, backgroundColor: recurrence === opt.value ? colors.teal : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {recurrence === opt.value && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: recurrence === opt.value ? colors.teal : colors.text }}>{opt.label}</Text>
                    <Text style={{ fontSize: 11, color: colors.text3, marginTop: 1 }}>{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Numpad */}
            {!useTyping && (
              <View style={{ gap: 8, marginBottom: 20 }}>
                {NUMPAD.map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
                    {row.map(key => (
                      <TouchableOpacity key={key} style={{ flex: 1, backgroundColor: key === '⌫' ? colors.surface : colors.surface2, borderRadius: 12, paddingVertical: 16, alignItems: 'center' }} onPress={() => numPress(key)} activeOpacity={0.7}>
                        <Text style={{ fontSize: 20, fontWeight: '500', color: key === '⌫' ? colors.text2 : colors.text }}>{key}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={{ backgroundColor: canSubmit ? colors.teal : colors.border, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center' }} onPress={handleSubmit} disabled={!canSubmit}>
              <Text style={{ color: canSubmit ? '#fff' : colors.text3, fontSize: 16, fontWeight: '700' }}>
                {mode === 'split' ? '✂️  Log Split Expense' : '✓  Log Expense'}
              </Text>
            </TouchableOpacity>
            {!canSubmit && <Text style={{ fontSize: 12, color: colors.text3, textAlign: 'center', marginTop: 8 }}>Enter an amount to continue</Text>}

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
