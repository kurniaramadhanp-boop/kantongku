import React, { useState } from 'react';
import { Budget, CategoryType } from '../types';
import { formatRupiah } from '../utils';
import { 
  AlertCircle, 
  Plus, 
  Sparkles, 
  Target, 
  Coins, 
  Trash2,
  Coffee,
  Dumbbell,
  Briefcase,
  Utensils,
  Users,
  CircleDollarSign,
  Receipt
} from 'lucide-react';
import { CATEGORIES } from '../mockData';

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'kopi':
      return <Coffee className="w-5 h-5 text-amber-400" />;
    case 'olahraga':
      return <Dumbbell className="w-5 h-5 text-emerald-400" />;
    case 'bisnis':
      return <Briefcase className="w-5 h-5 text-blue-400" />;
    case 'makan':
      return <Utensils className="w-5 h-5 text-orange-400" />;
    case 'sosial':
      return <Users className="w-5 h-5 text-purple-400" />;
    case 'pendapatan':
      return <CircleDollarSign className="w-5 h-5 text-lime-400" />;
    default:
      return <Receipt className="w-5 h-5 text-zinc-400" />;
  }
};

interface WalletViewProps {
  budgets: Budget[];
  onAddBudget: (budget: Omit<Budget, 'id' | 'sisaPercent'>) => void;
  onDeleteBudget: (id: string) => void;
}

