import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Modal, Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { radius } from '../theme';
import EmojiPicker from '../components/EmojiPicker';
import { loadGoalProgress } from '../storage/store';

const SCREEN_H    = Dimensions.get('window').height;

// ── Reusable bottom sheet ─────────────────────────────────────────────────────
function BottomSheet({ visible, onClose, children, title, maxHeight }) {
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const anim   = React.useRef(new Animated.Value(SCREEN_H)).current;
  React.useEffect(() => {
    Animated.spring(anim, { toValue: visible ? 0 : SCREEN_H, useNativeDriver: true, damping: 24, stiffness: 200 }).start();
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
          maxHeight: maxHeight ?? SCREEN_H * 0.92,
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

// ── Wallet picker ─────────────────────────────────────────────────────────────
function WalletPicker({ wallets, selectedId, onSelect, onClose, sym, colors }) {
  return (
    <ScrollView style={{ maxHeight: SCREEN_H * 0.45 }} contentContainerStyle={{ padding: 14 }}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: selectedId === null ? colors.tealLight : 'transparent', borderRadius: radius.md, marginBottom: 6 }}
        onPress={() => { onSelect(null); onClose(); }}
      >
        <Text style={{ fontSize: 18 }}>🚫</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: selectedId === null ? colors.teal : colors.text2 }}>No deduction</Text>
          <Text style={{ fontSize: 11, color: colors.text3 }}>Track progress only</Text>
        </View>
      </TouchableOpacity>
      {wallets.map(w => (
        <TouchableOpacity
          key={w.id}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: selectedId === w.id ? colors.tealLight : 'transparent', borderRadius: radius.md, marginBottom: 6 }}
          onPress={() => { onSelect(w.id); onClose(); }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: w.color + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 17 }}>{w.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: selectedId === w.id ? colors.teal : colors.text }}>{w.name}</Text>
            <Text style={{ fontSize: 11, color: colors.text3 }}>{sym}{(w.limit - w.spent).toFixed(0)} remaining</Text>
          </View>
          {selectedId === w.id && <Text style={{ color: colors.teal, fontSize: 16 }}>✓</Text>}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── Goal detail screen ────────────────────────────────────────────────────────
