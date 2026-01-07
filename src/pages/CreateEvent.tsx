
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, Calendar, MapPin, Type, Sparkles, Check, 
  Image as ImageIcon, Loader2, Ticket, Users, FileCheck,
  ChevronDown, Shuffle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '../components/UI';
import { supabase, getErrorMessage } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// --- HELPERS ---
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'June', 'July', 'Agustus', 'September', 'October', 'November', 'Desember'];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const generateTimeOptions = () => {
    const times = [];
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        times.push(`${hour}:00`);
        times.push(`${hour}:30`);
    }
    return times;
};
const TIME_OPTIONS = generateTimeOptions();

// --- KOLEKSI GAMBAR DEFAULT (10+ Themes) ---
const DEFAULT_COVERS = [
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=1000", // Party/Event
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000", // Tech/Conference
    "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1000", // Artsy/Party
    "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1000", // Workshop/Create
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000", // Cyber/Tech
    "https://images.unsplash.com/photo-1459749411177-0473ef716070?auto=format&fit=crop&q=80&w=1000", // Music/Concert
    "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=1000", // Education/Books
    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=1000", // Social/Meeting
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000", // Abstract/Fluid
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1000", // Business/Team
    "https://images.unsplash.com/photo-1561489396-888724a1543d?auto=format&fit=crop&q=80&w=1000", // Design/Minimal
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&q=80&w=1000", // Coding/Hackathon
];

