import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StatusBar, BackHandler } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import ReactNativeBiometrics from 'react-native-biometrics';

import { ThemeProvider, useTheme } from './src/ThemeContext';

import HomeScreen         from './src/screens/HomeScreen';
import WalletsScreen      from './src/screens/WalletsScreen';
import AnalysisScreen     from './src/screens/AnalysisScreen';
import GoalsScreen        from './src/screens/GoalsScreen';
import MoreScreen         from './src/screens/MoreScreen';
import IncomeScreen       from './src/screens/IncomeScreen';
import DebtScreen         from './src/screens/DebtScreen';
import InsightsScreen     from './src/screens/InsightsScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import GiftCardsScreen   from './src/screens/GiftCardsScreen';
import Drawer             from './src/components/Drawer';

import {
  initDb,
  loadWallets,          insertWallet,           updateWalletDetails,
  updateWalletSpent,    deleteWalletById,        resetAllSpent,        reorderWallets,
  loadTransactions,     insertTransaction,       updateTransaction,    deleteTransactionById,
  loadIncome,           insertIncome,            deleteIncomeById,
  loadDebts,            insertDebt,              settleDebtById,       deleteDebtById,
  loadRecurring,        insertRecurring,         updateRecurringLastApplied,
  toggleRecurringActive, deleteRecurringById,
  loadSettings,         saveSetting,
  loadPrevMonth,
  loadGoals,            insertGoal,              updateGoalSaved,      updateGoalDetails,
  deleteGoalById,       insertGoalProgress,      loadGoalProgress,     deleteGoalProgressEntry,
  loadGiftCards,        insertGiftCard,          updateGiftCardBalance, deleteGiftCardById,
  loadCustomTags,       insertCustomTag,         deleteCustomTag,
} from './src/storage/store';

import { getDueRecurring, buildRecurringTransaction } from './src/services/recurring';
import { checkAndNotify, requestNotificationPermission, scheduleDailyReminder } from './src/services/notifications';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Bottom nav tabs — Home replaces the old Wallets-as-first-tab
const NAV_TABS = [
  { id: 'Home',     icon: '🏠', label: 'Home'     },
  { id: 'Wallets',  icon: '👜', label: 'Wallets'  },
  { id: 'Analysis', icon: '📊', label: 'Analysis' },
  { id: 'More',     icon: '⚙️', label: 'Settings' },
];

// Drawer-only screens — back navigates to Home
const DRAWER_SCREENS = ['Goals','Income','Debts','Insights','Transactions','GiftCards'];

