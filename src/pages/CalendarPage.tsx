
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Card } from '../components/UI';
import { supabase } from '../services/supabaseClient';
import EventPreviewModal from '../components/EventPreviewModal';

const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Record<string, any> | null>(null);
  
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  // Fetch events when month changes
  useEffect(() => {
    const fetchEvents = async () => {
        setLoading(true);
        try {
            // Calculate start and end of the displayed month
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('events')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate);
            
            if (error) throw error;
            setEvents(data || []);
        } catch {
            // Ignore
        } finally {
            setLoading(false);
        }
    };

    fetchEvents();
  }, [currentDate]);

  const handlePrevMonth = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Calendar Grid Logic
  const generateGrid = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      const grid = [];
      
      // Empty cells for days before the 1st
      for (let i = 0; i < firstDayOfMonth; i++) {
          grid.push(null);
      }
      
      // Days of the month
      for (let i = 1; i <= daysInMonth; i++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          
          // Find events for this day
          const dayEvents = events.filter(e => e.date === dateStr);
          
          grid.push({
              day: i,
              dateStr,
              events: dayEvents
          });
      }
      
      return grid;
  };

  const gridCells = generateGrid();
  const monthName = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <EventPreviewModal 
            isOpen={!!selectedEvent} 
            onClose={() => setSelectedEvent(null)} 
            event={selectedEvent} 
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Kalender Kegiatan</h1>
                <p className="text-slate-500">Jadwal event kampus {monthName}</p>
            </div>
            <div className="flex items-center gap-4 bg-white p-1 rounded-full shadow-sm border border-slate-200">
                <button 
                    onClick={handlePrevMonth}
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="font-bold text-base text-slate-800 min-w-[140px] text-center select-none capitalize">
                    {monthName}
                </span>
                <button 
                    onClick={handleNextMonth}
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>

        <Card className="p-0 overflow-hidden shadow-lg border-0 min-h-[600px] flex flex-col">
            {/* Header Hari */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {days.map(d => (
                    <div key={d} className="py-4 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        {d}
                    </div>
                ))}
            </div>

            {/* Grid Kalender */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                </div>
            ) : (
                <div className="grid grid-cols-7 bg-white flex-1 auto-rows-fr">
                    {gridCells.map((cell, i) => (
                        <div key={i} className={`min-h-[120px] border-b border-r border-slate-100 p-2 relative group transition-colors ${cell ? 'hover:bg-slate-50/50' : 'bg-slate-50/30'}`}>
                            {cell && (
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-sm font-medium inline-block w-7 h-7 rounded-full flex items-center justify-center ${
                                            new Date().toDateString() === new Date(cell.dateStr).toDateString()
                                            ? 'bg-indigo-600 text-white shadow-md' 
                                            : 'text-slate-700'
                                        }`}>
                                            {cell.day}
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-1.5 overflow-y-auto max-h-[100px] custom-scrollbar">
                                        {cell.events.map((ev: any) => (
                                            <div 
                                                key={ev.id} 
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setSelectedEvent(ev);
                                                    }
                                                }}
                                                className={`text-xs px-2 py-1.5 rounded-md truncate font-medium cursor-pointer transition-all hover:scale-[1.02] shadow-sm border border-transparent hover:border-black/5 ${
                                                    ev.is_public 
                                                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white' 
                                                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                                }`}
                                                title={ev.title}
                                            >
                                                {ev.time && <span className="opacity-75 mr-1 text-[10px]">{ev.time.substring(0,5)}</span>}
                                                {ev.title}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    
                    {/* Fill remaining grid cells to make it look complete if last row is not full */}
                    {[...new Array(7 - (gridCells.length % 7 || 7))].map((_, i) => (
                         <div key={`empty-end-${i}`} className="bg-slate-50/30 border-b border-r border-slate-100"></div>
                    ))}
                </div>
            )}
        </Card>
    </div>
  );
};

export default CalendarPage;
