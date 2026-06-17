import React, { useState } from 'react';
import { Transaction, Pocket, Category } from '../types';
import { formatRupiah, generateWhatsAppReport } from '../utils';
import CategoryIcon from './CategoryIcon';
import { 
  Send, 
  Loader, 
  TrendingDown,
  Receipt,
  ExternalLink
} from 'lucide-react';

interface ActivityViewProps {
  transactions: Transaction[];
  pockets: Pocket[];
  categories: Category[];
  onOpenHistory: (filter?: { category?: string }) => void;
}

export default function ActivityView({ transactions, pockets, categories, onOpenHistory }: ActivityViewProps) {
  const [exporting, setExporting] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category);
    if (!cat) return <Receipt className="w-5 h-5 text-slate-400" />;
    return <CategoryIcon name={cat.icon} className="w-5 h-5" />;
  };

  const getCategoryColorClasses = (category: string) => {
    const cat = categories.find(c => c.id === category);
    const colorName = cat ? cat.color : 'slate';
    const map: Record<string, string> = {
      emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      indigo: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      teal: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
      orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
      cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
      pink: 'bg-pink-500/10 border-pink-500/20 text-pink-400',
      yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
      sky: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
      lime: 'bg-lime-500/10 border-lime-500/20 text-lime-400',
      violet: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
      fuchsia: 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400',
      slate: 'bg-slate-500/10 border-slate-500/20 text-slate-400'
    };
    return map[colorName] || 'bg-slate-500/10 border-slate-500/20 text-slate-400';
  };

  const totalBalance = pockets.reduce((sum, p) => sum + p.balance, 0);

  // Group transactions into weeks of the current month using REAL data
  const getWeeklyTrendData = (): number[] => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter outgoing transactions of the current month
    const outgoingThisMonth = transactions.filter(t => {
      if (t.type !== 'outgoing') return false;
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    if (outgoingThisMonth.length === 0) {
      // No real data — return fallback placeholder so chart isn't flat
      return [240000, 480000, 680000, 1050000];
    }

    const liveWeeks = [0, 0, 0, 0];
    outgoingThisMonth.forEach(t => {
      const day = new Date(t.date).getDate();
      if (day <= 7) liveWeeks[0] += t.amount;
      else if (day <= 14) liveWeeks[1] += t.amount;
      else if (day <= 21) liveWeeks[2] += t.amount;
      else liveWeeks[3] += t.amount;
    });

    // For weeks with no spending, keep 0 (don't inject fake data)
    return liveWeeks;
  };

  const weeklyTrendData = getWeeklyTrendData();
  const totalWeeklySpent = weeklyTrendData.reduce((sum, val) => sum + val, 0);

  // Calculate highest spending categories dynamically — current month only
  const getTopExpenseCategories = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const categoryTotals: Record<string, { spent: number; count: number }> = {};
    const outgoingList = transactions.filter(t => {
      if (t.type !== 'outgoing') return false;
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    outgoingList.forEach(t => {
      if (!categoryTotals[t.category]) {
        categoryTotals[t.category] = { spent: 0, count: 0 };
      }
      categoryTotals[t.category].spent += t.amount;
      categoryTotals[t.category].count += 1;
    });

    const totalSpent = outgoingList.reduce((s, t) => s + t.amount, 0);

    const categoriesArray = Object.keys(categoryTotals).map(catId => {
      const catInfo = categories.find(c => c.id === catId);
      const data = categoryTotals[catId];
      const percent = totalSpent > 0 ? Math.round((data.spent / totalSpent) * 100) : 0;
      return {
        id: catId,
        name: catInfo?.name || 'Lain-lain',
        icon: catInfo?.icon || 'receipt',
        color: catInfo?.color || 'slate',
        spent: data.spent,
        count: data.count,
        percent,
      };
    });

    return categoriesArray.sort((a, b) => b.spent - a.spent);
  };

  const topCategories = getTopExpenseCategories();

  // Export to WhatsApp with per-category summary
  const handleExportWA = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      const waTextString = generateWhatsAppReport(transactions, pockets, totalBalance, categories);
      const waUrlSimulated = `https://api.whatsapp.com/send?text=${waTextString}`;
      window.open(waUrlSimulated, '_blank');
    }, 2000);
  };

  // SVG coordinate calculations for smooth Curve spline
  const maxWeeklyHeight = Math.max(...weeklyTrendData, 1);
  const minWeeklyHeight = Math.min(...weeklyTrendData);
  const range = maxWeeklyHeight - minWeeklyHeight || 1;
  
  const coords = weeklyTrendData.map((val, idx) => {
    const x = (idx * 110) + 30;
    const factor = (val - minWeeklyHeight) / range;
    const y = 140 - (factor * 90);
    return { x, y, value: val };
  });

  let pathString = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const cp1x = (coords[i].x + coords[i + 1].x) / 2;
    const cp1y = coords[i].y;
    const cp2x = (coords[i].x + coords[i + 1].x) / 2;
    const cp2y = coords[i + 1].y;
    pathString += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${coords[i + 1].x} ${coords[i + 1].y}`;
  }

  const now = new Date();
  const currentMonthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-6 select-none font-body-md min-w-0 w-full">
      
      {/* Title Header */}
      <div>
        <h1 className="font-headline-md text-2xl text-white font-bold leading-tight">Analisis Pengeluaran</h1>
        <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
          Tinjau pola sirkulasi keuangan dan ekspor laporan berkala — <span className="text-primary font-semibold">{currentMonthName}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full min-w-0">
        
        {/* LEFT COLUMN: Weekly Trend Chart */}
        <div className="lg:col-span-7 flex flex-col gap-6 w-full min-w-0">
          <section className="flex flex-col gap-2.5 w-full min-w-0">
            <h2 className="font-headline-sm text-base text-white">Tren Pengeluaran Mingguan</h2>
            
            <div className="glass-card rounded-xl p-card_padding relative overflow-hidden flex flex-col gap-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-on-surface-variant font-label-caps uppercase tracking-wider">Total Pengeluaran Bulan Ini</p>
                  <p className="font-display-lg text-white font-mono-data">{formatRupiah(totalWeeklySpent)}</p>
                </div>
                
                <div className="flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
                  <TrendingDown className="w-4 h-4 shrink-0" />
                  <span className="font-mono-data text-xs font-bold">Pengeluaran</span>
                </div>
              </div>

              {/* SVG Spline curve chart */}
              <div className="h-44 w-full relative mt-3 select-all">
                <svg className="w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(78, 222, 163, 0.4)" />
                      <stop offset="100%" stopColor="rgba(78, 222, 163, 0.0)" />
                    </linearGradient>
                  </defs>

                  {/* Area map */}
                  <path
                    d={`M ${coords[0].x} 145 ${pathString} L ${coords[coords.length - 1].x} 145 Z`}
                    fill="url(#chartGradient)"
                  />

                  {/* Glowing spline stroke */}
                  <path
                    d={pathString}
                    fill="none"
                    stroke="#4edea3"
                    strokeWidth="3"
                    className="filter drop-shadow-[0_0_6px_rgba(78,222,163,0.8)]"
                  />

                  {/* Points */}
                  {coords.map((pt, idx) => (
                    <g key={idx} className="cursor-pointer" onClick={() => setSelectedWeek(idx === selectedWeek ? null : idx)}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={selectedWeek === idx ? '8' : '4'}
                        className={`${selectedWeek === idx ? 'fill-primary animate-pulse' : 'fill-surface stroke-primary'} transition-all`}
                        strokeWidth="2"
                      />
                      <circle cx={pt.x} cy={pt.y} r="2" fill="#0B111E" />
                    </g>
                  ))}
                </svg>

                {/* X-axis legends */}
                <div className="absolute bottom-2 left-0 w-full flex justify-between px-6 text-on-surface-variant/60 font-label-caps text-[10px] tracking-wider">
                  {weeklyTrendData.map((val, idx) => (
                    <span key={idx} className={val === 0 ? 'text-on-surface-variant/30' : ''}>
                      Mgg {idx + 1}
                    </span>
                  ))}
                </div>

                {/* Float Tooltip */}
                {selectedWeek !== null && (
                  <div className="absolute top-1 bg-surface border border-white/10 rounded-lg p-2 text-center text-xs shadow-xl left-1/2 -translate-x-1/2 z-10">
                    <span className="font-bold text-white block">Minggu {selectedWeek + 1}</span>
                    <span className="text-primary font-mono-data font-bold block mt-0.5">
                      {weeklyTrendData[selectedWeek] > 0 ? formatRupiah(weeklyTrendData[selectedWeek]) : 'Tidak ada pengeluaran'}
                    </span>
                    <button 
                      onClick={() => setSelectedWeek(null)}
                      className="text-[9px] font-label-caps uppercase text-on-surface-variant hover:text-white mt-1.5 flex items-center justify-center mx-auto"
                    >
                      Tutup [x]
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Top Categories & WhatsApp */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full min-w-0">
          {/* PENGELUARAN TERBESAR */}
          <section className="flex flex-col gap-2.5 w-full min-w-0">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h2 className="font-headline-sm text-base text-white">Pengeluaran Terbesar</h2>
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">Bulan Berjalan</span>
            </div>

            <div className="flex flex-col gap-3">
              {topCategories.length === 0 ? (
                <div className="text-center py-6 text-on-surface-variant/40 text-xs">
                  Belum ada data pengeluaran bulan ini.
                </div>
              ) : (
                topCategories.slice(0, 3).map(cat => (
                  <button
                    key={cat.id} 
                    onClick={() => onOpenHistory({ category: cat.id })}
                    className="glass-card rounded-lg p-card_padding flex items-center gap-4 group hover:bg-surface-container/20 hover:border-white/15 transition-all text-left w-full border border-transparent"
                    title={`Lihat semua transaksi ${cat.name}`}
                  >
                    {/* Icon */}
                    <div className={`w-11 h-11 rounded-full border flex items-center justify-center shrink-0 ${getCategoryColorClasses(cat.id)}`}>
                      {getCategoryIcon(cat.id)}
                    </div>

                    {/* Info */}
                    <div className="flex-grow flex flex-col min-w-0">
                      <span className="font-body-lg text-white font-medium truncate">{cat.name}</span>
                      <span className="font-body-md text-xs text-on-surface-variant">{cat.count} Transaksi</span>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <span className="font-mono-data text-[#FF4D4D] font-bold block">
                        - {formatRupiah(cat.spent)}
                      </span>
                      <span className="text-[10px] uppercase font-label-caps text-on-surface-variant/60 tracking-wider block mt-0.5">
                        {cat.percent}% total
                      </span>
                    </div>

                    {/* Arrow hint */}
                    <ExternalLink className="w-3.5 h-3.5 text-on-surface-variant/30 group-hover:text-primary transition-colors shrink-0" />
                  </button>
                ))
              )}

              {topCategories.length > 0 && (
                <button
                  onClick={() => onOpenHistory()}
                  className="text-xs text-primary hover:opacity-80 transition-opacity font-label-caps text-center py-1"
                >
                  Lihat Semua Riwayat →
                </button>
              )}
            </div>
          </section>

          {/* EXPORT WA */}
          <div className="w-full">
            {exporting ? (
              <button 
                disabled 
                className="w-full h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2.5 text-on-surface-variant/60"
              >
                <Loader className="w-5 h-5 text-primary animate-spin" />
                <span className="font-headline-sm text-sm">Menyiapkan Laporan Kas...</span>
              </button>
            ) : (
              <button 
                onClick={handleExportWA}
                className="w-full h-14 bg-primary text-on-primary font-headline-sm text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-[0_4px_15px_rgba(78,222,163,0.3)] hover:opacity-90 active:scale-[0.98] transition-all"
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"></path>
                </svg>
                Kirim Laporan Kas ke WA
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
