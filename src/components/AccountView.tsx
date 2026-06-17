import React, { useState, useEffect } from 'react';
import { Account, Pocket, Transaction } from '../types';
import { formatRupiah } from '../utils';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Landmark, 
  Smartphone, 
  Coins, 
  Wallet,
  Save,
  X,
  Sliders,
  ChevronRight,
  Info,
  Undo2
} from 'lucide-react';

interface AccountViewProps {
  accounts: Account[];
  pockets: Pocket[];
  transactions: Transaction[];
  onAddAccount: (account: Omit<Account, 'balance'> & { initialBalance: number }) => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
  onSaveAllocations: (accountId: string, allocations: Record<string, number>) => void;
}

const ICONS = [
  { value: 'bank', label: 'Bank', icon: Landmark },
  { value: 'smartphone', label: 'E-Wallet', icon: Smartphone },
  { value: 'cash', label: 'Uang Tunai', icon: Coins },
  { value: 'wallet', label: 'Dompet Lain', icon: Wallet },
];

const COLORS = [
  { value: 'indigo', label: 'Indigo/BCA', hex: '#3B82F6', activeClass: 'ring-2 ring-blue-500 bg-blue-500/20' },
  { value: 'purple', label: 'Purple/GoPay', hex: '#8B5CF6', activeClass: 'ring-2 ring-purple-500 bg-purple-500/20' },
  { value: 'emerald', label: 'Emerald/Tunai', hex: '#10B981', activeClass: 'ring-2 ring-emerald-500 bg-emerald-500/20' },
  { value: 'orange', label: 'Orange', hex: '#F97316', activeClass: 'ring-2 ring-orange-500 bg-orange-500/20' },
  { value: 'cyan', label: 'Cyan', hex: '#06B6D4', activeClass: 'ring-2 ring-cyan-500 bg-cyan-500/20' },
  { value: 'pink', label: 'Pink', hex: '#EC4899', activeClass: 'ring-2 ring-pink-500 bg-pink-500/20' },
];