export default function WalletView({ budgets, onAddBudget, onDeleteBudget }: WalletViewProps) {
  const [addMode, setAddMode] = useState(false);
  const [title, setTitle] = useState('');
  const [limit, setLimit] = useState<number>(0);
  const [spent, setSpent] = useState<number>(0);
  const [category, setCategory] = useState<CategoryType>('makan');
  const [type, setType] = useState<'expense_limit' | 'target_funding'>('expense_limit');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert('Mohon isi nama jatah');
    if (limit <= 0) return alert('Sediakan batas jajan / target dana yang valid');
    
    onAddBudget({
      title,
      spent,
      limit,
      category,
      type
    });

    // Reset
    setTitle('');
    setLimit(0);
    setSpent(0);
    setCategory('makan');
    setType('expense_limit');
    setAddMode(false);
  };

  // Generate Warn Banner dynamically if Jajan Kopi reaches sisa_percent <= 20
  const kopiBudget = budgets.find(b => b.title.toLowerCase().includes('kopi'));
  const showWarningBanner = kopiBudget ? (kopiBudget.limit - kopiBudget.spent) / kopiBudget.limit <= 0.21 : true;

  return (
    <div className="flex flex-col gap-6 select-none font-body-md">
      
      {/* Title Header */}
      <div>
        <h1 className="font-headline-md text-2xl text-white font-bold leading-tight">Jatah Jajan</h1>
        <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
          Pantau batas pengeluaran bulanan dan target tabungan kasmu.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full min-w-0">
        
        {/* LEFT COLUMN: Alert Banner & Setup Form */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full">
          {/* WARNING REM FINANSIAL ALERT BANNER (Verbatim mockup) */}
          {showWarningBanner && (
            <section className="p-4 rounded-xl bg-red-500/10 border border-[#842225] shadow-[0_4px_15px_rgba(132,34,37,0.15)] flex gap-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#842225]/15 rounded-full blur-2xl" />
              <div className="w-10 h-10 rounded-full bg-[#842225]/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-[#fecdd3] text-sm mb-1 uppercase tracking-wide font-label-caps">Rem Finansial</h4>
                <p className="text-[#fda4af] text-xs leading-relaxed">
                  Awas! Jatah Jajan Kopi kamu sisa 20%. Yuk ngerem dulu biar gak boncos sebelum akhir bulan!
                </p>
              </div>
            </section>
          )}

          {/* TRIGGER BUTTON TO ADD BUDGET TARGET */}
          {!addMode && (
            <button
              onClick={() => setAddMode(true)}
              className="w-full h-12 rounded-xl border border-dashed border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-all text-xs font-label-caps flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Atur Jatah Jajan Baru
            </button>
          )}

          {/* FORM: ADD BUDGET */}
          {addMode && (
            <form onSubmit={handleSubmit} className="glass-card rounded-xl p-card_padding border border-white/10 flex flex-col gap-4 text-left">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="font-bold text-white text-sm flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-primary" /> Atur Jatah Baru
                </span>
                <button 
                  type="button" 
                  onClick={() => setAddMode(false)}
                  className="text-xs text-on-surface-variant hover:text-white"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-[#0B111E] rounded-lg p-1 border border-white/5">
                <button
                  type="button"
                  onClick={() => setType('expense_limit')}
                  className={`py-1.5 rounded-md font-label-caps text-[10px] uppercase transition-all tracking-wider ${type === 'expense_limit' ? 'bg-[#EF4444] text-white text-bold' : 'text-on-surface-variant hover:text-white'}`}
                >
                  Batas Belanja
                </button>
                <button
                  type="button"
                  onClick={() => setType('target_funding')}
                  className={`py-1.5 rounded-md font-label-caps text-[10px] uppercase transition-all tracking-wider ${type === 'target_funding' ? 'bg-primary text-on-primary text-bold' : 'text-on-surface-variant hover:text-white'}`}
                >
                  Target Tabungan
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-label-caps text-on-surface-variant uppercase">Nama Jatah / Target</label>
                <input 
                  type="text"
                  required
                  placeholder="Misal: Jajan Kopi, Makan-makan"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 bg-surface rounded-lg text-xs text-white border border-white/10 focus:outline-none focus:border-primary px-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-label-caps text-on-surface-variant uppercase">Telah Terpakai (Rp)</label>
                  <input 
                    type="number"
                    placeholder="0"
                    value={spent || ''}
                    onChange={(e) => setSpent(Number(e.target.value))}
                    className="h-10 bg-surface rounded-lg text-xs text-white border border-white/10 focus:outline-none focus:border-primary px-3 font-mono-data"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-label-caps text-on-surface-variant uppercase">Batas Nominal (Rp)</label>
                  <input 
                    type="number"
                    required
                    placeholder="Limit Nominal"
                    value={limit || ''}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="h-10 bg-surface rounded-lg text-xs text-white border border-white/10 focus:outline-none focus:border-primary px-3 font-mono-data"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-label-caps text-on-surface-variant uppercase">Kategori Asosiasi</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryType)}
                  className="h-10 bg-surface rounded-lg text-xs text-white border border-white/10 focus:outline-none focus:border-primary px-2"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-primary text-on-primary font-label-caps text-xs tracking-wider rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-[0_2px_10px_rgba(78,222,163,0.2)]"
              >
                Simpan Struktur Jatah
              </button>
            </form>
          )}
        </div>

        {/* RIGHT COLUMN: Budgets list cards */}
        <div className="lg:col-span-7 flex flex-col gap-4 w-full">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {budgets.map(budget => {
              // Calculate stats
              const remaining = budget.limit - budget.spent;
              const percentage = Math.min(100, Math.max(0, (budget.spent / budget.limit) * 100));
              const isLowRemaining = (remaining / budget.limit) <= 0.20 && budget.type === 'expense_limit';
              
              let alertLabel = '';
              let barBgColor = 'bg-primary';
              
              if (budget.type === 'expense_limit') {
                if (isLowRemaining) {
                  alertLabel = `SISA ${Math.round((remaining / budget.limit) * 100)}%`;
                  barBgColor = 'bg-[#EF4444]';
                } else {
                  alertLabel = `SEHAT ${Math.round((remaining / budget.limit) * 100)}%`;
                  barBgColor = 'bg-primary';
                }
              } else {
                alertLabel = 'Terkumpul';
                barBgColor = 'bg-[#3B82F6]';
              }

              const catInfo = CATEGORIES.find(c => c.id === budget.category);

              return (
                <div 
                  key={budget.id}
                  id={`anggaran-${budget.id}`}
                  className="glass-card rounded-xl p-card_padding flex flex-col gap-3 group relative hover:border-white/10 transition-all justify-between"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <div className="w-10 h-10 rounded-full bg-[#0b101d] border border-white/5 flex items-center justify-center shrink-0">
                        {getCategoryIcon(budget.category)}
                      </div>
                      <div style={{ marginLeft: '12px' }}>
                        <h3 className="font-body-lg text-white font-medium flex items-center gap-1.5 leading-tight">{budget.title}</h3>
                        <p className="text-[11px] text-on-surface-variant leading-none mt-1">
                          {budget.type === 'expense_limit' ? 'Batas Belanja' : 'Rencana Anggaran'}
                        </p>
                      </div>
                    </div>

                    {/* Badge Tag */}
                    <span className={`px-2.5 py-1 text-[9px] font-label-caps uppercase rounded-md tracking-wider border shrink-0 ${isLowRemaining ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]' : budget.type === 'target_funding' ? 'bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6]' : 'bg-primary/10 border-primary/30 text-primary'}`}>
                      {alertLabel}
                    </span>
                    
                    {/* Delete button - always visible on mobile, hover on desktop */}
                    <button 
                      onClick={() => {
                        if ((window as any).hapusDataPermanen) {
                          (window as any).hapusDataPermanen('Daftar_Anggaran', budget.id, `anggaran-${budget.id}`);
                        } else {
                          if (confirm(`Apakah Anda yakin ingin menghapus jatah "${budget.title}"?`)) {
                            onDeleteBudget(budget.id);
                          }
                        }
                      }}
                      className="md:absolute md:top-2 md:right-2 p-1.5 flex items-center justify-center text-on-surface-variant/50 hover:text-[#EF4444] transition-all rounded md:hover:bg-white/5 md:opacity-0 md:group-hover:opacity-100"
                      title="Hapus jatah"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    {/* Fractional numbers */}
                    <div className="flex justify-between items-end mt-2 text-xs">
                      <span className="font-mono-data text-white font-bold">{formatRupiah(remaining)} Tersisa</span>
                      <span className="text-on-surface-variant font-mono-data">
                        {formatRupiah(budget.spent, false)} / <span className="font-bold text-white">{formatRupiah(budget.limit, false)}</span>
                      </span>
                    </div>

                    {/* Progress Indicator line */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${barBgColor}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    {/* Dynamic Warning Alert message inline if low */}
                    {isLowRemaining && (
                      <div className="text-[10px] text-red-300 flex items-center gap-1 font-medium bg-[#EF4444]/5 p-2 rounded-lg mt-3 border border-[#EF4444]/15">
                        <AlertCircle className="w-3.5 h-3.5 text-[#EF4444]" />
                        Pengeluaran mendekati batas jatah jajan!
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        </div>

      </div>
    </div>
  );
}
