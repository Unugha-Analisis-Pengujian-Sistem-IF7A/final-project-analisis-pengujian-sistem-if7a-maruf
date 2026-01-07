import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, Video, ArrowUpRight, Share2, Copy, ChevronsRight,
  User as UserIcon, Smile, CalendarPlus, ChevronDown, Mail,
  MessageCircle, ExternalLink, CheckCircle2
} from 'lucide-react';
import { getStorageUrl } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import ShareModal from './ShareModal';

interface EventPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Record<string, any>;
}

// --- Sub-Components ---

const PreviewHeader = ({ onClose, onCopy, id }: { onClose: () => void, onCopy: () => void, id: string }) => (
    <div className="absolute top-0 left-0 right-0 h-[68px] flex items-center justify-between px-6 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-50/50">
        <div className="flex items-center gap-3">
            <button 
                onClick={onClose}
                className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                data-testid="modal-close-btn"
            >
                <ChevronsRight size={22} />
            </button>
            
            <div className="h-6 w-[1px] bg-slate-200 mx-1" />

            <button 
                onClick={onCopy}
                data-testid="copy-link-btn"
                className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 transition-colors shadow-sm"
            >
                <Copy size={14} /> <span id="btn-copy">Salin Tautan</span>
            </button>
            
            <Link to={`/event/${id}`}>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 transition-colors shadow-sm">
                    Halaman Acara <ArrowUpRight size={14} />
                </button>
            </Link>
        </div>
    </div>
);

const EventImage = ({ imageUrl, title }: { imageUrl: string, title: string }) => (
    <div className="relative w-full aspect-square mb-6 group select-none">
         <div className="absolute inset-6 bg-inherit blur-3xl opacity-50 scale-110 rounded-full z-0">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
         </div>
         <div className="relative z-10 w-full h-full rounded-[24px] overflow-hidden shadow-sm ring-1 ring-black/5 bg-slate-100">
             <img src={imageUrl} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
         </div>
    </div>
);

interface WidgetProps {
    month: string;
    day: number | string;
    fullDate: string;
    timeString: string;
    location: string;
    isOnline: boolean;
    onCalendar: () => void;
    onMap: () => void;
}

const InfoWidgets = ({ month, day, fullDate, timeString, location, isOnline, onCalendar, onMap }: WidgetProps) => (
    <div className="space-y-5 mb-8">
        {/* Date Row */}
        <button 
            type="button"
            onClick={onCalendar}
            className="w-full text-left flex items-start gap-4 p-2 -ml-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-all group"
            title="Tambahkan ke Google Calendar"
        >
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
        </button>

        {/* Location Row */}
        <button 
            type="button"
            onClick={onMap}
            className="w-full text-left flex items-start gap-4 p-2 -ml-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-all group"
            title={isOnline ? "Buka Link Meeting" : "Buka Google Maps"}
        >
                <div className="w-[42px] h-[42px] rounded-[10px] border border-slate-200 flex items-center justify-center bg-white shrink-0 shadow-sm text-slate-700 group-hover:border-indigo-200 transition-colors">
                    {isOnline ? <Video size={20} /> : <MapPin size={20} />}
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 text-[15px] leading-snug flex items-center gap-2">
                    {isOnline ? 'Virtual' : 'Lokasi Langsung'}
                    <ExternalLink size={14} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h4>
                    <p className="text-slate-500 text-sm mt-0.5 line-clamp-1">{location}</p>
                </div>
        </button>
    </div>
);

const RegistrationCard = ({ user, onRegister, onShare }: { user: any, onRegister: () => void, onShare: () => void }) => (
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

        <div className="flex gap-3 mb-3">
            <button 
                onClick={onRegister}
                className="flex-1 bg-[#5D4E46] hover:bg-[#4a3e38] text-white font-semibold py-3 rounded-xl text-sm transition-colors shadow-md shadow-[#5D4E46]/10 flex items-center justify-center gap-2"
            >
                    {user ? 'Daftar Sekarang' : 'Masuk untuk Daftar'}
            </button>
            <button 
                onClick={onShare}
                className="px-4 bg-[#EFECE6] hover:bg-[#e5e2dc] text-[#5D4E46] font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                title="Undang Teman"
            >
                <Share2 size={18} /> <span className="hidden sm:inline">Undang</span>
            </button>
        </div>
    </div>
);

