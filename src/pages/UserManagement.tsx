
import React, { useEffect, useState, useCallback } from 'react';
import { 
    Users, Search, ShieldAlert, RefreshCw, UserPlus, Trash2, X, Check, Loader2, Mail, Lock, User
} from 'lucide-react';
import { Card, Badge, Button, Input, Modal } from '../components/UI';
import { supabase, getErrorMessage } from '../services/supabaseClient';
import { useAuth, UserRole } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    role: UserRole;
    avatar_url: string | null;
    created_at: string;
}

const UserManagement: React.FC = () => {
    const { user: currentUser } = useAuth();
    const { showToast } = useToast();
    const [stats, setStats] = useState({ users: 0, admins: 0, participants: 0 });
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState<Profile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'participant'>('all');
    
    // Add User Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newFullName, setNewFullName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('participant');
    const [isCreating, setIsCreating] = useState(false);

    // Delete Modal States
    const [userToDelete, setUserToDelete] = useState<{ id: string, name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Update Role Modal States
    const [roleToUpdate, setRoleToUpdate] = useState<{ id: string, name: string, role: string } | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch Counts
            const { count: totalUsers, error: err1 } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: activeAdmins, error: err2 } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
            const { count: activeParticipants, error: err3 } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'participant');
            
            if (err1 || err2 || err3) throw err1 || err2 || err3;

            setStats({ 
                users: totalUsers || 0, 
                admins: activeAdmins || 0,
                participants: activeParticipants || 0
            });

            // Fetch All Users
            const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setAllUsers(data || []);
        } catch (e: unknown) {
            console.error("Error fetching users", e);
            showToast("Gagal memuat data user: " + getErrorMessage(e), 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchData();
        
        // Use a unique channel name including timestamp to avoid conflicts on remounts
        const channelName = `users-realtime-${Date.now()}`;
        const profilesChannel = supabase.channel(channelName)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'profiles' 
            }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(profilesChannel);
        };
    }, [fetchData]);

    const handleUpdateRole = async (userId: string, newRole: string, userName: string) => {
        if (userId === currentUser?.id) {
            showToast("Anda tidak dapat mengubah role akun Anda sendiri demi keamanan.", 'error');
            return;
        }

        setRoleToUpdate({ id: userId, name: userName, role: newRole });
    };

    const confirmUpdateRole = async () => {
        if (!roleToUpdate) return;
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: roleToUpdate.role })
                .eq('id', roleToUpdate.id);
            
            if (error) throw error;
            
            await fetchData();
            showToast("Role user berhasil diperbarui!", "success");
            setRoleToUpdate(null);
        } catch (e: any) {
            showToast("Gagal mengubah role: " + getErrorMessage(e), 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (userId === currentUser?.id) {
            showToast("Anda tidak dapat menghapus akun Anda sendiri.", 'error');
            return;
        }

        setUserToDelete({ id: userId, name: userName });
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);

        try {
            // Panggil RPC admin_delete_user untuk hapus permanen dari Auth & Database
            const { error: rpcError } = await supabase.rpc('admin_delete_user', { 
                target_user_id: userToDelete.id 
            });
            
            if (rpcError) throw rpcError;

            showToast(`User ${userToDelete.name} beserta seluruh datanya berhasil dihapus secara permanen.`, 'success');
            setAllUsers(prev => prev.filter(u => u.id !== userToDelete.id)); 
            await fetchData();
            setUserToDelete(null);
        } catch (e: unknown) {
            const errorMsg = getErrorMessage(e);
            
            if (errorMsg.includes('foreign key')) {
                showToast("Gagal: User memiliki data terkait (Event/Peserta) yang tidak bisa dihapus otomatis.", 'error');
            } else {
                showToast("Gagal menghapus: " + errorMsg, 'error');
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail || !newPassword || !newFullName) {
            showToast("Mohon isi semua field.", 'error');
            return;
        }

        setIsCreating(true);
        try {
            // Create a temporary client that doesn't persist session 
            // to prevent the admin from being logged out
            const { createClient } = await import('@supabase/supabase-js');
            const tempSupabase = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                { auth: { persistSession: false } }
            );

            // Sign up using temporary client
            const { data, error: signUpError } = await tempSupabase.auth.signUp({
                email: newEmail,
                password: newPassword,
                options: {
                    data: {
                        full_name: newFullName,
                        role: newRole
                    }
                }
            });

            if (signUpError) throw signUpError;

            if (data.user) {
                // Manually insert into profiles just in case trigger is slow or not present
                // (Usually there's a trigger, but being explicit here is safer for admin flow)
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: data.user.id,
                        full_name: newFullName,
                        role: newRole,
                        email: newEmail
                    });
                
                if (profileError) console.error("Profile creation delay:", profileError);
            }

            showToast("User baru berhasil didaftarkan!", "success");
            setIsAddModalOpen(false);
            setNewEmail('');
            setNewFullName('');
            setNewPassword('');
            fetchData();
        } catch (e: unknown) {
            showToast("Gagal menambahkan user: " + getErrorMessage(e), 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const filteredUsers = allUsers.filter(u => 
        (roleFilter === 'all' || u.role === roleFilter) &&
        (
            (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.role || '').toLowerCase().includes(searchTerm.toLowerCase())
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
                    <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 bg-slate-900 border-none">
                        <UserPlus size={18} /> Tambah User
                    </Button>
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
                <Card className="p-6 border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Users size={24} /></div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Participant</p>
                            <h3 className="text-2xl font-bold text-slate-900">{stats.participants}</h3>
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
                                                    u.role === 'admin' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                                                }
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[10px] text-slate-400 select-all">
                                            {u.id}
                                        </td>
                                         <td className="px-6 py-4">
                                            <div className="flex justify-center gap-1.5 align-middle">
                                                <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
                                                    <button 
                                                        onClick={() => handleUpdateRole(u.id, 'admin', u.full_name || u.email)}
                                                        className={`p-2 transition-colors border-r border-slate-100 ${u.role === 'admin' ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:bg-slate-50'}`}
                                                        disabled={u.role === 'admin'}
                                                        title="Set as Admin"
                                                    >
                                                        <ShieldAlert size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateRole(u.id, 'participant', u.full_name || u.email)}
                                                        className={`p-2 transition-colors ${u.role === 'participant' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
                                                        disabled={u.role === 'participant'}
                                                        title="Set as Participant"
                                                    >
                                                        <Users size={16} />
                                                    </button>
                                                </div>

                                                <button 
                                                    onClick={() => handleDeleteUser(u.id, u.full_name || u.email || 'Anonymous')}
                                                    className="p-2 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all"
                                                    title="Hapus Profile User"
                                                >
                                                    <Trash2 size={16} />
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

            {/* Add User Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
                    <Card className="relative w-full max-w-md p-8 animate-in zoom-in-95 duration-200 shadow-2xl border-none">
                        <button 
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <UserPlus className="text-indigo-600" /> Tambah User Baru
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Daftarkan user baru secara manual ke system.</p>
                        </div>

                        <form onSubmit={handleAddUser} className="space-y-4">
                            <Input 
                                id="newFullName"
                                label="Nama Lengkap" 
                                placeholder="Nama sesuai KTM/Identitas" 
                                icon={User}
                                value={newFullName}
                                onChange={(e) => setNewFullName(e.target.value)}
                                required
                            />
                            <Input 
                                id="newEmail"
                                label="Email" 
                                type="email"
                                placeholder="mahasiswa@unugha.ac.id" 
                                icon={Mail}
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                required
                            />
                            <Input 
                                id="newPassword"
                                label="Password Sementara" 
                                type="password"
                                placeholder="Minimal 6 karakter" 
                                icon={Lock}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                            />

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">Role Awal</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['participant', 'admin'] as const).map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setNewRole(r)}
                                            className={`py-2 px-1 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                                                newRole === r 
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                                            }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button 
                                    type="button" 
                                    variant="secondary" 
                                    className="flex-1" 
                                    onClick={() => setIsAddModalOpen(false)}
                                >
                                    Batal
                                </Button>
                                <Button 
                                    type="submit" 
                                    className="flex-1"
                                    disabled={isCreating}
                                >
                                    {isCreating ? <Loader2 className="animate-spin" /> : (
                                        <span className="flex items-center gap-2"><Check size={18} /> Simpan</span>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Role Update Confirmation Modal */}
            <Modal 
                isOpen={!!roleToUpdate} 
                onClose={() => setRoleToUpdate(null)} 
                title="Konfirmasi Perubahan Role"
            >
                <div className="space-y-4">
                    <p className="text-slate-600">
                        Apakah Anda yakin ingin mengubah role <strong>{roleToUpdate?.name}</strong> menjadi <span className="text-indigo-600 font-bold uppercase">{roleToUpdate?.role}</span>?
                    </p>
                    <div className="flex gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setRoleToUpdate(null)} className="flex-1">Batal</Button>
                        <Button onClick={confirmUpdateRole} disabled={isUpdating} className="flex-1">
                            {isUpdating ? <Loader2 className="animate-spin" /> : 'Ya, Ubah Role'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete User Confirmation Modal */}
            <Modal 
                isOpen={!!userToDelete} 
                onClose={() => setUserToDelete(null)} 
                title="Hapus Profile User"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-red-800 text-sm flex gap-2">
                            <ShieldAlert className="shrink-0" size={18} />
                            <span><strong>PERINGATAN:</strong> User ini akan dihapus secara <strong>PERMANEN</strong> dari database UNUGHA, termasuk akses log-in mereka.</span>
                        </p>
                    </div>
                    <p className="text-slate-600">
                        Apakah Anda yakin ingin menghapus profil <strong>{userToDelete?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="flex gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setUserToDelete(null)} className="flex-1">Batal</Button>
                        <Button 
                            onClick={confirmDeleteUser} 
                            disabled={isDeleting} 
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none"
                        >
                            {isDeleting ? <Loader2 className="animate-spin" /> : 'Ya, Hapus Profile'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default UserManagement;
