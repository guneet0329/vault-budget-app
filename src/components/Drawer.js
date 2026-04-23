import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, TouchableWithoutFeedback, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';

const W = Dimensions.get('window').width;
const DRAWER_W = W * 0.78;

export default function Drawer({ visible, onClose, onNavigate, currentRoute, wallets, items = [] }) {
  const insets     = useSafeAreaInsets();
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(-DRAWER_W)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: visible ? 0 : -DRAWER_W, useNativeDriver: true, damping: 20, stiffness: 180 }),
      Animated.timing(opacity,    { toValue: visible ? 1 : 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  const totalBudget = wallets.reduce((s, w) => s + w.limit, 0);
  const totalSpent  = wallets.reduce((s, w) => s + w.spent, 0);
  const pct         = totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const barColor    = pct >= 90 ? colors.red : pct >= 70 ? colors.amber : colors.tealMid;

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: DRAWER_W,
        backgroundColor: colors.surface, elevation: 10,
        transform: [{ translateX }],
        paddingTop: insets.top + 10,
      }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>

          {/* ── Header ── */}
          <View style={{ padding: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 22, color: '#fff', fontWeight: '800' }}>V</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>My Vault</Text>
            <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>
              {totalSpent > 0 ? `${pct}% of budget used this month` : 'No spending logged yet'}
            </Text>
            {totalBudget > 0 && (
              <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: barColor, borderRadius: 99 }} />
              </View>
            )}
          </View>

          {/* ── Nav items ── */}
          <View style={{ paddingVertical: 6 }}>
            {items.map(item => {
              const isActive = currentRoute === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    paddingHorizontal: 18, paddingVertical: 13,
                    backgroundColor: isActive ? colors.tealLight : 'transparent',
                  }}
                  onPress={() => { onNavigate(item.id); onClose(); }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: isActive ? colors.teal : colors.text }}>
                      {item.label}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.text3, marginTop: 1 }}>{item.sub}</Text>
                  </View>
                  {isActive && <View style={{ width: 4, height: 28, backgroundColor: colors.teal, borderRadius: 99 }} />}
                </TouchableOpacity>
              );
            })}
          </View>

        </ScrollView>
      </Animated.View>
    </View>
  );
}
