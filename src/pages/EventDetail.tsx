
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Clock, 
  Share2, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2,
  Video,
  Smile,
  Mail,
  MessageCircle,
  Copy,
  ExternalLink,
  CalendarPlus,
  BellRing,
  Ticket,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import { Button } from '../components/UI';
import { supabase, getStorageUrl, getErrorMessage } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ShareModal from '../components/ShareModal';

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [registering, setRegistering] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  
  // Success Animation State
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);

  // Notification States
  const [emailNotif, setEmailNotif] = useState(true);
  const [waNotif, setWaNotif] = useState(false);

  // Share Modal State
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    const fetchEventAndStatus = async () => {
      if (!id) return;
      try {
        // 1. Fetch Event Details
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (eventError) throw eventError;
        setEvent(eventData);

        // 2. Check if User is Registered (if logged in)
        if (user) {
            const { data: regData } = await supabase
                .from('registrations')
                .select('*')
                .eq('event_id', id)
                .eq('user_id', user.id)
                .single();
            
            if (regData) setIsRegistered(true);
        }

      } catch {
        setError('Gagal memuat detail event.');
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndStatus();
  }, [id, user]);

  const handleRegister = async () => {
      if (!user) {
          // Redirect to login if not authenticated
          navigate('/login');
          return;
      }

      setRegistering(true);
      try {
          const { error } = await supabase
              .from('registrations')
              .insert([
                  { user_id: user.id, event_id: id }
              ]);

          if (error) throw error;

          // Success Flow
          setIsRegistered(true);
          setShowSuccessAnim(true);
          
          // Hide animation after 3.5s to settle into standard view
          setTimeout(() => setShowSuccessAnim(false), 3500);

      } catch (err: any) {
          const msg = getErrorMessage(err);
          showToast('Gagal mendaftar: ' + msg, 'error');
      } finally {
          setRegistering(false);
      }
  };

  const handleCopyLink = () => {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      showToast('Tautan berhasil disalin!', 'success');
  };

  const toggleNotification = (type: 'email' | 'wa') => {
      const isTurningOn = type === 'email' ? !emailNotif : !waNotif;
      
      if (type === 'email') setEmailNotif(!emailNotif);
      else setWaNotif(!waNotif);

      if (isTurningOn) {
          const msg = type === 'email' 
            ? `Berhasil! Pengingat email telah dijadwalkan ke ${user?.email}` 
            : `Notifikasi WhatsApp aktif. Pesan akan dikirim ke nomor terdaftar Anda.`;
          showToast(msg, 'success');
      }
  };

  // --- External Actions Logic ---

  const addToCalendar = () => {
    if (!event || !event.date) return;
    
    try {
        // Robust Date Parsing
        // Handle YYYY-MM-DD or ISO strings
        const eventDate = new Date(event.date);
        if (Number.isNaN(eventDate.getTime())) {
            showToast("Format tanggal tidak valid.", 'error');
            return;
        }

        const dateStr = eventDate.toISOString().split('T')[0].replaceAll('-', ''); // YYYYMMDD
        
        // Time Parsing (HH:MM:SS)
        let startTimeStr = '090000';
        let endTimeStr = '110000';

        if (event.time) {
            const [hours, minutes] = event.time.split(':');
            startTimeStr = `${hours}${minutes}00`;
            
            // Default 2 hours duration
            let endHour = Number.parseInt(hours, 10) + 2;
            if (endHour >= 24) endHour -= 24;
            endTimeStr = `${endHour.toString().padStart(2, '0')}${minutes}00`;
        }
        
        // Google Calendar Format: YYYYMMDDTHHMMSS
        const startDateTime = `${dateStr}T${startTimeStr}`;
        const endDateTime = `${dateStr}T${endTimeStr}`;

        const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || 'UNUGHA')}&ctz=Asia/Jakarta`;
        
        window.open(gCalUrl, '_blank', 'noopener,noreferrer');
    } catch {
        showToast("Gagal membuka kalender.", 'error');
    }
  };

  const openLocationMap = () => {
      if (!event || !event.location) return;

      const loc = event.location.toLowerCase();
      
      // 1. Direct URL
      if (loc.startsWith('http') || loc.startsWith('https')) {
          window.open(event.location, '_blank', 'noopener,noreferrer');
          return;
      }

      // 2. Online Platform Keywords
      const isOnlineLink = loc.includes('zoom') || loc.includes('meet') || loc.includes('teams') || loc.includes('online') || loc.includes('virtual');

      if (isOnlineLink) {
          if (loc.includes('zoom')) window.open('https://zoom.us/join', '_blank', 'noopener,noreferrer');
          else if (loc.includes('meet')) window.open('https://meet.google.com/', '_blank', 'noopener,noreferrer');
          else showToast('Link meeting spesifik belum tersedia.', 'info');
      } else {
          // 3. Offline Location -> Google Maps
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`, '_blank', 'noopener,noreferrer');
      }
  };

  // --- Host Actions ---
  const isHost = user && event && user.id === event.host_id;

  const handleDelete = async () => {
      if (!confirm("PERINGATAN: Apakah Anda yakin ingin menghapus event ini? Data pendaftar juga akan terhapus.")) return;
      
      setDeleting(true);
      try {
          const { error } = await supabase.from('events').delete().eq('id', id);
          if (error) throw error;
          
          showToast("Event berhasil dihapus.", 'success');
          navigate('/dashboard');
      } catch (e: any) {
          showToast("Gagal menghapus event: " + getErrorMessage(e), 'error');
          setDeleting(false);
      }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]"><Loader2 className="animate-spin text-[#5D4E46]" size={40} /></div>;
  if (error || !event) return <div className="min-h-screen flex flex-col items-center justify-center text-slate-500 bg-[#FDFBF7]"><p>{error || 'Event tidak ditemukan'}</p><Link to="/discover"><Button variant="ghost" className="mt-4">Kembali</Button></Link></div>;

  // Safe Date Parsing for UI Display
  const safeDate = (dateStr: string) => {
     if (!dateStr) return new Date();
     const d = new Date(dateStr);
     return Number.isNaN(d.getTime()) ? new Date() : d;
  };

  const dateObj = event.date ? safeDate(event.date) : new Date();
  const isValidDate = !Number.isNaN(dateObj.getTime());
  
  const month = isValidDate ? dateObj.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase() : 'NOV';
  const day = isValidDate ? dateObj.getDate() : '-';
  const fullDate = isValidDate ? dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Tanggal segera diumumkan';
  const timeString = event.time ? `${event.time.substring(0, 5)} WIB` : 'Waktu belum ditentukan';

  const isOnline = event.location?.toLowerCase().includes('virtual') || 
                   event.location?.toLowerCase().includes('online') || 
                   event.location?.toLowerCase().includes('zoom') ||
                   event.location?.toLowerCase().includes('meet');

  return (
    <div className="min-h-screen bg-white pb-20 pt-8">
        <ShareModal 
            isOpen={isShareOpen} 
            onClose={() => setIsShareOpen(false)} 
            title={event.title} 
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Breadcrumb / Back */}
            <div className="mb-8 flex items-center justify-between">
                <Link to="/discover" className="inline-flex items-center gap-2 text-slate-500 hover:text-[#5D4E46] transition-colors font-medium">
                    <ArrowLeft size={20} /> Kembali ke Explore
                </Link>
                <div className="flex gap-2">
                    <button onClick={handleCopyLink} className="p-2 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors" title="Salin Link">
                        <Copy size={18} />
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-12 items-start">
                
                {/* LEFT COLUMN: Image (Square with Glow) */}
                <div className="lg:col-span-5 relative">
                    <div className="sticky top-24">
                        <div className="relative w-full aspect-square mb-6 group select-none">
                            {/* Background Blur Glow */}
                            <div className="absolute inset-6 bg-inherit blur-3xl opacity-50 scale-110 rounded-full z-0">
                                <img src={getStorageUrl(event.image_url)} alt="" className="w-full h-full object-cover" />
                            </div>
                            
                            {/* Main Image */}
                            <div className="relative z-10 w-full h-full rounded-[32px] overflow-hidden shadow-sm ring-1 ring-black/5 bg-slate-100">
                                <img 
                                    src={getStorageUrl(event.image_url) || 'https://via.placeholder.com/800x800?text=Event'} 
                                    alt={event.title} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                />
                            </div>
                        </div>

                        <div className="hidden lg:block mt-6">
                             <div className="flex flex-col gap-2 text-sm text-slate-500">
                                <p className="font-medium text-slate-900">Kategori Event:</p>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                        {event.type?.charAt(0) || 'E'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{event.type || 'Umum'}</p>
                                        <p className="text-xs text-slate-500">Event Terverifikasi</p>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Details & Actions */}
                <div className="lg:col-span-7 space-y-8">
                    
                    {/* Header Info */}
                    <div>
                        <div className="flex gap-3 mb-4">
                            <span className="px-3 py-1 rounded-md bg-[#FDFBF7] border border-[#EFECE6] text-[#5D4E46] text-xs font-bold uppercase tracking-wider">
                                #{event.type?.split(' ')[0]}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-[1.1] mb-6 tracking-tight">
                            {event.title}
                        </h1>

                        {/* Info Widgets */}
                        <div className="flex flex-col sm:flex-row gap-6 border-y border-slate-100 py-6">
                             {/* Date Widget */}
                             <div 
                                role="button"
                                tabIndex={0}
                                onClick={addToCalendar}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        addToCalendar();
                                    }
                                }}
                                className="flex items-start gap-4 p-2 -ml-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-all group relative"
                                title="Tambahkan ke Google Calendar"
                             >
                                <div className="w-14 h-14 rounded-2xl border border-slate-200 flex flex-col items-center justify-center bg-white shrink-0 shadow-sm group-hover:border-indigo-200 transition-colors">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase leading-none mt-0.5">{month}</span>
                                    <span className="text-2xl font-bold text-slate-900 leading-none mb-0.5">{day}</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-lg leading-snug flex items-center gap-2">
                                        {fullDate} <CalendarPlus size={16} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </h4>
                                    <p className="text-slate-500 text-sm mt-0.5">{timeString}</p>
                                    <p className="text-xs text-indigo-600 font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Tambahkan ke Kalender</p>
                                </div>
                             </div>

                             {/* Location Widget */}
                             <div 
                                role="button"
                                tabIndex={0}
                                onClick={openLocationMap}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openLocationMap();
                                    }
                                }}
                                className="flex items-start gap-4 sm:border-l sm:border-slate-100 sm:pl-6 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-all group"
                                title={isOnline ? "Buka Link Meeting" : "Buka Google Maps"}
                             >
                                <div className="w-14 h-14 rounded-2xl border border-slate-200 flex items-center justify-center bg-white shrink-0 shadow-sm text-slate-700 group-hover:border-indigo-200 transition-colors">
                                    {isOnline ? <Video size={24} /> : <MapPin size={24} />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-lg leading-snug flex items-center gap-2">
                                        {isOnline ? 'Virtual Event' : 'Lokasi Langsung'}
                                        <ExternalLink size={16} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </h4>
                                    <p className="text-slate-500 text-sm mt-0.5 line-clamp-1">{event.location}</p>
                                    <p className="text-xs text-indigo-600 font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isOnline ? 'Buka Link' : 'Lihat Peta'}
                                    </p>
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Registration Card (The Beige Box) */}
                    <div className="bg-[#FDFBF7] rounded-[32px] p-6 md:p-8 border border-[#EFECE6] relative overflow-hidden transition-all duration-500">
                         {showSuccessAnim && (
                            <div className="absolute inset-0 z-50 bg-[#FDFBF7] flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
                                {/* Simple CSS Confetti Particles */}
                                <div className="absolute top-10 left-10 w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
                                <div className="absolute top-20 right-20 w-3 h-3 bg-orange-500 rounded-full animate-bounce delay-300"></div>
                                <div className="absolute bottom-10 left-1/3 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <div className="absolute top-1/3 right-10 w-2 h-2 bg-yellow-500 rounded-full animate-ping"></div>

                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-300">
                                    <CheckCircle2 size={40} className="text-green-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Pendaftaran Berhasil!</h3>
                                <p className="text-slate-500 text-center max-w-xs">Tiket telah ditambahkan ke Dashboard Anda.</p>
                                <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm text-sm font-medium text-slate-600">
                                    <Ticket size={16} className="text-indigo-600" />
                                    <span>Tiket Disimpan</span>
                                </div>
                            </div>
                         )}

                         <div className={`relative z-10 transition-opacity duration-300 ${showSuccessAnim ? 'opacity-0' : 'opacity-100'}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-[#E3F5E1] flex items-center justify-center text-green-700">
                                        {isRegistered ? <CheckCircle2 size={24} /> : <Smile size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-[#4A3E38]">
                                            {isRegistered ? 'Kamu Sudah Terdaftar!' : (user ? 'Siap Bergabung?' : 'Pendaftaran Dibuka')}
                                        </h3>
                                        <p className="text-[#8C8178] text-sm">
                                            {isRegistered ? 'Simpan tiketmu dan sampai jumpa di lokasi.' : (user ? 'Amankan kursimu sekarang sebelum penuh.' : 'Login akunmu untuk mendaftar event ini.')}
                                        </p>
                                    </div>
                                </div>
                                {isRegistered && (
                                    <div className="px-4 py-2 bg-white rounded-xl border border-[#E3F5E1] text-green-700 font-bold text-sm shadow-sm">
                                        Tiket Terkonfirmasi
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                {isRegistered ? (
                                     <Button 
                                        onClick={() => navigate('/dashboard')}
                                        variant="secondary" 
                                        className="flex-1 bg-white border-[#EFECE6] text-[#5D4E46] h-14 rounded-2xl text-base hover:bg-[#f5f2eb]"
                                     >
                                        Lihat Tiket di Dashboard
                                     </Button>
                                ) : (
                                    <Button 
                                        onClick={handleRegister}
                                        disabled={registering}
                                        className="flex-1 bg-[#5D4E46] hover:bg-[#4a3e38] text-white h-14 rounded-2xl text-base font-bold shadow-xl shadow-[#5D4E46]/10 transform transition-transform active:scale-[0.98]"
                                    >
                                        {registering ? <Loader2 className="animate-spin mr-2" /> : null}
                                        {user ? 'Daftar Sekarang' : 'Masuk untuk Daftar'}
                                    </Button>
                                )}
                                
                                <Button onClick={() => setIsShareOpen(true)} variant="secondary" className="px-6 bg-[#EFECE6] hover:bg-[#e5e2dc] border-transparent text-[#5D4E46] h-14 rounded-2xl" title="Undang Teman">
                                    <Share2 size={20} />
                                </Button>
                            </div>

                            {!isRegistered && (
                                <div className="mt-4 flex items-center gap-2 text-xs text-[#8C8178] font-medium bg-[#F5F2EB] p-3 rounded-xl w-fit">
                                    <Clock size={14} />
                                    Acara dimulai dalam <span className="text-[#C96F45] font-bold">5d 18h 30m</span>
                                </div>
                            )}
                         </div>
                    </div>

                    {/* Host Controls Section - Only visible to Host */}
                    {isHost && (
                         <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                             <div className="flex items-start gap-3">
                                 <ShieldAlert className="text-red-500 shrink-0 mt-1" size={20} />
                                 <div className="flex-1">
                                     <h3 className="font-bold text-red-900 text-base mb-1">Area Host</h3>
                                     <p className="text-sm text-red-700 mb-4">
                                         Sebagai penyelenggara, Anda memiliki kontrol penuh atas event ini.
                                     </p>
                                     <div className="flex gap-3">
                                         <Button 
                                            onClick={handleDelete}
                                            disabled={deleting}
                                            variant="secondary" 
                                            className="bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 h-10 text-sm"
                                         >
                                             {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                             {deleting ? 'Menghapus...' : 'Hapus Event'}
                                         </Button>
                                     </div>
                                 </div>
                             </div>
                         </div>
                    )}

                    {/* Profile & Notification Settings Section - ONLY VISIBLE IF REGISTERED */}
                    {isRegistered && !showSuccessAnim && (
                        <div className="border-t border-slate-100 pt-8 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <BellRing size={20} className="text-slate-900" />
                                        <h4 className="font-bold text-slate-900">Pengaturan Notifikasi</h4>
                                    </div>
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        Sinkronisasi Aktif
                                    </span>
                                </div>
                                
                                <div className="space-y-3">
                                    {/* Email Toggle */}
                                    <div 
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => toggleNotification('email')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                toggleNotification('email');
                                            }
                                        }}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer select-none ${
                                            emailNotif 
                                            ? 'bg-indigo-50/50 border-indigo-100' 
                                            : 'bg-white border-slate-100 hover:border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${emailNotif ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <Mail size={18} />
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold transition-colors ${emailNotif ? 'text-indigo-900' : 'text-slate-600'}`}>Email Reminder</p>
                                                <p className="text-xs text-slate-500">{emailNotif ? 'Pengingat dikirim H-1 Acara' : 'Notifikasi email dimatikan'}</p>
                                            </div>
                                        </div>
                                        <div className={`w-12 h-7 rounded-full relative transition-colors duration-200 ${emailNotif ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${emailNotif ? 'right-1' : 'left-1'}`}></div>
                                        </div>
                                    </div>

                                    {/* Whatsapp Toggle */}
                                    <div 
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => toggleNotification('wa')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                toggleNotification('wa');
                                            }
                                        }}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer select-none ${
                                            waNotif 
                                            ? 'bg-green-50/50 border-green-100' 
                                            : 'bg-white border-slate-100 hover:border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${waNotif ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <MessageCircle size={18} />
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold transition-colors ${waNotif ? 'text-green-900' : 'text-slate-600'}`}>WhatsApp Info</p>
                                                <p className="text-xs text-slate-500">{waNotif ? 'Update info via WhatsApp aktif' : 'Notifikasi WA dimatikan'}</p>
                                            </div>
                                        </div>
                                        <div className={`w-12 h-7 rounded-full relative transition-colors duration-200 ${waNotif ? 'bg-green-600' : 'bg-slate-200'}`}>
                                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${waNotif ? 'right-1' : 'left-1'}`}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div className="prose prose-slate prose-lg max-w-none pt-4">
                        <h3 className="font-bold text-slate-900 mb-4">Tentang Acara Ini</h3>
                        <div className="text-slate-600 leading-relaxed whitespace-pre-line">
                            {event.description}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};

export default EventDetail;
