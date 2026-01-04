
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Calendar, MapPin, Clock, ArrowRight, Smile, Loader2 } from 'lucide-react';
import { Card, Badge, Button } from '../../components/UI';
import { supabase, getStorageUrl } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import EventPreviewModal from '../../components/EventPreviewModal';

export const ParticipantDashboard: React.FC = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    useEffect(() => {
        const fetchTickets = async () => {
            if (!user) return;
            // Fetch registrations with linked event data
            const { data } = await supabase
                .from('registrations')
                .select(`
                    id,
                    status,
                    ticket_code,
                    events:events (*)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            
            setTickets(data || []);
            setLoading(false);
        };
        fetchTickets();
    }, [user]);

    return (
        <div className="space-y-8">
            <EventPreviewModal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} event={selectedEvent} />

            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2">Halo, {user?.user_metadata?.full_name || 'Mahasiswa'}! 👋</h2>
                    <p className="text-violet-100 mb-6 max-w-lg">
                        Siap untuk kegiatan hari ini? Cek tiket event yang sudah kamu daftarkan di bawah ini.
                    </p>
                    <Link to="/discover">
                        <Button className="bg-white text-indigo-600 hover:bg-indigo-50 border-none">
                            Cari Event Lain <ArrowRight size={18} />
                        </Button>
                    </Link>
                </div>
                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl"></div>
            </div>

            {/* My Tickets Section */}
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                        <Ticket size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Tiket Saya</h3>
                </div>

                {loading ? (
                    <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-600" /></div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
                        <Smile size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium">Kamu belum mendaftar event apapun.</p>
                        <Link to="/discover" className="text-indigo-600 font-bold hover:underline mt-2 inline-block">Mulai Jelajahi</Link>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        {tickets.map((item) => {
                            const event = item.events; // data event joined
                            if (!event) return null;
                            
                            return (
                                <div 
                                    key={item.id} 
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedEvent(event)} 
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setSelectedEvent(event);
                                        }
                                    }}
                                    className="cursor-pointer group"
                                >
                                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-indigo-200 transition-all duration-300 relative flex flex-col h-full">
                                        {/* Ticket Stub Design */}
                                        <div className="relative h-40 bg-slate-200 overflow-hidden">
                                            <img src={getStorageUrl(event.image_url)} alt="" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                            <div className="absolute bottom-4 left-4 text-white">
                                                <Badge status={event.status || 'Upcoming'} className="bg-white/20 text-white border-white/30 backdrop-blur-sm mb-2" />
                                                <h4 className="font-bold text-lg line-clamp-1">{event.title}</h4>
                                            </div>
                                        </div>
                                        
                                        {/* Ticket Body */}
                                        <div className="p-5 flex-1 flex flex-col justify-between relative bg-white">
                                            {/* Cutout Circles for Ticket Effect */}
                                            <div className="absolute -top-3 left-0 w-6 h-6 bg-slate-50 rounded-full translate-x-[-50%]"></div>
                                            <div className="absolute -top-3 right-0 w-6 h-6 bg-slate-50 rounded-full translate-x-[50%]"></div>
                                            
                                            <div className="space-y-3 mb-4 border-b border-dashed border-slate-200 pb-4">
                                                <div className="flex items-center gap-3 text-slate-600 text-sm">
                                                    <Calendar size={16} className="text-indigo-500" />
                                                    <span>{event.date}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-slate-600 text-sm">
                                                    <Clock size={16} className="text-indigo-500" />
                                                    <span>{event.time} WIB</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-slate-600 text-sm">
                                                    <MapPin size={16} className="text-indigo-500" />
                                                    <span className="truncate">{event.location}</span>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <div className="text-xs text-slate-400 font-mono">
                                                    ID: {item.ticket_code?.substring(0,8).toUpperCase()}
                                                </div>
                                                <div className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-100">
                                                    TERDAFTAR
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
