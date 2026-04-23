import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';
import { radius } from '../theme';

export default function SplitPanel({ total, wallets, onChange, currency }) {
  const { colors, shadow } = useTheme();
  const sym = currency?.symbol || '$';

  const [units,  setUnits]  = useState(() => Object.fromEntries(wallets.map(w => [w.id, 'dollar'])));
  const [values, setValues] = useState(() => Object.fromEntries(wallets.map(w => [w.id, ''])));

  const resolved = wallets.map(w => {
    const raw = parseFloat(values[w.id]) || 0;
    const amt = units[w.id] === 'percent' ? (raw / 100) * total : raw;
    return { walletId: w.id, amount: Math.round(amt * 100) / 100 };
  });

  const allocated  = resolved.reduce((s, r) => s + r.amount, 0);
  const remaining  = Math.round((total - allocated) * 100) / 100;
  const isBalanced = Math.abs(remaining) < 0.01;
  const isOver     = remaining < -0.01;
  const progressPct = total > 0 ? Math.min((allocated / total) * 100, 100) : 0;
  const progressColor = isOver ? colors.red : isBalanced ? colors.tealMid : colors.amber;

  useEffect(() => { onChange(resolved); }, [values, units]);

  function setUnit(wid, unit) {
    setUnits(prev => ({ ...prev, [wid]: unit }));
    setValues(prev => {
      const old = parseFloat(prev[wid]) || 0;
      if (unit === 'percent' && total > 0) {
        const asDollar = units[wid] === 'dollar' ? old : (old / 100) * total;
        return { ...prev, [wid]: ((asDollar / total) * 100).toFixed(1) };
      } else {
        const asPct = units[wid] === 'percent' ? old : 0;
        return { ...prev, [wid]: ((asPct / 100) * total).toFixed(2) };
      }
    });
  }

  function autoFill() {
    if (total <= 0) return;
    const share = (total / wallets.length).toFixed(2);
    const newVals = {};
    wallets.forEach(w => {
      newVals[w.id] = units[w.id] === 'percent' ? ((1 / wallets.length) * 100).toFixed(1) : share;
    });
    setValues(newVals);
  }

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: colors.teal }]}>
        <View>
          <Text style={styles.bannerLabel}>Total to split</Text>
          <Text style={styles.bannerTotal}>{sym}{total.toFixed(2)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.bannerLabel}>{isBalanced ? '✓ Balanced' : isOver ? '⚠ Over' : 'Remaining'}</Text>
          <Text style={[styles.bannerRemaining, { color: isOver ? '#ffaaaa' : isBalanced ? '#a8f0e0' : '#ffe8a0' }]}>
            {isOver ? '-' : ''}{sym}{Math.abs(remaining).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: progressColor }]} />
      </View>

      {/* Auto-fill */}
      <TouchableOpacity style={[styles.autoFillBtn, { backgroundColor: colors.tealLight }]} onPress={autoFill}>
        <Text style={[styles.autoFillText, { color: colors.teal }]}>⚡ Auto-split evenly</Text>
      </TouchableOpacity>

      {/* Per-wallet rows */}
      {wallets.map(w => {
        const resolvedAmt = resolved.find(r => r.walletId === w.id)?.amount || 0;
        const walletPct   = total > 0 ? Math.round((resolvedAmt / total) * 100) : 0;
        return (
          <View key={w.id} style={[styles.walletRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.walletIconWrap, { backgroundColor: w.color + '22' }]}>
              <Text style={styles.walletEmoji}>{w.emoji}</Text>
            </View>
            <View style={styles.walletInfo}>
              <Text style={[styles.walletName, { color: colors.text }]}>{w.name}</Text>
              <Text style={[styles.walletSub, { color: colors.text3 }]}>
                Budget: {sym}{(w.limit - w.spent).toFixed(0)} left{resolvedAmt > 0 ? `  ·  ${walletPct}%` : ''}
              </Text>
            </View>
            {/* Unit toggle */}
            <View style={[styles.unitPill, { backgroundColor: colors.surface2 }]}>
              <TouchableOpacity style={[styles.unitBtn, units[w.id] === 'dollar' && { backgroundColor: colors.surface }]} onPress={() => setUnit(w.id, 'dollar')}>
                <Text style={[styles.unitBtnText, { color: units[w.id] === 'dollar' ? colors.teal : colors.text3 }]}>$</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.unitBtn, units[w.id] === 'percent' && { backgroundColor: colors.surface }]} onPress={() => setUnit(w.id, 'percent')}>
                <Text style={[styles.unitBtnText, { color: units[w.id] === 'percent' ? colors.teal : colors.text3 }]}>%</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.numInput, { backgroundColor: colors.surface2, borderColor: colors.border, color: colors.text }]}
              value={values[w.id]}
              onChangeText={t => setValues(prev => ({ ...prev, [w.id]: t }))}
              keyboardType="decimal-pad"
              placeholder={units[w.id] === 'percent' ? '0.0' : '0.00'}
              placeholderTextColor={colors.text3}
              maxLength={7}
            />
          </View>
        );
      })}

      {/* Validation */}
      {!isBalanced && allocated > 0 && (
        <View style={[styles.validationRow, { backgroundColor: isOver ? colors.redLight : colors.amberLight }]}>
          <Text style={[styles.validationText, { color: isOver ? colors.red : colors.amber }]}>
            {isOver ? `Over by ${sym}${Math.abs(remaining).toFixed(2)} — reduce some amounts` : `${sym}${remaining.toFixed(2)} still unallocated`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: 16, borderWidth: 1.5 },
  banner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  bannerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  bannerTotal: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 2 },
  bannerRemaining: { fontSize: 20, fontWeight: '700', marginTop: 2 },
  progressTrack: { height: 4 },
  progressFill: { height: '100%' },
  autoFillBtn: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'transparent', alignItems: 'center' },
  autoFillText: { fontSize: 13, fontWeight: '600' },
  walletRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  walletIconWrap: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  walletEmoji: { fontSize: 16 },
  walletInfo: { flex: 1, minWidth: 0 },
  walletName: { fontSize: 13, fontWeight: '600' },
  walletSub: { fontSize: 11, marginTop: 1 },
  unitPill: { flexDirection: 'row', borderRadius: 6, padding: 2, gap: 2, flexShrink: 0 },
  unitBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  unitBtnText: { fontSize: 12, fontWeight: '700' },
  numInput: { width: 72, paddingHorizontal: 8, paddingVertical: 7, textAlign: 'right', borderWidth: 1.5, borderRadius: 8, fontSize: 14, fontWeight: '600', flexShrink: 0 },
  validationRow: { padding: 12, alignItems: 'center' },
  validationText: { fontSize: 13, fontWeight: '600' },
});