function GoalDetail({ goal, wallets, currency, onBack, onAddProgress, onDeleteProgress, onEditGoal, onDeleteGoal }) {
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  const sym = currency?.symbol || '$';

  const [progress,    setProgress]    = useState([]);
  const [progSheet,   setProgSheet]   = useState(false);
  const [progAmt,     setProgAmt]     = useState('');
  const [progNote,    setProgNote]    = useState('');
  const [progWid,     setProgWid]     = useState(goal.walletId ?? null);
  const [progWalPick, setProgWalPick] = useState(false);

  const [editSheet,   setEditSheet]   = useState(false);
  const [eName,       setEName]       = useState(goal.name);
  const [eTarget,     setETarget]     = useState(String(goal.target));
  const [eEmoji,      setEEmoji]      = useState(goal.emoji);
  const [eWid,        setEWid]        = useState(goal.walletId ?? null);
  const [eWalPick,    setEWalPick]    = useState(false);

  useEffect(() => {
    refreshProgress();
  }, [goal.id]);

  function refreshProgress() {
    try { setProgress(loadGoalProgress(goal.id)); } catch {}
  }

  const pct       = Math.min(Math.round((goal.saved / goal.target) * 100), 100);
  const isComplete = pct >= 100;

  function submitProgress() {
    const amt = parseFloat(progAmt);
    if (!amt || amt <= 0) return;
    onAddProgress(goal.id, amt, progWid, progNote);
    setProgAmt(''); setProgNote(''); setProgSheet(false);
    setTimeout(refreshProgress, 100);
  }

  function handleDeleteProgress(p) {
    onDeleteProgress(p.id);
    setTimeout(refreshProgress, 100);
  }

  function saveEdit() {
    if (!eName.trim() || !eTarget) return;
    onEditGoal(goal.id, eName.trim(), eEmoji, parseFloat(eTarget), eWid);
    setEditSheet(false);
  }

  const linkedW = wallets.find(w => w.id === goal.walletId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
            onPress={onBack}
          >
            <Text style={{ fontSize: 18, color: colors.text }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 24 }}>{goal.emoji}</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, flex: 1 }}>{goal.name}</Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.blueLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 }}
            onPress={() => setEditSheet(true)}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.blue }}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor: colors.redLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
            onPress={() => onDeleteGoal(goal.id)}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.red }}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Progress summary */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <View>
              <Text style={{ fontSize: 11, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.4 }}>Saved</Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: isComplete ? colors.green : colors.teal }}>
                {sym}{goal.saved.toFixed(0)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.4 }}>Target</Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>{sym}{goal.target.toFixed(0)}</Text>
            </View>
          </View>
          <View style={{ height: 10, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
            <View style={{ height: '100%', width: `${pct}%`, backgroundColor: isComplete ? colors.green : colors.teal, borderRadius: 99 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: colors.text3 }}>
              {isComplete ? '🎉 Goal reached!' : `${sym}${(goal.target - goal.saved).toFixed(0)} to go`}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: isComplete ? colors.green : colors.teal }}>{pct}%</Text>
          </View>
          {linkedW && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
              <Text style={{ fontSize: 12 }}>{linkedW.emoji}</Text>
              <Text style={{ fontSize: 12, color: colors.text3 }}>Default: deducts from {linkedW.name}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Add progress button */}
      {!isComplete && (
        <TouchableOpacity
          style={[{ margin: 14, backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center' }, shadow.sm]}
          onPress={() => { setProgWid(goal.walletId ?? null); setProgAmt(''); setProgNote(''); setProgSheet(true); }}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>+ Add Progress</Text>
        </TouchableOpacity>
      )}

      {/* Progress history */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 40 }}>
        {progress.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 32, marginBottom: 10 }}>📭</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 }}>No contributions yet</Text>
            <Text style={{ fontSize: 13, color: colors.text3 }}>Tap "Add Progress" to log your first deposit</Text>
          </View>
        ) : (
          <>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Contribution History
            </Text>
            <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }, shadow.sm]}>
              {progress.map((p, i) => {
                const w = wallets.find(w => w.id === p.walletId);
                return (
                  <View
                    key={p.id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: i < progress.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 16 }}>{w?.emoji || '💰'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.teal }}>+{sym}{p.amount.toFixed(2)}</Text>
                      <Text style={{ fontSize: 11, color: colors.text3, marginTop: 2 }}>
                        {w ? `from ${w.name}` : 'no wallet'} · {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                      {p.note ? <Text style={{ fontSize: 11, color: colors.text3, fontStyle: 'italic', marginTop: 1 }}>{p.note}</Text> : null}
                    </View>
                    <TouchableOpacity
                      style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.redLight, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => handleDeleteProgress(p)}
                    >
                      <Text style={{ fontSize: 14 }}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Add Progress sheet ── */}
      <BottomSheet visible={progSheet} onClose={() => setProgSheet(false)} title="Add Progress">
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Amount ({sym})</Text>
          <TextInput
            style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 14, textAlign: 'center' }}
            value={progAmt} onChangeText={setProgAmt}
            keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.text3} autoFocus
          />
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Deduct from Wallet</Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            onPress={() => setProgWalPick(true)}
          >
            {wallets.find(w => w.id === progWid) ? (
              <><Text style={{ fontSize: 18 }}>{wallets.find(w => w.id === progWid).emoji}</Text>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.teal }}>{wallets.find(w => w.id === progWid).name}</Text></>
            ) : <Text style={{ flex: 1, fontSize: 15, color: colors.text3 }}>No deduction (track only)</Text>}
            <Text style={{ color: colors.text3 }}>›</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Note (optional)</Text>
          <TextInput
            style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 18 }}
            value={progNote} onChangeText={setProgNote}
            placeholder="e.g. Monthly contribution" placeholderTextColor={colors.text3}
          />
          <TouchableOpacity style={{ backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: 15, alignItems: 'center' }} onPress={submitProgress}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save</Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>

      {/* ── Wallet picker for progress ── */}
      <BottomSheet visible={progWalPick} onClose={() => setProgWalPick(false)} title="Deduct from Wallet">
        <WalletPicker wallets={wallets} selectedId={progWid} onSelect={setProgWid} onClose={() => setProgWalPick(false)} sym={sym} colors={colors} />
      </BottomSheet>

      {/* ── Edit goal sheet ── */}
      <BottomSheet visible={editSheet} onClose={() => setEditSheet(false)} title="Edit Goal">
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Goal Name</Text>
          <TextInput style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 14 }} value={eName} onChangeText={setEName} placeholderTextColor={colors.text3} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Target ({sym})</Text>
          <TextInput style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 14 }} value={eTarget} onChangeText={setETarget} keyboardType="decimal-pad" placeholderTextColor={colors.text3} />
          <EmojiPicker selected={eEmoji} onSelect={setEEmoji} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Default Wallet</Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            onPress={() => setEWalPick(true)}
          >
            {wallets.find(w => w.id === eWid) ? (
              <><Text style={{ fontSize: 18 }}>{wallets.find(w => w.id === eWid).emoji}</Text>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.teal }}>{wallets.find(w => w.id === eWid).name}</Text></>
            ) : <Text style={{ flex: 1, fontSize: 15, color: colors.text3 }}>No wallet (track only)</Text>}
            <Text style={{ color: colors.text3 }}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: 15, alignItems: 'center' }} onPress={saveEdit}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save Changes</Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>

      {/* ── Wallet picker for edit ── */}
      <BottomSheet visible={eWalPick} onClose={() => setEWalPick(false)} title="Default Wallet">
        <WalletPicker wallets={wallets} selectedId={eWid} onSelect={setEWid} onClose={() => setEWalPick(false)} sym={sym} colors={colors} />
      </BottomSheet>
    </View>
  );
}

