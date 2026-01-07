import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { 
    MapPin, Clock, Loader2, Video, 
    ArrowRight, Smile 
} from 'lucide-react';
import { Card, Badge, Button } from '../../components/UI';
import EventPreviewModal from '../../components/EventPreviewModal';
import { Link } from 'react-router-dom';

const ParticipantDashboard: React.FC = () => {
    const { user } = useAuth();
    interface EnrichedEvent {
        id: string;
        title: string;
        date: string;
        time: string;
        location: string;
        image_url: string | null;
        status: string;
        max_attendees?: number;
        registered_count: number;
    }

    const [events, setEvents] = useState<EnrichedEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<EnrichedEvent | null>(null);
    const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

    useEffect(() => {
        const fetchEvents = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const { data: userRegs, error: regError } = await supabase
                    .from('registrations')
                    .select(`
                        id,
                        event_id,
                        events (*)
                    `)
                    .eq('user_id', user.id);
                
                if (regError) throw regError;
                
                if (userRegs) {
                    const eventIds = userRegs.map((r) => r.event_id).filter(Boolean) as string[];
                    const { data: allRegs, error: countError } = await supabase
                        .from('registrations')
                        .select('event_id')
                        .in('event_id', eventIds);
                    
                    if (countError) throw countError;

                    const countsMap: Record<string, number> = {};
                    allRegs?.forEach((r) => {
                        countsMap[r.event_id] = (countsMap[r.event_id] || 0) + 1;
                    });

                    const now = new Date();
                    interface RegistrationWithEvent {
                        event_id: string;
                        events: Record<string, unknown> | Record<string, unknown>[] | null;
                    }

                    const extractedEvents: EnrichedEvent[] = (userRegs as unknown as RegistrationWithEvent[] || [])
                        .map((reg) => {
                            if (!reg.events) return null;

                            // Supabase join results can be an array or a single object
                            const eventData = Array.isArray(reg.events) ? reg.events[0] : reg.events;
                            if (!eventData) return null;

                            return {
                                ...eventData,
                                registered_count: countsMap[reg.event_id] || 0
                            } as EnrichedEvent;
                        })
                        .filter((ev): ev is EnrichedEvent => {
                            if (!ev) return false;
                            const eventDate = new Date(ev.date + 'T' + ev.time);
                            return filter === 'upcoming' ? eventDate >= now : eventDate < now;
                        })
                        .sort((a, b) => {
                            const dateA = new Date(a.date + 'T' + a.time).getTime();
                            const dateB = new Date(b.date + 'T' + b.time).getTime();
                            return filter === 'upcoming' ? dateA - dateB : dateB - dateA;
                        });
                    
                    setEvents(extractedEvents);
                }
            } catch (error) {
                console.error('Error fetching dashboard events:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, [user, filter]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            full: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            dayName: date.toLocaleDateString('id-ID', { weekday: 'long' })
        };
    };

    return (
        <div className="space-y-6 md:space-y-10 pb-20 max-w-5xl mx-auto px-4 md:px-0">
            {/* Modal - Sesuaikan dengan props EventPreviewModal yang benar */}
            <EventPreviewModal 
                isOpen={!!selectedEvent} 
                onClose={() => setSelectedEvent(null)} 
                event={selectedEvent || {}} 
            />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Acara
                        <span className="w-2 h-10 bg-indigo-600 rounded-full animate-pulse hidden md:block"></span>
                    </h1>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto">
                    <button 
                        onClick={() => setFilter('upcoming')}
                        className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${filter === 'upcoming' ? 'bg-white text-indigo-600 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Mendatang
                    </button>
                    <button 
                        onClick={() => setFilter('past')}
                        className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${filter === 'past' ? 'bg-white text-indigo-600 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Lampau
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-indigo-600" size={48} />
                    <p className="text-slate-400 font-medium animate-pulse">Menyiapkan timeline...</p>
                </div>
            ) : events.length === 0 ? (
                <div className="py-24 text-center bg-white/50 backdrop-blur-sm rounded-[40px] border-2 border-dashed border-slate-200 p-10">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Smile className="text-slate-300" size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Belum ada acara {filter === 'upcoming' ? 'mendatang' : 'lampau'}</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mb-8">
                        {filter === 'upcoming' 
                            ? 'Mulai jelajahi acara menarik di kampus dan reservasi tiketmu sekarang!' 
                            : 'Kamu belum memiliki riwayat acara yang sudah selesai.'}
                    </p>
                    <Link to="/discover">
                        <Button className="px-10">Jelajahi Sekarang <ArrowRight size={18} className="ml-2" /></Button>
                    </Link>
                </div>
            ) : (
                <div className="relative pl-4 md:pl-0">
                    <div className="space-y-16">
                        {events.map((event, index) => {
                            const dateInfo = formatDate(event.date);
                            const isVirtual = event.location?.toLowerCase().includes('virtual') || event.location?.toLowerCase().includes('online');

                            return (
                                <div key={event.id} className="grid grid-cols-12 gap-0 md:gap-4 group">
                                    <div className="hidden md:block col-span-2 pt-2 text-right pr-6">
                                        <div className="sticky top-24">
                                            <p className="text-xl font-black text-slate-900 leading-none mb-1">{dateInfo.full}</p>
                                            <p className="text-sm font-bold text-slate-400 capitalize">{dateInfo.dayName}</p>
                                        </div>
                                    </div>

                                    <div className="col-span-1 flex flex-col items-center relative">
                                        <div className="md:hidden absolute -left-4 -top-8 whitespace-nowrap bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold">
                                            {dateInfo.full}
                                        </div>
                                        <div className="w-5 h-5 rounded-full border-4 border-white bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)] z-10 group-hover:scale-125 transition-transform duration-300"></div>
                                        {index !== events.length - 1 && (
                                            <div className="w-0.5 grow bg-gradient-to-b from-indigo-100 via-slate-100 to-transparent border-l-2 border-dashed border-slate-200 my-2"></div>
                                        )}
                                    </div>

                                    <div className="col-span-11 md:col-span-9 pb-4">
                                        <Card 
                                            onClick={() => setSelectedEvent(event)}
                                            className="p-1 pr-6 cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/10 border-slate-100 group-hover:border-indigo-200 transition-all duration-500 overflow-hidden bg-white/80 backdrop-blur-md"
                                        >
                                            <div className="flex flex-col md:flex-row items-stretch gap-0 md:gap-8">
                                                <div className="p-6 flex-grow space-y-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2 text-indigo-600 font-black text-sm tracking-widest bg-indigo-50 px-3 py-1 rounded-lg">
                                                            <Clock size={14} />
                                                            {event.time?.substring(0, 5)}
                                                        </div>
                                                        <Badge status={event.status} className="px-4 py-1.5 rounded-lg border-none shadow-sm" />
                                                    </div>
                                                    
                                                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors drop-shadow-sm">
                                                        {event.title}
                                                    </h3>

                                                    <div className="flex flex-wrap gap-5 text-slate-500">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                                                <Smile size={18} className="text-slate-400 group-hover:text-indigo-500" />
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-600">Oleh Admin Team</span>
                                                        </div>
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                                                {isVirtual ? <Video size={18} /> : <MapPin size={18} />}
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-600 truncate max-w-[180px] md:max-w-none">{event.location}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between border-t border-slate-50 pt-5 mt-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex -space-x-3">
                                                                {[1, 2, 3, 4].map((i) => (
                                                                    <div key={i} className="w-9 h-9 rounded-xl border-2 border-white bg-slate-200 overflow-hidden shadow-sm group-hover:shadow-indigo-200 transition-shadow">
                                                                        <img src={`https://i.pravatar.cc/100?u=${event.id}${i}`} alt="Attendee" className="w-full h-full object-cover" />
                                                                    </div>
                                                                ))}
                                                                <div className="w-9 h-9 rounded-xl border-2 border-white bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-indigo-200">
                                                                    +{Math.abs(event.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 50) + 20}
                                                                </div>
                                                            </div>
                                                            <Badge status="Hadir" className="bg-emerald-500 text-white border-none px-4 py-1 font-black text-[10px] rounded-lg shadow-lg shadow-emerald-200" />
                                                            
                                                            {event.max_attendees && (
                                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-lg border border-amber-100">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                                                                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-tight">
                                                                        {event.max_attendees - event.registered_count <= 0 
                                                                            ? 'Penuh' 
                                                                            : `Sisa ${event.max_attendees - event.registered_count} Kuota`}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-45 shadow-sm">
                                                            <ArrowRight size={24} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="shrink-0 w-full md:w-56 h-48 md:h-auto overflow-hidden relative group-hover:shadow-2xl transition-all duration-700 md:my-4 md:mr-4 md:rounded-[24px]">
                                                    <img 
                                                        src={event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'} 
                                                        alt={event.title}
                                                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export { ParticipantDashboard };
