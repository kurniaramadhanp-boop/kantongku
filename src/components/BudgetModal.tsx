import React, { useState } from 'react';
import { Budget, Category, Transaction, CategoryType } from '../types';
import { formatRupiah, getCategoryColorHex } from '../utils';
import CategoryIcon from './CategoryIcon';
import { 
  Plus, 
  Sparkles, 
  Target, 
  Trash2,
  X,
  Edit3,
  GripVertical,
  Save,
  ChevronUp,
  ChevronDown,
  Clock,
  Bell
} from 'lucide-react';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgets: Budget[];
  transactions: Transaction[]; // Memfilter mutasi transaksi secara riil dan dinamis
  onAddBudget: (budget: Omit<Budget, 'id' | 'sisaPercent'>) => void;
  onEditBudget: (budget: Budget) => void;
  onDeleteBudget: (id: string) => void;
  onReorderBudgets: (reordered: Budget[]) => void;
  categories: Category[];
}

type TimeframeType = '1_minggu' | '1_bulan' | 'tanggal_kustom';

export default function BudgetModal({ 
  isOpen, 
  onClose, 
  budgets, 
  transactions, 
  onAddBudget, 
  onEditBudget, 
  onDeleteBudget, 
  onReorderBudgets, 
  categories 
}: BudgetModalProps) {
  const [addMode, setAddMode] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  
  // Form Control States
  const [title, setTitle] = useState('');
  const [limitDisplay, setLimitDisplay] = useState('');
  const [limit, setLimit] = useState<number>(0);
  const [category, setCategory] = useState<CategoryType>(categories[0]?.id || 'makan');
  const [type, setType] = useState<'expense_limit' | 'target_funding'>('expense_limit');
  
  // Timeframe States
  const [timeframe, setTimeframe] = useState<TimeframeType>('1_bulan');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const isTouchDevice = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0);

  if (!isOpen) return null;

  // LOGIKA OTOMATISASI: Menghitung transaksi di dalam rentang awal s/d akhir siklus secara absolut
  const calculateRealSpent = (catId: string, startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 0;
    
    const sDate = new Date(startStr);
    sDate.setHours(0, 0, 0, 0); // Kunci di awal hari semenjak aturan aktif
    
    const eDate = new Date(endStr);
    eDate.setHours(23, 59, 59, 999); // Kunci di mili-detik terakhir hari penutupan

    const filteredTrans = transactions.filter(t => {
      if (t.category !== catId) return false;
      const tDate = new Date(t.date);
      return tDate >= sDate && tDate <= eDate;
    });

    return filteredTrans.reduce((sum, t) => sum + t.amount, 0);
  };

  const resetForm = () => {
    setTitle('');
    setLimit(0);
    setLimitDisplay('');
    setCategory(categories[0]?.id || 'makan');
    setType('expense_limit');
    setTimeframe('1_bulan');
    setStartDate('');
    setEndDate('');
    setEditingBudgetId(null);
    setAddMode(false);
  };

  const handleOpenEdit = (budget: Budget) => {
    setEditingBudgetId(budget.id);
    setTitle(budget.title);
    setLimit(budget.limit);
    setLimitDisplay(new Intl.NumberFormat('id-ID').format(budget.limit));
    setCategory(budget.category);
    setType(budget.type);
    setTimeframe((budget as any).timeframe || '1_bulan');
    setStartDate((budget as any).startDate || '');
    setEndDate((budget as any).endDate || '');
    setAddMode(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert('Mohon isi nama Aturan Target & Limit');
    if (limit <= 0) return alert('Sediakan batas jajan / target dana alarm yang valid');

    const kini = new Date();
    let computedStartDate = new Date().toISOString().split('T')[0]; // Hari ini (YYYY-MM-DD)
    let computedEndDate = '';

    // LOGIKA ABSOLUT MAJU KE DEPAN
    if (timeframe === '1_minggu') {
      const targetDate = new Date(kini);
      targetDate.setDate(kini.getDate() + 7); // +7 Hari penuh ke depan
      computedEndDate = targetDate.toISOString().split('T')[0];
    } else if (timeframe === '1_bulan') {
      const targetDate = new Date(kini);
      targetDate.setMonth(kini.getMonth() + 1); // Mengikuti angka tanggal yang sama di bulan berikutnya
      computedEndDate = targetDate.toISOString().split('T')[0];
    } else if (timeframe === 'tanggal_kustom') {
      if (!startDate || !endDate) return alert('Mohon isi rentang tanggal kustom secara lengkap');
      
      const checkStart = new Date(startDate);
      const checkEnd = new Date(endDate);
      
      // VALIDASI: Waktu akhir harus lebih besar dari waktu sekarang/mulai
      if (checkEnd <= checkStart) {
        return alert('Waktu akhir harus lebih besar dari waktu mulai / waktu sekarang!');
      }
      computedStartDate = startDate;
      computedEndDate = endDate;
    }

    const autoSpent = calculateRealSpent(category, computedStartDate, computedEndDate);
    const remaining = limit - autoSpent;
    const sisaPercent = limit > 0 ? Math.max(0, Math.round((remaining / limit) * 100)) : 0;

    const payloadData = {
      title,
      limit,
      spent: autoSpent,
      category,
      type,
      timeframe,
      startDate: computedStartDate,
      endDate: computedEndDate,
    };

    if (editingBudgetId) {
      const existing = budgets.find(b => b.id === editingBudgetId);
      if (!existing) return;
      onEditBudget({
        ...existing,
        ...payloadData,
        sisaPercent
      });
    } else {
      onAddBudget(payloadData as any);
    }
    resetForm();
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (isTouchDevice) return;
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (isTouchDevice) return;
    e.preventDefault();
    setDragOverId(id);
  };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (isTouchDevice) return;
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragOverId(null); setDragId(null); return; }
    const newOrder = [...budgets];
    const fromIdx = newOrder.findIndex(b => b.id === dragId);
    const toIdx = newOrder.findIndex(b => b.id === targetId);
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    onReorderBudgets(newOrder);
    setDragOverId(null);
    setDragId(null);
  };

  return (
    <div className="fixed inset-0 bg-[#060A13]/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4 overflow-y-auto">
      <div className="glass-card rounded-2xl w-full max-w-2xl border border-white/10 relative overflow-hidden flex flex-col my-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Modal */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 shrink-0">
          <div>
            <h2 className="font-headline-md text-xl text-white font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Target &amp; Limit
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Pantau batas pengeluaran alarm dan target tabungan secara otomatis berbasis kategori transaksi riil.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-5 no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* PANEL KIRI: FORM CONTROL */}
            <div className="md:col-span-5 flex flex-col gap-4">
              {!addMode ? (
                <button onClick={() => { resetForm(); setAddMode(true); }} className="w-full h-12 rounded-xl border border-dashed border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-all text-xs font-label-caps flex items-center justify-center gap-1.5 active:scale-[0.98]" >
                  <Plus className="w-4 h-4" /> Atur Target &amp; Limit Baru
                </button>
              ) : (
                <form onSubmit={handleSubmit} className="bg-surface-variant/20 border border-white/5 rounded-xl p-4 flex flex-col gap-3 text-left">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="font-bold text-white text-xs flex items-center gap-1">
                      {editingBudgetId ? <><Edit3 className="w-3.5 h-3.5 text-primary" /> Edit Aturan</> : 'Atur Aturan Baru'}
                    </span>
                    <button type="button" onClick={resetForm} className="text-[10px] text-on-surface-variant hover:text-white">Batal</button>
                  </div>

                  {/* Switch Jenis Aturan Tipe */}
                  <div className="grid grid-cols-2 gap-1 bg-[#0B111E]/80 rounded-lg p-1 border border-white/5">
                    <button type="button" onClick={() => setType('expense_limit')} className={`py-1.5 rounded-md font-label-caps text-[9px] uppercase transition-all tracking-wider ${type === 'expense_limit' ? 'bg-[#EF4444] text-white font-bold shadow-sm' : 'text-on-surface-variant hover:text-white'}`}>
                      Limit Belanja
                    </button>
                    <button type="button" onClick={() => setType('target_funding')} className={`py-1.5 rounded-md font-label-caps text-[9px] uppercase transition-all tracking-wider ${type === 'target_funding' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'text-on-surface-variant hover:text-white'}`}>
                      Target Nabung
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-label-caps text-on-surface-variant uppercase">Nama Aturan / Alarm</label>
                    <input type="text" required placeholder="Misal: Limit Kopi, Target Laptop" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 bg-[#0B111E]/40 rounded-lg text-xs text-white border border-white/10 px-3 focus:outline-none focus:border-primary/60" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-label-caps text-on-surface-variant uppercase">Batas Limit / Target Alarm (Rp)</label>
                    <input type="text" inputMode="numeric" required placeholder="Rp 0" value={limitDisplay} onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setLimit(raw ? Number(raw) : 0);
                      setLimitDisplay(raw ? new Intl.NumberFormat('id-ID').format(Number(raw)) : '');
                    }} className="h-9 bg-[#0B111E]/40 rounded-lg text-xs text-white border border-white/10 px-3 font-mono-data focus:outline-none focus:border-primary/60" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-label-caps text-on-surface-variant uppercase">Koneksikan Kategori Transaksi</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value as CategoryType)} className="h-9 bg-[#0B111E]/40 rounded-lg text-xs text-white border border-white/10 px-2 focus:outline-none">
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id} className="bg-[#0B111E] text-white">{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-label-caps text-on-surface-variant uppercase">Siklus Waktu Pemantauan</label>
                    <select value={timeframe} onChange={(e) => setTimeframe(e.target.value as TimeframeType)} className="h-9 bg-[#0B111E]/40 rounded-lg text-xs text-white border border-white/10 px-2 focus:outline-none">
                      <option value="1_minggu" className="bg-[#0B111E]">1 Minggu</option>
                      <option value="1_bulan" className="bg-[#0B111E]">1 Bulan</option>
                      <option value="tanggal_kustom" className="bg-[#0B111E]">Tanggal (Rentang Kustom)</option>
                    </select>
                  </div>

                  {timeframe === 'tanggal_kustom' && (
                    <div className="grid grid-cols-2 gap-2 animate-fade-in">
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-label-caps text-on-surface-variant uppercase">Mulai</label>
                        <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 bg-[#0B111E]/40 border border-white/10 rounded-md text-[10px] px-2 text-white focus:outline-none" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-label-caps text-on-surface-variant uppercase">Selesai</label>
                        <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 bg-[#0B111E]/40 border border-white/10 rounded-md text-[10px] px-2 text-white focus:outline-none" />
                      </div>
                    </div>
                  )}

                  <button type="submit" className="w-full h-9 bg-primary text-on-primary font-label-caps text-[10px] tracking-wider rounded-lg mt-1 flex items-center justify-center gap-1.5 shadow-sm">
                    <Save className="w-3.5 h-3.5" /> {editingBudgetId ? 'Simpan Perubahan' : 'Aktifkan Alarm'}
                  </button>
                </form>
              )}
            </div>

            {/* PANEL KANAN: LIST ATURAN & ALARM DETEKSI PROGRESIF */}
            <div className="md:col-span-7 flex flex-col gap-3">
              {budgets.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant/40 flex flex-col items-center gap-1.5 bg-white/5 border border-white/5 rounded-xl">
                  <Target className="w-8 h-8 text-on-surface-variant/20" />
                  <p className="text-xs">Belum ada Target &amp; Limit yang dikonfigurasi.</p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-on-surface-variant/50 flex items-center gap-1 pl-1">
                    <GripVertical className="w-3 h-3" /> Lajur seret atau gunakan tombol navigasi prioritas di bawah
                  </p>
                  
                  {budgets.map(budget => {
                    const start = (budget as any).startDate;
                    const end = (budget as any).endDate;
                    const tf = ((budget as any).timeframe || '1_bulan') as string;
                    
                    // Hitung nominal spent secara dinamis dan riil dari rentang tanggal absolut
                    const realSpent = calculateRealSpent(budget.category, start, end);
                    const remaining = budget.limit - realSpent;
                    const percentage = Math.min(100, Math.max(0, (realSpent / budget.limit) * 100));

                    // DUA JENIS ALARM (PROGRESIF 70%, 80%, 90% DAN ALARM TERCAPAI 100%)
                    let isTriggered100 = realSpent >= budget.limit;
                    let alarmLevel = 0;
                    if (percentage >= 100) alarmLevel = 100;
                    else if (percentage >= 90) alarmLevel = 90;
                    else if (percentage >= 80) alarmLevel = 80;
                    else if (percentage >= 70) alarmLevel = 70;

                    let barBgColor = 'bg-primary';
                    let alertLabel = 'Aman';

                    if (budget.type === 'expense_limit') {
                      if (isTriggered100) {
                        barBgColor = 'bg-rose-600';
                        alertLabel = 'OVER BUDGET!';
                      } else if (alarmLevel >= 70) {
                        barBgColor = 'bg-amber-500';
                        alertLabel = `ALARM ${alarmLevel}%`;
                      } else {
                        barBgColor = 'bg-emerald-400';
                        alertLabel = 'LIMIT AMAN';
                      }
                    } else {
                      if (isTriggered100) {
                        barBgColor = 'bg-blue-500';
                        alertLabel = 'GOAL DICAPAI!';
                      } else {
                        barBgColor = 'bg-sky-400';
                        alertLabel = `TERKUMPUL ${Math.round(percentage)}%`;
                      }
                    }

                    const isDragging = dragId === budget.id;
                    const isDragOver = dragOverId === budget.id;

                    return (
                      <div 
                        key={budget.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, budget.id)}
                        onDragOver={(e) => handleDragOver(e, budget.id)}
                        onDrop={(e) => handleDrop(e, budget.id)}
                        className={`border rounded-xl p-4 flex flex-col gap-2.5 relative group transition-all text-left ${
                          isDragging ? 'opacity-30 scale-95 bg-white/5 border-white/10' : isDragOver ? 'bg-primary/5 border-primary/30 scale-[1.01]' : 'bg-surface-variant/10 hover:bg-surface-variant/20 border-white/5'
                        }`}
                      >
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-20 group-hover:opacity-50 hidden md:block">
                          <GripVertical className="w-3.5 h-3.5 text-on-surface-variant" />
                        </div>

                        {/* Banner Notifikasi Alarm Kritis & Sukses */}
                        {alarmLevel >= 70 && (
                          <div className={`p-2 rounded-lg text-[10px] flex items-center gap-1.5 font-medium mb-1 border ${isTriggered100 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            <Bell className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {budget.type === 'expense_limit' 
                                ? (isTriggered100 ? `Peringatan Keras: Limit Belanja "${budget.title}" sudah melampaui batas nominal aman!` : `Perhatian: Pemakaian jajan kategori ini sudah menyentuh ${alarmLevel}%!`)
                                : (isTriggered100 ? `Selamat! Target Nabung celengan "${budget.title}" Anda sudah terpenuhi 🎉` : `Sedikit lagi! Target menabung Anda sudah mencapai ${alarmLevel}%` )
                              }
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-start gap-2 md:pl-5 md:pr-24">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#0b101d] border border-white/5 flex items-center justify-center shrink-0">
                              {(() => {
                                const cat = categories.find(c => c.id === budget.category);
                                const colorHex = cat ? getCategoryColorHex(cat.color) : '#64748B';
                                return <CategoryIcon name={cat?.icon || 'receipt'} className="w-4 h-4" style={{ color: colorHex }} />;
                              })()}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm text-white font-bold leading-snug truncate">{budget.title}</h3>
                              <p className="text-[10px] text-on-surface-variant flex items-center gap-1">
                                <Clock className="w-3 h-3 text-primary" /> 
                                {budget.type === 'expense_limit' ? 'Limit Belanja' : 'Target Nabung'} • 
                                <span className="capitalize text-white/70"> {tf.replace('_', ' ')}</span>
                              </p>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 text-[8px] font-label-caps font-bold uppercase rounded tracking-wider border shrink-0 ${isTriggered100 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : alarmLevel >= 70 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                            {alertLabel}
                          </span>
                        </div>

                        <div className="flex justify-between items-end text-[11px] mt-1 md:pl-5">
                          <span className="font-medium text-white/90">
                            {budget.type === 'expense_limit' 
                              ? (remaining >= 0 ? `${formatRupiah(remaining)} Sisa` : `${formatRupiah(Math.abs(remaining))} Over Limit`)
                              : `${formatRupiah(realSpent)} Terkumpul`
                            }
                          </span>
                          <span className="text-on-surface-variant font-mono-data">
                            {formatRupiah(realSpent, false)} / <span className="font-bold text-white">{formatRupiah(budget.limit, false)}</span>
                          </span>
                        </div>

                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden md:ml-5 md:w-[calc(100%-20px)]">
                          <div className={`h-full rounded-full transition-all duration-500 ${barBgColor}`} style={{ width: `${percentage}%` }} />
                        </div>

                        {/* TOMBOL NAVIGASI PRIORITAS & AKSI UTUH */}
                        <div className="md:absolute md:top-3 md:right-3 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-wrap mt-2 md:mt-0">
                          <button onClick={() => handleOpenEdit(budget)} className="p-1.5 text-on-surface-variant/60 hover:text-primary transition-colors text-[11px] rounded hover:bg-white/5 md:hover:bg-transparent" title="Edit aturan"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { if (confirm(`Hapus aturan Target & Limit "${budget.title}"?`)) onDeleteBudget(budget.id); }} className="p-1.5 text-on-surface-variant/60 hover:text-rose-400 transition-colors text-[11px] rounded hover:bg-white/5 md:hover:bg-transparent" title="Hapus aturan"><Trash2 className="w-3.5 h-3.5" /></button>

                          <button onClick={() => {
                              const idx = budgets.findIndex(b => b.id === budget.id);
                              if (idx > 0) {
                                const newOrder = [...budgets];
                                [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
                                onReorderBudgets(newOrder);
                              }
                            }}
                            disabled={budgets.findIndex(b => b.id === budget.id) === 0}
                            className="p-1.5 text-on-surface-variant/60 hover:text-primary disabled:opacity-30 transition-colors text-[11px] rounded hover:bg-white/5 md:hover:bg-transparent" title="Naikkan Prioritas"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>

                          <button onClick={() => {
                              const idx = budgets.findIndex(b => b.id === budget.id);
                              if (idx < budgets.length - 1) {
                                const newOrder = [...budgets];
                                [newOrder[idx + 1], newOrder[idx]] = [newOrder[idx], newOrder[idx + 1]];
                                onReorderBudgets(newOrder);
                              }
                            }}
                            disabled={budgets.findIndex(b => b.id === budget.id) === budgets.length - 1}
                            className="p-1.5 text-on-surface-variant/60 hover:text-primary disabled:opacity-30 transition-colors text-[11px] rounded hover:bg-white/5 md:hover:bg-transparent" title="Turunkan Prioritas"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}