const PrepareSection = ({ 
    show, 
    onToggleShow, 
    user, 
    emailNotif, 
    waNotif, 
    onToggle 
}: { 
    show: boolean, 
    onToggleShow: () => void, 
    user: any, 
    emailNotif: boolean, 
    waNotif: boolean, 
    onToggle: (type: 'email' | 'wa') => void 
}) => (
    <div className="mt-6">
        <button 
        onClick={onToggleShow}
        data-testid="prepare-toggle"
        className="flex items-center justify-between w-full mb-3 group p-2 hover:bg-slate-50 rounded-lg transition-colors"
        >
            <h4 className="font-bold text-slate-900 text-[15px]">Bersiaplah untuk Acara</h4>
            <ChevronDown 
                size={18} 
                className={`text-slate-400 group-hover:text-indigo-600 transition-transform duration-300 ${show ? 'rotate-180' : ''}`} 
            />
        </button>

        {show && (
            <div className="bg-[#FDFBF7] rounded-[20px] p-5 border border-stone-100/50 animate-in slide-in-from-top-2">
                {user ? (
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
                ) : (
                    <div className="text-center py-4">
                        <p className="text-xs text-[#8C8178] mb-3">Login untuk mengatur notifikasi acara.</p>
                    </div>
                )}

                {/* Settings Toggles */}
                <div className={`space-y-4 pt-2 border-t border-[#EFECE6] ${user ? '' : 'opacity-60 pointer-events-none'}`}>
                    <button 
                    type="button"
                    onClick={() => onToggle('email')}
                    data-testid="email-toggle"
                    className="w-full flex items-center justify-between cursor-pointer select-none group"
                    >
                        <div className="flex items-center gap-2 text-[#4A3E38]">
                            <Mail size={16} className={`text-[#8C8178] transition-colors ${emailNotif ? 'text-indigo-600' : ''}`} />
                            <span className="text-xs font-semibold">Email Reminder</span>
                        </div>
                        <div className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${emailNotif ? 'bg-[#5D4E46]' : 'bg-[#EFECE6]'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${emailNotif ? 'right-1' : 'left-1'}`}></div>
                        </div>
                    </button>

                    <button 
                    type="button"
                    onClick={() => onToggle('wa')}
                    data-testid="wa-toggle"
                    className="w-full flex items-center justify-between cursor-pointer select-none group"
                    >
                        <div className="flex items-center gap-2 text-[#4A3E38]">
                            <MessageCircle size={16} className={`text-[#8C8178] transition-colors ${waNotif ? 'text-green-600' : ''}`} />
                            <span className="text-xs font-semibold">WhatsApp</span>
                        </div>
                        <div className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${waNotif ? 'bg-green-600' : 'bg-[#EFECE6]'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${waNotif ? 'right-1' : 'left-1'}`}></div>
                        </div>
                    </button>
                </div>
            </div>
        )}
    </div>
);

// --- Main Component ---

const EventPreviewModal: React.FC<EventPreviewModalProps> = ({ isOpen, onClose, event }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showPrepare, setShowPrepare] = useState(!!user);
  const [isShareOpen, setIsShareOpen] = useState(false);
  
  const [emailNotif, setEmailNotif] = useState(false);
  const [waNotif, setWaNotif] = useState(false);
  
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'email' | 'wa'}>({
      show: false, 
      message: '', 
      type: 'email'
  });



  if (!isOpen || !event) return null;

  const handleCopyLink = () => {
    const baseUrl = import.meta.env.BASE_URL;
    const url = `${globalThis.location.origin}${baseUrl}event/${event.id}`;
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

  const handleToggleNotification = (type: 'email' | 'wa') => {
      const isTurningOn = type === 'email' ? !emailNotif : !waNotif;
      
      if (type === 'email') setEmailNotif(!emailNotif);
      else setWaNotif(!waNotif);

      if (isTurningOn) {
          const target = type === 'email' ? (user?.email || 'email anda') : 'nomor terdaftar';
          const message = type === 'email' 
            ? `Pengingat dijadwalkan ke ${target}`
            : `Notifikasi WhatsApp aktif ke ${target}`;
            
          setToast({ show: true, message, type });
          setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
      }
  };

  const formatCalendarDate = (date: Date, timeStr?: string) => {
    const dateStr = date.toISOString().split('T')[0].replaceAll('-', '');
    let startTime = '090000';
    let endTime = '110000';

    if (timeStr) {
      const [hours, minutes] = timeStr.split(':');
      startTime = `${hours}${minutes}00`;
      let endHour = Number.parseInt(hours, 10) + 2;
      if (endHour >= 24) endHour -= 24;
      endTime = `${endHour.toString().padStart(2, '0')}${minutes}00`;
    }
    return { start: `${dateStr}T${startTime}`, end: `${dateStr}T${endTime}` };
  };

  const addToCalendar = () => {
    if (!event?.date) return;
    try {
        const eventDate = new Date(event.date);
        if (Number.isNaN(eventDate.getTime())) return;

        const { start, end } = formatCalendarDate(eventDate, event.time);
        const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${end}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || 'UNUGHA')}&ctz=Asia/Jakarta`;
        
        globalThis.open(gCalUrl, '_blank', 'noopener,noreferrer');
    } catch { 
        // Ignore
    }
  };

  const openLocationMap = () => {
      if (!event?.location) return;

      const loc = event.location.toLowerCase();
      const isOnlineLink = loc.startsWith('http') || loc.startsWith('https');
      const isPlatform = loc.includes('zoom') || loc.includes('meet') || loc.includes('teams') || loc.includes('virtual') || loc.includes('online');

      if (isOnlineLink) {
          globalThis.open(event.location, '_blank', 'noopener,noreferrer');
      } else if (isPlatform) {
          if (loc.includes('zoom')) globalThis.open('https://zoom.us/join', '_blank', 'noopener,noreferrer');
          else if (loc.includes('meet')) globalThis.open('https://meet.google.com/', '_blank', 'noopener,noreferrer');
          else alert('Link meeting belum tersedia.');
      } else {
          globalThis.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`, '_blank', 'noopener,noreferrer');
      }
  };

  // Safe Date Parsing
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
  const baseUrl = import.meta.env.BASE_URL;
  const eventUrl = `${globalThis.location.origin}${baseUrl}event/${event.id}`;

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
      <button 
        type="button"
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-300 w-full h-full border-none p-0 cursor-default"
        onClick={onClose}
        aria-label="Close modal"
        data-testid="modal-backdrop"
      ></button>

      {/* Modal Panel */}
      <div className="relative w-full max-w-[500px] h-[calc(100vh-16px)] m-2 bg-white rounded-[24px] shadow-2xl flex flex-col animate-in slide-in-from-right-4 duration-300 overflow-hidden ring-1 ring-black/5">
        
        <PreviewHeader onClose={onClose} onCopy={handleCopyLink} id={event.id} />

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
             <EventImage imageUrl={imageUrl} title={event.title} />

             <div className="mb-8">
                <h2 className="text-[28px] font-bold text-slate-900 leading-tight mb-4 tracking-tight">{event.title}</h2>
                <div className="flex flex-wrap gap-4 mt-4 text-xs font-medium text-slate-400">
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 font-bold uppercase tracking-wider">#{event.type || 'Event'}</span>
                </div>
             </div>

             <InfoWidgets 
                month={month}
                day={day}
                fullDate={fullDate}
                timeString={timeString}
                location={event.location || ''}
                isOnline={!!isOnline}
                onCalendar={addToCalendar}
                onMap={openLocationMap}
             />

             <RegistrationCard 
                user={user} 
                onRegister={handleRegisterAction} 
                onShare={() => setIsShareOpen(true)} 
             />

             <PrepareSection 
                show={showPrepare}
                onToggleShow={() => setShowPrepare(!showPrepare)}
                user={user}
                emailNotif={emailNotif}
                waNotif={waNotif}
                onToggle={handleToggleNotification}
             />
        </div>
      </div>
    </div>
    </>
  );
};

export default EventPreviewModal;
