import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';
import { radius } from '../theme';

// ── Child wallet row — compact, indented ──────────────────────────────────────
export function ChildWalletCard({ wallet, sym, onPress }) {
  const { colors } = useTheme();
  const { name, emoji, color, limit, spent, billType } = wallet;

  const isFixed  = billType === 'fixed';
  const pct      = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const rem      = limit - spent;
  const barColor = isFixed
    ? (pct >= 100 ? colors.amber : color)
    : (pct >= 90 ? colors.red : pct >= 70 ? colors.amber : color);

  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: colors.border }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Indent line */}
      <View style={{ width: 2, height: 36, backgroundColor: colors.border, borderRadius: 1, marginLeft: 6 }} />

      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 15 }}>{emoji}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 }} numberOfLines={1}>{name}</Text>
          {isFixed && (
            <View style={{ backgroundColor: colors.amberLight, borderRadius: 99, paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 8, fontWeight: '700', color: colors.amber }}>FIXED</Text>
            </View>
          )}
        </View>
        <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: barColor, borderRadius: 99 }} />
        </View>
      </View>

      <View style={{ alignItems: 'flex-end', minWidth: 64 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: barColor === colors.red ? colors.red : colors.text }}>
          {sym}{rem.toFixed(0)}
        </Text>
        <Text style={{ fontSize: 10, color: colors.text3 }}>of {sym}{limit}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Parent group card — looks identical to WalletCard, children expand below ──
export function ParentWalletCard({ wallet, children, sym, onChildPress, collapsed, onToggleCollapse }) {
  const { colors, shadow } = useTheme();
  const { name, emoji, color, billType } = wallet;

  const totalLimit = children.reduce((s, c) => s + c.limit, 0);
  const totalSpent = children.reduce((s, c) => s + c.spent, 0);
  const rem        = totalLimit - totalSpent;
  const pct        = totalLimit > 0 ? Math.min(Math.round((totalSpent / totalLimit) * 100), 100) : 0;
  const isFixed    = billType === 'fixed';
  const isLow      = !isFixed && pct >= 90;
  const isWarn     = !isFixed && pct >= 70 && pct < 90;
  const barColor   = isLow  ? colors.red
                   : isWarn ? colors.amber
                   : isFixed && pct >= 100 ? colors.amber
                   : color;
  const remColor   = isLow ? colors.red : isWarn ? colors.amber : colors.text;
  const s          = sym || '$';

  return (
    // Outer container is a column so children stack below the header
    <View style={[{ borderRadius: radius.lg, marginHorizontal: 14, marginBottom: 10, overflow: 'hidden', backgroundColor: colors.surface }, shadow.sm]}>

      {/* Header row — tap to collapse/expand */}
      <TouchableOpacity
        style={{ flexDirection: 'row' }}
        onPress={onToggleCollapse}
        activeOpacity={0.85}
      >
        {/* Left accent bar — same 4px as WalletCard */}
        <View style={{ width: 4, backgroundColor: color }} />

        {/* Content — same padding/layout as WalletCard inner */}
        <View style={{ flex: 1, padding: 16 }}>
          <View style={styles.row}>
            <View style={styles.iconName}>
              <View style={[styles.icon, { backgroundColor: color + '22' }]}>
                <Text style={styles.emoji}>{emoji}</Text>
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
                  {isFixed && (
                    <View style={{ backgroundColor: colors.amberLight, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: colors.amber, letterSpacing: 0.4 }}>📌 FIXED</Text>
                    </View>
                  )}
                  <View style={{ backgroundColor: colors.surface2, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text3 }}>{children.length}</Text>
                  </View>
                </View>
                <Text style={[styles.sub, { color: colors.text3 }]}>
                  {totalSpent > 0 ? `${pct}% used` : 'No spending yet'}{collapsed ? '  ▶' : '  ▼'}
                </Text>
              </View>
            </View>
            <View style={styles.amounts}>
              <Text style={[styles.remaining, { color: remColor }]}>{s}{rem.toFixed(0)}</Text>
              <Text style={[styles.limitText, { color: colors.text3 }]}>of {s}{totalLimit}</Text>
            </View>
          </View>
          <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
          </View>
          <View style={styles.barLabels}>
            <Text style={[styles.spentText, { color: colors.text3 }]}>Spent {s}{totalSpent.toFixed(0)}</Text>
            <Text style={[styles.pctText, { color: barColor }]}>{pct}%</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Children stack below when expanded */}
      {!collapsed && children.map(child => (
        <ChildWalletCard
          key={child.id}
          wallet={child}
          sym={s}
          onPress={() => onChildPress(child)}
        />
      ))}
    </View>
  );
}

// ── Standalone wallet card (no parent, no children) ───────────────────────────
export default function WalletCard({ wallet, onPress, onLongPress, sym }) {
  const { colors, shadow } = useTheme();
  const { name, emoji, color, limit, spent, billType } = wallet;
  const s = sym || '$';

  const isFixed  = billType === 'fixed';
  const pct      = limit ? Math.round((spent / limit) * 100) : 0;
  const rem      = limit - spent;
  const isLow    = !isFixed && pct >= 90;
  const isWarn   = !isFixed && pct >= 70 && pct < 90;
  const barColor = isLow  ? colors.red
                 : isWarn ? colors.amber
                 : isFixed && pct >= 100 ? colors.amber
                 : color;
  const remColor = isLow ? colors.red : isWarn ? colors.amber : colors.text;

  return (
    <TouchableOpacity
      style={[styles.card, shadow.sm, { backgroundColor: colors.surface }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
    >
      <View style={[styles.accentBar, { backgroundColor: color }]} />
      <View style={styles.inner}>
        <View style={styles.row}>
          <View style={styles.iconName}>
            <View style={[styles.icon, { backgroundColor: color + '22' }]}>
              <Text style={styles.emoji}>{emoji}</Text>
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
                {isFixed && (
                  <View style={{ backgroundColor: colors.amberLight, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: colors.amber, letterSpacing: 0.4 }}>📌 FIXED</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.sub, { color: colors.text3 }]}>
                {spent > 0 ? `${pct}% used` : 'No spending yet'}
              </Text>
            </View>
          </View>
          <View style={styles.amounts}>
            <Text style={[styles.remaining, { color: remColor }]}>{s}{rem.toFixed(0)}</Text>
            <Text style={[styles.limitText, { color: colors.text3 }]}>of {s}{limit}</Text>
          </View>
        </View>
        <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
        </View>
        <View style={styles.barLabels}>
          <Text style={[styles.spentText, { color: colors.text3 }]}>Spent {s}{spent.toFixed(0)}</Text>
          <Text style={[styles.pctText, { color: barColor }]}>{pct}%</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:       { borderRadius: radius.lg, marginHorizontal: 14, marginBottom: 10, flexDirection: 'row', overflow: 'hidden' },
  accentBar:  { width: 4 },
  inner:      { flex: 1, padding: 16 },
  row:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconName:   { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  icon:       { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emoji:      { fontSize: 18 },
  name:       { fontSize: 15, fontWeight: '600' },
  sub:        { fontSize: 11, marginTop: 1 },
  amounts:    { alignItems: 'flex-end' },
  remaining:  { fontSize: 20, fontWeight: '700' },
  limitText:  { fontSize: 11, marginTop: 2 },
  barTrack:   { height: 6, borderRadius: 99, marginTop: 12, overflow: 'hidden' },
  barFill:    { height: '100%', borderRadius: 99 },
  barLabels:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  spentText:  { fontSize: 11 },
  pctText:    { fontSize: 11, fontWeight: '700' },
});