function BottomNav({ active, onPress }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12) }}>
      {NAV_TABS.map(tab => {
        const isActive = active === tab.id;
        return (
          <TouchableOpacity key={tab.id} style={{ flex: 1, alignItems: 'center', gap: 3 }} onPress={() => onPress(tab.id)} activeOpacity={0.7}>
            <Text style={{ fontSize: 22 }}>{tab.icon}</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.2, color: isActive ? colors.teal : colors.text3 }}>{tab.label}</Text>
            {isActive && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.teal }} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AppInner({ seed }) {
  const { isDark, colors } = useTheme();
  const now = new Date();

  const [wallets,       setWallets]       = useState(seed.wallets);
  const [transactions,  setTransactions]  = useState(seed.transactions);
  const [income,        setIncome]        = useState(seed.income);
  const [debts,         setDebts]         = useState(seed.debts);
  const [recurring,     setRecurring]     = useState(seed.recurring);
  const [settings,      setSettings]      = useState(seed.settings);
  const [prevMonth,     setPrevMonth]     = useState(seed.prevMonth);
  const [customTags,    setCustomTags]    = useState(seed.customTags);
  const [goals,         setGoals]         = useState(seed.goals);
  const [giftCards,     setGiftCards]     = useState(seed.giftCards);
  const [activeTab,     setActiveTab]     = useState('Home');
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [hideNumbers,   setHideNumbers]   = useState(seed.settings.hideNumbers ?? false);
  const [currentMonth,  setCurrentMonth]  = useState(`${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`);
  const [authenticated, setAuthenticated] = useState(false);
  const recurringApplied = useRef(false);

  // ── Android back handler ──────────────────────────────────────────────────
  useEffect(() => {
    const onBack = () => {
      if (drawerOpen) { setDrawerOpen(false); return true; }
      if (DRAWER_SCREENS.includes(activeTab)) { setActiveTab('Home'); return true; }
      if (activeTab !== 'Home') { setActiveTab('Home'); return true; }
      return false; // let Android minimize
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [activeTab, drawerOpen]);

  useEffect(() => {
    try { requestNotificationPermission(); scheduleDailyReminder(); } catch {}
  }, []);

  useEffect(() => {
    if (wallets.length) { try { checkAndNotify(wallets, transactions); } catch {} }
  }, [wallets]);

  // ── Recurring — fix double-apply by checking last_applied date in DB ──────
  useEffect(() => {
    if (recurringApplied.current || !recurring.length) return;
    recurringApplied.current = true;
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      // Re-load from DB to get freshest last_applied values
      const freshRecurring = loadRecurring();
      const due = getDueRecurring(freshRecurring);
      if (!due.length) return;

      const ts = Date.now();
      const currentWallets = loadWallets();
      due.forEach(r => {
        // Double-check: skip if already applied today (DB-based guard)
        if (r.lastApplied === todayStr) return;
        const txn = buildRecurringTransaction(r);
        insertTransaction(txn);
        const w = currentWallets.find(w => w.id === r.walletId);
        if (w) updateWalletSpent(r.walletId, Math.round((w.spent + r.amount) * 100) / 100);
        updateRecurringLastApplied(r.id, ts);
      });
      setWallets(loadWallets());
      setTransactions(loadTransactions());
      setRecurring(loadRecurring());
      const applied = due.filter(r => r.lastApplied !== todayStr);
      if (applied.length) Alert.alert('🔄 Recurring Applied', `${applied.length} expense${applied.length > 1 ? 's' : ''} auto-deducted`);
    } catch (e) { console.warn('Recurring:', e); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const rnb = new ReactNativeBiometrics();
        const { available } = await rnb.isSensorAvailable();
        if (available && seed.settings.biometric !== false) promptBiometric(rnb);
        else setAuthenticated(true);
      } catch { setAuthenticated(true); }
    })();
  }, []);

  async function promptBiometric(instance) {
    try {
      const rn = instance || new ReactNativeBiometrics();
      const { success } = await rn.simplePrompt({ promptMessage: 'Unlock Vault' });
      if (success) setAuthenticated(true);
      else Alert.alert('Authentication Failed', 'Please try again.', [{ text: 'Retry', onPress: () => promptBiometric() }]);
    } catch { setAuthenticated(true); }
  }

  // ── Wallet mutations ──────────────────────────────────────────────────────
  const addWallet  = useCallback((data) => { try { insertWallet(data); setWallets(loadWallets()); } catch (e) { Alert.alert('Error', e.message); } }, []);
  const editWallet = useCallback((id, data) => { try { updateWalletDetails(id, data.name, data.emoji, data.color, data.limit, data.billType, data.parentId ?? null); setWallets(loadWallets()); } catch (e) { Alert.alert('Error', e.message); } }, []);
  const deleteWallet = useCallback((id) => { try { deleteWalletById(id); setWallets(loadWallets()); setTransactions(loadTransactions()); } catch (e) { Alert.alert('Error', e.message); } }, []);

  const reorderWalletsCb = useCallback((orderedIds) => {
    try { reorderWallets(orderedIds); setWallets(loadWallets()); }
    catch (e) { Alert.alert('Error', e.message); }
  }, []);

  // ── Expense mutations ─────────────────────────────────────────────────────
  const addExpense = useCallback((splits, desc, extra = {}) => {
    try {
      const { tags = [], note = '', photo = null, frequency = 'once', date } = extra;
      const txnDate = date || Date.now();
      const currentWallets = loadWallets();
      splits.forEach((sp, idx) => {
        insertTransaction({ id: `txn_${txnDate}_${idx}_${Math.random()}`, walletId: sp.walletId ?? null, amount: sp.amount, desc: desc || 'Expense', note, tags, photo, frequency, isRecurring: false, date: txnDate });
        if (sp.walletId) {
          const w = currentWallets.find(w => w.id === sp.walletId);
          updateWalletSpent(sp.walletId, Math.round(((w?.spent ?? 0) + sp.amount) * 100) / 100);
        }
        if (frequency !== 'once' && sp.walletId) {
          insertRecurring({ id: `rec_${txnDate}_${idx}`, name: desc || 'Recurring', walletId: sp.walletId, amount: sp.amount, frequency, lastApplied: new Date(txnDate).toISOString().slice(0, 10), tags });
        }
      });
      setWallets(loadWallets());
      setTransactions(loadTransactions());
      if (extra.frequency !== 'once') setRecurring(loadRecurring());
    } catch (e) { Alert.alert('Error saving expense', e.message); }
  }, []);

  const deleteTransactionCb = useCallback((id, walletId, amount) => {
    try { deleteTransactionById(id, walletId, amount); setWallets(loadWallets()); setTransactions(loadTransactions()); }
    catch (e) { Alert.alert('Error', e.message); }
  }, []);

  const updateTransactionCb = useCallback((id, data) => {
    try { updateTransaction(id, data); setWallets(loadWallets()); setTransactions(loadTransactions()); }
    catch (e) { Alert.alert('Error', e.message); }
  }, []);

  // ── Goals ─────────────────────────────────────────────────────────────────
  const addGoal = useCallback((g) => {
    try { insertGoal(g); setGoals(loadGoals()); }
    catch (e) { Alert.alert('Error', e.message); }
  }, []);

  const editGoalCb = useCallback((id, name, emoji, target, walletId) => {
    try { updateGoalDetails(id, name, emoji, target, walletId); setGoals(loadGoals()); }
    catch (e) { Alert.alert('Error', e.message); }
  }, []);

  const deleteGoalCb = useCallback((id) => {
    try { deleteGoalById(id); setGoals(loadGoals()); setWallets(loadWallets()); setTransactions(loadTransactions()); }
    catch (e) { Alert.alert('Error', e.message); }
  }, []);

  const deleteGoalProgressCb = useCallback((progressId) => {
    try {
      deleteGoalProgressEntry(progressId);
      setGoals(loadGoals());
      setWallets(loadWallets());
      setTransactions(loadTransactions());
    } catch (e) { Alert.alert('Error', e.message); }
  }, []);

  // Add progress: update goal saved amount, optionally deduct from wallet.
  // The transaction ID is stored in goal_progress so that if the user later
  // deletes that transaction, deleteTransactionById() can revert goal.saved.
  const addGoalProgress = useCallback((goalId, amount, walletId, note) => {
    try {
      const goal = loadGoals().find(g => String(g.id) === String(goalId));
      if (!goal) return;
      const newSaved = Math.min(goal.saved + amount, goal.target);
      updateGoalSaved(goalId, newSaved);

      let txnId = null;
      if (walletId != null) {
        const currentWallets = loadWallets();
        const w = currentWallets.find(w => w.id === walletId);
        if (w) {
          txnId = `goal_prog_${Date.now()}_${Math.random()}`;
          insertTransaction({ id: txnId, walletId, amount, desc: `Goal: ${goal.name}`, note: note ?? '', tags: ['#goals'], frequency: 'once', isRecurring: false, date: Date.now() });
          updateWalletSpent(walletId, Math.round(((w.spent ?? 0) + amount) * 100) / 100);
        }
        setWallets(loadWallets());
        setTransactions(loadTransactions());
      }

      // Store progress with the transaction ID so delete can sync back
      insertGoalProgress({
        id: `prog_${Date.now()}_${Math.random()}`,
        goalId, amount,
        walletId: walletId ?? null,
        transactionId: txnId,
        note: note ?? '',
        date: Date.now(),
      });

      setGoals(loadGoals());
    } catch (e) { Alert.alert('Error', e.message); }
  }, []);

  // ── Tags ──────────────────────────────────────────────────────────────────
  const createTag = useCallback((name, color) => { try { insertCustomTag(name, color); setCustomTags(loadCustomTags()); } catch {} }, []);
  const removeTag = useCallback((name) => { try { deleteCustomTag(name); setCustomTags(loadCustomTags()); } catch {} }, []);

  // ── Income ────────────────────────────────────────────────────────────────
  const addIncome    = useCallback((item) => { try { insertIncome(item);    setIncome(loadIncome()); } catch (e) { Alert.alert('Error', e.message); } }, []);
  const deleteIncome = useCallback((id)   => { try { deleteIncomeById(id); setIncome(loadIncome()); } catch {} }, []);

  // ── Debts ─────────────────────────────────────────────────────────────────
  const addDebt    = useCallback((d)  => { try { insertDebt(d);       setDebts(loadDebts()); } catch (e) { Alert.alert('Error', e.message); } }, []);
  const settleDebt = useCallback((id) => {
    try {
      const debt = loadDebts().find(d => String(d.id) === String(id));
      settleDebtById(id);
      if (debt?.walletId && debt.type === 'borrowed') {
        const cw = loadWallets();
        const w  = cw.find(w => w.id === debt.walletId);
        const ts = Date.now();
        insertTransaction({ id: `debt_settle_${ts}_${Math.random()}`, walletId: debt.walletId, amount: debt.amount, desc: `Debt repaid — ${debt.name}`, note: debt.note ?? '', tags: ['#debt'], frequency: 'once', isRecurring: false, date: ts });
        if (w) updateWalletSpent(debt.walletId, Math.round(((w.spent ?? 0) + debt.amount) * 100) / 100);
        setWallets(loadWallets());
        setTransactions(loadTransactions());
      }
      setDebts(loadDebts());
    } catch (e) { Alert.alert('Error', e.message); }
  }, []);
  const deleteDebt = useCallback((id) => { try { deleteDebtById(id); setDebts(loadDebts()); } catch {} }, []);

  // ── Gift Cards ────────────────────────────────────────────────────────────
  const addGiftCard = useCallback((card) => {
    try { insertGiftCard(card); setGiftCards(loadGiftCards()); }
    catch (e) { Alert.alert('Error', e.message); }
  }, []);
  const useGiftCard = useCallback((id, amount) => {
    try {
      const card = loadGiftCards().find(c => String(c.id) === String(id));
      if (!card) return;
      const newBal = Math.max(0, Math.round((card.balance - amount) * 100) / 100);
      updateGiftCardBalance(id, newBal);
      setGiftCards(loadGiftCards());
    } catch (e) { Alert.alert('Error', e.message); }
  }, []);
  const deleteGiftCard = useCallback((id) => {
    try { deleteGiftCardById(id); setGiftCards(loadGiftCards()); } catch {}
  }, []);

  // ── Recurring ─────────────────────────────────────────────────────────────
  const deleteRecurring = useCallback((id) => { try { deleteRecurringById(id); setRecurring(loadRecurring()); } catch {} }, []);
  const toggleRecurring = useCallback((id) => { try { toggleRecurringActive(id); setRecurring(loadRecurring()); } catch {} }, []);

  // ── Settings ──────────────────────────────────────────────────────────────
  const changeCurrency = useCallback((cur) => { try { saveSetting('currency', cur); setSettings(p => ({ ...p, currency: cur })); } catch (e) { Alert.alert('Error', e.message); } }, []);

  const toggleHideNumbers = useCallback(() => {
    const next = !hideNumbers;
    setHideNumbers(next);
    try { saveSetting('hideNumbers', next); } catch {}
  }, [hideNumbers]);

  const applySuggestion = useCallback((walletId, newLimit) => {
    const w = wallets.find(w => w.id === walletId);
    if (w) { updateWalletDetails(walletId, w.name, w.emoji, w.color, newLimit, w.billType); setWallets(loadWallets()); }
  }, [wallets]);

  const resetMonth = useCallback(() => {
    try { resetAllSpent(); setWallets(loadWallets()); setTransactions([]); setPrevMonth(loadPrevMonth()); } catch {}
  }, []);

  // ── Lock screen ───────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Text style={{ fontSize: 64, marginBottom: 20 }}>🔒</Text>
        <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Vault is locked</Text>
        <Text style={{ fontSize: 14, color: colors.text3, textAlign: 'center', marginBottom: 40 }}>Authenticate to access your budget</Text>
        <TouchableOpacity style={{ backgroundColor: colors.teal, borderRadius: 50, paddingHorizontal: 28, paddingVertical: 16 }} onPress={() => promptBiometric()}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>👆 Unlock with Biometrics</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currency   = settings.currency ?? { code: 'USD', symbol: '$', name: 'US Dollar' };
  const shared     = { wallets, transactions, currentMonth, currency };
  const walletOps  = { onAddWallet: addWallet, onEditWallet: editWallet, onDeleteWallet: deleteWallet, onReorderWallets: reorderWalletsCb };

  const drawerItems = [
    { id: 'Home',         icon: '🏠', label: 'Home',         sub: 'Dashboard'        },
    { id: 'Wallets',      icon: '👜', label: 'Wallets',      sub: 'Budget wallets'   },
    { id: 'Transactions', icon: '📋', label: 'Transactions', sub: 'All expenses'     },
    { id: 'Analysis',     icon: '📊', label: 'Analysis',     sub: 'Charts & stats'   },
    { id: 'Insights',     icon: '🧠', label: 'Insights',     sub: 'Smart suggestions'},
    { id: 'GiftCards',    icon: '🎁', label: 'Gift Cards',  sub: 'Track stored value'   },
    { id: 'Goals',        icon: '🎯', label: 'Goals',        sub: 'Savings goals'    },
    { id: 'Income',       icon: '💼', label: 'Income',       sub: 'Income tracking'  },
    { id: 'Debts',        icon: '🤝', label: 'Debts',        sub: 'Lent & borrowed'  },
    { id: 'More',         icon: '⚙️', label: 'Settings',     sub: 'App settings'    },
  ];

  function renderScreen() {
    switch (activeTab) {
      case 'Home':
        return (
          <HomeScreen
            {...shared}
            income={income} debts={debts} goals={goals} giftCards={giftCards}
            onOpenDrawer={() => setDrawerOpen(true)}
            onNavigate={setActiveTab}
            isDark={isDark}
            onAddExpense={addExpense}
            customTags={customTags}
            onCreateTag={createTag}
          />
        );
      case 'Wallets':
        return (
          <WalletsScreen
            {...shared} {...walletOps}
            onAddExpense={addExpense}
            onMonthChange={setCurrentMonth}
            onOpenDrawer={() => setDrawerOpen(true)}
            customTags={customTags}
            onCreateTag={createTag}
          />
        );
      case 'Analysis':
        return <AnalysisScreen {...shared} customTags={customTags} />;
      case 'Insights':
        return <InsightsScreen {...shared} income={income} prevMonthData={prevMonth} onApplySuggestion={applySuggestion} />;
      case 'GiftCards':
        return (
          <GiftCardsScreen
            giftCards={giftCards}
            currency={currency}
            onAddCard={addGiftCard}
            onUseCard={useGiftCard}
            onDeleteCard={deleteGiftCard}
          />
        );
      case 'Goals':
        return (
          <GoalsScreen
            goals={goals} wallets={wallets} currency={currency}
            onAddGoal={addGoal}
            onEditGoal={editGoalCb}
            onDeleteGoal={deleteGoalCb}
            onAddProgress={addGoalProgress}
            onDeleteProgress={deleteGoalProgressCb}
          />
        );
      case 'Income':
        return <IncomeScreen income={income} onAddIncome={addIncome} onDeleteIncome={deleteIncome} currency={currency} />;
      case 'Debts':
        return <DebtScreen debts={debts} wallets={wallets} onAddDebt={addDebt} onSettleDebt={settleDebt} onDeleteDebt={deleteDebt} currency={currency} />;
      case 'Transactions':
        return (
          <TransactionsScreen
            {...shared}
            onDeleteTransaction={deleteTransactionCb}
            onUpdateTransaction={updateTransactionCb}
          />
        );
      case 'More':
        return (
          <MoreScreen
            {...shared} {...walletOps}
            recurring={recurring}
            onResetMonth={resetMonth}
            onDeleteRecurring={deleteRecurring}
            onToggleRecurring={toggleRecurring}
            onChangeCurrency={changeCurrency}
            onDeleteTransaction={deleteTransactionCb}
          />
        );
      default: return null;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
      {renderScreen()}
      <BottomNav active={activeTab} onPress={setActiveTab} />
      <Drawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={setActiveTab}
        currentRoute={activeTab}
        wallets={wallets}
        items={drawerItems}
        transactions={transactions}
        currentMonth={currentMonth}
      />
    </View>
  );
}

export default function App() {
  const [state, setState] = useState({ status: 'loading', seed: null, error: null });

  useEffect(() => {
    try {
      initDb();
      const settings     = loadSettings();
      const wallets      = loadWallets();
      const transactions = loadTransactions();
      const income       = loadIncome();
      const debts        = loadDebts();
      const recurring    = loadRecurring();
      const prevMonth    = loadPrevMonth();
      const customTags   = loadCustomTags();
      const goals        = loadGoals();
      const giftCards    = loadGiftCards();
      setState({ status: 'ready', seed: { settings, wallets, transactions, income, debts, recurring, prevMonth, customTags, goals, giftCards }, error: null });
    } catch (e) {
      console.error('[App] initDb:', e);
      setState({ status: 'error', seed: null, error: e.message });
    }
  }, []);

  if (state.status === 'loading') return (
    <SafeAreaProvider>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1a17' }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 16, color: '#9abfb8', fontWeight: '600' }}>Loading Vault...</Text>
      </View>
    </SafeAreaProvider>
  );

  if (state.status === 'error') return (
    <SafeAreaProvider>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1a2520', marginBottom: 8 }}>Database Error</Text>
        <Text style={{ fontSize: 13, color: '#888', textAlign: 'center' }}>{state.error}</Text>
      </View>
    </SafeAreaProvider>
  );

  const { seed } = state;
  const initialTheme = seed.settings.theme === 'light' || seed.settings.theme === 'dark' ? seed.settings.theme : null;

  return (
    <SafeAreaProvider>
      <ThemeProvider initialTheme={initialTheme} onThemeChange={(mode) => saveSetting('theme', mode ?? 'system')}>
        <AppInner seed={seed} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
