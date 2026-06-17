import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Mic, 
  Edit3, 
  X, 
  Loader, 
  CheckCircle2, 
  ChevronRight, 
  Play, 
  Square, 
  DollarSign,
  Brain,
  Receipt,
  Upload,
  Code,
  Wallet,
  Users,
  Store,
  Coffee,
  Dumbbell,
  Briefcase,
  Utensils,
  CircleDollarSign,
  Heart,
  Sparkles,
  PiggyBank,
  CreditCard,
  Coins,
  ShoppingBag,
  Home as HomeIcon,
  Car,
  Plane,
  Gamepad2,
  GraduationCap,
  Gift,
  Smartphone,
  Settings
} from 'lucide-react';
import { PocketType, CategoryType, Transaction, Pocket, Account, Category } from '../types';
import { formatRupiah, getCategoryColorHex } from '../utils';
import CategoryIcon from './CategoryIcon';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'date'> & { date?: string }) => void;
  editingTransaction?: Transaction | null;
  onEditTransaction?: (transaction: Transaction) => void;
  pockets: Pocket[];
  accounts: Account[];
  categories: Category[];
  onOpenCategoryManager: () => void;
}

type ModalViewType = 'options' | 'camera' | 'voice' | 'manual' | 'parser';

export default function AddTransactionModal({ 
  isOpen, 
  onClose, 
  onAddTransaction, 
  editingTransaction,
  onEditTransaction,
  pockets, 
  accounts,
  categories,
  onOpenCategoryManager
}: AddTransactionModalProps) {
  const [currentView, setCurrentView] = useState<ModalViewType>('options');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [audioRecording, setAudioRecording] = useState(false);
  
  // AI Parser Specific States
  const [inputText, setInputText] = useState('');
  const [rawJsonAnswer, setRawJsonAnswer] = useState<any>(null);
  const [apiError, setApiError] = useState('');

  // Manual Form States
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [pocketId, setPocketId] = useState<PocketType>('');
  const [accountId, setAccountId] = useState<string>('');
  const [category, setCategory] = useState<CategoryType>('makan');
  const [type, setType] = useState<'incoming' | 'outgoing'>('outgoing');
  const [notes, setNotes] = useState('');
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'lusa' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Pre-fill form fields if editing, or reset to defaults if adding new transaction
  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setTitle(editingTransaction.title);
        setAmount(editingTransaction.amount);
        setPocketId(editingTransaction.pocketId);
        setAccountId(editingTransaction.accountId);
        setCategory(editingTransaction.category);
        setType(editingTransaction.type);
        setNotes(editingTransaction.notes || '');
        setDatePreset('custom');
        
        // Parse date to YYYY-MM-DD
        const dateObj = new Date(editingTransaction.date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        setCustomDate(`${year}-${month}-${day}`);
        
        setCurrentView('manual');
      } else {
        setTitle('');
        setAmount(0);
        if (pockets.length > 0) setPocketId(pockets[0].id);
        if (accounts.length > 0) setAccountId(accounts[0].id);
        setCategory(categories[0]?.id || 'makan');
        setType('outgoing');
        setNotes('');
        setDatePreset('today');
        setCurrentView('options');
      }
    }
  }, [isOpen, editingTransaction, pockets, accounts, categories]);

  if (!isOpen) return null;

  const handleApiParse = async (text: string) => {
    setIsProcessing(true);
    setProgressMsg('Mengirim permintaan ke Gemini 3.5 Flash...');
    setApiError('');
    setRawJsonAnswer(null);

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: text }),
      });

      if (!res.ok) {
        throw new Error('Gagal menghubungi asisten AI');
      }

      const data = await res.json();
      setRawJsonAnswer(data);

      // Now map the response props into form fields
      const rawAmount = data.nominal || 0;
      setAmount(rawAmount);

      const rawTitle = data.catatan || 'Transaksi Baru';
      setTitle(rawTitle);
      setNotes(`Dianalisis AI: ${rawTitle}`);

      // Kepemilikan rules
      if (rawTitle.toLowerCase().includes('futsal') || rawTitle.toLowerCase().includes('arisan') || rawTitle.toLowerCase().includes('kas')) {
        setPocketId('kas');
      } else if (rawTitle.toLowerCase().includes('bisnis') || rawTitle.toLowerCase().includes('usaha') || rawTitle.toLowerCase().includes('omset')) {
        setPocketId('bisnis');
      } else {
        setPocketId('pribadi');
      }

      // Account rules 
      if (rawTitle.toLowerCase().includes('cash') || rawTitle.toLowerCase().includes('tunai')) {
        const cashAcc = accounts.find(a => a.icon === 'cash');
        if (cashAcc) setAccountId(cashAcc.id);
      } else {
        if (accounts.length > 0) setAccountId(accounts[0].id);
      }

      // Kategori mapping rules dynamically
      const cat = String(data.kategori || '').toLowerCase();
      const matchedCategory = categories.find(c => 
        cat.includes(c.name.toLowerCase()) || 
        c.name.toLowerCase().includes(cat) ||
        cat.includes(c.id.toLowerCase())
      );
      if (matchedCategory) {
        setCategory(matchedCategory.id);
      } else {
        // Fallback checks
        if (cat.includes('makan') || cat.includes('culinary')) {
          setCategory(categories.find(c => c.id === 'makan' || c.name.toLowerCase().includes('makan'))?.id || categories[0]?.id || 'makan');
        } else if (cat.includes('belanja') || cat.includes('grosir')) {
          setCategory(categories.find(c => c.id === 'belanja' || c.name.toLowerCase().includes('belanja'))?.id || categories[0]?.id || 'makan');
        } else if (cat.includes('bisnis') || cat.includes('modal') || cat.includes('usaha')) {
          setCategory(categories.find(c => c.id === 'bisnis' || c.name.toLowerCase().includes('usaha') || c.name.toLowerCase().includes('bisnis'))?.id || categories[0]?.id || 'makan');
        } else if (cat.includes('kopi') || cat.includes('minum') || cat.includes('jajan')) {
          setCategory(categories.find(c => c.id === 'kopi' || c.name.toLowerCase().includes('kopi') || c.name.toLowerCase().includes('jajan'))?.id || categories[0]?.id || 'makan');
        } else if (cat.includes('futsal') || cat.includes('olahraga')) {
          setCategory(categories.find(c => c.id === 'olahraga' || c.name.toLowerCase().includes('olahraga'))?.id || categories[0]?.id || 'makan');
        } else if (cat.includes('sehat') || cat.includes('obat') || cat.includes('dokter')) {
          setCategory(categories.find(c => c.id === 'kesehatan' || c.name.toLowerCase().includes('sehat') || c.name.toLowerCase().includes('kesehatan'))?.id || categories[0]?.id || 'makan');
        } else if (cat.includes('sosial') || cat.includes('arisan') || cat.includes('sumbangan')) {
          setCategory(categories.find(c => c.id === 'sosial' || c.name.toLowerCase().includes('sosial'))?.id || categories[0]?.id || 'makan');
        } else if (cat.includes('gaji') || cat.includes('omset') || cat.includes('pendapatan') || cat.includes('masuk')) {
          setCategory(categories.find(c => c.id === 'pendapatan' || c.name.toLowerCase().includes('pendapatan') || c.name.toLowerCase().includes('gaji'))?.id || categories[0]?.id || 'makan');
        } else {
          setCategory(categories[categories.length - 1]?.id || 'lainnya');
        }
      }

      // Type default
      if (String(data.tipe).toLowerCase() === 'pemasukan') {
        setType('incoming');
      } else {
        setType('outgoing');
      }

    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'Gagal memproses dengan asisten AI');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProgressMsg('Membaca file & mengonversinya ke Base64...');

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        setProgressMsg('Mengunggah ke API Gemini dan menganalisis berkas...');
        
        // Invoke globally bound kirimKeGeminiAI (Otomatis memetakan & menyimpan data cerdas)
        const parsed = await (window as any).kirimKeGeminiAI(base64Data, file.type);
        
        if (parsed) {
          setIsProcessing(false);
          setAudioRecording(false);
          
          // 1. Autofill data dasar dari AI ke state form
          setTitle(parsed.catatan || 'Transaksi Baru');
          setAmount(parsed.nominal || 0);
          setNotes(`Diunggah via berkas ${type === 'audio' ? 'suara' : 'struk'}: ${file.name}.`);

          // 2. Petakan KANTONG (Pocket) secara dinamis dari parameter kepemilikan AI
          const kepemilikanRaw = String(parsed.kepemilikan || 'Uangku').toLowerCase();
          let pocket: PocketType = pockets[0]?.id || 'pribadi';
          if (kepemilikanRaw.includes('bisnis')) {
            pocket = pockets.find(p => p.id === 'bisnis' || p.name.toLowerCase().includes('bisnis'))?.id || pocket;
          } else if (kepemilikanRaw.includes('orang') || kepemilikanRaw.includes('grup') || kepemilikanRaw.includes('kas')) {
            pocket = pockets.find(p => p.id === 'kas' || p.name.toLowerCase().includes('kas'))?.id || pocket;
          }
          setPocketId(pocket);

          // 3. Petakan REKENING (Account) secara dinamis dari parameter sumber_dana AI
          const sumberDanaRaw = String(parsed.sumber_dana || 'Cash').toLowerCase();
          let accId = accounts[0]?.id || 'acc-bca';
          if (sumberDanaRaw.includes('cash') || sumberDanaRaw.includes('tunai')) {
            const cashAcc = accounts.find(a => a.icon === 'cash' || a.id.toLowerCase().includes('cash'));
            if (cashAcc) accId = cashAcc.id;
          } else if (sumberDanaRaw.includes('dana')) {
            const danaAcc = accounts.find(a => a.id.toLowerCase().includes('dana') || a.name.toLowerCase().includes('dana'));
            if (danaAcc) accId = danaAcc.id;
          } else if (sumberDanaRaw.includes('gopay')) {
            const gopayAcc = accounts.find(a => a.id.toLowerCase().includes('gopay') || a.name.toLowerCase().includes('gopay'));
            if (gopayAcc) accId = gopayAcc.id;
          } else if (sumberDanaRaw.includes('bca')) {
            const bcaAcc = accounts.find(a => a.id.toLowerCase().includes('bca') || a.name.toLowerCase().includes('bca'));
            if (bcaAcc) accId = bcaAcc.id;
          }
          setAccountId(accId);

          // 4. Petakan KATEGORI secara dinamis dari parameter kategori AI
          let cat = categories[categories.length - 1]?.id || 'lainnya';
          const catRaw = String(parsed.kategori || '').toLowerCase();
          const matchedCategory = categories.find(c => 
            catRaw.includes(c.name.toLowerCase()) || 
            c.name.toLowerCase().includes(catRaw) ||
            catRaw.includes(c.id.toLowerCase())
          );
          if (matchedCategory) {
            cat = matchedCategory.id;
          } else {
            if (catRaw.includes('makan') || catRaw.includes('culinary')) {
              cat = categories.find(c => c.id === 'makan' || c.name.toLowerCase().includes('makan'))?.id || cat;
            } else if (catRaw.includes('belanja') || catRaw.includes('grosir')) {
              cat = categories.find(c => c.id === 'belanja' || c.name.toLowerCase().includes('belanja'))?.id || cat;
            } else if (catRaw.includes('kopi') || catRaw.includes('minum') || catRaw.includes('jajan')) {
              cat = categories.find(c => c.id === 'kopi' || c.name.toLowerCase().includes('kopi') || c.name.toLowerCase().includes('jajan'))?.id || cat;
            }
          }
          setCategory(cat);

          // 5. Tentukan Tipe Transaksi
          let tType: 'incoming' | 'outgoing' = 'outgoing';
          if (String(parsed.tipe).toLowerCase() === 'pemasukan') {
            tType = 'incoming';
          }
          setType(tType);

          // Pindahkan view ke form manual agar user bisa memverifikasi kecocokan data sebelum final
          setCurrentView('manual');
        }
      } catch (err: any) {
        console.error("Gagal memproses berkas:", err);
        alert("Gagal memproses file: " + (err.message || err));
      } finally {
        setIsProcessing(false);
        setAudioRecording(false);
      }
    };
    reader.onerror = () => {
      alert("Error membaca file.");
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  // Mock Receipt Templates
  const MOCK_RECEIPTS = [
    { title: 'Beli Kopi Nangka', amount: 35000, pocketId: 'pribadi' as PocketType, category: 'kopi' as CategoryType, type: 'outgoing' as const, note: 'Nota Kopi Nangka dari AI Scanner' },
    { title: 'Iuran Kas Futsal', amount: 5000000, pocketId: 'kas' as PocketType, category: 'olahraga' as CategoryType, type: 'incoming' as const, note: 'Terima Kas Futsal Terkumpul' },
    { title: 'Belanja Dimsum Pack', amount: 150000, pocketId: 'bisnis' as PocketType, category: 'bisnis' as CategoryType, type: 'outgoing' as const, note: 'Nota pembelian bahan baku di pasar' },
  ];

  // Mock Voice Templates
  const MOCK_VOICES = [
    { text: '"Tadi bayar iuran futsal seratus ribu pakai uang kas"' , title: 'Iuran Futsal', amount: 100000, pocketId: 'kas' as PocketType, category: 'olahraga' as CategoryType, type: 'outgoing' as const },
    { text: '"Makan gulai nasi padang lima puluh ribu rupiah uang sendiri"', title: 'Nasi Padang', amount: 50000, pocketId: 'pribadi' as PocketType, category: 'makan' as CategoryType, type: 'outgoing' as const },
    { text: '"Ada omset grosiran masuk dua juta ke kas bisnis"', title: 'Omset Grosir', amount: 2000000, pocketId: 'bisnis' as PocketType, category: 'bisnis' as CategoryType, type: 'incoming' as const },
  ];

  const handleScanReceipt = (item: typeof MOCK_RECEIPTS[0]) => {
    setIsProcessing(true);
    setProgressMsg('Mengaktifkan Model Gemini 1.5 Pro...');
    
    setTimeout(() => {
      setProgressMsg('Scanning & Mendeteksi batas-batas struk...');
    }, 1000);

    setTimeout(() => {
      setProgressMsg('Ekstraksi teks nota belanja via OCR...');
    }, 2200);

    setTimeout(() => {
      setIsProcessing(false);
      setTitle(item.title);
      setAmount(item.amount);
      setPocketId(item.pocketId);
      setCategory(item.category);
      setType(item.type);
      setNotes(item.note);
      setCurrentView('manual');
    }, 3500);
  };

  const handleVoiceParse = (item: typeof MOCK_VOICES[0]) => {
    setAudioRecording(true);
    setProgressMsg('Mendengarkan suara Anda...');
    
    setTimeout(() => {
      setProgressMsg('Mengonversi suara ke teks...');
    }, 1500);

    setTimeout(() => {
      setProgressMsg('Memparse maksud kalimat via Gemini NLP...');
    }, 2800);

    setTimeout(() => {
      setAudioRecording(false);
      setTitle(item.title);
      setAmount(item.amount);
      setPocketId(item.pocketId);
      setCategory(item.category);
      setType(item.type);
      setNotes(`Catat Suara: ${item.text}`);
      setCurrentView('manual');
    }, 4200);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert('Mohon isi judul transaksi');
    if (amount <= 0) return alert('Nominal harus lebih besar dari 0');
    
    let finalDate = new Date();
    if (datePreset === 'yesterday') {
      finalDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else if (datePreset === 'lusa') {
      finalDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    } else if (datePreset === 'custom') {
      const parsedDate = new Date(customDate);
      const now = new Date();
      parsedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      finalDate = parsedDate;
    }

    if (editingTransaction && onEditTransaction) {
      onEditTransaction({
        ...editingTransaction,
        title,
        amount,
        pocketId,
        accountId,
        category,
        type,
        notes: notes || undefined,
        date: finalDate.toISOString()
      });
    } else {
      onAddTransaction({
        title,
        amount,
        pocketId,
        accountId,
        category,
        type,
        notes: notes || undefined,
        date: finalDate.toISOString()
      });
    }

    // Reset Form
    setTitle('');
    setAmount(0);
    setPocketId(pockets[0]?.id || 'pribadi');
    setCategory(categories[0]?.id || 'makan');
    setType('outgoing');
    setNotes('');
    setDatePreset('today');
    setCurrentView('options');
    onClose();
  };

  const goBack = () => {
    setCurrentView('options');
    setIsProcessing(false);
    setAudioRecording(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center font-body-md">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={() => {
          goBack();
          onClose();
        }}
      />
      
      {/* Sheet Content */}
      <div className="relative w-full max-w-md glass-card rounded-t-2xl border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] transform transition-transform duration-300 translate-y-0 flex flex-col pb-10 z-10 max-h-[85vh] overflow-y-auto no-scrollbar">
        
        {/* Handle Bar */}
        <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto mt-3 mb-5 shrink-0" />
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-container_margin mb-4">
          {currentView !== 'options' && !editingTransaction && (
            <button 
              onClick={goBack}
              className="text-xs text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full hover:bg-primary/20"
            >
              Kembali
            </button>
          )}
          <span className="flex-grow text-center font-headline-sm text-white">
            {editingTransaction ? 'Ubah Transaksi' : (
              <>
                {currentView === 'options' && 'Catat Pengeluaran'}
                {currentView === 'camera' && 'AI Scanner Struk'}
                {currentView === 'voice' && 'Mendikte lewat Suara'}
                {currentView === 'manual' && 'Input Manual'}
                {currentView === 'parser' && 'JSON Parser AI KantongKu'}
              </>
            )}
          </span>
          <button 
            onClick={() => {
              goBack();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-on-surface-variant hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Layout Router */}
        <div className="px-container_margin flex-grow">
          
          {/* VIEW: Option Selector (image_3 variant) */}
          {currentView === 'options' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-on-surface-variant font-label-caps text-xs">Pilih Cara Catat Uang</h3>
              
              {/* Option 1: AI Camera */}
              <button 
                onClick={() => setCurrentView('camera')} 
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left group active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-on-surface-variant group-hover:scale-110 transition-transform shrink-0">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="flex-grow">
                  <p className="font-body-lg text-white font-bold">Foto Struk Belanja</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Baca nota instan otomatis pakai AI preset</p>
                </div>
                <ChevronRight className="w-5 h-5 ml-auto text-on-surface-variant/40 group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* Option 2: Mic / Voice */}
              <button 
                onClick={() => setCurrentView('voice')} 
                className="flex items-center gap-4 p-4 rounded-xl bg-secondary/5 border border-secondary/10 hover:bg-secondary/10 transition-all text-left group active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform shrink-0">
                  <Mic className="w-6 h-6" />
                </div>
                <div className="flex-grow">
                  <p className="font-body-lg text-white font-bold">Catat Pakai Suara</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Dikte asisten suara preset</p>
                </div>
                <ChevronRight className="w-5 h-5 ml-auto text-on-surface-variant/40 group-hover:text-secondary transition-colors shrink-0" />
              </button>

              {/* Option 3: Manual Input */}
              <button 
                onClick={() => setCurrentView('manual')} 
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left group active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-on-surface-variant group-hover:scale-110 transition-transform shrink-0">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div className="flex-grow">
                  <p className="font-body-lg text-white font-bold">Input Manual</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Ketik manual nominal & kategori</p>
                </div>
                <ChevronRight className="w-5 h-5 ml-auto text-on-surface-variant/40 group-hover:text-white transition-colors shrink-0" />
              </button>
            </div>
          )}

          {/* VIEW: Receipt Photo Simulator */}
          {currentView === 'camera' && (
            <div className="flex flex-col gap-5 text-center items-center py-4">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader className="w-12 h-12 text-primary animate-spin" />
                  <div className="flex flex-col gap-1">
                    <p className="text-white font-medium text-lg">Menganalisis Struk...</p>
                    <p className="text-xs text-on-surface-variant animate-pulse">{progressMsg}</p>
                  </div>
                </div>
              ) : (
                <>
                  <label className="w-full aspect-[4/3] bg-surface/50 border border-white/5 rounded-xl flex flex-col items-center justify-center gap-4 p-6 relative overflow-hidden group border-dashed hover:border-primary/40 duration-200 cursor-pointer">
                    <input
                      type="file"
                      id="upload-struk-input"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'image')}
                      className="hidden"
                    />
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Glowing Scan HUD Line */}
                    <div className="absolute left-0 right-0 h-0.5 bg-primary/40 shadow-[0_0_15px_#4edea3] top-1/4 animate-bounce" />

                    <Camera className="w-12 h-12 text-primary/80" />
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-white">Ambil Foto atau Klik Upload Struk</p>
                      <p className="text-xs text-on-surface-variant">Klik untuk mengunggah berkas foto struk asli Anda & diparse Gemini</p>
                    </div>
                  </label>

                  <div className="w-full text-left flex flex-col gap-3">
                    <span className="text-xs text-on-surface-variant uppercase font-label-caps tracking-wider block">Atau gunakan demo struk instan:</span>
                    <div className="grid grid-cols-1 gap-2">
                      {MOCK_RECEIPTS.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleScanReceipt(item)}
                          className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5 hover:border-primary/30 transition-colors text-left text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <Receipt className="w-5 h-5 text-primary shrink-0" />
                            <span className="text-white font-medium">{item.title}</span>
                          </div>
                          <span className="font-mono-data text-primary text-xs font-bold">{formatRupiah(item.amount)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* VIEW: Voice Recorder Simulator */}
          {currentView === 'voice' && (
            <div className="flex flex-col gap-6 text-center items-center py-4">
              {audioRecording ? (
                <div className="flex flex-col items-center gap-6 py-6 w-full">
                  {/* Glowing Equalizer Bar Simulation */}
                  <div className="flex items-center gap-1.5 h-12">
                    <span className="w-1.5 bg-secondary rounded-full animate-[bounce_0.8s_infinite] h-8" />
                    <span className="w-1.5 bg-secondary rounded-full animate-[bounce_1.2s_infinite] h-12" />
                    <span className="w-1.5 bg-secondary rounded-full animate-[bounce_0.6s_infinite] h-6" />
                    <span className="w-1.5 bg-secondary rounded-full animate-[bounce_0.9s_infinite] h-10" />
                    <span className="w-1.5 bg-secondary rounded-full animate-[bounce_1.4s_infinite] h-12" />
                    <span className="w-1.5 bg-secondary rounded-full animate-[bounce_0.7s_infinite] h-8" />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <p className="text-white font-medium text-lg">Mendengarkan...</p>
                    <p className="text-xs text-secondary animate-pulse">{progressMsg}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-4 items-center">
                    <button 
                      type="button"
                      onClick={() => handleVoiceParse(MOCK_VOICES[0])}
                      className="w-16 h-16 rounded-full bg-secondary/10 border border-secondary/20 hover:bg-secondary/20 active:scale-95 duration-150 flex items-center justify-center text-secondary relative group"
                    >
                      <div className="absolute inset-0 bg-secondary/20 rounded-full animate-ping opacity-20 pointer-events-none" />
                      <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </button>

                    <label className="h-16 px-6 bg-white/5 border border-white/10 text-on-surface-variant hover:text-white rounded-full flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold active:scale-[0.98] transition-all">
                      <input
                        type="file"
                        id="upload-voice-input"
                        accept="audio/*"
                        onChange={(e) => handleFileChange(e, 'audio')}
                        className="hidden"
                      />
                      <Upload className="w-[18px] h-[18px] shrink-0" />
                      Unggah Berkas Audio
                    </label>
                  </div>
                  <p className="text-xs text-on-surface-variant max-w-[280px]">
                    Tekan tombol mikrofon preset atau <span className="text-secondary font-semibold">Unggah File Audio Suara asli Anda</span> untuk didikte asisten: <br />
                    <span className="italic text-secondary/70 mt-1 block">"Saya beli dimsum sum sum memakai uang bisnis seratus ribu rupiah"</span>
                  </p>

                  <div className="w-full text-left flex flex-col gap-2.5 mt-2">
                    <span className="text-xs text-on-surface-variant uppercase font-label-caps tracking-wider block">Demo Bicara Instan:</span>
                    <div className="flex flex-col gap-2">
                      {MOCK_VOICES.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleVoiceParse(item)}
                          className="flex flex-col p-3 rounded-lg bg-[#161E2E] border border-white/5 hover:border-secondary/40 transition-colors text-left text-xs gap-1"
                        >
                          <span className="italic text-secondary font-medium">{item.text}</span>
                          <span className="text-[10px] text-on-surface-variant/40 font-label-caps uppercase">Simulasi Pemrosesan AI</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* VIEW: Real AI Parser Engine */}
          {currentView === 'parser' && (
            <div className="flex flex-col gap-4 text-left py-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">
                  Input Teks/Suara Bebas
                </label>
                <textarea
                  id="parser-input-textarea"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ketik iuran futsal, kas kelas, omset usaha, dll. untuk testing aturan kepemilikan..."
                  className="h-24 bg-surface-variant/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-primary/60 resize-none font-body-md"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    if (!inputText.trim()) return alert('Mohon isi teks terlebih dahulu');
                    handleApiParse(inputText);
                  }}
                  className="flex-1 h-12 bg-primary text-on-primary font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 active:scale-[0.98] transition-all shadow-[0_4px_15px_rgba(78,222,163,0.2)]"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin mr-1 inline-block" />
                      Memproses AI...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5 mr-1 inline-block align-middle shrink-0" />
                      Parse Input Teks
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputText('');
                    setRawJsonAnswer(null);
                    setApiError('');
                  }}
                  className="px-4 h-12 bg-white/5 border border-white/10 text-on-surface-variant hover:text-white rounded-xl text-xs font-semibold"
                >
                  Reset
                </button>
              </div>

              {/* Quick Preset Prompts */}
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-xs text-on-surface-variant/55 font-label-caps uppercase tracking-wider">
                  Test Case Aturan Khusus (Klik untuk Pasang):
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInputText('Tadi malam bayar iuran lapangan futsal kas kelas seratus lima puluh ribu')}
                    className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-left text-xs transition-all border border-white/5 flex flex-col gap-0.5"
                  >
                    <span className="text-white font-medium">1. Aturan Futsal / Kas Kelas ("Uang Orang")</span>
                    <span className="text-on-surface-variant/60 italic text-[11px]">"Tadi malam bayar iuran lapangan futsal kas kelas..."</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputText('Terima omset grosir modal usaha baru dua juta rupiah langsung masuk cash')}
                    className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-left text-xs transition-all border border-white/5 flex flex-col gap-0.5"
                  >
                    <span className="text-white font-medium">2. Aturan Usaha / Omset ("Uang Bisnis")</span>
                    <span className="text-on-surface-variant/60 italic text-[11px]">"Terima omset grosir modal usaha..."</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputText('Baru saja beli kopi susu jajan sore tiga puluh lima ribu')}
                    className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-left text-xs transition-all border border-white/5 flex flex-col gap-0.5"
                  >
                    <span className="text-white font-medium">3. Aturan Umum (Default: "Uangku / Pribadi")</span>
                    <span className="text-on-surface-variant/60 italic text-[11px]">"Baru saja beli kopi susu jajan sore..."</span>
                  </button>
                </div>
              </div>

              {/* API Error Display */}
              {apiError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                  {apiError}
                </div>
              )}

              {/* RAW JSON Output rendering */}
              {rawJsonAnswer && (
                <div className="flex flex-col gap-2 mt-2 border-t border-white/5 pt-3">
                  <span className="text-xs text-primary font-bold uppercase font-label-caps tracking-wider flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-primary shrink-0" />
                    Hasil Keluaran JSON Mentah:
                  </span>
                  <pre className="p-3 rounded-lg bg-[#070b14] border border-white/5 text-[11px] font-mono text-emerald-400 overflow-x-auto select-all max-h-48 whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(rawJsonAnswer, null, 2)}
                  </pre>
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between gap-2 mt-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-white font-semibold">Tebakan Mapping Form:</span>
                      <span className="text-[10px] text-on-surface-variant">Kepemilikan: {rawJsonAnswer.kepemilikan} • Dana: {rawJsonAnswer.sumber_dana}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView('manual');
                      }}
                      className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold shadow-sm hover:opacity-95"
                    >
                      Lanjut Edit Form
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: Manual Form Input */}
          {currentView === 'manual' && (
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-4 text-left">
              {/* Type Switch (Pemasukan / Pengeluaran) */}
              <div className="flex bg-[#0B111E] rounded-lg p-1 border border-white/5 w-fit self-center">
                <button
                  type="button"
                  onClick={() => setType('outgoing')}
                  className={`px-4 py-1.5 rounded-md font-label-caps text-xs transition-all ${type === 'outgoing' ? 'bg-[#EF4444] text-white shadow-lg' : 'text-on-surface-variant/60 hover:text-white'}`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setType('incoming')}
                  className={`px-4 py-1.5 rounded-md font-label-caps text-xs transition-all ${type === 'incoming' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant/60 hover:text-white'}`}
                >
                  Pemasukan
                </button>
              </div>

              {/* Title Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Judul Transaksi</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beli Kopi Susu, Gaji Bulanan"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-12 bg-surface-variant/40 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-primary/60"
                />
              </div>

              {/* Amount Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Nominal (Rp)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 font-mono-data text-primary text-sm font-bold">Rp</span>
                  <input
                    type="text"
                    required
                    placeholder="0"
                    value={formatRupiah(amount, false) || ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                      const num = Number(raw);
                      setAmount(isNaN(num) ? 0 : num);
                    }}
                    className="h-12 w-full bg-surface-variant/40 border border-white/10 rounded-lg pl-12 pr-4 text-white focus:outline-none focus:border-primary/60 font-mono-data"
                  />
                </div>
              </div>

              {/* Date / Time Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Waktu Catatan</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['today', 'yesterday', 'lusa', 'custom'] as const).map((preset) => {
                    const isSelected = datePreset === preset;
                    let label = '';
                    if (preset === 'today') label = 'Hari Ini';
                    else if (preset === 'yesterday') label = 'Kemarin';
                    else if (preset === 'lusa') label = 'Lusa';
                    else if (preset === 'custom') label = 'Kalender';

                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDatePreset(preset)}
                        className={`py-2 px-1 rounded-lg border text-xs font-semibold text-center transition-all ${
                          isSelected
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-surface-variant/20 border-white/5 text-on-surface-variant hover:bg-white/5'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {datePreset === 'custom' && (
                  <input
                    type="date"
                    required
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="mt-2 h-11 bg-surface-variant/40 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-primary/60"
                  />
                )}
              </div>

              {/* Pocket Source Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Sumber Dana / Kantong</label>
                <div className="grid grid-cols-3 gap-2">
                  {pockets.map(p => {
                    const isSelected = pocketId === p.id;
                    
                    // Determine color classes dynamically based on pocket.color
                    let activeColorClass = 'bg-primary/10 border-primary text-primary';
                    if (p.color === 'emerald') activeColorClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                    else if (p.color === 'indigo') activeColorClass = 'bg-blue-500/10 border-blue-500/20 text-blue-400';
                    else if (p.color === 'amber') activeColorClass = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                    else if (p.color === 'rose') activeColorClass = 'bg-rose-500/10 border-rose-500/20 text-rose-400';
                    else if (p.color === 'purple') activeColorClass = 'bg-purple-500/10 border-purple-500/20 text-purple-400';
                    else if (p.color === 'teal') activeColorClass = 'bg-teal-500/10 border-teal-500/20 text-teal-400';
                    else if (p.color === 'orange') activeColorClass = 'bg-orange-500/10 border-orange-500/20 text-orange-400';
                    else if (p.color === 'cyan') activeColorClass = 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400';
                    else if (p.color === 'pink') activeColorClass = 'bg-pink-500/10 border-pink-500/20 text-pink-400';
                    else if (p.color === 'yellow') activeColorClass = 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
                    else if (p.color === 'sky') activeColorClass = 'bg-sky-500/10 border-sky-500/20 text-sky-400';
                    else if (p.color === 'lime') activeColorClass = 'bg-lime-500/10 border-lime-500/20 text-lime-400';

                    // Determine icon component
                    let IconComponent = Wallet;
                    if (p.icon === 'group') IconComponent = Users;
                    else if (p.icon === 'storefront') IconComponent = Store;
                    else if (p.icon === 'coffee') IconComponent = Coffee;
                    else if (p.icon === 'heart') IconComponent = Heart;
                    else if (p.icon === 'sparkles') IconComponent = Sparkles;
                    else if (p.icon === 'piggy') IconComponent = PiggyBank;
                    else if (p.icon === 'creditcard') IconComponent = CreditCard;
                    else if (p.icon === 'coins') IconComponent = Coins;
                    else if (p.icon === 'shopping') IconComponent = ShoppingBag;
                    else if (p.icon === 'home') IconComponent = HomeIcon;
                    else if (p.icon === 'car') IconComponent = Car;
                    else if (p.icon === 'plane') IconComponent = Plane;
                    else if (p.icon === 'game') IconComponent = Gamepad2;
                    else if (p.icon === 'education') IconComponent = GraduationCap;
                    else if (p.icon === 'food') IconComponent = Utensils;
                    else if (p.icon === 'gift') IconComponent = Gift;
                    else if (p.icon === 'briefcase') IconComponent = Briefcase;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPocketId(p.id)}
                        className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1.5 transition-all text-center ${isSelected ? activeColorClass : 'bg-surface-variant/20 border-white/5 text-on-surface-variant hover:bg-white/5'}`}
                      >
                        <IconComponent className="w-[18px] h-[18px] shrink-0" />
                        <span className="truncate w-full">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Rekening / Dompet Fisik</label>
                <div className="grid grid-cols-3 gap-2">
                  {accounts.map(acc => {
                    const isSelected = accountId === acc.id;
                    
                    let activeColorClass = 'bg-primary/10 border-primary text-primary';
                    if (acc.color === 'indigo') activeColorClass = 'bg-blue-500/10 border-blue-500/20 text-blue-400';
                    else if (acc.color === 'purple') activeColorClass = 'bg-purple-500/10 border-purple-500/20 text-purple-400';
                    else if (acc.color === 'emerald') activeColorClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                    else if (acc.color === 'orange') activeColorClass = 'bg-orange-500/10 border-orange-500/20 text-orange-400';
                    else if (acc.color === 'cyan') activeColorClass = 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400';
                    else if (acc.color === 'pink') activeColorClass = 'bg-pink-500/10 border-pink-500/20 text-pink-400';

                    let IconComponent = Wallet;
                    if (acc.icon === 'bank') IconComponent = CreditCard;
                    else if (acc.icon === 'smartphone') IconComponent = Smartphone;
                    else if (acc.icon === 'cash') IconComponent = Coins;

                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setAccountId(acc.id)}
                        className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1.5 transition-all text-center ${isSelected ? activeColorClass : 'bg-surface-variant/20 border-white/5 text-on-surface-variant hover:bg-white/5'}`}
                      >
                        <IconComponent className="w-[18px] h-[18px] shrink-0" />
                        <span className="truncate w-full">{acc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Circle Selector */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-label-caps text-on-surface-variant uppercase">Kategori</label>
                  <button
                    type="button"
                    onClick={onOpenCategoryManager}
                    className="text-[10px] text-primary hover:underline flex items-center gap-1.5 font-semibold"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Kelola Kategori
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap">
                  {categories.map((cat) => {
                    const isSelected = category === cat.id;
                    const catHex = getCategoryColorHex(cat.color);
                    
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex-shrink-0 px-3.5 py-1.5 rounded-full border text-xs flex items-center gap-1.5 transition-all ${
                          isSelected 
                            ? 'font-bold' 
                            : 'bg-surface-variant/40 border-white/5 text-on-surface-variant/70'
                        }`}
                        style={isSelected ? {
                          backgroundColor: catHex + '20',
                          borderColor: catHex,
                          color: catHex
                        } : {}}
                      >
                        <CategoryIcon name={cat.icon} className="w-4 h-4 shrink-0" />
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes TextArea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Catatan Tambahan (Opsional)</label>
                <textarea
                  placeholder="Tuliskan catatan transaksi di sini (misal: patungan futsal bersama tim divisi)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-16 bg-surface-variant/40 border border-white/10 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-primary/60 resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full h-13 mt-2 bg-primary text-on-primary font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_4px_15px_rgba(78,222,163,0.2)]"
              >
                <CheckCircle2 className="w-5 h-5" />
                {editingTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