const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  
  // Split state for the UI requirements
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  
  // Options State
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('0');
  const [requireApproval, setRequireApproval] = useState(false);
  const [capacity, setCapacity] = useState(''); // Empty = Unlimited
  const [type, setType] = useState('Seminar'); 

  // --- CALENDAR & TIME PICKER STATE ---
  const [pickerOpen, setPickerOpen] = useState<'none' | 'startDate' | 'startTime' | 'endDate' | 'endTime'>('none');
  const [calendarView, setCalendarView] = useState(new Date()); // Controls the month currently viewed in calendar
  
  // Helper to handle calendar navigation
  const changeMonth = (offset: number) => {
    setCalendarView(new Date(calendarView.getFullYear(), calendarView.getMonth() + offset, 1));
  };

  // Helper to render calendar grid
  const renderCalendar = (onSelect: (dateStr: string) => void, selectedDateStr: string) => {
      const year = calendarView.getFullYear();
      const month = calendarView.getMonth();
      const daysInMonth = getDaysInMonth(year, month);
      const firstDay = getFirstDayOfMonth(year, month);
      
      const days = [];
      // Empty slots for previous month
      for (let i = 0; i < firstDay; i++) {
          days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
      }
      
      // Actual days
      for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = selectedDateStr === dateStr;
          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          days.push(
              <button 
                key={day} 
                onClick={(e) => { e.stopPropagation(); onSelect(dateStr); setPickerOpen('none'); }}
                className={`h-8 w-8 text-xs font-bold rounded-full transition-all 
                    ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-300' : 
                      isToday ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                  {day}
              </button>
          );
      }
      return days;
  };

  // --- EXISTING LOGIC ---
  
  // Check Auth & Role
  useEffect(() => {
    if (!loading) {
        if (!user) {
            navigate('/login');
        } else if (role !== 'admin') {
            showToast("Akses ditolak. Hanya Admin yang dapat membuat event.", 'error');
            setTimeout(() => navigate('/dashboard'), 2000);
        }
    }
  }, [user, role, loading, navigate, showToast]);

  // Initial Random Image
  useEffect(() => {
      // Set random image on mount if none selected
      if (!bannerPreview) {
          handleShuffleCover();
      }
  }, [bannerPreview]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("Ukuran file terlalu besar! Maksimal 5MB.", 'error');
        return;
      }
      setBannerFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleShuffleCover = () => {
      // Pick a random image from DEFAULT_COVERS using crypto for better randomness/security compliance
      const randomValues = new Uint32Array(1);
      crypto.getRandomValues(randomValues);
      const randomIndex = randomValues[0] % DEFAULT_COVERS.length;
      const selectedCover = DEFAULT_COVERS[randomIndex];
      
      setBannerPreview(selectedCover);
      setBannerFile(null); // Reset file input because we are using a URL now
  };

  const handleSubmit = async () => {
    if (!user) {
        showToast("Anda harus login.", 'error');
        navigate('/login');
        return;
    }

    if (!title || !startDate || !startTime) {
        showToast("Mohon lengkapi Judul, Tanggal Mulai, dan Waktu Mulai.", 'error');
        return;
    }

    setIsSubmitting(true);

    try {
        let imagePath = null;
        // 1. Handle Image
        if (bannerFile) {
            const fileExt = bannerFile.name.split('.').pop();
            const randomValues = new Uint32Array(1);
            crypto.getRandomValues(randomValues);
            const fileName = `${randomValues[0]}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('banners').upload(filePath, bannerFile);
            if (uploadError) throw uploadError;
            imagePath = filePath;
        } else if (bannerPreview && bannerPreview.startsWith('http')) {
            imagePath = bannerPreview;
        } else {
            const randomValues = new Uint32Array(1);
            crypto.getRandomValues(randomValues);
            const randomIndex = randomValues[0] % DEFAULT_COVERS.length;
            imagePath = DEFAULT_COVERS[randomIndex];
        }

        const { error: insertError } = await supabase.from('events').insert([{
            title: title,
            date: startDate, 
            time: startTime,
            end_time: endTime || null,
            location: location,
            description: description,
            type: type,
            is_public: true, // Biar selalu muncul di Explore
            host_id: user.id,
            image_url: imagePath,
            status: 'Terbuka',
            price: isFree ? 0 : Number.parseFloat(price),
            max_attendees: capacity ? Number.parseInt(capacity, 10) : null
        }]);

        if (insertError) throw insertError;
        
        showToast("Event berhasil dibuat!", "success");
        setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error) {
        // console.error('Error creating event:', error);
        // Ignore error explicitly for production safety
        showToast('Gagal membuat event: ' + getErrorMessage(error), 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  // Click outside to close pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if ((event.target as HTMLElement).closest('.picker-container')) return;
        setPickerOpen('none');
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-[#F0FDFABD] pt-8 pb-32 flex justify-center font-sans">
      <div className="w-full max-w-5xl px-4 md:px-8 grid md:grid-cols-12 gap-8 md:gap-12">
        
        {/* LEFT COLUMN: Image & Theme */}
        <div className="md:col-span-4 space-y-4">
             {/* Image Uploader Card */}
             <div className="aspect-square w-full rounded-[32px] bg-gradient-to-br from-slate-200 to-slate-300 shadow-xl shadow-slate-500/10 relative overflow-hidden group">
                 {bannerPreview ? (
                     <>
                        <img src={bannerPreview} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                     </>
                 ) : (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                         <div className="w-20 h-20 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center mb-4">
                             <ImageIcon size={32} className="opacity-80" />
                         </div>
                         <p className="font-bold text-lg">Upload Cover</p>
                         <p className="text-sm opacity-70">atau gunakan gambar acak</p>
                     </div>
                 )}
                 <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={handleImageChange} accept="image/*" title="Klik untuk upload gambar sendiri" />
                 <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
                     <div className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg">
                         <Upload size={18} />
                     </div>
                 </div>
             </div>

             {/* Theme & Shuffle Control */}
             <div className="flex gap-2">
                <div className="flex-1 bg-white/60 backdrop-blur-sm p-3 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/80 transition-colors shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-6 bg-gradient-to-r from-pink-300 to-purple-300 rounded-md shadow-inner"></div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Thema Visual</p>
                            <p className="text-sm font-bold text-slate-800">Otomatis</p>
                        </div>
                    </div>
                    <ChevronDown size={16} className="text-slate-400" />
                </div>
                <button onClick={handleShuffleCover} className="w-14 bg-white/60 backdrop-blur-sm rounded-2xl flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-white/80 transition-all shadow-sm active:scale-95" title="Ganti Gambar Cover Secara Acak">
                    <Shuffle size={20} />
                </button>
             </div>
             <p className="text-xs text-center text-slate-400 mt-2">
                Tips: Klik tombol <Shuffle size={10} className="inline mx-0.5"/> untuk mendapatkan inspirasi cover keren secara instan!
             </p>
        </div>

        {/* RIGHT COLUMN: Form Inputs */}
        <div className="md:col-span-8 space-y-6">
            
            {/* 1. Title Input */}
            <div>
                <input 
                    type="text" 
                    placeholder="Nama Acara"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent border-none text-5xl md:text-6xl font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-0 px-0 leading-tight font-[serif]"
                />
            </div>

            {/* 2. Date & Time Block (CUSTOM UI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Date & Time */}
                <div className="bg-slate-100/50 rounded-2xl p-4 transition-colors group picker-container relative">
                     <div className="text-xs text-slate-500 font-bold mb-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div> Mulai
                     </div>
                     <div className="flex gap-2 relative">
                         {/* Date Trigger */}
                         <button 
                            onClick={() => { setPickerOpen(pickerOpen === 'startDate' ? 'none' : 'startDate'); setCalendarView(startDate ? new Date(startDate) : new Date()); }}
                            className="flex-1 bg-white rounded-xl p-2.5 text-left border border-slate-200 hover:border-emerald-300 transition-colors flex items-center justify-between"
                         >
                            <span className={`font-bold text-sm ${startDate ? 'text-slate-800' : 'text-slate-400'}`}>
                                {startDate ? new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pilih Tanggal'}
                            </span>
                            <Calendar size={16} className="text-emerald-500" />
                         </button>

                         {/* Time Trigger */}
                         <button 
                            onClick={() => setPickerOpen(pickerOpen === 'startTime' ? 'none' : 'startTime')}
                            className="w-24 bg-white rounded-xl p-2.5 text-center border border-slate-200 hover:border-emerald-300 transition-colors font-bold text-sm text-slate-800"
                         >
                            {startTime || '--:--'}
                         </button>
                     </div>

                     {/* Custom Start Date Picker */}
                     {pickerOpen === 'startDate' && (
                        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 w-72 animate-in fade-in zoom-in-95">
                            <div className="flex justify-between items-center mb-4">
                                <button data-testid="calendar-prev-month" onClick={(e) => { e.stopPropagation(); changeMonth(-1); }} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft size={16} /></button>
                                <span className="font-bold text-slate-800 text-sm">{MONTHS[calendarView.getMonth()]} {calendarView.getFullYear()}</span>
                                <button data-testid="calendar-next-month" onClick={(e) => { e.stopPropagation(); changeMonth(1); }} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight size={16} /></button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                                {DAYS.map(d => <span key={d} className="text-[10px] font-bold text-slate-400 uppercase">{d}</span>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {renderCalendar(setStartDate, startDate)}
                            </div>
                        </div>
                     )}

                     {/* Custom Start Time Picker */}
                     {pickerOpen === 'startTime' && (
                        <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 w-32 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95">
                            {TIME_OPTIONS.map(t => (
                                <button 
                                    key={t} 
                                    onClick={() => { setStartTime(t); setPickerOpen('none'); }}
                                    className={`w-full text-center py-2 rounded-lg text-sm font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-colors ${startTime === t ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                     )}
                </div>

                {/* End Date & Time */}
                <div className="bg-slate-100/50 rounded-2xl p-4 transition-colors group picker-container relative">
                     <div className="text-xs text-slate-500 font-bold mb-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-400"></div> Selesai
                     </div>
                     <div className="flex gap-2 relative">
                         {/* End Date Trigger */}
                         <button 
                            onClick={() => { setPickerOpen(pickerOpen === 'endDate' ? 'none' : 'endDate'); setCalendarView(endDate ? new Date(endDate) : new Date()); }}
                            className="flex-1 bg-white rounded-xl p-2.5 text-left border border-slate-200 hover:border-rose-300 transition-colors flex items-center justify-between"
                         >
                            <span className={`font-bold text-sm ${endDate ? 'text-slate-800' : 'text-slate-400'}`}>
                                {endDate ? new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pilih Tanggal'}
                            </span>
                            <Calendar size={16} className="text-rose-500" />
                         </button>

                         {/* End Time Trigger */}
                         <button 
                            onClick={() => setPickerOpen(pickerOpen === 'endTime' ? 'none' : 'endTime')}
                            className="w-24 bg-white rounded-xl p-2.5 text-center border border-slate-200 hover:border-rose-300 transition-colors font-bold text-sm text-slate-800"
                         >
                            {endTime || '--:--'}
                         </button>
                     </div>

                     {/* Custom End Date Picker */}
                     {pickerOpen === 'endDate' && (
                        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 w-72 animate-in fade-in zoom-in-95">
                            <div className="flex justify-between items-center mb-4">
                                <button onClick={(e) => { e.stopPropagation(); changeMonth(-1); }} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft size={16} /></button>
                                <span className="font-bold text-slate-800 text-sm">{MONTHS[calendarView.getMonth()]} {calendarView.getFullYear()}</span>
                                <button onClick={(e) => { e.stopPropagation(); changeMonth(1); }} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight size={16} /></button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                                {DAYS.map(d => <span key={d} className="text-[10px] font-bold text-slate-400 uppercase">{d}</span>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {renderCalendar(setEndDate, endDate)}
                            </div>
                        </div>
                     )}

                     {/* Custom End Time Picker */}
                     {pickerOpen === 'endTime' && (
                        <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 w-32 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95">
                            {TIME_OPTIONS.map(t => (
                                <button 
                                    key={t} 
                                    onClick={() => { setEndTime(t); setPickerOpen('none'); }}
                                    className={`w-full text-center py-2 rounded-lg text-sm font-bold hover:bg-rose-50 hover:text-rose-600 transition-colors ${endTime === t ? 'bg-rose-100 text-rose-700' : 'text-slate-600'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                     )}
                </div>
            </div>

            {/* 3. Location Block */}
            <div className="bg-slate-100/50 rounded-2xl p-4 flex items-center gap-4 hover:bg-slate-100 transition-colors focus-within:ring-2 focus-within:ring-indigo-500/20">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                    <MapPin size={22} />
                </div>
                <div className="flex-1">
                    <p className="text-xs text-slate-500 font-bold mb-0.5">Lokasi Acara</p>
                    <input 
                        type="text" 
                        placeholder="Online / Nama Gedung / Alamat..." 
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full bg-transparent border-none p-0 text-slate-800 placeholder:text-slate-400 focus:outline-none font-semibold text-lg"
                    />
                </div>
            </div>

            {/* 4. Description Block */}
            <div className="bg-slate-100/50 rounded-2xl p-4 hover:bg-slate-100 transition-colors focus-within:ring-2 focus-within:ring-indigo-500/20">
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                        <Type size={22} />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-slate-500 font-bold mb-2">Detail & Deskripsi</p>
                        <textarea 
                            rows={5}
                            placeholder="Jelaskan tentang acara ini secara detail..." 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium leading-relaxed resize-none custom-scrollbar"
                        />
                    </div>
                </div>
            </div>

            {/* 5. Options Section */}
            <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Pengaturan Tambahan</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Ticket Card */}
                    <div className={`p-4 rounded-2xl border transition-all cursor-pointer ${!isFree ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-2">
                             <div className={`p-2 rounded-xl ${!isFree ? 'bg-indigo-200/50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                <Ticket size={20} />
                             </div>
                             <div className="flex items-center gap-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <span className="sr-only">Aktifkan Tiket Berbayar</span>
                                  <input type="checkbox" checked={!isFree} onChange={() => setIsFree(!isFree)} className="sr-only peer" />
                                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                             </div>
                        </div>
                        <p className="font-bold text-slate-700">Tiket Berbayar</p>
                        {isFree ? (
                             <p className="text-xs text-slate-500 mt-1">Acara ini gratis untuk semua</p>
                        ) : (
                             <div className="mt-2 flex items-center gap-1">
                                 <span className="text-slate-400 text-sm font-bold">Rp</span>
                                 <input 
                                     type="number" 
                                     value={price}
                                     onChange={(e) => setPrice(e.target.value)}
                                     className="w-full bg-transparent font-bold text-lg text-indigo-600 border-b border-indigo-200 focus:border-indigo-500 focus:outline-none px-0 py-0.5"
                                     placeholder="0"
                                 />
                             </div>
                        )}
                    </div>

                    {/* Capacity Card */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                             <div className="p-2 rounded-xl bg-orange-50 text-orange-500">
                                <Users size={20} />
                             </div>
                        </div>
                        <p className="font-bold text-slate-700">Kapasitas Peserta</p>
                        <div className="mt-2 text-slate-500 text-sm">
                             <input 
                                 type="number" 
                                 value={capacity}
                                 onChange={(e) => setCapacity(e.target.value)}
                                 placeholder="Tidak terbatas"
                                 className="w-full bg-transparent font-bold text-lg text-slate-800 border-b border-slate-200 focus:border-slate-400 focus:outline-none px-0 py-0.5 placeholder:text-slate-300"
                             />
                        </div>
                    </div>

                    {/* Approval Card */}
                     <div 
                        role="button"
                        tabIndex={0}
                        onClick={() => setRequireApproval(!requireApproval)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setRequireApproval(!requireApproval);
                            }
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${requireApproval ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                             <div className={`p-2 rounded-xl ${requireApproval ? 'bg-blue-200/50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                <FileCheck size={20} />
                             </div>
                             {requireApproval && <div className="text-blue-500"><Check size={18} /></div>}
                        </div>
                        <p className="font-bold text-slate-700">Butuh Persetujuan</p>
                        <p className="text-xs text-slate-500 mt-1">
                            {requireApproval ? 'Pendaftar harus dikonfirmasi manual' : 'Pendaftaran otomatis diterima'}
                        </p>
                    </div>

                    {/* Type Selector (Custom Dropdown UI) */}
                    <div className="relative group h-full">
                        <button 
                            onClick={() => {
                                const dropdown = document.getElementById('type-dropdown');
                                if (dropdown) dropdown.classList.toggle('hidden');
                            }}
                            onBlur={() => {
                                // Delay hide to allow click event to register
                                setTimeout(() => {
                                    const dropdown = document.getElementById('type-dropdown');
                                    if (dropdown) dropdown.classList.add('hidden');
                                }, 200);
                            }}
                            className="w-full h-full p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 transition-all flex flex-col justify-between text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:scale-[0.98]"
                        >
                             <div className="flex justify-between items-start w-full">
                                <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-indigo-50 transition-colors text-slate-500 group-hover:text-indigo-500">
                                    <Sparkles size={20} />
                                </div>
                                <ChevronDown size={18} className="text-slate-300 group-hover:text-indigo-400" />
                             </div>
                             
                             <div className="mt-2">
                                <p className="text-xs text-slate-400 font-bold mb-1">Kategori Event</p>
                                <p className="text-lg font-bold text-slate-800 truncate">{type}</p>
                             </div>
                        </button>

                        {/* Custom Dropdown Menu */}
                        <div id="type-dropdown" className="hidden absolute bottom-full mb-2 left-0 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-bottom-left">
                            <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar">
                                {['Seminar', 'Workshop', 'Lomba', 'Seni Budaya', 'Teknologi', 'UKM', 'Olahraga', 'Lainnya'].map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => setType(option)}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-between ${
                                            type === option 
                                            ? 'bg-indigo-50 text-indigo-600' 
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                    >
                                        {option}
                                        {type === option && <Check size={16} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
                <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="w-full h-14 text-lg font-bold bg-teal-700 hover:bg-teal-800 shadow-teal-700/20 transition-transform active:scale-[0.99]"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Buat Acara'}
                </Button>
            </div>

        </div>
      </div>
      
    </div>
  );
};

export default CreateEvent;