export default function AccountView({
  accounts,
  pockets,
  transactions,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onSaveAllocations
}: AccountViewProps) {
  const [formMode, setFormMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Form States
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [icon, setIcon] = useState('bank');
  const [color, setColor] = useState('indigo');

  // Allocation States
  const [isEditingAllocation, setIsEditingAllocation] = useState(false);
  const [allocationInputs, setAllocationInputs] = useState<Record<string, number>>({});

  // Reset editing allocation state when wallet selection changes
  useEffect(() => {
    setIsEditingAllocation(false);
  }, [selectedAccountId]);

  const handleStartEditAllocation = () => {
    if (!selectedAccountId) return;
    const inputs: Record<string, number> = {};
    pockets.forEach(p => {
      const pocketTrans = transactions.filter(t => t.accountId === selectedAccountId && t.pocketId === p.id);
      const balance = pocketTrans.reduce((sum, t) => {
        const delta = t.type === 'incoming' ? t.amount : -t.amount;
        return sum + delta;
      }, 0);
      inputs[p.id] = Math.max(0, balance);
    });
    setAllocationInputs(inputs);
    setIsEditingAllocation(true);
  };

  const handleAllocationInputChange = (pocketId: string, val: number) => {
    setAllocationInputs(prev => ({
      ...prev,
      [pocketId]: Math.max(0, val)
    }));
  };

  const totalAllocatedInput = Object.values(allocationInputs).reduce((sum, v) => sum + v, 0);

  const handleAllocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAcc = accounts.find(a => a.id === selectedAccountId);
    if (!selectedAccountId || !targetAcc) return;
    if (totalAllocatedInput !== targetAcc.balance) {
      return alert('Total alokasi harus sama dengan total saldo wallet.');
    }
    onSaveAllocations(selectedAccountId, allocationInputs);
    setIsEditingAllocation(false);
  };

  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  // Open add account form
  const handleOpenAdd = () => {
    setName('');
    setTag('');
    setInitialBalance(0);
    setIcon('bank');
    setColor('indigo');
    setFormMode('add');
    setDeleteWarning(null);
  };

  // Open edit account form
  const handleOpenEdit = (acc: Account) => {
    setEditingAccountId(acc.id);
    setName(acc.name);
    setTag(acc.tag || '');
    setIcon(acc.icon);
    setColor(acc.color);
    setFormMode('edit');
    setDeleteWarning(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Nama rekening tidak boleh kosong');

    if (formMode === 'add') {
      onAddAccount({
        id: `acc-${Date.now()}`,
        name: name.trim(),
        tag: tag.trim() || 'Rekening kustom',
        icon,
        color,
        initialBalance: initialBalance || 0
      });
    } else if (formMode === 'edit' && editingAccountId) {
      const accToEdit = accounts.find(a => a.id === editingAccountId);
      if (!accToEdit) return;
      onEditAccount({
        ...accToEdit,
        name: name.trim(),
        tag: tag.trim() || 'Rekening kustom',
        icon,
        color
      });
    }
    setFormMode('list');
  };

  const handleDeleteCheck = (accId: string, accName: string) => {
    const hasTransactions = transactions.some(t => t.accountId === accId);
    const msg = hasTransactions 
      ? `Apakah Anda yakin ingin menghapus rekening "${accName}"? Peringatan: Semua riwayat transaksi yang menggunakan rekening ini juga akan dihapus secara permanen!`
      : `Apakah Anda yakin ingin menghapus rekening "${accName}"?`;

    if (confirm(msg)) {
      onDeleteAccount(accId);
      setDeleteWarning(null);
      if (selectedAccountId === accId) setSelectedAccountId(null);
    }
  };

  const getAccountIcon = (iconName: string, colorHex: string) => {
    const found = ICONS.find(i => i.value === iconName);
    const IconComp = found ? found.icon : Landmark;
    return <IconComp className="w-5 h-5 shrink-0" style={{ color: colorHex }} />;
  };

  const getBorderColorHex = (colorName: string) => {
    const found = COLORS.find(c => c.value === colorName);
    return found ? found.hex : '#94A3B8';
  };

  const getPocketColorHex = (colorName: string) => {
    const map: Record<string, string> = {
      emerald: '#10B981',
      indigo: '#3B82F6',
      amber: '#F59E0B',
      rose: '#EF4444',
      purple: '#8B5CF6',
      teal: '#14B8A6',
      orange: '#F97316',
      cyan: '#06B6D4',
      pink: '#EC4899',
      yellow: '#EAB308',
      sky: '#0EA5E9',
      lime: '#84CC16'
    };
    return map[colorName] || '#94A3B8';
  };

  // Calculate dynamic pocket allocations inside selected account
  const getPocketAllocations = (accId: string) => {
    const allocations: { pocketId: string; name: string; color: string; balance: number; percentage: number }[] = [];
    const acc = accounts.find(a => a.id === accId);
    if (!acc) return allocations;

    let totalAllocated = 0;
    const tempAllocations: Omit<typeof allocations[number], 'percentage'>[] = [];

    pockets.forEach(p => {
      // Sum transactions in this account for this pocket
      const pocketTrans = transactions.filter(t => t.accountId === accId && t.pocketId === p.id);
      const balance = pocketTrans.reduce((sum, t) => {
        const delta = t.type === 'incoming' ? t.amount : -t.amount;
        return sum + delta;
      }, 0);

      if (balance > 0) {
        tempAllocations.push({
          pocketId: p.id,
          name: p.name,
          color: p.color,
          balance
        });
        totalAllocated += balance;
      }
    });

    // Compute percentages
    tempAllocations.forEach(a => {
      const percentage = totalAllocated > 0 ? Math.round((a.balance / totalAllocated) * 100) : 0;
      allocations.push({ ...a, percentage });
    });

    return allocations;
  };

  const activeAllocations = selectedAccountId ? getPocketAllocations(selectedAccountId) : [];
  const selectedAccount = selectedAccountId ? accounts.find(a => a.id === selectedAccountId) : null;

  return (
    <div className="flex flex-col gap-6 select-none font-body-md text-white">
      {/* Title Header */}
      <div className="flex justify-between items-center w-full">
        <div>
          <h1 className="font-headline-md text-2xl text-white font-bold leading-tight">Dompet &amp; Wallet</h1>
          <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
            Kelola simpanan fisik (Bank/E-Wallet/Dompet) dan pantau alokasi kantong di dalamnya.
          </p>
        </div>
        
        {formMode === 'list' && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 h-11 bg-primary text-on-primary rounded-xl text-xs font-bold transition-all active:scale-95 shadow-[0_4px_15px_rgba(78,222,163,0.2)]"
          >
            <Plus className="w-4 h-4" />
            Tambah Wallet
          </button>
        )}
      </div>

      {deleteWarning && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex gap-2 items-start animate-shake">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Tidak Dapat Dihapus</p>
            <p className="leading-relaxed">{deleteWarning}</p>
            <button 
              type="button"
              onClick={() => setDeleteWarning(null)}
              className="mt-2 text-white bg-rose-500/20 hover:bg-rose-500/30 px-2.5 py-1 rounded text-[10px] font-bold"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {formMode === 'list' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          
          {/* LEFT COLUMN: Accounts List */}
          <div className="lg:col-span-7 flex flex-col gap-4 w-full">
            {accounts.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center text-on-surface-variant/40 flex flex-col items-center gap-2">
                <Landmark className="w-10 h-10 text-on-surface-variant/30" />
                <p className="text-xs">Belum ada rekening dibuat. Silakan tambah rekening baru.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts.map(acc => {
                  const borderHex = getBorderColorHex(acc.color);
                  const isFocused = selectedAccountId === acc.id;
                  const borderStyle = isFocused 
                    ? `2px solid ${borderHex}` 
                    : '1px solid rgba(255, 255, 255, 0.08)';

                  return (
                    <div
                      key={acc.id}
                      onClick={() => setSelectedAccountId(isFocused ? null : acc.id)}
                      className={`glass-card rounded-xl p-5 relative overflow-hidden flex flex-col gap-3 hover:bg-white/5 transition-all duration-200 cursor-pointer ${isFocused ? 'ring-2 ring-offset-2 ring-offset-[#0B111E]' : ''}`}
                      style={{ 
                        borderLeftColor: borderHex, 
                        borderLeftWidth: '4px',
                        borderTop: borderStyle,
                        borderRight: borderStyle,
                        borderBottom: borderStyle,
                        borderColor: isFocused ? borderHex : ''
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          {getAccountIcon(acc.icon, borderHex)}
                          <h3 className="font-headline-sm text-md text-white font-medium">{acc.name}</h3>
                        </div>
                        
                        {/* CRUD Tools in header */}
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenEdit(acc)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-on-surface-variant hover:text-white transition-colors"
                            title="Edit rekening"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {accounts.length > 1 && (
                            <button
                              onClick={() => handleDeleteCheck(acc.id, acc.name)}
                              className="p-1.5 bg-white/5 hover:bg-rose-500/5 hover:border-rose-500/20 border border-white/5 rounded-lg text-on-surface-variant/60 hover:text-rose-400 transition-colors"
                              title="Hapus rekening"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] text-on-surface-variant/70 uppercase font-label-caps tracking-wider">Saldo Total</p>
                        <p className="font-mono-data text-xl font-bold text-white mt-0.5">{formatRupiah(acc.balance)}</p>
                      </div>

                      <div className="flex justify-between items-center mt-1 pt-2.5 border-t border-white/5">
                        <span className="text-[10px] text-on-surface-variant/60 italic truncate max-w-[120px]">{acc.tag || 'Rekening Aktif'}</span>
                        <span className="text-[9px] font-label-caps font-bold text-primary flex items-center gap-1">
                          Pemberian Alokasi
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Pocket Allocation Breakdown for Focused Account */}
          <div className="lg:col-span-5 w-full">
            {selectedAccount ? (
              <div className="glass-card rounded-xl p-5 border border-white/10 relative overflow-hidden flex flex-col gap-4 animate-fade-in">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                
                {isEditingAllocation ? (
                  <form onSubmit={handleAllocationSubmit} className="flex flex-col gap-4 text-left">
                    <div className="border-b border-white/5 pb-2">
                      <span className="text-[10px] font-label-caps text-on-surface-variant uppercase">Atur Alokasi Saldo</span>
                      <h3 className="font-headline-sm text-lg text-white font-bold flex items-center gap-2 mt-0.5">
                        {getAccountIcon(selectedAccount.icon, getBorderColorHex(selectedAccount.color))}
                        {selectedAccount.name}
                      </h3>
                      <p className="text-[11px] text-on-surface-variant/70 mt-1">
                        Tentukan alokasi saldo {formatRupiah(selectedAccount.balance)} ke kantong-kantong.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto pr-1 no-scrollbar">
                      {pockets.map(p => {
                        const val = allocationInputs[p.id] || 0;
                        return (
                          <div key={p.id} className="flex flex-col gap-1.5">
                            <label className="text-[11px] text-white/80 font-medium">{p.name}</label>
                            <div className="relative flex items-center">
                              <span className="absolute left-3 font-mono-data text-primary text-xs font-bold">Rp</span>
                              <input 
                                type="number"
                                min="0"
                                max={selectedAccount.balance}
                                placeholder="0"
                                value={val || ''}
                                onChange={(e) => handleAllocationInputChange(p.id, Number(e.target.value))}
                                className="h-10 w-full bg-[#0B111E]/40 border border-white/10 rounded-lg pl-9 pr-3 text-xs text-white focus:outline-none focus:border-primary/60 font-mono-data"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Totals check */}
                    <div className="p-3 bg-surface-variant/30 border border-white/5 rounded-xl text-xs flex flex-col gap-1.5 font-mono-data">
                      <div className="flex justify-between text-on-surface-variant">
                        <span>Total Saldo Wallet:</span>
                        <span>{formatRupiah(selectedAccount.balance)}</span>
                      </div>
                      <div className="flex justify-between text-white font-bold">
                        <span>Total Dialokasikan:</span>
                        <span>{formatRupiah(totalAllocatedInput)}</span>
                      </div>
                      <div className={`flex justify-between ${totalAllocatedInput === selectedAccount.balance ? 'text-primary font-bold' : 'text-rose-400 font-bold'}`}>
                        <span>Sisa Saldo:</span>
                        <span>{formatRupiah(selectedAccount.balance - totalAllocatedInput)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-white/5">
                      <button
                        type="submit"
                        disabled={totalAllocatedInput !== selectedAccount.balance}
                        className="flex-1 h-10 bg-primary text-on-primary rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:opacity-95 disabled:opacity-50 transition-all shadow-[0_4px_12px_rgba(78,222,163,0.15)] active:scale-[0.98]"
                      >
                        <Save className="w-4 h-4" />
                        Simpan Alokasi
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingAllocation(false)}
                        className="px-3 h-10 bg-white/5 border border-white/10 text-on-surface-variant hover:text-white rounded-xl text-xs font-semibold hover:bg-white/10 transition-all"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="border-b border-white/5 pb-3">
                      <span className="text-[10px] font-label-caps text-on-surface-variant uppercase">Rincian Alokasi Uang</span>
                      <h3 className="font-headline-sm text-lg text-white font-bold flex items-center gap-2 mt-0.5">
                        {getAccountIcon(selectedAccount.icon, getBorderColorHex(selectedAccount.color))}
                        {selectedAccount.name}
                      </h3>
                    </div>

                    <div className="flex flex-col gap-4">
                      {activeAllocations.length === 0 ? (
                        <div className="text-center py-8 text-on-surface-variant/40 flex flex-col items-center gap-1">
                          <Sliders className="w-8 h-8 text-on-surface-variant/20 mb-1" />
                          <p className="text-xs">Uang di wallet ini belum teralokasi ke kantong mana pun.</p>
                          <p className="text-[10px] leading-relaxed mt-1 text-on-surface-variant/30">Klik tombol di bawah untuk menetapkan alokasi awal.</p>
                        </div>
                      ) : (
                        <>
                          {/* Allocation percentages progress bar */}
                          <div className="flex h-3 w-full rounded-full overflow-hidden bg-white/5 border border-white/5">
                            {activeAllocations.map(alloc => (
                              <div 
                                key={alloc.pocketId}
                                style={{ 
                                  width: `${alloc.percentage}%`,
                                  backgroundColor: getPocketColorHex(alloc.color)
                                }}
                                title={`${alloc.name}: ${alloc.percentage}%`}
                              />
                            ))}
                          </div>

                          {/* Allocations breakdown list */}
                          <div className="flex flex-col gap-3">
                            {activeAllocations.map(alloc => {
                              const pColor = getPocketColorHex(alloc.color);
                              return (
                                <div key={alloc.pocketId} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-b-0">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pColor }} />
                                    <span className="text-white font-medium">{alloc.name}</span>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-mono-data text-xs font-bold text-white">{formatRupiah(alloc.balance)}</p>
                                    <p className="text-[10px] text-on-surface-variant font-mono-data mt-0.5">{alloc.percentage}% dari saldo wallet</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {/* Adjust Allocations Action Button */}
                      {selectedAccount.balance > 0 ? (
                        <button
                          type="button"
                          onClick={handleStartEditAllocation}
                          className="w-full h-11 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 mt-2 active:scale-[0.98]"
                        >
                          <Sliders className="w-4 h-4" />
                          Sesuaikan Alokasi Dana
                        </button>
                      ) : (
                        <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs text-on-surface-variant/60 flex items-center gap-2 mt-2">
                          <Info className="w-4 h-4 shrink-0 text-primary" />
                          <span>Saldo wallet Rp 0. Catat pemasukan baru di wallet ini terlebih dahulu untuk mengalokasikan dana.</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="glass-card rounded-xl p-6 text-center border border-white/5 text-on-surface-variant/40 flex flex-col items-center gap-2 py-12">
                <Sliders className="w-9 h-9 text-on-surface-variant/25" />
                <h3 className="text-sm font-semibold text-white/80">Pilih Wallet</h3>
                <p className="text-xs leading-relaxed max-w-[200px] mx-auto text-on-surface-variant/50">
                  Klik salah satu kartu wallet di samping untuk melihat rincian alokasi kantong di dalamnya.
                </p>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ADD / EDIT FORM OVERLAY */
        <div className="glass-card rounded-xl p-5 border border-white/10 max-w-md mx-auto w-full">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
            
            {/* Account Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-label-caps text-on-surface-variant uppercase">Nama Wallet / Dompet</label>
              <input
                type="text"
                required
                maxLength={24}
                placeholder="Contoh: Bank BCA, E-Wallet ShopeePay"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 bg-surface-variant/40 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-primary/60 font-body-md"
              />
            </div>

            {/* Account Tagline */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-label-caps text-on-surface-variant uppercase">Tagline / Deskripsi Singkat</label>
              <input
                type="text"
                maxLength={32}
                placeholder="Contoh: Dompet utama, Akun belanja harian"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="h-11 bg-surface-variant/40 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-primary/60 font-body-md"
              />
            </div>

            {/* Initial balance (only on add mode) */}
            {formMode === 'add' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Saldo Awal Wallet (Rp)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={initialBalance || ''}
                  onChange={(e) => setInitialBalance(Number(e.target.value))}
                  className="h-11 bg-surface-variant/40 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-primary/60 font-mono-data"
                />
              </div>
            )}

            {/* Accent Color selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-label-caps text-on-surface-variant uppercase">Tema Warna Aksen</label>
              <div className="grid grid-cols-6 gap-2">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`h-9 rounded-lg flex items-center justify-center transition-all border text-xs font-semibold ${color === c.value ? c.activeClass : 'bg-surface-variant/10 border-white/5 text-on-surface-variant hover:bg-white/5'}`}
                    style={{ color: c.hex, borderColor: color === c.value ? c.hex : '' }}
                    title={c.label}
                  >
                    A
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-label-caps text-on-surface-variant uppercase">Pilih Ikon Wallet</label>
              <div className="grid grid-cols-4 gap-2">
                {ICONS.map(i => {
                  const IconComp = i.icon;
                  const isSelected = icon === i.value;
                  const foundColor = COLORS.find(c => c.value === color);
                  const activeStyle = foundColor ? { color: foundColor.hex, borderColor: foundColor.hex, backgroundColor: foundColor.hex + '15' } : {};
                  
                  return (
                    <button
                      key={i.value}
                      type="button"
                      onClick={() => setIcon(i.value)}
                      className={`h-10 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-all border ${isSelected ? '' : 'bg-surface-variant/10 border-white/5 text-on-surface-variant hover:bg-white/5'}`}
                      style={isSelected ? activeStyle : {}}
                    >
                      <IconComp className="w-4 h-4 shrink-0" />
                      {i.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Action buttons */}
            <div className="flex gap-2.5 mt-3 pt-3 border-t border-white/5">
              <button
                type="submit"
                className="flex-1 h-11 bg-primary text-on-primary rounded-xl font-headline-sm text-sm font-bold flex items-center justify-center gap-1.5 hover:opacity-95 transition-all shadow-[0_4px_15px_rgba(78,222,163,0.15)] active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                Simpan Wallet
              </button>
              <button
                type="button"
                onClick={() => setFormMode('list')}
                className="px-4 h-11 bg-white/5 border border-white/10 text-on-surface-variant hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1 hover:bg-white/10 active:scale-[0.98]"
              >
                <Undo2 className="w-4 h-4" />
                Batal
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
}
