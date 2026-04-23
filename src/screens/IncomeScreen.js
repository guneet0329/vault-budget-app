import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { radius } from '../theme';

const INCOME_EMOJIS = ['💼','💰','🏦','📈','🎯','🏠','🎨','💻','🚀','🎁'];
const INCOME_TYPES  = ['Salary','Freelance','Investment','Rental','Gift','Other'];

export default function IncomeScreen({ income, onAddIncome, onDeleteIncome, currency }) {
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  const sym = currency?.symbol || '$';

  const [modal,  setModal]  = useState(false);
  const [name,   setName]   = useState('');
  const [amount, setAmount] = useState('');
  const [type,   setType]   = useState('Salary');
  const [emoji,  setEmoji]  = useState('💼');
  const [repeat, setRepeat] = useState('monthly');

  function toMonthly(amount, repeat) {
    if (repeat === 'weekly')   return amount * 4.33;
    if (repeat === 'biweekly') return amount * 2.167;
    if (repeat === 'monthly')  return amount;
    return amount;
  }
  const totalIncome = income.reduce((s, i) => s + toMonthly(i.amount, i.repeat), 0);

  function save() {
    const amt = parseFloat(amount);
    if (!name.trim() || !amt || amt <= 0) return Alert.alert('Please fill in all fields');
    onAddIncome({ id: Date.now(), name: name.trim(), amount: amt, type, emoji, repeat, date: Date.now() });
    setName(''); setAmount(''); setType('Salary'); setEmoji('💼'); setRepeat('monthly');
    setModal(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>Income</Text>
          <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}>Track your money coming in</Text>
        </View>
        <TouchableOpacity style={{ backgroundColor: colors.greenLight, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 7 }} onPress={() => setModal(true)}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.green }}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
        <View style={[{ backgroundColor: colors.green, borderRadius: radius.lg, padding: 20, marginBottom: 16, alignItems: 'center' }]}>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Monthly Income</Text>
          <Text style={{ fontSize: 40, fontWeight: '700', color: '#fff', marginTop: 4 }}>{sym}{totalIncome.toFixed(0)}</Text>
        </View>

        {income.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 50 }}>
            <Text style={{ fontSize: 52, marginBottom: 14 }}>💼</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 }}>No income sources yet</Text>
            <Text style={{ fontSize: 14, color: colors.text3, textAlign: 'center' }}>Tap "+ Add" to log salary, freelance, or other income</Text>
          </View>
        ) : income.map(item => (
          <TouchableOpacity key={item.id} style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 }, shadow.sm]} onLongPress={() => Alert.alert('Delete', `Remove "${item.name}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => onDeleteIncome(item.id) }])} activeOpacity={0.85}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{item.name}</Text>
              <Text style={{ fontSize: 12, color: colors.text3, marginTop: 2, textTransform: 'capitalize' }}>{item.type}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.green }}>+{sym}{item.amount.toFixed(0)}</Text>
              <Text style={{ fontSize: 10, color: colors.text3, marginTop: 2, textTransform: 'capitalize' }}>{item.repeat}</Text>
              {item.repeat === 'biweekly' && (
                <Text style={{ fontSize: 10, color: colors.green, marginTop: 1, opacity: 0.75 }}>≈ {sym}{toMonthly(item.amount, item.repeat).toFixed(0)}/mo</Text>
              )}
              {item.repeat === 'weekly' && (
                <Text style={{ fontSize: 10, color: colors.green, marginTop: 1, opacity: 0.75 }}>≈ {sym}{toMonthly(item.amount, item.repeat).toFixed(0)}/mo</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
        <Text style={{ fontSize: 11, color: colors.text3, textAlign: 'center', marginTop: 8 }}>Long-press an entry to delete it</Text>
      </ScrollView>

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 99, alignSelf: 'center', marginTop: 14 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>New Income Source</Text>
            <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }} onPress={() => setModal(false)}>
              <Text style={{ fontSize: 14, color: colors.text2 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {[['Name', name, setName, 'e.g. Monthly Salary', false], ['Amount', amount, setAmount, '0.00', true]].map(([label, val, setter, ph, isNum]) => (
              <View key={label}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>{label} {isNum ? `(${sym})` : ''}</Text>
                <TextInput style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: 15, color: colors.text, marginBottom: 16 }} value={val} onChangeText={setter} placeholder={ph} placeholderTextColor={colors.text3} keyboardType={isNum ? 'decimal-pad' : 'default'} />
              </View>
            ))}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {INCOME_TYPES.map(t => (
                <TouchableOpacity key={t} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: type === t ? colors.greenLight : colors.surface2, borderWidth: 1.5, borderColor: type === t ? colors.green : 'transparent' }} onPress={() => setType(t)}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: type === t ? colors.green : colors.text2 }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Icon</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {INCOME_EMOJIS.map(e => (
                <TouchableOpacity key={e} style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: emoji === e ? colors.greenLight : colors.surface2, borderWidth: 1.5, borderColor: emoji === e ? colors.green : 'transparent', alignItems: 'center', justifyContent: 'center' }} onPress={() => setEmoji(e)}>
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Frequency</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {[
                { val: 'once',      label: 'Once'      },
                { val: 'weekly',    label: 'Weekly'    },
                { val: 'biweekly', label: 'Biweekly'  },
                { val: 'monthly',   label: 'Monthly'   },
              ].map(f => (
                <TouchableOpacity key={f.val} style={{ paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.sm, backgroundColor: repeat === f.val ? colors.green : colors.surface2 }} onPress={() => setRepeat(f.val)}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: repeat === f.val ? '#fff' : colors.text3 }}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[{ backgroundColor: colors.green, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center' }, shadow.sm]} onPress={save}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save Income Source</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
