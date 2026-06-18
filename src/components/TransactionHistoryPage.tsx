import React, { useState, useMemo } from 'react';
import { Transaction, Pocket, Account, Category } from '../types';
import { formatRupiah, formatDate, getCategoryColorHex } from '../utils';
import CategoryIcon from './CategoryIcon';
import {
  Search, SlidersHorizontal, ChevronDown, Calendar, Tag, Wallet, 
  ArrowDownLeft, ArrowUpRight, Receipt, Edit3, Trash2, RotateCcw, 
  ChevronLeft, Send
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialFilter?.category ? [initialFilter.category] : []);
  const [selectedPockets, setSelectedPockets] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [showFilters, setShowFilters] = useState(!!initialFilter?.category);

  const getCategoryHexColor = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? getCategoryColorHex(cat.color) : '#64748B';
  };

  // Logic Opsi Penyaringan Tingkat Lanjut
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.notes?.toLowerCase().includes(search.toLowerCase())) return false;
      if (dateFrom && new Date(t.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(t.date) > new Date(dateTo)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(t.category)) return false;
      if (selectedPockets.length > 0 && !selectedPockets.includes(t.pocketId)) return false;
      if (selectedAccounts.length > 0 && !selectedAccounts.includes(t.accountId)) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, search, dateFrom, dateTo, selectedCategories, selectedPockets, selectedAccounts, typeFilter]);

  const totalIncoming = filteredTransactions.filter(t => t.type === 'incoming').reduce((s, t) => s + t.amount, 0);
  const totalOutgoing = filteredTransactions.filter(t => t.type === 'outgoing').reduce((s, t) => s + t.amount, 0);

  const hasActiveFilters = !!(search || dateFrom || dateTo || selectedCategories.length > 0 || selectedPockets.length > 0 || selectedAccounts.length > 0 || typeFilter !== 'all');

  const toggleCategory = (id: string) => setSelectedCategories(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);
  const togglePocket = (id: string) => setSelectedPockets(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAccount = (id: string) => setSelectedAccounts(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const resetFilters = () => {
    setSearch(''); setDateFrom(''); setDateTo(''); setSelectedCategories([]); setSelectedPockets([]); setSelectedAccounts([]); setTypeFilter('all');
  };

  const handleExportWA = () => {
    if (filteredTransactions.length === 0) return alert("Tidak ada data terfilter.");
    
    // Format: Nama Transaksi | Waktu | Nominal +/-
    const transLines = filteredTransactions.map(t => {
      const sign = t.type === 'outgoing' ? '-' : '+';
      const formattedAmount = formatRupiah(t.amount, false);
      return `${t.title} | ${formatDate(t.date)} | ${sign}${formattedAmount}`;
    }).join('\n');

    const totalIncoming = filteredTransactions.filter(t => t.type === 'incoming').reduce((s, t) => s + t.amount, 0);
    const totalOutgoing = filteredTransactions.filter(t => t.type === 'outgoing').reduce((s, t) => s + t.amount, 0);
    const netCashFlow = totalIncoming - totalOutgoing;

    const reportText = 
      `*ANALISIS LAPORAN TRANSAKSI*\n` +
      `-------------------------------------\n` +
      `${transLines}\n` +
      `-------------------------------------\n` +
      `• *Jumlah Arus Masuk* : Rp ${formatRupiah(totalIncoming, false)}\n` +
      `• *Jumlah Arus Keluar* : Rp ${formatRupiah(totalOutgoing, false)}\n` +
      `• *Arus Kas Bersih* : ${netCashFlow >= 0 ? '+' : '-'}Rp ${formatRupiah(Math.abs(netCashFlow), false)}\n\n` +
      `laporan otomatis aplikasi KantongKu`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(reportText)}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full text-left max-h-[calc(100vh-120px)] overflow-y-auto pb-12 no-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-white/5 pb-4">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-lg"><ChevronLeft className="w-5 h-5"/></button>
        <h1 className="text-xl font-bold">Riwayat Transaksi</h1>
      </div>

      {/* Filter UI */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <input type="text" placeholder="Cari deskripsi..." value={search} onChange={e => setSearch(e.target.value)} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:outline-none" />
          {hasActiveFilters && (
            <button onClick={resetFilters} className="absolute right-3 top-3.5 text-rose-400 text-xs flex items-center gap-1"><RotateCcw className="w-3 h-3"/> Reset</button>
          )}
        </div>
        
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center justify-between px-4 h-11 bg-white/5 rounded-xl text-xs border border-white/5">
          <span className="flex items-center gap-2"><SlidersHorizontal className="w-3.5 h-3.5 text-primary"/> Opsi Penyaringan Tingkat Lanjut</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}/>
        </button>

        {showFilters && (
          <div className="bg-white/5 p-4 rounded-xl flex flex-col gap-4 border border-white/5 animate-fade-in">
            <div className="flex gap-2">
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-full h-9 bg-black/20 rounded px-2 text-xs text-white border border-white/10" />
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-full h-9 bg-black/20 rounded px-2 text-xs text-white border border-white/10" />
            </div>
            
            <div className="flex gap-2 items-center my-1">
              {(['all', 'incoming', 'outgoing'] as const).map(t => (
                <button key={t} type="button" onClick={() => setTypeFilter(t)} className={`h-8 px-3 rounded-lg text-xs border transition-all ${typeFilter === t ? 'bg-primary text-black font-bold border-primary' : 'bg-white/5 border-white/10 text-white/70'}`}>
                  {t === 'all' ? 'Semua Kas' : t === 'incoming' ? 'Masuk' : 'Keluar'}
                </button>
              ))}
            </div>

            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider mb-2">Pilih Kategori</p>
              <div className="flex flex-wrap gap-1">
                {categories.map(c => (
                  <button key={c.id} type="button" onClick={()=>toggleCategory(c.id)} className={`px-2.5 py-1 rounded text-[10px] font-medium border transition-all ${selectedCategories.includes(c.id) ? 'bg-primary border-primary text-black font-bold' : 'bg-white/5 border-white/10 text-white/70'}`}>{c.name}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider mb-2">Pilih Kantong</p>
              <div className="flex flex-wrap gap-1">
                {pockets.map(p => (
                  <button key={p.id} type="button" onClick={()=>togglePocket(p.id)} className={`px-2.5 py-1 rounded text-[10px] font-medium border transition-all ${selectedPockets.includes(p.id) ? 'bg-primary border-primary text-black font-bold' : 'bg-white/5 border-white/10 text-white/70'}`}>{p.name}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider mb-2">Pilih Wallet / Rekening</p>
              <div className="flex flex-wrap gap-1">
                {accounts.map(a => (
                  <button key={a.id} type="button" onClick={()=>toggleAccount(a.id)} className={`px-2.5 py-1 rounded text-[10px] font-medium border transition-all ${selectedAccounts.includes(a.id) ? 'bg-primary border-primary text-black font-bold' : 'bg-white/5 border-white/10 text-white/70'}`}>{a.name}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <button onClick={handleExportWA} className="w-full h-12 bg-primary text-black font-bold text-xs font-label-caps uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all hover:opacity-90 active:scale-[0.99]">
         <Send className="w-4 h-4"/> Kirim Analisis Laporan
      </button>

      {/* List Rendering Transaksi */}
      <div className="flex flex-col gap-2 mt-2">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-10 text-white/30 text-xs">Tidak ada data mutasi yang cocok dengan filter.</div>
        ) : (
          filteredTransactions.map(t => {
            const isExpense = t.type === 'outgoing';
            const cat = categories.find(c => c.id === t.category);
            const colorHex = getCategoryHexColor(t.category);
            return (
              <div key={t.id} onClick={() => onEditTransactionSelect(t)} className="flex items-center p-3 gap-3 hover:bg-white/5 rounded-xl border border-white/5 glass-card cursor-pointer transition-all">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs shrink-0" style={{ backgroundColor: colorHex + '15', border: `1px solid ${colorHex}30` }}>
                  <CategoryIcon name={cat?.icon || 'receipt'} className="w-4 h-4" style={{ color: colorHex }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t.title}</p>
                  <p className="text-[10px] text-white/40 font-mono-data mt-0.5">{formatDate(t.date)}</p>
                </div>
                <span className={`text-sm font-bold font-mono-data shrink-0 ${isExpense ? 'text-rose-400' : 'text-primary'}`}>
                  {isExpense ? '-' : '+'}{formatRupiah(t.amount, false)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}