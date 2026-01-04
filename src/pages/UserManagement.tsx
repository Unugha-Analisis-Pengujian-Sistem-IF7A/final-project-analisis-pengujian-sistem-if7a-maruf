
import React, { useEffect, useState } from 'react';
import { 
    Users, Search, ShieldAlert, RefreshCw, UserCog
} from 'lucide-react';
import { Card, Badge, Button, Input } from '../components/UI';
import { supabase, getErrorMessage } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

const UserManagement: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [stats, setStats] = useState({ users: 0, admins: 0, organizers: 0 });
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'organizer' | 'participant'>('all');

    useEffect(() => {
        fetchData();
        
        const profilesChannel = supabase.channel('users-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(profilesChannel);
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Counts
            const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: activeAdmins } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
            const { count: activeOrganizers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'organizer');
            
            setStats({ 
                users: totalUsers || 0, 
                admins: activeAdmins || 0,
                organizers: activeOrganizers || 0
            });

            // Fetch All Users
            const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
            setAllUsers(data || []);
        } catch {
            // console.error("Error fetching users", error);
            // Ignore for security
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRole = async (userId: string, newRole: string) => {
        if (userId === currentUser?.id) {
            alert("Anda tidak dapat mengubah role akun Anda sendiri demi keamanan.");
            return;
        }

        const confirmChange = confirm(`Apakah anda yakin ingin mengubah akses user ini menjadi ${newRole.toUpperCase()}?`);
        if (!confirmChange) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);
            
            if (error) throw error;
        } catch (e: any) {
            alert("Gagal mengubah role: " + getErrorMessage(e));
        }
    };

    const filteredUsers = allUsers.filter(u => 
        (roleFilter === 'all' || u.role === roleFilter) &&
        (
            (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (u.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (u.role?.toLowerCase().includes(searchTerm.toLowerCase()))
        )
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Users className="text-indigo-600" /> Manajemen User
                    </h1>
                    <p className="text-slate-500 mt-1">Kelola akses, role, dan akun pengguna dalam system.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={fetchData} className="gap-2">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh Data
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-l-4 border-l-slate-800 bg-slate-900 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl"><Users size={24} /></div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total User</p>
                            <h3 className="text-2xl font-bold">{stats.users}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 border-l-4 border-l-red-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><ShieldAlert size={24} /></div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Administrator</p>
                            <h3 className="text-2xl font-bold text-slate-900">{stats.admins}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 border-l-4 border-l-indigo-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><UserCog size={24} /></div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Organizer</p>
                            <h3 className="text-2xl font-bold text-slate-900">{stats.organizers}</h3>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters & Actions */}
            <Card className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white shadow-sm border border-slate-100 rounded-2xl">
                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
                    <button 
                        onClick={() => setRoleFilter('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${roleFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                        Semua Role
                    </button>
                    <button 
                        onClick={() => setRoleFilter('admin')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${roleFilter === 'admin' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                    >
                        Admin
                    </button>
                    <button 
                        onClick={() => setRoleFilter('organizer')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${roleFilter === 'organizer' ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                    >
                        Organizer
                    </button>
                    <button 
                        onClick={() => setRoleFilter('participant')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${roleFilter === 'participant' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                    >
                        Participant
                    </button>
                </div>
                
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Cari nama, email, atau ID..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </Card>

            {/* Data Table */}
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Informasi User</th>
                                <th className="px-6 py-4">Role Saat Ini</th>
                                <th className="px-6 py-4">ID Database</th>
                                <th className="px-6 py-4 text-center">Ubah Akses</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search size={32} className="opacity-20" />
                                            <p>Tidak ada data user yang ditemukan.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200 overflow-hidden shrink-0">
                                                    {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="Avatar" /> : (u.full_name?.charAt(0).toUpperCase() || 'U')}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-slate-900 text-sm">{u.full_name || 'Anonymous'}</p>
                                                        {currentUser?.id === u.id && (
                                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">YOU</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400">{u.email || 'No Email'}</p>
                                                    <p className="text-[10px] text-slate-300 mt-0.5">Joined: {new Date(u.created_at).toLocaleDateString('id-ID')}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge 
                                                status={u.role || 'participant'} 
                                                className={
                                                    u.role === 'admin' ? 'bg-red-50 text-red-700 border-red-100' : 
                                                    u.role === 'organizer' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 
                                                    'bg-slate-50 text-slate-600 border-slate-100'
                                                }
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[10px] text-slate-400 select-all">
                                            {u.id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-1.5">
                                                <button 
                                                    onClick={() => handleUpdateRole(u.id, 'admin')}
                                                    className={`p-2 rounded-lg transition-colors ${u.role === 'admin' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-red-50 text-red-600 hover:bg-red-100 hover:scale-105'}`}
                                                    disabled={u.role === 'admin'}
                                                    title="Set as Admin"
                                                >
                                                    <ShieldAlert size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateRole(u.id, 'organizer')}
                                                    className={`p-2 rounded-lg transition-colors ${u.role === 'organizer' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-105'}`}
                                                    disabled={u.role === 'organizer'}
                                                    title="Set as Organizer"
                                                >
                                                    <UserCog size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateRole(u.id, 'participant')}
                                                    className={`p-2 rounded-lg transition-colors ${u.role === 'participant' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105'}`}
                                                    disabled={u.role === 'participant'}
                                                    title="Set as Participant"
                                                >
                                                    <Users size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
