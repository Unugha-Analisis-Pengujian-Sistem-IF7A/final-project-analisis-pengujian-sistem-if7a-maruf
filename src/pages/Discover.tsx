
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search,
  MapPin, 
  Calendar,
  Loader2
} from 'lucide-react';
import { Card } from '../components/UI';
import { supabase, getStorageUrl } from '../services/supabaseClient';
import EventPreviewModal from '../components/EventPreviewModal';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image_url: string | null;
  type: string;
  is_public: boolean;
  price: number;
  status?: string;
  max_attendees?: number;
  registered_count?: number;
}

const Discover: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Semua');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Sync state with URL param changes (e.g. from Navbar)
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      setTimeout(() => setSearch(q), 0);
    }
  }, [searchParams]);

  useEffect(() => {
      const fetchEvents = async () => {
          setLoading(true);
          try {
              let query = supabase
                  .from('events')
                  .select('*')
                  .order('date', { ascending: true });

              if (filter !== 'Semua') {
                  query = query.eq('type', filter);
              }

              if (search) {
                  query = query.ilike('title', `%${search}%`);
              }

              const { data: eventsData, error } = await query;
              
              if (error) {
                  console.error("Error fetching events:", error);
                  // Optional: handle error state
              } else if (eventsData) {
                  // Fetch registration counts for these events
                  const eventIds = eventsData.map(e => e.id);
                  const { data: regCounts } = await supabase
                      .from('registrations')
                      .select('event_id')
                      .in('event_id', eventIds);
                  
                  const countsMap: Record<string, number> = {};
                  regCounts?.forEach(r => {
                      countsMap[r.event_id] = (countsMap[r.event_id] || 0) + 1;
                  });

                  const enrichedEvents = eventsData.map(e => ({
                      ...e,
                      registered_count: countsMap[e.id] || 0
                  }));

                  setEvents(enrichedEvents);
              }
          } catch (err) {
              console.error("Unexpected error in fetchEvents:", err);
          } finally {
              setLoading(false);
          }
      };

      fetchEvents();
  }, [filter, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EventPreviewModal 
            key={selectedEvent?.id || 'modal'}
            isOpen={!!selectedEvent} 
            onClose={() => setSelectedEvent(null)} 
            event={selectedEvent || {}} 
        />

        {/* Search Header */}
        <div className="relative mb-12 text-center py-10">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Temukan Event Seru</h1>
            <p className="text-slate-500 mb-8">Cari berdasarkan nama, kategori, atau tipe event.</p>
            
            <div className="max-w-2xl mx-auto relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={24} />
                </div>
                <input 
                    type="text" 
                    placeholder="Cari event..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-14 pl-14 pr-6 rounded-full border-2 border-slate-100 shadow-lg shadow-slate-200/50 focus:border-indigo-500 focus:outline-none text-lg transition-colors"
                />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
                {['Semua', 'Teknologi', 'Seni Budaya', 'Olahraga', 'Seminar', 'Workshop'].map((cat) => (
                    <button 
                        key={cat} 
                        onClick={() => setFilter(cat)}
                        className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${filter === cat ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-500'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        </div>

        {/* Grid */}
        {/* Grid */}
        {(() => {
            if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
            
            if (events.length === 0) return <div className="text-center py-20 text-slate-500">Tidak ada event ditemukan.</div>;

            return (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {events.map((event) => (
                        <button 
                            key={event.id} 
                            type="button"
                            onClick={() => setSelectedEvent(event)} 
                            className="cursor-pointer text-left border-none p-0 bg-transparent block"
                        >
                            <Card className="h-full p-0 overflow-hidden group hover:shadow-2xl transition-all duration-300 border-0">
                                <div className="relative h-48 overflow-hidden bg-slate-100">
                                    <img 
                                        src={getStorageUrl(event.image_url) || 'https://via.placeholder.com/500x300?text=Event'} 
                                        alt={event.title} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                    />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-slate-800 uppercase tracking-wide shadow-sm">
                                        {event.type}
                                    </div>
                                </div>
                                <div className="p-6">


                                    <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">{event.title}</h3>
                                    <div className="space-y-2 text-sm text-slate-500 mb-4">
                                        <div className="flex items-center gap-2"><Calendar size={16} className="text-indigo-500" /> {event.date}</div>
                                        <div className="flex items-center gap-2"><MapPin size={16} className="text-indigo-500" /> {event.location}</div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-indigo-600">{event.status || 'Terbuka'}</span>
                                            {!!event.max_attendees && (
                                                <span className={`text-[10px] font-bold ${event.max_attendees - (event.registered_count || 0) <= 5 ? 'text-red-500' : 'text-slate-400'}`}>
                                                    {event.max_attendees - (event.registered_count || 0) <= 0 
                                                        ? 'KUOTA PENUH' 
                                                        : `${event.max_attendees - (event.registered_count || 0)} Kuota Tersisa`}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-400">Klik untuk Preview →</span>
                                    </div>
                                </div>
                            </Card>
                        </button>
                    ))}
                </div>
            );
        })()}
    </div>
  );
};

export default Discover;
