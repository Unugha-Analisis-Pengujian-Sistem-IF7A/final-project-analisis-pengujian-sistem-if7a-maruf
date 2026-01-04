
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Video, 
  ArrowUpRight, 
  Share2, 
  Copy,
  ChevronsRight,
  User as UserIcon,
  Smile,
  CalendarPlus,
  ChevronDown,
  Mail,
  MessageCircle,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { getStorageUrl } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import ShareModal from './ShareModal';

interface EventPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Record<string, any>;
}

const EventPreviewModal: React.FC<EventPreviewModalProps> = ({ isOpen, onClose, event }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showPrepare, setShowPrepare] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  
  // Toggle States for Notifications
  const [emailNotif, setEmailNotif] = useState(false);
  const [waNotif, setWaNotif] = useState(false);
  
  // Feedback Toast State
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'email' | 'wa'}>({
      show: false, 
      message: '', 
      type: 'email'
  });

  useEffect(() => {
    if (isOpen) {
        const t = setTimeout(() => {

            // Default open the prepare section if user is logged in
            setShowPrepare(!!user);
        }, 0);
        return () => clearTimeout(t);
    }
  }, [isOpen, user]);

  if (!isOpen || !event) return null;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#/event/${event.id}`;
    navigator.clipboard.writeText(url);
    const btn = document.getElementById('btn-copy');
    if(btn) btn.innerHTML = 'Disalin!';
    setTimeout(() => {
        if(btn) btn.innerHTML = 'Salin Tautan';
    }, 2000);
  };

  const handleRegisterAction = () => {
    if (!user) {
        navigate('/login');
        return;
    }
    navigate(`/event/${event.id}`);
  };

  // --- Notification Logic ---
  const handleToggleNotification = (type: 'email' | 'wa') => {
      // 1. Determine action (Turning ON or OFF)
      const isTurningOn = type === 'email' ? !emailNotif : !waNotif;
      
      // 2. Update State
      if (type === 'email') setEmailNotif(!emailNotif);
      else setWaNotif(!waNotif);

      // 3. Show Feedback ONLY if turning ON
      if (isTurningOn) {
          const target = type === 'email' ? (user?.email || 'email anda') : 'nomor terdaftar';
          const message = type === 'email' 
            ? `Pengingat dijadwalkan ke ${target}`
            : `Notifikasi WhatsApp aktif ke ${target}`;
            
          setToast({ show: true, message, type });
          
          // Hide toast after 3 seconds
          setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
      }
  };

  // --- External Actions Logic ---
  const addToCalendar = () => {
    if (!event || !event.date) return;
    
    try {
        // Robust Date Parsing
        const eventDate = new Date(event.date);
        if (Number.isNaN(eventDate.getTime())) {
            alert("Format tanggal tidak valid.");
            return;
        }

        const dateStr = eventDate.toISOString().split('T')[0].replaceAll('-', ''); // YYYYMMDD
        
        let startTimeStr = '090000';
        let endTimeStr = '110000';

        if (event.time) {
            const [hours, minutes] = event.time.split(':');
            startTimeStr = `${hours}${minutes}00`;
            
            let endHour = Number.parseInt(hours, 10) + 2;
            if (endHour >= 24) endHour -= 24;
            endTimeStr = `${endHour.toString().padStart(2, '0')}${minutes}00`;
        }
        
        const startDateTime = `${dateStr}T${startTimeStr}`;
        const endDateTime = `${dateStr}T${endTimeStr}`;

        const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || 'UNUGHA')}&ctz=Asia/Jakarta`;
        
        window.open(gCalUrl, '_blank', 'noopener,noreferrer');
    } catch {
        // Ignore
    }
  };

  const openLocationMap = () => {
      if (!event || !event.location) return;

      const loc = event.location.toLowerCase();
      const isOnlineLink = loc.includes('http') || loc.includes('https');
      const isPlatform = loc.includes('zoom') || loc.includes('meet') || loc.includes('teams') || loc.includes('virtual') || loc.includes('online');

      if (isOnlineLink) {
          window.open(event.location, '_blank', 'noopener,noreferrer');
      } else if (isPlatform) {
          if (loc.includes('zoom')) window.open('https://zoom.us/join', '_blank', 'noopener,noreferrer');
          else if (loc.includes('meet')) window.open('https://meet.google.com/', '_blank', 'noopener,noreferrer');
          else alert('Link meeting belum tersedia.');
      } else {
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`, '_blank', 'noopener,noreferrer');
      }
  };

  // Helper untuk format tanggal dengan Safe Parsing
  const safeDate = (dateStr: string) => {
     if (!dateStr) return new Date();
     const d = new Date(dateStr);
     return Number.isNaN(d.getTime()) ? new Date() : d;
  };

  const dateObj = event.date ? safeDate(event.date) : new Date();
  const isValidDate = !Number.isNaN(dateObj.getTime());

  const month = isValidDate ? dateObj.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase() : 'NOV';
  const day = isValidDate ? dateObj.getDate() : '-';
  const fullDate = isValidDate ? dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Segera';
  const timeString = event.time ? `${event.time.substring(0, 5)} WIB` : 'Waktu TBA';

  const isOnline = event.location?.toLowerCase().includes('virtual') || 
                   event.location?.toLowerCase().includes('online') || 
                   event.location?.toLowerCase().includes('zoom') ||
                   event.location?.toLowerCase().includes('meet');
                   
  const imageUrl = getStorageUrl(event.image_url) || 'https://via.placeholder.com/800x800?text=Event';
  const eventUrl = `${window.location.origin}/#/event/${event.id}`;

  return (
    <>
    {/* Share Modal integrated separately to ensure z-index correctness */}
    <ShareModal 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
        title={event.title}
        url={eventUrl} 
    />

    <div className="fixed inset-0 z-[100] flex justify-end items-start font-sans">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-300"
        role="button"
        tabIndex={-1}
        onClick={onClose}
        onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClose();
            }
        }}
        data-testid="modal-backdrop"
      ></div>

      {/* Modal Panel - Desain Floating Side Panel */}
      <div className="relative w-full max-w-[500px] h-[calc(100vh-16px)] m-2 bg-white rounded-[24px] shadow-2xl flex flex-col animate-in slide-in-from-right-4 duration-300 overflow-hidden ring-1 ring-black/5">
        
        {/* Header Section */}
        <div className="absolute top-0 left-0 right-0 h-[68px] flex items-center justify-between px-6 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-50/50">
            <div className="flex items-center gap-3">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                    data-testid="modal-close-btn"
                >
                    <ChevronsRight size={22} />
                </button>
                
                <div className="h-6 w-[1px] bg-slate-200 mx-1" />

                {/* Header Actions */}
                <button 
                    onClick={handleCopyLink}
                    data-testid="copy-link-btn"
                    className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 transition-colors shadow-sm"
                >
                    <Copy size={14} /> <span id="btn-copy">Salin Tautan</span>
                </button>
                
                <Link to={`/event/${event.id}`}>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 transition-colors shadow-sm">
                        Halaman Acara <ArrowUpRight size={14} />
                    </button>
                </Link>
            </div>
        </div>

        {/* Feedback Toast */}
        {toast.show && (
            <div className="absolute top-[80px] left-1/2 -translate-x-1/2 z-50 w-[90%] bg-slate-900/90 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2 fade-in">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'email' ? 'bg-indigo-500' : 'bg-green-500'}`}>
                    <CheckCircle2 size={16} className="text-white" />
                </div>
                <div>
                    <p className="text-sm font-semibold">Notifikasi Aktif</p>
                    <p className="text-xs text-slate-300 line-clamp-1">{toast.message}</p>
                </div>
            </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-[80px] px-6 pb-8">
             
             {/* 1. Square Image with Glow */}
             <div className="relative w-full aspect-square mb-6 group select-none">
                 {/* Background Blur Glow */}
                 <div className="absolute inset-6 bg-inherit blur-3xl opacity-50 scale-110 rounded-full z-0">
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                 </div>
                 
                 {/* Main Image */}
                 <div className="relative z-10 w-full h-full rounded-[24px] overflow-hidden shadow-sm ring-1 ring-black/5 bg-slate-100">
                     <img src={imageUrl} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                 </div>
             </div>

             {/* 2. Title & Organizer */}
             <div className="mb-8">
                <h2 className="text-[28px] font-bold text-slate-900 leading-tight mb-4 tracking-tight">{event.title}</h2>
                
                <div className="flex items-center gap-3">
                     <div className="w-7 h-7 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center overflow-hidden shrink-0">
                         <img src={`https://ui-avatars.com/api/?name=${event.type || 'U'}&background=random`} alt="" className="w-full h-full object-cover" />
                     </div>
                     <p className="text-slate-600 text-sm font-medium truncate">
                        Diselenggarakan oleh <span className="text-slate-900 font-bold">{event.type || 'Panitia Kampus'}</span>
                     </p>
                </div>

                <div className="flex flex-wrap gap-4 mt-4 text-xs font-medium text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">#{event.type?.split(' ')[0] || 'Event'}</span>
                </div>
             </div>

             {/* 3. Info Rows (Date & Location) */}
             <div className="space-y-5 mb-8">
                {/* Date Row */}
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
                    className="flex items-start gap-4 p-2 -ml-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-all group"
                    title="Tambahkan ke Google Calendar"
                >
                     {/* Date Widget */}
                     <div className="w-[42px] h-[42px] rounded-[10px] border border-slate-200 flex flex-col items-center justify-center bg-white shrink-0 shadow-sm group-hover:border-indigo-200 transition-colors">
                         <span className="text-[9px] font-bold text-slate-500 uppercase leading-none mt-0.5">{month}</span>
                         <span className="text-lg font-bold text-slate-900 leading-none mb-0.5">{day}</span>
                     </div>
                     <div>
                         <h4 className="font-bold text-slate-900 text-[15px] leading-snug flex items-center gap-2">
                            {fullDate} 
                            <CalendarPlus size={14} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                         </h4>
                         <p className="text-slate-500 text-sm mt-0.5">{timeString}</p>
                     </div>
                </div>

                {/* Location Row */}
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
                    className="flex items-start gap-4 p-2 -ml-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-all group"
                    title={isOnline ? "Buka Link Meeting" : "Buka Google Maps"}
                >
                     {/* Location Icon Logic */}
                     <div className="w-[42px] h-[42px] rounded-[10px] border border-slate-200 flex items-center justify-center bg-white shrink-0 shadow-sm text-slate-700 group-hover:border-indigo-200 transition-colors">
                         {isOnline ? <Video size={20} /> : <MapPin size={20} />}
                     </div>
                     <div>
                         <h4 className="font-bold text-slate-900 text-[15px] leading-snug flex items-center gap-2">
                            {isOnline ? 'Virtual' : 'Lokasi Langsung'}
                            <ExternalLink size={14} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                         </h4>
                         <p className="text-slate-500 text-sm mt-0.5 line-clamp-1">{event.location}</p>
                     </div>
                </div>
             </div>

             {/* 4. Registration / Status Card */}
             <div className="bg-[#FDFBF7] rounded-[20px] p-5 border border-stone-100/50">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-[#E3F5E1] flex items-center justify-center text-green-600">
                         <Smile size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-[#4A3E38] text-[15px]">
                            {user ? 'Siap Mendaftar?' : 'Pendaftaran Dibuka'}
                        </h4>
                        <p className="text-[#8C8178] text-xs">
                            {user ? 'Amankan tiketmu sekarang.' : 'Login untuk mendaftar event ini.'}
                        </p>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 mb-3">
                    <button 
                        onClick={handleRegisterAction}
                        className="flex-1 bg-[#5D4E46] hover:bg-[#4a3e38] text-white font-semibold py-3 rounded-xl text-sm transition-colors shadow-md shadow-[#5D4E46]/10 flex items-center justify-center gap-2"
                    >
                         {user ? 'Daftar Sekarang' : 'Masuk untuk Daftar'}
                    </button>
                    <button 
                        onClick={() => setIsShareOpen(true)}
                        className="px-4 bg-[#EFECE6] hover:bg-[#e5e2dc] text-[#5D4E46] font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                        title="Undang Teman"
                    >
                        <Share2 size={18} /> <span className="hidden sm:inline">Undang</span>
                    </button>
                </div>
             </div>

             {/* 5. Profile Section (Collapsible Dropdown) */}
             <div className="mt-6">
                  <button 
                    onClick={() => setShowPrepare(!showPrepare)}
                    data-testid="prepare-toggle"
                    className="flex items-center justify-between w-full mb-3 group p-2 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                      <h4 className="font-bold text-slate-900 text-[15px]">Bersiaplah untuk Acara</h4>
                      <ChevronDown 
                         size={18} 
                         className={`text-slate-400 group-hover:text-indigo-600 transition-transform duration-300 ${showPrepare ? 'rotate-180' : ''}`} 
                      />
                  </button>

                 {showPrepare && (
                     <div className="bg-[#FDFBF7] rounded-[20px] p-5 border border-stone-100/50 animate-in slide-in-from-top-2">
                         {user ? (
                             <>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-[#D3E5FF] flex items-center justify-center text-indigo-600 border-2 border-white shadow-sm overflow-hidden">
                                        {user.user_metadata?.avatar_url ? (
                                            <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={20} />
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                         <p className="text-xs text-[#8C8178]">Profil Anda</p>
                                         <h5 className="font-bold text-[#4A3E38] truncate">{user.user_metadata?.full_name || user.email?.split('@')[0] || 'Peserta'}</h5>
                                    </div>
                                </div>
                             </>
                         ) : (
                             <div className="text-center py-4">
                                 <p className="text-xs text-[#8C8178] mb-3">Login untuk mengatur notifikasi acara.</p>
                             </div>
                         )}

                         {/* Settings Toggles (Always visible but disabled if not logged in for visual queue) */}
                         <div className={`space-y-4 pt-2 border-t border-[#EFECE6] ${!user ? 'opacity-60 pointer-events-none' : ''}`}>
                             {/* Email Toggle */}
                             <div 
                                role="button"
                                tabIndex={0}
                                onClick={() => handleToggleNotification('email')}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleToggleNotification('email');
                                    }
                                }}
                                data-testid="email-toggle"
                                className="flex items-center justify-between cursor-pointer select-none group"
                             >
                                 <div className="flex items-center gap-2 text-[#4A3E38]">
                                     <Mail size={16} className={`text-[#8C8178] transition-colors ${emailNotif ? 'text-indigo-600' : ''}`} />
                                     <span className="text-xs font-semibold">Email Reminder</span>
                                 </div>
                                 <div className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${emailNotif ? 'bg-[#5D4E46]' : 'bg-[#EFECE6]'}`}>
                                     <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${emailNotif ? 'right-1' : 'left-1'}`}></div>
                                 </div>
                             </div>

                             {/* WhatsApp Toggle */}
                             <div 
                                role="button"
                                tabIndex={0}
                                onClick={() => handleToggleNotification('wa')}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleToggleNotification('wa');
                                    }
                                }}
                                data-testid="wa-toggle"
                                className="flex items-center justify-between cursor-pointer select-none group"
                             >
                                 <div className="flex items-center gap-2 text-[#4A3E38]">
                                     <MessageCircle size={16} className={`text-[#8C8178] transition-colors ${waNotif ? 'text-green-600' : ''}`} />
                                     <span className="text-xs font-semibold">WhatsApp</span>
                                 </div>
                                 <div className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${waNotif ? 'bg-green-600' : 'bg-[#EFECE6]'}`}>
                                     <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${waNotif ? 'right-1' : 'left-1'}`}></div>
                                 </div>
                             </div>
                         </div>
                     </div>
                 )}
             </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default EventPreviewModal;
