import React, { useState, useMemo } from 'react';
import { Transaction, Pocket, Account, Category } from '../types';
import { formatRupiah, formatDate, getCategoryColorHex } from '../utils';
import CategoryIcon from './CategoryIcon';
import {
  X, Search, Filter, Calendar, Wallet, Tag, ArrowDownLeft, ArrowUpRight,
  Receipt, Trash2, Edit3, ChevronDown, SlidersHorizontal, RotateCcw, ChevronLeft
} from 'lucide-react';

interface TransactionHistoryPageProps {
  transactions: Transaction[];
  pockets: Pocket[];
  accounts: Account[];
  categories: Category[];
  initialFilter?: { category?: string };
  onEditTransactionSelect: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onBack: () => void;
}

export default function TransactionHistoryPage({
  transactions,
  pockets,
  accounts,
  categories,
  initialFilter,
  onEditTransactionSelect,
  onDeleteTransaction,
  onBack
}: TransactionHistoryPageProps) {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialFilter?.category ? [initialFilter.category] : []
  );
  const [selectedPockets, setSelectedPockets] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [showFilters, setShowFilters] = useState(!!initialFilter?.category);

  const getCategoryColorClasses = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    const hex = cat ? getCategoryColorHex(cat.color) : '#64748B';
    return hex;
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Keyword search
      if (search) {
        const lower = search.toLowerCase();
        if (!t.title.toLowerCase().includes(lower) && !t.notes?.toLowerCase().includes(lower)) return false;
      }
      // Date from
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (new Date(t.date) < fromDate) return false;
      }
      // Date to
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (new Date(t.date) > toDate) return false;
      }
      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(t.category)) return false;
      // Pocket filter
      if (selectedPockets.length > 0 && !selectedPockets.includes(t.pocketId)) return false;
      // Account filter
      if (selectedAccounts.length > 0 && !selectedAccounts.includes(t.accountId)) return false;
      // Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, search, dateFrom, dateTo, selectedCategories, selectedPockets, selectedAccounts, typeFilter]);

  const totalIncoming = filteredTransactions.filter((t: Transaction) => t.type === 'incoming').reduce((s: number, t: Transaction) => s + t.amount, 0);
  const totalOutgoing = filteredTransactions.filter((t: Transaction) => t.type === 'outgoing').reduce((s: number, t: Transaction) => s + t.amount, 0);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev: string[]) => prev.includes(id) ? prev.filter((c: string) => c !== id) : [...prev, id]);
  };
  const togglePocket = (id: string) => {
    setSelectedPockets((prev: string[]) => prev.includes(id) ? prev.filter((p: string) => p !== id) : [...prev, id]);
  };
  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev: string[]) => prev.includes(id) ? prev.filter((a: string) => a !== id) : [...prev, id]);
  };

  const resetFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setSelectedCategories([]);
    setSelectedPockets([]);
    setSelectedAccounts([]);
    setTypeFilter('all');
  };

  const hasActiveFilters = search || dateFrom || dateTo || selectedCategories.length > 0 || selectedPockets.length > 0 || selectedAccounts.length > 0 || typeFilter !== 'all';

  return (
    <div className="flex flex-col gap-4 select-none font-body-md w-full h-full">
      {/* Header with back button */}
      <div className="flex items-center gap-4 border-b border-white/5 pb-4">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Riwayat Transaksi
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {filteredTransactions.length} transaksi ditemukan
          </p>
        </div>
      </div>

      {/* Search + Filter Controls */}
      <div className="flex flex-col gap-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="Cari nama transaksi, catatan..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="w-full h-11 bg-surface-variant/20 border border-white/10 rounded-xl pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 placeholder:text-on-surface-variant/40"
          />
        </div>

        {/* Filter toggle row */}
        <div className="flex gap-2 items-center overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setShowFilters((f: boolean) => !f)}
            className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-label-caps border transition-all shrink-0 ${showFilters ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-on-surface-variant hover:text-white'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Type filter pills */}
          {(['all', 'incoming', 'outgoing'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`h-9 px-3 rounded-lg text-xs font-label-caps border transition-all shrink-0 ${
                typeFilter === t
                  ? t === 'incoming' ? 'bg-primary/15 border-primary/30 text-primary'
                    : t === 'outgoing' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : 'bg-white/10 border-white/20 text-white'
                  : 'bg-white/5 border-white/10 text-on-surface-variant hover:text-white'
              }`}
            >
              {t === 'all' ? 'Semua' : t === 'incoming' ? '+ Masuk' : '- Keluar'}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-label-caps bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Expanded filter panel */}
        {showFilters && (
          <div className="flex flex-col gap-3 p-4 bg-surface-variant/10 border border-white/5 rounded-xl">
            {/* Date range */}
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-[9px] font-label-caps text-on-surface-variant uppercase flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Dari Tanggal
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
                  className="h-9 bg-[#0B111E]/60 border border-white/10 rounded-lg text-xs text-white px-2 focus:outline-none focus:border-primary/50"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-[9px] font-label-caps text-on-surface-variant uppercase flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)}
                  className="h-9 bg-[#0B111E]/60 border border-white/10 rounded-lg text-xs text-white px-2 focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            {/* Category filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-label-caps text-on-surface-variant uppercase flex items-center gap-1">
                <Tag className="w-3 h-3" /> Kategori
              </label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map(cat => {
                  const hex = getCategoryColorHex(cat.color);
                  const active = selectedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`flex items-center gap-1 h-8 px-2.5 rounded-full text-[10px] font-semibold border transition-all ${active ? '' : 'bg-white/5 border-white/10 text-on-surface-variant hover:text-white'}`}
                      style={active ? { backgroundColor: hex + '25', borderColor: hex + '60', color: hex } : {}}
                    >
                      <CategoryIcon name={cat.icon} className="w-3 h-3" />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pocket filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-label-caps text-on-surface-variant uppercase flex items-center gap-1">
                <Wallet className="w-3 h-3" /> Kantong
              </label>
              <div className="flex flex-wrap gap-1.5">
                {pockets.map(p => {
                  const active = selectedPockets.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePocket(p.id)}
                      className={`h-8 px-2.5 rounded-full text-[10px] font-semibold border transition-all ${active ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-on-surface-variant hover:text-white'}`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Account filter */}
            {accounts.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-label-caps text-on-surface-variant uppercase flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Wallet/Rekening
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {accounts.map(a => {
                    const active = selectedAccounts.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleAccount(a.id)}
                        className={`h-8 px-2.5 rounded-full text-[10px] font-semibold border transition-all ${active ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-white/5 border-white/10 text-on-surface-variant hover:text-white'}`}
                      >
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary pills */}
        {filteredTransactions.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-center gap-1.5 py-2 bg-primary/5 border border-primary/15 rounded-lg">
              <ArrowDownLeft className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-mono-data text-primary font-bold">+{formatRupiah(totalIncoming)}</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-2 bg-rose-500/5 border border-rose-500/15 rounded-lg">
              <ArrowUpRight className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-xs font-mono-data text-rose-400 font-bold">-{formatRupiah(totalOutgoing)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <Receipt className="w-7 h-7 text-on-surface-variant/30" />
            </div>
            <p className="text-sm text-on-surface-variant/50">Tidak ada transaksi yang cocok</p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-xs text-primary hover:underline">Reset filter</button>
            )}
          </div>
        ) : (
          filteredTransactions.map(t => {
            const isExpense = t.type === 'outgoing';
            const sign = isExpense ? '-' : '+';
            const colorClass = isExpense ? 'text-rose-400' : 'text-primary';
            const pocket = pockets.find(p => p.id === t.pocketId);
            const cat = categories.find(c => c.id === t.category);
            const colorHex = getCategoryColorClasses(t.category);

            return (
              <div
                key={t.id}
                className="flex items-center gap-3 p-3 glass-card rounded-xl hover:bg-white/5 transition-all group cursor-pointer"
                onClick={() => onEditTransactionSelect(t)}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: colorHex + '20', border: `1px solid ${colorHex}40` }}
                >
                  {cat ? (
                    <CategoryIcon name={cat.icon} className="w-5 h-5" style={{ color: colorHex }} />
                  ) : (
                    <Receipt className="w-5 h-5 text-slate-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{t.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {cat && (
                      <span
                        className="text-[9px] font-label-caps px-1.5 py-0.5 rounded border"
                        style={{ color: colorHex, backgroundColor: colorHex + '15', borderColor: colorHex + '40' }}
                      >
                        {cat.name}
                      </span>
                    )}
                    {pocket && (
                      <span className="text-[9px] text-on-surface-variant/60">
                        {pocket.name}
                      </span>
                    )}
                    <span className="text-[9px] font-mono-data text-on-surface-variant/40">{formatDate(t.date)}</span>
                  </div>
                </div>

                {/* Amount + Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-mono-data font-bold text-sm ${colorClass}`}>
                    {sign}{formatRupiah(t.amount, false)}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditTransactionSelect(t); }}
                      className="p-1 rounded text-on-surface-variant/50 hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Hapus transaksi "${t.title}"?`)) onDeleteTransaction(t.id);
                      }}
                      className="p-1 rounded text-on-surface-variant/50 hover:text-rose-400 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
