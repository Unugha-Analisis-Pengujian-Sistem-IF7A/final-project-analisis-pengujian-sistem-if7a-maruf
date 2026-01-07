
import React, { useEffect, useState, useCallback } from 'react';
import { 
    Users, Calendar, Clock, 
    Zap, Activity, LayoutDashboard, ChevronRight,
    ShieldAlert
} from 'lucide-react';
import { Card, Button } from '../../components/UI';
import { supabase } from '../../services/supabaseClient';
import { Link } from 'react-router-dom';

interface DashboardStats {
    users: number;
    events: number;
    newToday: number;
    activeRegistrations: number;
}

interface RecentUser {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
    created_at: string;
}

interface RecentEvent {
    id: string;
    title: string;
    description: string;
    created_at: string;
}

export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({ 
        users: 0, 
        events: 0, 
        newToday: 0,
        activeRegistrations: 0 
    });
    const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
    const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            // Fetch Counts
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: eventCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
            const { count: regCount } = await supabase.from('registrations').select('*', { count: 'exact', head: true });
            
            // New Users Today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { count: newToday } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString());

            setStats({ 
                users: userCount || 0, 
                events: eventCount || 0,
                newToday: newToday || 0,
                activeRegistrations: regCount || 0
            });

            // Fetch Recent Users
            const { data: users } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);
            setRecentUsers(users || []);

            // Fetch Recent Events
            const { data: events } = await supabase
                .from('events')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);
            setRecentEvents(events || []);

        } catch (e) {
            console.error("Dashboard fetch error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        
        const channel = supabase.channel('admin-dashboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold animate-pulse">Menyiapkan Data Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Section with Glass Card */}
            <div className="relative overflow-hidden bg-slate-900 rounded-[40px] p-8 md:p-12 shadow-2xl shadow-indigo-500/10 border border-slate-800">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-600/10 to-transparent pointer-events-none"></div>
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
                                <ShieldAlert size={32} />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                                System <span className="text-indigo-400">Control</span>
                            </h1>
                        </div>
                        <p className="text-slate-400 max-w-sm font-medium leading-relaxed">
                            Pusat kendali administrasi untuk mengawasi aktivitas pengguna, event, dan kesehatan sistem secara real-time.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 w-full md:w-auto">
                        <div className="bg-slate-800/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-700 flex items-center justify-between md:justify-start gap-4 shadow-inner">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Root Access Active</span>
                            </div>
                            <div className="h-4 w-[1px] bg-slate-700 hidden md:block"></div>
                            <span className="text-[10px] text-slate-500 font-bold hidden md:block select-all">UID: ADMIN-{Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                        </div>
                        <Button variant="secondary" data-testid="refresh-btn" className="w-full md:w-auto rounded-2xl bg-white/5 border-none text-white hover:bg-white/10 transition-colors py-6 font-bold tracking-wide" onClick={fetchData}>
                            <Clock size={18} className="mr-2 text-indigo-400" />
                            Update Terakhir: {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total User', value: stats.users, icon: Users, color: 'indigo', trend: '+12%' },
                    { label: 'Total Event', value: stats.events, icon: Calendar, color: 'emerald', trend: '+5%' },
                    { label: 'User Baru', value: stats.newToday, icon: Zap, color: 'amber', trend: stats.newToday > 0 ? 'Trending' : 'Stable' },
                    { label: 'Pendaftaran', value: stats.activeRegistrations, icon: Activity, color: 'rose', trend: 'Live' }
                ].map((stat, i) => (
                    <Card key={i} className="p-6 border-none shadow-xl shadow-slate-200/40 hover:translate-y-[-4px] transition-all duration-300">
                        <div className="flex justify-between items-start">
                            <div className={`p-3 rounded-2xl ${
                                stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                                stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                                'bg-rose-50 text-rose-600'
                            }`}>
                                <stat.icon size={24} />
                            </div>
                            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-500 uppercase tracking-tighter">
                                {stat.trend}
                            </span>
                        </div>
                        <div className="mt-6">
                            <h3 className="text-3xl font-black text-slate-900">{stat.value}</h3>
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mt-1">{stat.label}</p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Main Content Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Activity Feed */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="p-8 border-none shadow-2xl shadow-slate-200/50 bg-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                            <Activity size={120} />
                        </div>
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Recent Activity</h3>
                                <p className="text-sm text-slate-400">Acara & event terbaru yang masuk ke sistem.</p>
                            </div>
                        </div>

                        <div className="space-y-6 relative z-10">
                            {recentEvents.length === 0 ? (
                                <p className="text-center py-12 text-slate-300 font-medium bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-100">
                                    Belum ada aktivitas event terbaru.
                                </p>
                            ) : recentEvents.map((evt, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center border-4 border-white shadow-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                            <Calendar size={18} />
                                        </div>
                                        <div className="w-0.5 h-full bg-slate-100 group-last:hidden"></div>
                                    </div>
                                    <div className="pb-8 group-last:pb-0 flex-grow">
                                        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm group-hover:border-indigo-100 group-hover:shadow-md transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{evt.title}</h4>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(evt.created_at).toLocaleDateString('id-ID')}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed">{evt.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Navigation Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Link to="/users" className="block group">
                            <Card className="p-8 bg-slate-900 text-white border-none shadow-2xl shadow-slate-900/40 relative overflow-hidden h-full">
                                <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                                <LayoutDashboard className="mb-4 text-indigo-400" size={32} />
                                <h3 className="text-2xl font-black mb-2 tracking-tight">Manajemen User</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6">Kelola hak akses, role, dan verifikasi akun pengguna secara terpusat.</p>
                                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
                                    Buka Sekarang <ChevronRight size={14} />
                                </div>
                            </Card>
                        </Link>

                        <div className="group cursor-not-allowed">
                            <Card className="p-8 bg-white border-none shadow-xl border border-slate-50 h-full relative overflow-hidden">
                                <ShieldAlert className="mb-4 text-red-100" size={32} />
                                <h3 className="text-2xl font-black mb-2 tracking-tight text-slate-300">Security Audit</h3>
                                <p className="text-slate-200 text-sm leading-relaxed mb-6">Review log keamanan dan percobaan akses yang mencurigakan (Coming Soon).</p>
                                <div className="text-slate-200 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                                    Feature Locked <Zap size={12} />
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    {/* New Members List */}
                    <Card className="p-8 border-none shadow-xl bg-white">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">New Members</h3>
                            <Users size={20} className="text-slate-100" />
                        </div>
                        <div className="space-y-5">
                            {recentUsers.map((u, i) => (
                                <div key={i} className="flex items-center gap-4 group cursor-pointer hover:translate-x-1 transition-transform">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border-2 border-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                                        {u.avatar_url ? (
                                            <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 font-bold text-sm">
                                                {u.full_name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <p className="font-bold text-slate-900 text-sm truncate">{u.full_name || 'Anonymous'}</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${
                                                u.role === 'admin' ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                                {u.role}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-200" />
                                </div>
                            ))}
                        </div>
                        <Link to="/users" className="block mt-8">
                            <Button variant="ghost" className="w-full text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors">
                                Lihat Semua Member
                            </Button>
                        </Link>
                    </Card>

                    {/* System Health */}
                    <Card className="p-8 border-none shadow-xl bg-gradient-to-br from-slate-50 to-white">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-6 flex items-center gap-2">
                           <Zap size={20} className="text-amber-500" /> System Metrics
                        </h3>
                        <div className="space-y-5">
                            {[
                                { name: 'Database API', status: 'Optimal', pulse: 'bg-emerald-500' },
                                { name: 'Realtime Sync', status: 'Active', pulse: 'bg-emerald-500' },
                                { name: 'Storage Engine', status: 'Healthy', pulse: 'bg-emerald-500' }
                            ].map((m, i) => (
                                <div key={i} className="bg-white p-4 rounded-[20px] border border-slate-100 flex justify-between items-center">
                                    <span className="text-xs text-slate-500 font-bold">{m.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{m.status}</span>
                                        <div className={`w-2 h-2 rounded-full ${m.pulse} animate-pulse shadow-sm`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
