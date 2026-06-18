import React, { useState, useEffect } from 'react';
import { Pocket, Transaction, Budget, Notification, UserProfile, PocketType, Account, Category } from './types';
import {
  INITIAL_POCKETS,
  INITIAL_TRANSACTIONS,
  INITIAL_BUDGETS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACCOUNTS,
  CATEGORIES
} from './mockData';
import { getDefaultProfile } from './utils';

// Import Views
import Login from './components/Login';
import HomeDashboard from './components/HomeDashboard';
import AccountView from './components/AccountView';
import BudgetModal from './components/BudgetModal';
import ActivityView from './components/ActivityView';
import ProfileView from './components/ProfileView';
import { AppSettings } from './components/ProfileView';
import AddTransactionModal from './components/AddTransactionModal';
import BrandLogo from './components/BrandLogo';
import PocketManagerModal from './components/PocketManagerModal';
import CategoryManagerModal from './components/CategoryManagerModal';
import TransactionHistoryView from './components/TransactionHistoryView';
import TransactionHistoryPage from './components/TransactionHistoryPage';

// Icons for navigation
import { Home, Wallet, PlusCircle, LineChart, User, Receipt } from 'lucide-react';

const recalculateBalances = (
  currentTransactions: Transaction[],
  currentPockets: Pocket[],
  currentAccounts: Account[]
) => {
  const updatedPockets = currentPockets.map(p => {
    const pocketTrans = currentTransactions.filter(t => t.pocketId === p.id);
    const balance = pocketTrans.reduce((sum, t) => {
      const delta = t.type === 'incoming' ? t.amount : -t.amount;
      return sum + delta;
    }, 0);
    return { ...p, balance: Math.max(0, balance) };
  });

  const updatedAccounts = currentAccounts.map(a => {
    const accTrans = currentTransactions.filter(t => t.accountId === a.id);
    const balance = accTrans.reduce((sum, t) => {
      const delta = t.type === 'incoming' ? t.amount : -t.amount;
      return sum + delta;
    }, 0);
    return { ...a, balance: Math.max(0, balance) };
  });

  return { updatedPockets, updatedAccounts };
};


