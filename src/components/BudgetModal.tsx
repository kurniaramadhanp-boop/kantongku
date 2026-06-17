import React, { useState } from 'react';
import { Budget, CategoryType, Category } from '../types';
import { formatRupiah, getCategoryColorHex } from '../utils';
import CategoryIcon from './CategoryIcon';
import { 
  AlertCircle, 
  Plus, 
  Sparkles, 
  Target, 
  Trash2,
  Receipt,
  X,
  Edit3,
  GripVertical,
  Save,
  Undo2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgets: Budget[];
  onAddBudget: (budget: Omit<Budget, 'id' | 'sisaPercent'>) => void;
  onEditBudget: (budget: Budget) => void;
  onDeleteBudget: (id: string) => void;
  onReorderBudgets: (reordered: Budget[]) => void;
  categories: Category[];
}

export default function BudgetModal({ isOpen, onClose, budgets, onAddBudget, onEditBudget, onDeleteBudget, onReorderBudgets, categories }: BudgetModalProps) {
  const [addMode, setAddMode] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [limitDisplay, setLimitDisplay] = useState('');
  const [limit, setLimit] = useState<number>(0);
  const [spentDisplay, setSpentDisplay] = useState('');
  const [spent, setSpent] = useState<number>(0);
  const [category, setCategory] = useState<CategoryType>(categories[0]?.id || 'makan');
  const [type, setType] = useState<'expense_limit' | 'target_funding'>('expense_limit');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Determine if device is touch (disable drag-and-drop on mobile)
  const isTouchDevice = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0);

  if (!isOpen) return null;

  const formatNum = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (!raw) return '';
    return new Intl.NumberFormat('id-ID').format(Number(raw));
  };

  const resetForm = () => {
    setTitle('');
    setLimit(0);
    setLimitDisplay('');
    setSpent(0);
    setSpentDisplay('');
    setCategory(categories[0]?.id || 'makan');
    setType('expense_limit');
    setEditingBudgetId(null);
    setAddMode(false);
  };

  const handleOpenEdit = (budget: Budget) => {
    setEditingBudgetId(budget.id);
    setTitle(budget.title);
    setLimit(budget.limit);
    setLimitDisplay(new Intl.NumberFormat('id-ID').format(budget.limit));
    setSpent(budget.spent);
    setSpentDisplay(new Intl.NumberFormat('id-ID').format(budget.spent));
    setCategory(budget.category);
    setType(budget.type);
    setAddMode(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert('Mohon isi nama jatah');
    if (limit <= 0) return alert('Sediakan batas jajan / target dana yang valid');
    
    if (editingBudgetId) {
      const existing = budgets.find(b => b.id === editingBudgetId);
      if (!existing) return;
      const remaining = limit - spent;
      const sisaPercent = limit > 0 ? Math.max(0, Math.round((remaining / limit) * 100)) : 0;
      onEditBudget({
        ...existing,
        title,
        spent,
        limit,
        category,
        type,
        sisaPercent
      });
    } else {
      onAddBudget({ title, spent, limit, category, type });
    }
    resetForm();
  };

  // Drag & drop (disabled on touch devices)
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
  const handleDragEnd = () => { setDragOverId(null); setDragId(null); };

  const kopiBudget = budgets.find(b => b.title.toLowerCase().includes('kopi'));
  const showWarningBanner = kopiBudget ? (kopiBudget.limit - kopiBudget.spent) / kopiBudget.limit <= 0.21 : false;

  return (
    <div className="fixed inset-0 bg-[#060A13]/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4 overflow-y-auto">
      <div 
        className="glass-card rounded-2xl w-full max-w-2xl border border-white/10 relative overflow-hidden flex flex-col my-8 animate-fade-in shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 shrink-0">
          <div>
            <h2 className="font-headline-md text-xl text-white font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Jatah Jajan &amp; Budget
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Kelola limit belanja bulanan dan target tabungan Anda.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-6 no-scrollbar">
          {/* Warn Banner */}
          {showWarningBanner && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-[#842225] shadow-[0_4px_15px_rgba(132,34,37,0.15)] flex gap-3 relative overflow-hidden">
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
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left: Add/Edit Form */}
            <div className="md:col-span-5 flex flex-col gap-4">
              {!addMode ? (
                <button
                  onClick={() => { resetForm(); setAddMode(true); }}
                  className="w-full h-12 rounded-xl border border-dashed border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-all text-xs font-label-caps flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  Atur Jatah Jajan Baru
                </button>
              ) : (
                <form onSubmit={handleSubmit} className="bg-surface-variant/20 border border-white/5 rounded-xl p-4 flex flex-col gap-3 text-left">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="font-bold text-white text-xs flex items-center gap-1">
                      {editingBudgetId ? (
                        <><Edit3 className="w-3.5 h-3.5 text-primary" /> Edit Jatah</>
                      ) : 'Atur Jatah Baru'}
                    </span>
                    <button 
                      type="button" 
                      onClick={resetForm}
                      className="text-[10px] text-on-surface-variant hover:text-white"
                    >
                      Batal
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1 bg-[#0B111E]/80 rounded-lg p-1 border border-white/5">
                    <button
                      type="button"
                      onClick={() => setType('expense_limit')}
                      className={`py-1 rounded-md font-label-caps text-[9px] uppercase transition-all tracking-wider ${type === 'expense_limit' ? 'bg-[#EF4444] text-white font-bold' : 'text-on-surface-variant hover:text-white'}`}
                    >
                      Batas Belanja
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('target_funding')}
                      className={`py-1 rounded-md font-label-caps text-[9px] uppercase transition-all tracking-wider ${type === 'target_funding' ? 'bg-primary text-on-primary font-bold' : 'text-on-surface-variant hover:text-white'}`}
                    >
                      Tabungan
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-label-caps text-on-surface-variant uppercase">Nama Jatah / Target</label>
                    <input 
                      type="text"
                      required
                      placeholder="Misal: Jajan Kopi, Makan-makan"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-9 bg-[#0B111E]/40 rounded-lg text-xs text-white border border-white/10 focus:outline-none focus:border-primary/60 px-3"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-label-caps text-on-surface-variant uppercase">Terpakai (Rp)</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={spentDisplay}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          setSpent(raw ? Number(raw) : 0);
                          setSpentDisplay(raw ? new Intl.NumberFormat('id-ID').format(Number(raw)) : '');
                        }}
                        className="h-9 bg-[#0B111E]/40 rounded-lg text-xs text-white border border-white/10 focus:outline-none focus:border-primary/60 px-3 font-mono-data"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-label-caps text-on-surface-variant uppercase">Batas (Rp)</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        required
                        placeholder="Limit"
                        value={limitDisplay}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          setLimit(raw ? Number(raw) : 0);
                          setLimitDisplay(raw ? new Intl.NumberFormat('id-ID').format(Number(raw)) : '');
                        }}
                        className="h-9 bg-[#0B111E]/40 rounded-lg text-xs text-white border border-white/10 focus:outline-none focus:border-primary/60 px-3 font-mono-data"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-label-caps text-on-surface-variant uppercase">Kategori</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as CategoryType)}
                      className="h-9 bg-[#0B111E]/40 rounded-lg text-xs text-white border border-white/10 focus:outline-none focus:border-primary/60 px-2"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id} className="bg-[#0B111E] text-white">{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-9 bg-primary text-on-primary font-label-caps text-[10px] tracking-wider rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-[0_2px_8px_rgba(78,222,163,0.15)] mt-1 flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {editingBudgetId ? 'Simpan Perubahan' : 'Simpan Jatah'}
                  </button>
                </form>
              )}
            </div>

            {/* Right: Budgets List */}
            <div className="md:col-span-7 flex flex-col gap-3">
              {budgets.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant/40 flex flex-col items-center gap-1.5 bg-white/5 border border-white/5 rounded-xl">
                  <Target className="w-8 h-8 text-on-surface-variant/20" />
                  <p className="text-xs">Belum ada jatah jajan yang diatur.</p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-on-surface-variant/50 flex items-center gap-1">
                    <GripVertical className="w-3 h-3" />
                    Seret untuk mengubah urutan
                  </p>
                  {budgets.map(budget => {
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

                    const isDragging = dragId === budget.id;
                    const isDragOver = dragOverId === budget.id;

                    return (
                      <div 
                        key={budget.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, budget.id)}
                        onDragOver={(e) => handleDragOver(e, budget.id)}
                        onDrop={(e) => handleDrop(e, budget.id)}
                        onDragEnd={handleDragEnd}
                        className={`border rounded-xl p-4 flex flex-col gap-2.5 relative group transition-all text-left ${
                          isDragging
                            ? 'opacity-40 scale-95 bg-white/5 border-white/10'
                            : isDragOver
                            ? 'bg-primary/5 border-primary/30 scale-[1.01]'
                            : 'bg-surface-variant/10 hover:bg-surface-variant/20 border-white/5'
                        }`}
                      >
                        {/* Drag handle */}
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-30 group-hover:opacity-60 transition-opacity">
                          <GripVertical className="w-4 h-4 text-on-surface-variant" />
                        </div>

                        <div className="flex justify-between items-start gap-2 pl-5 pr-16">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#0b101d] border border-white/5 flex items-center justify-center shrink-0">
                              {(() => {
                                const cat = categories.find(c => c.id === budget.category);
                                const colorHex = cat ? getCategoryColorHex(cat.color) : '#64748B';
                                return <CategoryIcon name={cat?.icon || 'receipt'} className="w-4 h-4" style={{ color: colorHex }} />;
                              })()}
                            </div>
                            <div>
                              <h3 className="text-sm text-white font-medium leading-snug">{budget.title}</h3>
                              <p className="text-[10px] text-on-surface-variant">
                                {budget.type === 'expense_limit' ? 'Batas Belanja' : 'Rencana Anggaran'}
                              </p>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 text-[8px] font-label-caps font-bold uppercase rounded tracking-wider border shrink-0 ${isLowRemaining ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]' : budget.type === 'target_funding' ? 'bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6]' : 'bg-primary/10 border-primary/30 text-primary'}`}>
                            {alertLabel}
                          </span>
                        </div>

                        {/* Fractional numbers */}
                        <div className="flex justify-between items-end text-[11px] mt-1 pl-5">
                          <span className="font-mono-data text-white font-bold">{formatRupiah(remaining)} Tersisa</span>
                          <span className="text-on-surface-variant font-mono-data">
                            {formatRupiah(budget.spent, false)} / <span className="font-bold text-white">{formatRupiah(budget.limit, false)}</span>
                          </span>
                        </div>

                        {/* Progress Indicator line */}
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${barBgColor}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        {/* Edit + Delete + Reorder buttons - visible on mobile, hover on desktop */}
                        <div className="md:absolute md:top-3 md:right-3 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-wrap mt-2 md:mt-0">
                          <button 
                            onClick={() => handleOpenEdit(budget)}
                            className="p-1.5 text-on-surface-variant/60 hover:text-primary transition-colors text-[11px] md:text-xs rounded md:rounded-sm flex items-center justify-center hover:bg-white/5 md:hover:bg-transparent"
                            title="Edit jatah"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm(`Apakah Anda yakin ingin menghapus jatah "${budget.title}"?`)) {
                                onDeleteBudget(budget.id);
                              }
                            }}
                            className="p-1.5 text-on-surface-variant/60 hover:text-rose-400 transition-colors text-[11px] md:text-xs rounded md:rounded-sm flex items-center justify-center hover:bg-white/5 md:hover:bg-transparent"
                            title="Hapus jatah"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {/* Move Up */}
                          <button
                            onClick={() => {
                              const idx = budgets.findIndex(b => b.id === budget.id);
                              if (idx > 0) {
                                const newOrder = [...budgets];
                                [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
                                onReorderBudgets(newOrder);
                              }
                            }}
                            disabled={budgets.findIndex(b => b.id === budget.id) === 0}
                            className="p-1.5 text-on-surface-variant/60 hover:text-primary disabled:opacity-40 transition-colors text-[11px] md:text-xs rounded md:rounded-sm flex items-center justify-center hover:bg-white/5 md:hover:bg-transparent"
                            title="Naik"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          {/* Move Down */}
                          <button
                            onClick={() => {
                              const idx = budgets.findIndex(b => b.id === budget.id);
                              if (idx < budgets.length - 1) {
                                const newOrder = [...budgets];
                                [newOrder[idx + 1], newOrder[idx]] = [newOrder[idx], newOrder[idx + 1]];
                                onReorderBudgets(newOrder);
                              }
                            }}
                            disabled={budgets.findIndex(b => b.id === budget.id) === budgets.length - 1}
                            className="p-1.5 text-on-surface-variant/60 hover:text-primary disabled:opacity-40 transition-colors text-[11px] md:text-xs rounded md:rounded-sm flex items-center justify-center hover:bg-white/5 md:hover:bg-transparent"
                            title="Turun"
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