// ── Main GoalsScreen ──────────────────────────────────────────────────────────
export default function GoalsScreen({
  goals, wallets, currency,
  onAddGoal, onDeleteGoal, onAddProgress, onDeleteProgress, onEditGoal,
}) {
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  const sym = currency?.symbol || '$';

  const [detailGoal, setDetailGoal] = useState(null);
  const [addSheet,   setAddSheet]   = useState(false);
  const [gName,      setGName]      = useState('');
  const [gTarget,    setGTarget]    = useState('');
  const [gEmoji,     setGEmoji]     = useState('🎯');
  const [gWid,       setGWid]       = useState(null);
  const [gWalPick,   setGWalPick]   = useState(false);

  const totalSaved  = goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const completed   = goals.filter(g => g.saved >= g.target).length;

  function saveGoal() {
    if (!gName.trim() || !gTarget) return;
    onAddGoal({ id: `goal_${Date.now()}`, name: gName.trim(), emoji: gEmoji, target: parseFloat(gTarget), saved: 0, walletId: gWid, createdAt: Date.now() });
    setGName(''); setGTarget(''); setGEmoji('🎯'); setGWid(null);
    setAddSheet(false);
  }

  // If viewing a goal detail, render that screen
  if (detailGoal) {
    const live = goals.find(g => String(g.id) === String(detailGoal.id)) ?? detailGoal;
    return (
      <GoalDetail
        goal={live}
        wallets={wallets}
        currency={currency}
        onBack={() => setDetailGoal(null)}
        onAddProgress={onAddProgress}
        onDeleteProgress={onDeleteProgress}
        onEditGoal={onEditGoal}
        onDeleteGoal={(id) => { onDeleteGoal(id); setDetailGoal(null); }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>Goals</Text>
          <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>{completed}/{goals.length} complete</Text>
        </View>
        <TouchableOpacity style={{ backgroundColor: colors.tealLight, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 7 }} onPress={() => setAddSheet(true)}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.teal }}>+ New Goal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
        {/* Summary */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Total Saved',  val: `${sym}${totalSaved.toFixed(0)}`,  color: colors.teal   },
            { label: 'Total Target', val: `${sym}${totalTarget.toFixed(0)}`, color: colors.blue   },
            { label: 'Completed',    val: `${completed}/${goals.length}`,    color: colors.green  },
          ].map((s, i) => (
            <View key={i} style={[{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, alignItems: 'center' }, shadow.sm]}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: s.color }}>{s.val}</Text>
              <Text style={{ fontSize: 10, color: colors.text3, marginTop: 3, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {goals.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 50 }}>
            <Text style={{ fontSize: 52, marginBottom: 14 }}>🎯</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 }}>No goals yet</Text>
            <Text style={{ fontSize: 14, color: colors.text3, textAlign: 'center' }}>Tap "+ New Goal" to start saving</Text>
          </View>
        ) : goals.map(g => {
          const pct        = Math.min(Math.round((g.saved / g.target) * 100), 100);
          const isComplete = pct >= 100;
          const linkedW    = wallets.find(w => w.id === g.walletId);
          return (
            <TouchableOpacity
              key={g.id}
              style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, marginBottom: 12, borderWidth: 1.5, borderColor: isComplete ? colors.green : 'transparent' }, shadow.sm]}
              onPress={() => setDetailGoal(g)}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 30 }}>{g.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{g.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>
                    {isComplete ? '🎉 Complete' : `${sym}${(g.target - g.saved).toFixed(0)} to go`}
                  </Text>
                  {linkedW && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <Text style={{ fontSize: 11 }}>{linkedW.emoji}</Text>
                      <Text style={{ fontSize: 11, color: colors.text3 }}>{linkedW.name}</Text>
                    </View>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: isComplete ? colors.green : colors.teal }}>{sym}{g.saved.toFixed(0)}</Text>
                  <Text style={{ fontSize: 11, color: colors.text3, marginTop: 1 }}>of {sym}{g.target.toFixed(0)}</Text>
                </View>
              </View>
              <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
                <View style={{ height: '100%', width: `${pct}%`, backgroundColor: isComplete ? colors.green : colors.teal, borderRadius: 99 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, color: colors.text3 }}>Tap to view history</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isComplete ? colors.green : colors.teal }}>{pct}%</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Add Goal sheet ── */}
      <BottomSheet visible={addSheet} onClose={() => setAddSheet(false)} title="New Goal">
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Goal Name</Text>
          <TextInput style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 14 }} value={gName} onChangeText={setGName} placeholder="e.g. Emergency Fund" placeholderTextColor={colors.text3} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Target ({sym})</Text>
          <TextInput style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 14 }} value={gTarget} onChangeText={setGTarget} keyboardType="decimal-pad" placeholder="3000" placeholderTextColor={colors.text3} />
          <EmojiPicker selected={gEmoji} onSelect={setGEmoji} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Default Wallet (optional)</Text>
          <Text style={{ fontSize: 12, color: colors.text3, marginBottom: 8 }}>Progress contributions will deduct from this wallet by default.</Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.surface2, borderRadius: radius.sm, padding: 12, marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            onPress={() => setGWalPick(true)}
          >
            {wallets.find(w => w.id === gWid) ? (
              <><Text style={{ fontSize: 18 }}>{wallets.find(w => w.id === gWid).emoji}</Text>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.teal }}>{wallets.find(w => w.id === gWid).name}</Text></>
            ) : <Text style={{ flex: 1, fontSize: 15, color: colors.text3 }}>No wallet (track only)</Text>}
            <Text style={{ color: colors.text3 }}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: 15, alignItems: 'center' }} onPress={saveGoal}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save Goal</Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>

      {/* ── Wallet picker for new goal ── */}
      <BottomSheet visible={gWalPick} onClose={() => setGWalPick(false)} title="Default Wallet">
        <WalletPicker wallets={wallets} selectedId={gWid} onSelect={setGWid} onClose={() => setGWalPick(false)} sym={sym} colors={colors} />
      </BottomSheet>
    </View>
  );
}
