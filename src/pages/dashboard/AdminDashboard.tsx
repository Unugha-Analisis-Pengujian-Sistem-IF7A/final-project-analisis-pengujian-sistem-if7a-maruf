
import React, { useEffect, useState } from 'react';
import { 
    Users, Calendar, ShieldAlert, Search, 
    RefreshCw
} from 'lucide-react';
import { Card, Badge, Button } from '../../components/UI';
import { supabase, getErrorMessage } from '../../services/supabaseClient';

export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({ users: 0, events: 0 });
    const [loading, setLoading] = useState(true);
    
    // Data States
    interface UserProfile {
        id: string;
        email?: string;
        full_name?: string;
        avatar_url?: string;
        role: string;
        created_at: string;
    }
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    
    // Search & Filter
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchInitialData();
        
        // Setup Realtime Subscription
        const profilesChannel = supabase.channel('admin-realtime-profiles')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                fetchInitialData();
            })
            .subscribe();



        return () => {
            supabase.removeChannel(profilesChannel);
        };
    }, []);

    const fetchInitialData = async () => {
        try {
            // Fetch Counts
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: eventCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
            setStats({ 
                users: userCount || 0, 
                events: eventCount || 0 
            });

            // Fetch Data
            const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
            setAllUsers(users || []);



        } catch {
            // Ignore
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRole = async (userId: string, newRole: string) => {
        const confirmChange = confirm(`Ubah role user ini menjadi ${newRole.toUpperCase()}?`);
        if (!confirmChange) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);
            
            if (error) throw error;
        } catch (e) {
            alert("Gagal mengubah role: " + getErrorMessage(e));
        }
    };



    const filteredUsers = allUsers.filter(u => 
        (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.role?.toLowerCase().includes(searchTerm.toLowerCase()))
    );



    const getRoleClassName = (role: string) => {
        if (role === 'admin') return 'bg-red-50 text-red-700';
        if (role === 'organizer') return 'bg-indigo-50 text-indigo-700';
        return 'bg-slate-100 text-slate-700';
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Admin Header */}
            <div className="bg-slate-950 text-white p-8 rounded-[32px] relative overflow-hidden shadow-2xl border border-slate-800">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <ShieldAlert className="text-red-500" size={28} />
                            <h2 className="text-3xl font-bold tracking-tight">System Administration</h2>
                        </div>
                        <p className="text-slate-400 max-w-md">Akses penuh untuk manajemen User dan Role system.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700 flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                            <span className="text-sm font-bold text-slate-200">Root Access Active</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 border-l-4 border-l-indigo-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Users size={24} /></div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total User</p>
                            <h3 className="text-2xl font-bold text-slate-900">{stats.users}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 border-l-4 border-l-emerald-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Calendar size={24} /></div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Event</p>
                            <h3 className="text-2xl font-bold text-slate-900">{stats.events}</h3>
                        </div>
                    </div>
                </Card>

            </div>

            {/* Management Tabs */}
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center justify-between p-6 border-b border-slate-100 gap-4">
                    <div className="flex p-1 bg-slate-100 rounded-2xl w-full sm:w-auto">
                        <button 
                            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold bg-white text-indigo-600 shadow-sm"
                        >
                            Manajemen User
                        </button>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Cari data..." 
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <Button variant="secondary" onClick={fetchInitialData} className="w-[42px] h-[42px] p-0 rounded-xl border-slate-200 flex items-center justify-center" aria-label="Refresh Data" data-testid="refresh-btn">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </Button>
                    </div>
                </div>

                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4" data-testid="user-table-header">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200 overflow-hidden">
                                                {u.avatar_url ? <img src={u.avatar_url} alt={u.full_name || 'Avatar'} className="w-full h-full object-cover" /> : (u.full_name?.charAt(0) || 'U')}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{u.full_name || 'No Name'}</p>
                                                <p className="text-xs text-slate-400">{u.email || u.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge 
                                            status={u.role || 'participant'} 
                                            className={getRoleClassName(u.role)}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-500">{new Date(u.created_at).toLocaleDateString()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <select 
                                                className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                value={u.role}
                                                onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                            >
                                                <option value="participant">Participant</option>
                                                <option value="organizer">Organizer</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