export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [pockets, setPockets] = useState<Pocket[]>(INITIAL_POCKETS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [budgets, setBudgets] = useState<Budget[]>(INITIAL_BUDGETS);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isPocketManagerOpen, setIsPocketManagerOpen] = useState<boolean>(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState<boolean>(false);
  const [historyInitialFilter, setHistoryInitialFilter] = useState<{ category?: string } | undefined>(undefined);

  const DEFAULT_SETTINGS: AppSettings = { currency: 'IDR', theme: 'dark', alarmRem: true };
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Load state from localStorage on boot & bind Firebase Auth state callback
  useEffect(() => {
    const savedUser = localStorage.getItem('kantongku_user');
    const parsedUser = savedUser ? JSON.parse(savedUser) : null;
    const stored = readStoredState(parsedUser?.email);

    const loadedPockets = stored.pockets ? JSON.parse(stored.pockets) : INITIAL_POCKETS;
    const loadedTransactions = stored.transactions ? JSON.parse(stored.transactions) : INITIAL_TRANSACTIONS;
    const loadedAccounts = stored.accounts ? JSON.parse(stored.accounts) : INITIAL_ACCOUNTS;
    const loadedCategories = stored.categories ? JSON.parse(stored.categories) : CATEGORIES;

    if (savedUser) setCurrentUser(parsedUser);
    
    const { updatedPockets, updatedAccounts } = recalculateBalances(loadedTransactions, loadedPockets, loadedAccounts);

    setPockets(updatedPockets);
    setTransactions(loadedTransactions);
    setAccounts(updatedAccounts);
    setCategories(loadedCategories);

    if (stored.budgets) setBudgets(JSON.parse(stored.budgets));
    if (stored.notifications) setNotifications(JSON.parse(stored.notifications));

    // Load app settings
    const savedSettings = localStorage.getItem('kantongku_settings');
    if (savedSettings) setAppSettings(JSON.parse(savedSettings));

    // Register callback for Firebase Auth state changes
    (window as any).onAuthStateChangedCallback = (firebaseUser: any) => {
      console.log("[Firebase Auth State] Changed:", firebaseUser);
      if (firebaseUser) {
        // User is logged in
        const storagePrefix = getStoragePrefix(firebaseUser.email);
        const storedProfileStr = localStorage.getItem(`${storagePrefix}profile`);
        let profile;
        if (storedProfileStr) {
          try {
            profile = JSON.parse(storedProfileStr);
            profile.email = firebaseUser.email;
          } catch (e) {
            profile = getDefaultProfile(firebaseUser.email, firebaseUser.displayName, firebaseUser.photoURL);
          }
        } else {
          profile = getDefaultProfile(firebaseUser.email, firebaseUser.displayName, firebaseUser.photoURL);
        }
        setCurrentUser(profile);
        localStorage.setItem('kantongku_user', JSON.stringify(profile));
        setActiveTab('home');
      } else {
        // User is logged out
        setCurrentUser(null);
        localStorage.removeItem('kantongku_user');
      }
    };

    return () => {
      delete (window as any).onAuthStateChangedCallback;
    };
  }, []);

  // Expose global firebase simpanTransaksiKeFirebase function as requested by guidelines
  useEffect(() => {
    (window as any).simpanTransaksiKeFirebase = (jsonParsed: any) => {
      console.log("[Firebase Simulator] simpanTransaksiKeFirebase called:", jsonParsed);
      if (!jsonParsed) return;

      const nominal = Number(jsonParsed.nominal || 0);
      const catatan = jsonParsed.catatan || 'Transaksi Baru';
      const kategoriRaw = String(jsonParsed.kategori || '').toLowerCase();
      const tipeRaw = String(jsonParsed.tipe || 'pengeluaran').toLowerCase();
      
      // Ambil parameter baru hasil analisis cerdas server.ts
      const sumberDanaRaw = String(jsonParsed.sumber_dana || 'Cash').toLowerCase();
      const kepemilikanRaw = String(jsonParsed.kepemilikan || 'Uangku').toLowerCase();

      // 1. Tentukan KANTONG (Pocket) berdasarkan Kepemilikan dari AI
      let pocketId = pockets[0]?.id || 'pribadi';
      if (kepemilikanRaw.includes('bisnis')) {
        pocketId = pockets.find(p => p.id === 'bisnis' || p.name.toLowerCase().includes('bisnis'))?.id || pocketId;
      } else if (kepemilikanRaw.includes('orang') || kepemilikanRaw.includes('grup') || kepemilikanRaw.includes('kas')) {
        pocketId = pockets.find(p => p.id === 'kas' || p.name.toLowerCase().includes('kas'))?.id || pocketId;
      }

      // 2. Tentukan REKENING (Account) berdasarkan Sumber Dana dari AI
      let accountId = accounts[0]?.id || 'acc-bca';
      if (sumberDanaRaw.includes('cash') || sumberDanaRaw.includes('tunai')) {
        const cashAcc = accounts.find(a => a.icon === 'cash' || a.id.toLowerCase().includes('cash'));
        if (cashAcc) accountId = cashAcc.id;
      } else if (sumberDanaRaw.includes('dana')) {
        const danaAcc = accounts.find(a => a.id.toLowerCase().includes('dana') || a.name.toLowerCase().includes('dana'));
        if (danaAcc) accountId = danaAcc.id;
      } else if (sumberDanaRaw.includes('gopay')) {
        const gopayAcc = accounts.find(a => a.id.toLowerCase().includes('gopay') || a.name.toLowerCase().includes('gopay'));
        if (gopayAcc) accountId = gopayAcc.id;
      } else if (sumberDanaRaw.includes('bca')) {
        const bcaAcc = accounts.find(a => a.id.toLowerCase().includes('bca') || a.name.toLowerCase().includes('bca'));
        if (bcaAcc) accountId = bcaAcc.id;
      }

      // 3. Tentukan KATEGORI secara dinamis
      let category = categories[categories.length - 1]?.id || 'lainnya';
      const matchedCategory = categories.find(cat => 
        kategoriRaw.includes(cat.name.toLowerCase()) || 
        cat.name.toLowerCase().includes(kategoriRaw) ||
        kategoriRaw.includes(cat.id.toLowerCase())
      );
      if (matchedCategory) {
        category = matchedCategory.id;
      } else {
        if (kategoriRaw.includes('makan') || kategoriRaw.includes('culinary')) {
          category = categories.find(c => c.id === 'makan' || c.name.toLowerCase().includes('makan'))?.id || category;
        } else if (kategoriRaw.includes('belanja') || kategoriRaw.includes('grosir')) {
          category = categories.find(c => c.id === 'belanja' || c.name.toLowerCase().includes('belanja'))?.id || category;
        } else if (kategoriRaw.includes('kopi') || kategoriRaw.includes('minum') || kategoriRaw.includes('jajan')) {
          category = categories.find(c => c.id === 'kopi' || c.name.toLowerCase().includes('kopi') || c.name.toLowerCase().includes('jajan'))?.id || category;
        } else if (kategoriRaw.includes('gaji') || kategoriRaw.includes('pendapatan')) {
          category = categories.find(c => c.id === 'pendapatan' || c.name.toLowerCase().includes('pendapatan'))?.id || category;
        }
      }

      // 4. Tentukan Tipe Transaksi
      let type: 'incoming' | 'outgoing' = tipeRaw === 'pemasukan' ? 'incoming' : 'outgoing';

      handleAddTransaction({
        title: catatan,
        amount: nominal,
        pocketId,
        accountId,
        category,
        type,
        notes: `Dianalisis AI via Suara/Media: ${catatan}`
      });

      alert(`Sukses Menyimpan ke Perangkat!\nTransaksi: "${catatan}" senilai Rp ${nominal.toLocaleString('id-ID')} masuk ke Kantong ${pocketId.toUpperCase()} & Rekening ${accountId.toUpperCase()}.`);
    };

    // Bind React data deletion helpers globally so index.html Script can update state as well
    (window as any).handleDeleteTransaction = handleDeleteTransaction;
    (window as any).handleDeleteBudget = handleDeleteBudget;
    (window as any).hitungUlangTotalSaldo = () => {
      console.log("[React] hitungUlangTotalSaldo triggered.");
    };

    return () => {
      delete (window as any).simpanTransaksiKeFirebase;
      delete (window as any).handleDeleteTransaction;
      delete (window as any).handleDeleteBudget;
      delete (window as any).hitungUlangTotalSaldo;
    };
  }, [pockets, transactions, budgets, notifications, accounts]);

  // Expose kirimKeGeminiAI globally to meet requested specification with secure server-side proxy
  useEffect(() => {
    (window as any).kirimKeGeminiAI = async function (mediaData: string, tipeMedia: string) {
      console.log("[Gemini API Channel] kirimKeGeminiAI invoked for format:", tipeMedia);

      try {
        // Primary route: Secure full-stack server proxy so private API Keys aren't sent to the browser
        const response = await fetch('/api/parse-media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mediaData, tipeMedia }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Gagal menghubungi asisten AI');
        }

        const jsonParsed = await response.json();
        console.log("[Gemini API Channel] JSON parsed safely:", jsonParsed);
        
        // Save the parsed transaction and update budgets
        (window as any).simpanTransaksiKeFirebase(jsonParsed);
        return jsonParsed;
      } catch (err: any) {
        console.error("[Gemini API Channel] Error:", err.message);
        throw err;
      }
    };

    return () => {
      delete (window as any).kirimKeGeminiAI;
    };
  }, []);

  const updateStateAndStorage = (
    newTransactions: Transaction[],
    newPockets: Pocket[],
    newAccounts: Account[],
    newBudgets: Budget[] = budgets,
    newNotifications: Notification[] = notifications,
    newCategories: Category[] = categories
  ) => {
    const { updatedPockets, updatedAccounts } = recalculateBalances(newTransactions, newPockets, newAccounts);
    setPockets(updatedPockets);
    setAccounts(updatedAccounts);
    setTransactions(newTransactions);
    setBudgets(newBudgets);
    setNotifications(newNotifications);
    setCategories(newCategories);
    saveStateToStorage(updatedPockets, newTransactions, newBudgets, newNotifications, updatedAccounts, newCategories);
  };

  // Sync state mutations to localStorage
  const saveStateToStorage = (
    updatedPockets: Pocket[],
    updatedTransactions: Transaction[],
    updatedBudgets: Budget[],
    updatedNotifications: Notification[],
    updatedAccounts: Account[],
    updatedCategories: Category[] = categories
  ) => {
    const storagePrefix = getStoragePrefix(currentUser?.email || 'shared');

    localStorage.setItem(`${storagePrefix}pockets`, JSON.stringify(updatedPockets));
    localStorage.setItem(`${storagePrefix}transactions`, JSON.stringify(updatedTransactions));
    localStorage.setItem(`${storagePrefix}budgets`, JSON.stringify(updatedBudgets));
    localStorage.setItem(`${storagePrefix}notifications`, JSON.stringify(updatedNotifications));
    localStorage.setItem(`${storagePrefix}accounts`, JSON.stringify(updatedAccounts));
    localStorage.setItem(`${storagePrefix}categories`, JSON.stringify(updatedCategories));
  };

  const handleLogin = (email: string) => {
    const storagePrefix = getStoragePrefix(email);
    const storedProfileStr = localStorage.getItem(`${storagePrefix}profile`);
    let profile;
    if (storedProfileStr) {
      try {
        profile = JSON.parse(storedProfileStr);
        profile.email = email;
      } catch (e) {
        profile = getDefaultProfile(email);
      }
    } else {
      profile = getDefaultProfile(email);
    }
    const stored = readStoredState(email);

    if (stored.pockets) {
      const loadedPockets = JSON.parse(stored.pockets);
      const loadedTransactions = stored.transactions ? JSON.parse(stored.transactions) : INITIAL_TRANSACTIONS;
      const loadedAccounts = stored.accounts ? JSON.parse(stored.accounts) : INITIAL_ACCOUNTS;
      const loadedCategories = stored.categories ? JSON.parse(stored.categories) : CATEGORIES;
      const { updatedPockets, updatedAccounts } = recalculateBalances(loadedTransactions, loadedPockets, loadedAccounts);

      setPockets(updatedPockets);
      setTransactions(loadedTransactions);
      setAccounts(updatedAccounts);
      setCategories(loadedCategories);
      if (stored.budgets) setBudgets(JSON.parse(stored.budgets));
      if (stored.notifications) setNotifications(JSON.parse(stored.notifications));
    }

    setCurrentUser(profile);
    localStorage.setItem('kantongku_user', JSON.stringify(profile));
    setActiveTab('home');
  };

  const handleLogout = async () => {
    if ((window as any).keluarAkunFirebase) {
      try {
        await (window as any).keluarAkunFirebase();
      } catch (err) {
        console.error("Firebase logout failed:", err);
      }
    }
    setCurrentUser(null);
    localStorage.removeItem('kantongku_user');
    setActiveTab('home');
  };

  const handleResetData = () => {
    const { updatedPockets, updatedAccounts } = recalculateBalances(INITIAL_TRANSACTIONS, INITIAL_POCKETS, INITIAL_ACCOUNTS);
    setPockets(updatedPockets);
    setTransactions(INITIAL_TRANSACTIONS);
    setBudgets(INITIAL_BUDGETS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAccounts(updatedAccounts);
    setCategories(CATEGORIES);
    saveStateToStorage(updatedPockets, INITIAL_TRANSACTIONS, INITIAL_BUDGETS, INITIAL_NOTIFICATIONS, updatedAccounts, CATEGORIES);
    alert('Asisten KantongKu berhasil dikembalikan ke data mockup awal.');
  };

  // Mark all notifications as read
  const handleMarkAllNotificationsRead = () => {
    const updatedNotifications = notifications.map((n) => ({ ...n, isRead: true }));
    updateStateAndStorage(transactions, pockets, accounts, budgets, updatedNotifications, categories);
  };

  // Add transaction logic with reactive wallet & budget computations
  const handleAddTransaction = (newTransData: Omit<Transaction, 'id' | 'date'> & { date?: string }) => {
    const newTransaction: Transaction = {
      ...newTransData,
      id: `t-${Date.now()}`,
      date: newTransData.date || new Date().toISOString()
    };

    const nextTransactions = [newTransaction, ...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Increment budget spending if it matches categories
    const nextBudgets = budgets.map((b) => {
      if (b.category === newTransaction.category && newTransaction.type === 'outgoing') {
        const nextSpent = b.spent + newTransaction.amount;
        const remaining = b.limit - nextSpent;
        const nextPercent = Math.max(0, Math.round((remaining / b.limit) * 100));
        return {
          ...b,
          spent: nextSpent,
          sisaPercent: nextPercent
        };
      }
      return b;
    });

    // Fire dynamic alarm notifications
    let nextNotifications = [...notifications];
    
    // Check if target limits have been surpassed or reached warning zone
    const targetBudgetObj = nextBudgets.find(b => b.category === newTransaction.category);
    if (targetBudgetObj && targetBudgetObj.type === 'expense_limit') {
      const remainingRatio = (targetBudgetObj.limit - targetBudgetObj.spent) / targetBudgetObj.limit;
      if (remainingRatio <= 0.20 && remainingRatio > 0) {
        const alertNotif: Notification = {
          id: `n-${Date.now()}`,
          title: 'Rem Finansial',
          message: `Opps! Sisa anggaran jatah jajan "${targetBudgetObj.title}" sisa ${Math.round(remainingRatio * 100)}%. Batasi pembelian agar tetap aman!`,
          time: 'Baru Saja',
          isRead: false,
          type: 'warning'
        };
        nextNotifications = [alertNotif, ...nextNotifications];
      }
    }

    updateStateAndStorage(nextTransactions, pockets, accounts, nextBudgets, nextNotifications);
  };

  // Delete transaction operation
  const handleDeleteTransaction = (id: string) => {
    const target = transactions.find(t => t.id === id);
    if (!target) return;

    const nextTransactions = transactions.filter(t => t.id !== id);

    // Rollback budget spent counters
    const nextBudgets = budgets.map((b) => {
      if (b.category === target.category && target.type === 'outgoing') {
        const nextSpent = Math.max(0, b.spent - target.amount);
        const remaining = b.limit - nextSpent;
        const nextPercent = Math.max(0, Math.round((remaining / b.limit) * 100));
        return { ...b, spent: nextSpent, sisaPercent: nextPercent };
      }
      return b;
    });

    updateStateAndStorage(nextTransactions, pockets, accounts, nextBudgets);
  };

  const handleEditTransactionSelect = (t: Transaction) => {
    setEditingTransaction(t);
    setIsAddModalOpen(true);
  };

  const handleEditTransaction = (editedTrans: Transaction) => {
    const originalTrans = transactions.find(t => t.id === editedTrans.id);
    if (!originalTrans) return;

    // 1. Revert original transaction's effect on budgets
    let nextBudgets = budgets.map((b) => {
      if (b.category === originalTrans.category && originalTrans.type === 'outgoing') {
        const nextSpent = Math.max(0, b.spent - originalTrans.amount);
        const remaining = b.limit - nextSpent;
        const nextPercent = Math.max(0, Math.round((remaining / b.limit) * 100));
        return { ...b, spent: nextSpent, sisaPercent: nextPercent };
      }
      return b;
    });

    // 2. Apply new transaction's effect on budgets
    nextBudgets = nextBudgets.map((b) => {
      if (b.category === editedTrans.category && editedTrans.type === 'outgoing') {
        const nextSpent = b.spent + editedTrans.amount;
        const remaining = b.limit - nextSpent;
        const nextPercent = Math.max(0, Math.round((remaining / b.limit) * 100));
        return { ...b, spent: nextSpent, sisaPercent: nextPercent };
      }
      return b;
    });

    // 3. Update the transaction in the list
    const nextTransactions = transactions.map(t => t.id === editedTrans.id ? editedTrans : t).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Fire dynamic alarm notifications
    let nextNotifications = [...notifications];
    const targetBudgetObj = nextBudgets.find(b => b.category === editedTrans.category);
    if (targetBudgetObj && targetBudgetObj.type === 'expense_limit' && editedTrans.type === 'outgoing') {
      const remainingRatio = (targetBudgetObj.limit - targetBudgetObj.spent) / targetBudgetObj.limit;
      if (remainingRatio <= 0.20 && remainingRatio > 0) {
        const alertNotif: Notification = {
          id: `n-${Date.now()}`,
          title: 'Rem Finansial',
          message: `Opps! Sisa anggaran jatah jajan "${targetBudgetObj.title}" sisa ${Math.round(remainingRatio * 100)}%. Batasi pembelian agar tetap aman!`,
          time: 'Baru Saja',
          isRead: false,
          type: 'warning'
        };
        nextNotifications = [alertNotif, ...nextNotifications];
      }
    }

    updateStateAndStorage(nextTransactions, pockets, accounts, nextBudgets, nextNotifications);
    setEditingTransaction(null);
  };

  // Core add budget target logic
  const handleAddBudget = (newBudData: Omit<Budget, 'id' | 'sisaPercent'>) => {
    const remaining = newBudData.limit - newBudData.spent;
    const initialPercent = Math.max(0, Math.round((remaining / newBudData.limit) * 100));
    
    const newBudget: Budget = {
      ...newBudData,
      id: `b-${Date.now()}`,
      sisaPercent: initialPercent
    };

    const updatedBudgets = [newBudget, ...budgets];
    setBudgets(updatedBudgets);
    saveStateToStorage(pockets, transactions, updatedBudgets, notifications, accounts);
  };

  const handleDeleteBudget = (id: string) => {
    const updatedBudgets = budgets.filter(b => b.id !== id);
    setBudgets(updatedBudgets);
    saveStateToStorage(pockets, transactions, updatedBudgets, notifications, accounts);
  };

  // CRUD Handlers for Pockets
  // CRUD Handlers for Pockets
  const handleAddPocket = (newPocData: Omit<Pocket, 'balance'> & { initialBalance: number }) => {
    const newPocket: Pocket = {
      id: newPocData.id,
      name: newPocData.name,
      balance: 0,
      icon: newPocData.icon,
      tag: newPocData.tag,
      color: newPocData.color
    };

    const nextPockets = [...pockets, newPocket];

    // If initialBalance > 0, generate an incoming transaction to history
    let nextTransactions = transactions;
    if (newPocData.initialBalance > 0) {
      const primaryAccId = accounts[0]?.id || 'acc-bca';
      const initialTrans: Transaction = {
        id: `t-init-${Date.now()}`,
        title: `Saldo Awal ${newPocData.name}`,
        amount: newPocData.initialBalance,
        type: 'incoming',
        pocketId: newPocData.id,
        accountId: primaryAccId,
        category: 'pendapatan',
        date: new Date().toISOString()
      };
      nextTransactions = [initialTrans, ...transactions];
    }

    updateStateAndStorage(nextTransactions, nextPockets, accounts);
  };

  const handleEditPocket = (updatedPocket: Pocket) => {
    const nextPockets = pockets.map(p => p.id === updatedPocket.id ? updatedPocket : p);
    updateStateAndStorage(transactions, nextPockets, accounts);
  };

  const handleDeletePocket = (id: string) => {
    // 1. Find all transactions associated with this pocket
    const targetTrans = transactions.filter(t => t.pocketId === id);
    const targetTransIds = new Set(targetTrans.map(t => t.id));

    // 2. Rollback budgets spent counter
    const nextBudgets = budgets.map((b) => {
      // Find deleted outgoing transactions matching this budget's category
      const budgetDeletedTrans = targetTrans.filter(t => t.category === b.category && t.type === 'outgoing');
      const totalAmount = budgetDeletedTrans.reduce((sum, t) => sum + t.amount, 0);
      const nextSpent = Math.max(0, b.spent - totalAmount);
      const remaining = b.limit - nextSpent;
      const nextPercent = Math.max(0, Math.round((remaining / b.limit) * 100));
      return {
        ...b,
        spent: nextSpent,
        sisaPercent: nextPercent
      };
    });

    // 3. Filter out transactions
    const nextTransactions = transactions.filter(t => !targetTransIds.has(t.id));

    // 4. Delete pocket
    const nextPockets = pockets.filter(p => p.id !== id);

    updateStateAndStorage(nextTransactions, nextPockets, accounts, nextBudgets);
  };

  const handleReorderPockets = (reorderedPockets: Pocket[]) => {
    updateStateAndStorage(transactions, reorderedPockets, accounts);
  };

  // Simulate instant secure pocket-to-pocket transfers
  const handlePocketTransferSimulate = (fromId: PocketType, toId: PocketType, amount: number) => {
    const sourcePocket = pockets.find(p => p.id === fromId);
    if (!sourcePocket || sourcePocket.balance < amount) {
      alert('Maaf, saldo di kantong pengirim tidak mencukupi untuk melakukan transfer ini.');
      return;
    }

    // Create double-entry transactions (out from source, in to destination)
    const fromLabel = pockets.find(p => p.id === fromId)?.name || 'Sumber';
    const toLabel = pockets.find(p => p.id === toId)?.name || 'Tujuan';
    const primaryAccId = accounts[0]?.id || 'acc-bca';
    
    const outTrans: Transaction = {
      id: `t-trsf-out-${Date.now()}`,
      title: `Trsf ke Kantong ${toLabel}`,
      amount: amount,
      type: 'outgoing',
      pocketId: fromId,
      accountId: primaryAccId,
      category: 'lainnya',
      date: new Date().toISOString()
    };

    const inTrans: Transaction = {
      id: `t-trsf-in-${Date.now()}`,
      title: `Trsf dari Kantong ${fromLabel}`,
      amount: amount,
      type: 'incoming',
      pocketId: toId,
      accountId: primaryAccId,
      category: 'lainnya',
      date: new Date().toISOString()
    };

    const nextTransactions = [outTrans, inTrans, ...transactions];

    const transferNotif: Notification = {
      id: `n-trans-${Date.now()}`,
      title: 'Pemindahan Buku Berhasil',
      message: `Pemindahan saldo dari Kantong "${fromLabel}" ke "${toLabel}" sejumlah ${amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })} berhasil disimpan.`,
      time: 'Baru Saja',
      isRead: false,
      type: 'info'
    };

    const nextNotifications = [transferNotif, ...notifications];

    updateStateAndStorage(nextTransactions, pockets, accounts, budgets, nextNotifications);
  };

  // CRUD Handlers for Accounts (Rekening)
  const handleAddAccount = (newAccData: Omit<Account, 'balance'> & { initialBalance: number }) => {
    const newAccount: Account = {
      id: newAccData.id,
      name: newAccData.name,
      balance: 0,
      icon: newAccData.icon,
      color: newAccData.color,
      tag: newAccData.tag
    };

    const nextAccounts = [...accounts, newAccount];

    // Generating an incoming transaction if initial balance > 0
    let nextTransactions = transactions;
    if (newAccData.initialBalance > 0) {
      const defaultPocketId = pockets[0]?.id || 'pribadi';
      const initialTrans: Transaction = {
        id: `t-accinit-${Date.now()}`,
        title: `Saldo Awal ${newAccData.name}`,
        amount: newAccData.initialBalance,
        type: 'incoming',
        pocketId: defaultPocketId,
        accountId: newAccount.id,
        category: 'pendapatan',
        date: new Date().toISOString()
      };
      nextTransactions = [initialTrans, ...transactions];
    }

    updateStateAndStorage(nextTransactions, pockets, nextAccounts);
  };

  const handleEditAccount = (updatedAccount: Account) => {
    const nextAccounts = accounts.map(a => a.id === updatedAccount.id ? updatedAccount : a);
    updateStateAndStorage(transactions, pockets, nextAccounts);
  };

  const handleDeleteAccount = (id: string) => {
    // 1. Find all transactions associated with this account
    const targetTrans = transactions.filter(t => t.accountId === id);
    const targetTransIds = new Set(targetTrans.map(t => t.id));

    // 2. Rollback budgets spent counter
    const nextBudgets = budgets.map((b) => {
      // Find deleted outgoing transactions matching this budget's category
      const budgetDeletedTrans = targetTrans.filter(t => t.category === b.category && t.type === 'outgoing');
      const totalAmount = budgetDeletedTrans.reduce((sum, t) => sum + t.amount, 0);
      const nextSpent = Math.max(0, b.spent - totalAmount);
      const remaining = b.limit - nextSpent;
      const nextPercent = Math.max(0, Math.round((remaining / b.limit) * 100));
      return {
        ...b,
        spent: nextSpent,
        sisaPercent: nextPercent
      };
    });

    // 3. Filter out transactions
    const nextTransactions = transactions.filter(t => !targetTransIds.has(t.id));

    // 4. Delete account
    const nextAccounts = accounts.filter(a => a.id !== id);

    updateStateAndStorage(nextTransactions, pockets, nextAccounts, nextBudgets);
  };

  const handleSaveAllocations = (accountId: string, allocations: Record<string, number>) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    const newTransactions: Transaction[] = [];
    pockets.forEach(p => {
      // Calculate old allocation (sum of transactions for this account & pocket)
      const pocketTrans = transactions.filter(t => t.accountId === accountId && t.pocketId === p.id);
      const oldAlloc = pocketTrans.reduce((sum, t) => {
        const delta = t.type === 'incoming' ? t.amount : -t.amount;
        return sum + delta;
      }, 0);

      const newAlloc = allocations[p.id] || 0;
      const difference = newAlloc - oldAlloc;

      if (difference !== 0) {
        // Create adjustment transaction
        const adjTrans: Transaction = {
          id: `t-adj-${Date.now()}-${p.id}`,
          title: `Penyesuaian Alokasi ${p.name}`,
          amount: Math.abs(difference),
          type: difference > 0 ? 'incoming' : 'outgoing',
          pocketId: p.id,
          accountId: accountId,
          category: 'lainnya',
          date: new Date().toISOString(),
          notes: `Penyesuaian alokasi dana untuk dompet ${account.name}`
        };
        newTransactions.push(adjTrans);
      }
    });

    const nextTransactions = [...newTransactions, ...transactions];
    updateStateAndStorage(nextTransactions, pockets, accounts);
  };

  const handleAddCategory = (newCat: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...newCat,
      id: `cat-${Date.now()}`
    };
    const nextCategories = [...categories, newCategory];
    updateStateAndStorage(transactions, pockets, accounts, budgets, notifications, nextCategories);
  };

  const handleEditCategory = (updatedCat: Category) => {
    const nextCategories = categories.map(c => c.id === updatedCat.id ? updatedCat : c);
    updateStateAndStorage(transactions, pockets, accounts, budgets, notifications, nextCategories);
  };

  const handleDeleteCategory = (id: string) => {
    const nextCategories = categories.filter(c => c.id !== id);
    
    // Cascade delete: remove all transactions and budgets associated with this category
    const nextTransactions = transactions.filter(t => t.category !== id);
    const nextBudgets = budgets.filter(b => b.category !== id);
    
    updateStateAndStorage(nextTransactions, pockets, accounts, nextBudgets, notifications, nextCategories);
  };

  const handleReorderCategories = (reordered: Category[]) => {
    setCategories(reordered);
    saveStateToStorage(pockets, transactions, budgets, notifications, accounts, reordered);
  };

  const handleEditBudget = (updated: Budget) => {
    const nextBudgets = budgets.map(b => b.id === updated.id ? updated : b);
    updateStateAndStorage(transactions, pockets, accounts, nextBudgets, notifications, categories);
  };

  const handleReorderBudgets = (reordered: Budget[]) => {
    setBudgets(reordered);
    saveStateToStorage(pockets, transactions, reordered, notifications, accounts, categories);
  };

  const handleOpenHistory = (filter?: { category?: string }) => {
    setHistoryInitialFilter(filter);
    setActiveTab('history');
  };

  const handleSaveProfile = async (name: string, avatarUrl: string) => {
    if (!currentUser) return;
    if ((window as any).ubahProfilFirebase) {
      await (window as any).ubahProfilFirebase(name, avatarUrl);
    }
    const updated = { ...currentUser, name, avatarUrl };
    setCurrentUser(updated);
    localStorage.setItem('kantongku_user', JSON.stringify(updated));

    const storagePrefix = getStoragePrefix(currentUser.email);
    localStorage.setItem(`${storagePrefix}profile`, JSON.stringify(updated));
  };

  const handleChangePassword = async (oldPass: string, newPass: string) => {
    if ((window as any).ubahKataSandiFirebase) {
      await (window as any).ubahKataSandiFirebase(oldPass, newPass);
    }
  };

  const handleSaveSettings = (settings: AppSettings) => {
    setAppSettings(settings);
    localStorage.setItem('kantongku_settings', JSON.stringify(settings));
    // Apply theme
    if (settings.theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  };

  // Guard routing view: Login Check
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen text-white relative font-body-md antialiased overflow-x-hidden select-none bg-[#0B111E] flex flex-col md:flex-row">
      
      {/* Background Ambient Glow Layout */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-[-10%] w-[350px] h-[350px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 right-[-10%] w-[350px] h-[350px] rounded-full bg-secondary/5 blur-[120px]" />
      </div>

      {/* DESKTOP SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 bg-[#0F172A]/40 backdrop-blur-2xl p-6 h-screen sticky top-0 shrink-0 z-40">
        {/* Brand / Logo */}
        <div className="mb-8 px-2 flex items-center gap-2">
          <BrandLogo className="w-8 h-8 text-primary shrink-0" glow={false} />
          <span className="font-headline-md text-2xl font-bold text-primary tracking-tight glow-text-primary">
            KantongKu
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-2 flex-grow">
          {/* TAB: Home */}
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none ${activeTab === 'home' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-on-surface-variant/70 hover:text-white hover:bg-white/5'}`}
          >
            <Home className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">Home</span>
          </button>

          {/* TAB: Wallet */}
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none ${activeTab === 'wallet' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-on-surface-variant/70 hover:text-white hover:bg-white/5'}`}
          >
            <Wallet className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">Wallet</span>
          </button>

          {/* TAB: Analisis / Activity */}
          <button 
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none ${activeTab === 'activity' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-on-surface-variant/70 hover:text-white hover:bg-white/5'}`}
          >
            <LineChart className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">Analisis</span>
          </button>

          {/* TAB: Riwayat / History */}
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none ${activeTab === 'history' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-on-surface-variant/70 hover:text-white hover:bg-white/5'}`}
          >
            <Receipt className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">Riwayat</span>
          </button>

          {/* TAB: Profile Settings */}
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none ${activeTab === 'profile' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-on-surface-variant/70 hover:text-white hover:bg-white/5'}`}
          >
            <User className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">Profil</span>
          </button>
        </nav>

        {/* User profile section at the bottom of sidebar */}
        <div className="border-t border-white/5 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img 
              alt="User Avatar" 
              className="w-8 h-8 rounded-full border border-white/10 shrink-0 object-cover" 
              src={currentUser?.avatarUrl}
            />
            <span className="text-xs font-semibold text-white truncate max-w-[100px]">{currentUser?.name}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-[10px] uppercase font-label-caps tracking-wider text-rose-400 hover:text-rose-300 font-bold px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main View Container */}
      <div className="flex-grow min-h-screen pb-28 md:pb-8 flex flex-col relative z-10 w-full min-w-0">
        <div className="max-w-md md:max-w-5xl w-full mx-auto pt-4 md:pt-10 px-4 md:px-8">
          {/* Mobile persistent header */}
          <div className="w-full flex justify-center items-center gap-2 pb-3 md:hidden border-b border-white/5 mb-3">
            <BrandLogo className="w-7 h-7 text-primary shrink-0" glow={false} />
            <span className="font-headline-md text-2xl font-bold text-primary tracking-tight glow-text-primary">
              KantongKu
            </span>
          </div>

          {activeTab === 'home' && (
            <HomeDashboard
              pockets={pockets}
              transactions={transactions}
              notifications={notifications}
              userProfile={currentUser}
              categories={categories}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onDeleteTransaction={handleDeleteTransaction}
              onPocketTransferSimulate={handlePocketTransferSimulate}
              onChangeTab={setActiveTab}
              onOpenPocketManager={() => setIsPocketManagerOpen(true)}
              onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
              onEditTransactionSelect={handleEditTransactionSelect}
              onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              onOpenHistory={handleOpenHistory}
            />
          )}

          {activeTab === 'wallet' && (
            <AccountView 
              accounts={accounts}
              pockets={pockets}
              transactions={transactions}
              onAddAccount={handleAddAccount}
              onEditAccount={handleEditAccount}
              onDeleteAccount={handleDeleteAccount}
              onSaveAllocations={handleSaveAllocations}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityView 
              transactions={transactions}
              pockets={pockets}
              categories={categories}
              onOpenHistory={handleOpenHistory}
            />
          )}

          {activeTab === 'history' && (
            <TransactionHistoryPage
              transactions={transactions}
              pockets={pockets}
              accounts={accounts}
              categories={categories}
              initialFilter={historyInitialFilter}
              onEditTransactionSelect={handleEditTransactionSelect}
              onDeleteTransaction={handleDeleteTransaction}
              onBack={() => setActiveTab('home')}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView 
              userProfile={currentUser}
              appSettings={appSettings}
              onLogout={handleLogout}
              onResetData={handleResetData}
              onSaveProfile={handleSaveProfile}
              onSaveSettings={handleSaveSettings}
              onChangePassword={handleChangePassword}
            />
          )}
        </div>
      </div>

      {/* Global Add Floating modal panel bottom sheet */}
      <AddTransactionModal 
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTransaction(null);
        }}
        onAddTransaction={handleAddTransaction}
        editingTransaction={editingTransaction}
        onEditTransaction={handleEditTransaction}
        pockets={pockets}
        accounts={accounts}
        categories={categories}
        onOpenCategoryManager={() => {
          setIsAddModalOpen(false);
          setEditingTransaction(null);
          setIsCategoryManagerOpen(true);
        }}
      />

      {/* Budget Modal */}
      <BudgetModal 
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        budgets={budgets}
        onAddBudget={handleAddBudget}
        onEditBudget={handleEditBudget}
        onDeleteBudget={handleDeleteBudget}
        onReorderBudgets={handleReorderBudgets}
        categories={categories}
      />

      {/* Pocket Manager Modal */}
      <PocketManagerModal
        isOpen={isPocketManagerOpen}
        onClose={() => setIsPocketManagerOpen(false)}
        pockets={pockets}
        transactions={transactions}
        onAddPocket={handleAddPocket}
        onEditPocket={handleEditPocket}
        onDeletePocket={handleDeletePocket}
        onReorderPockets={handleReorderPockets}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        transactions={transactions}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        onReorderCategories={handleReorderCategories}
      />


      {/* FIXED BOTTOM HUD NAVIGATION (Verbatim mockups layout) */}
      <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 rounded-t-2xl bg-surface/70 border-t border-white/5 backdrop-blur-2xl px-6 pt-2 pb-6 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center relative">
          
          {/* TAB: Home */}
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all active:scale-95 duration-100 ${activeTab === 'home' ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(78,222,163,0.3)]' : 'text-on-surface-variant/70 hover:text-white'}`}
          >
            <Home className="w-5 h-5" />
            <span className="font-label-caps text-[9px] uppercase tracking-wider">Home</span>
          </button>

          {/* TAB: Wallet */}
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all active:scale-95 duration-100 ${activeTab === 'wallet' ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(78,222,163,0.3)]' : 'text-on-surface-variant/70 hover:text-white'}`}
          >
            <Wallet className="w-5 h-5" />
            <span className="font-label-caps text-[9px] uppercase tracking-wider">Wallet</span>
          </button>

          {/* TAB ACTION EMBED: Add Float trigger */}
          <div className="w-16 flex justify-center relative -top-7">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="w-13 h-13 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_4px_22px_rgba(78,222,163,0.4)] hover:scale-105 active:scale-90 transition-all font-bold group border border-primary/20"
              title="Catat Baru"
            >
              <PlusCircle className="w-8 h-8 text-on-primary stroke-[2.5]" />
            </button>
          </div>

          {/* TAB: Analytics / Activity */}
          <button 
            onClick={() => setActiveTab('activity')}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all active:scale-95 duration-100 ${activeTab === 'activity' ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(78,222,163,0.3)]' : 'text-on-surface-variant/70 hover:text-white'}`}
          >
            <LineChart className="w-5 h-5" />
            <span className="font-label-caps text-[9px] uppercase tracking-wider">Analisis</span>
          </button>

          {/* TAB: Profile Settings */}
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all active:scale-95 duration-100 ${activeTab === 'profile' ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(78,222,163,0.3)]' : 'text-on-surface-variant/70 hover:text-white'}`}
          >
            <User className="w-5 h-5" />
            <span className="font-label-caps text-[9px] uppercase tracking-wider">Profil</span>
          </button>

        </div>
      </nav>
    </div>
  );
}

const getStoragePrefix = (email?: string) => {
  const safeEmail = (email || 'shared')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');

  return `kantongku_${safeEmail}_`;
};

const readStoredState = (email?: string) => {
  const storagePrefix = getStoragePrefix(email);

  const readItem = (key: string) => {
    return localStorage.getItem(`${storagePrefix}${key}`)
      ?? localStorage.getItem(`kantongku_shared_${key}`)
      ?? localStorage.getItem(`kantongku_${key}`);
  };

  return {
    pockets: readItem('pockets'),
    transactions: readItem('transactions'),
    budgets: readItem('budgets'),
    notifications: readItem('notifications'),
    accounts: readItem('accounts'),
    categories: readItem('categories'),
  };
};
