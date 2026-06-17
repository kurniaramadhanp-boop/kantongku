import { Pocket, Category, Transaction, Budget, Notification, Account } from './types';

export const INITIAL_POCKETS: Pocket[] = [
  {
    id: 'pribadi',
    name: 'Uangku Sendiri',
    balance: 3000000,
    icon: 'wallet',
    tag: 'Aman dibelanjakan',
    color: 'emerald',
  },
  {
    id: 'kas',
    name: 'Uang Orang / Kas',
    balance: 5000000,
    icon: 'group',
    tag: 'Sebagai bendahara/panitia',
    color: 'indigo',
  },
  {
    id: 'bisnis',
    name: 'Uang Bisnis',
    balance: 2000000,
    icon: 'storefront',
    tag: 'Modal & Omset',
    color: 'amber',
  },
];

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc-bca',
    name: 'Bank BCA',
    balance: 8000000,
    icon: 'bank',
    color: 'indigo',
    tag: 'Rekening Utama',
  },
  {
    id: 'acc-gopay',
    name: 'GoPay',
    balance: 1500000,
    icon: 'smartphone',
    color: 'purple',
    tag: 'E-Wallet Belanja',
  },
  {
    id: 'acc-cash',
    name: 'Uang Tunai / Cash',
    balance: 500000,
    icon: 'cash',
    color: 'emerald',
    tag: 'Dompet Fisik',
  },
];

export const CATEGORIES: Category[] = [
  { id: 'makan', name: 'Makan-makan', icon: 'restaurant', color: 'rose' },
  { id: 'belanja', name: 'Belanja', icon: 'shopping_bag', color: 'orange' },
  { id: 'bisnis', name: 'Bahan Usaha', icon: 'inventory_2', color: 'amber' },
  { id: 'kopi', name: 'Jajan Kopi', icon: 'local_cafe', color: 'orange' },
  { id: 'olahraga', name: 'Olahraga', icon: 'sports_soccer', color: 'emerald' },
  { id: 'kesehatan', name: 'Kesehatan', icon: 'shield_heart', color: 'teal' },
  { id: 'sosial', name: 'Sosial', icon: 'diversity_1', color: 'indigo' },
  { id: 'pendapatan', name: 'Pendapatan', icon: 'payments', color: 'emerald' },
  { id: 'lainnya', name: 'Lain-lain', icon: 'more_horiz', color: 'slate' },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 't-init-gopay',
    title: 'Saldo Awal GoPay',
    amount: 1525000,
    type: 'incoming',
    pocketId: 'pribadi',
    accountId: 'acc-gopay',
    category: 'pendapatan',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
  },
  {
    id: 't-init-cash',
    title: 'Saldo Awal Tunai',
    amount: 650000,
    type: 'incoming',
    pocketId: 'pribadi',
    accountId: 'acc-cash',
    category: 'pendapatan',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
  },
  {
    id: 't-init-bca-pribadi',
    title: 'Saldo Awal Pribadi BCA',
    amount: 825000,
    type: 'incoming',
    pocketId: 'pribadi',
    accountId: 'acc-bca',
    category: 'pendapatan',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
  },
  {
    id: 't-init-bca-kas',
    title: 'Saldo Awal Kas BCA',
    amount: 7400000,
    type: 'incoming',
    pocketId: 'kas',
    accountId: 'acc-bca',
    category: 'pendapatan',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
  },
  {
    id: 't-init-bca-bisnis',
    title: 'Saldo Awal Bisnis BCA',
    amount: 2150000,
    type: 'incoming',
    pocketId: 'bisnis',
    accountId: 'acc-bca',
    category: 'pendapatan',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
  },
  {
    id: 't-default-1',
    title: 'Beli Kopi Susu',
    amount: 25000,
    type: 'outgoing',
    pocketId: 'pribadi',
    accountId: 'acc-gopay',
    category: 'kopi',
    date: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
  },
  {
    id: 't-default-2',
    title: 'Iuran Lapangan',
    amount: 100000,
    type: 'incoming',
    pocketId: 'kas',
    accountId: 'acc-bca',
    category: 'olahraga',
    date: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
  },
  {
    id: 't-default-3',
    title: 'Bahan Baku Dimsum',
    amount: 150000,
    type: 'outgoing',
    pocketId: 'bisnis',
    accountId: 'acc-bca',
    category: 'bisnis',
    date: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(), // 20 hours ago
  },
  {
    id: 't-default-4',
    title: 'Makan Malam',
    amount: 150000,
    type: 'outgoing',
    pocketId: 'pribadi',
    accountId: 'acc-cash',
    category: 'makan',
    date: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), // yesterday
  },
  {
    id: 't-default-5',
    title: 'Patungan Villa',
    amount: 2500000,
    type: 'incoming',
    pocketId: 'kas',
    accountId: 'acc-bca',
    category: 'sosial',
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
  },
  {
    id: 't-default-6',
    title: 'Gaji Bulanan',
    amount: 15000000,
    type: 'incoming',
    pocketId: 'pribadi',
    accountId: 'acc-bca',
    category: 'pendapatan',
    date: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(), // 2 days ago
  },
  {
    id: 't-default-7',
    title: 'DP Villa Lembang',
    amount: 5000000,
    type: 'outgoing',
    pocketId: 'kas',
    accountId: 'acc-bca',
    category: 'sosial',
    date: new Date(Date.now() - 1000 * 60 * 60 * 70).toISOString(), // 3 days ago
  },
];

export const INITIAL_BUDGETS: Budget[] = [
  {
    id: 'b-default-1',
    title: 'Jajan Kopi',
    spent: 240000,
    limit: 300000,
    category: 'kopi',
    sisaPercent: 20,
    type: 'expense_limit',
  },
  {
    id: 'b-default-2',
    title: 'Makan-Makan',
    spent: 600000,
    limit: 1500000,
    category: 'makan',
    sisaPercent: 60,
    type: 'expense_limit',
  },
  {
    id: 'b-default-3',
    title: 'Iuran Kas Futsal',
    spent: 5000000,
    limit: 5000000,
    category: 'olahraga',
    sisaPercent: 0,
    type: 'target_funding',
  },
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n-default-1',
    title: 'Rem Finansial',
    message: 'Awas! Jatah Jajan Kopi kamu sisa 20%. Yuk ngerem dulu biar gak boncos sebelum akhir bulan!',
    time: '10 Menit Lalu',
    isRead: false,
    type: 'warning',
  },
  {
    id: 'n-default-2',
    title: 'Penerimaan Kas Berhasil',
    message: 'Uang patungan villa sejumlah Rp 2.500.000 telah masuk ke Kantong Kas.',
    time: 'Yesterday',
    isRead: true,
    type: 'success',
  },
];
