
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, Save, LogOut, Loader2, 
  UploadCloud, Globe, Instagram, Youtube, 
  Linkedin, Twitter, Chrome, Trash2,
  Plus, MoreHorizontal,
  CheckCircle2, ShieldCheck
} from 'lucide-react';
import { Button, Input } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase, getErrorMessage, getStorageUrl } from '../services/supabaseClient';

const ProfileSettings: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'akun' | 'preferensi' | 'pembayaran'>('akun');
  
  // Loading States
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  
  // Profile Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Social Links
  const [socials, setSocials] = useState({
    instagram: '',
    x: '',
    youtube: '',
    tiktok: '',
    linkedin: '',
    website: ''
  });


  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      
      // Split name
      const names = metaName.split(' ');
      setFirstName(names[0] || '');
      setLastName(names.slice(1).join(' ') || '');
      
      setUsername(user.user_metadata?.username || '');
      setBio(user.user_metadata?.bio || '');
      setPhone(user.user_metadata?.phone || '');
      
      if (user.user_metadata?.socials) {
          setSocials(user.user_metadata.socials);
      }
      
      if (user.user_metadata?.avatar_url) {
          setAvatarUrl(user.user_metadata.avatar_url);
      }
    }

  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const updatedFullName = `${firstName} ${lastName}`.trim();

    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
            full_name: updatedFullName,
            username,
            bio,
            socials,
            phone
        }
      });

      if (error) throw error;
      
      if (user) {
          await supabase.from('profiles').update({ 
              full_name: updatedFullName,
              avatar_url: avatarUrl 
          }).eq('id', user.id);
      }

      showToast('Profil berhasil diperbarui!', 'success');
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const randomValues = new Uint32Array(1);
      crypto.getRandomValues(randomValues);
      const fileName = `${user?.id}-${randomValues[0]}.${fileExt}`;
      const filePath = `${fileName}`;

      setLoading(true);
      try {
          if (!user) throw new Error('User not authenticated');
          const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
          if (uploadError) throw uploadError;
          const publicUrl = getStorageUrl(filePath, 'avatars');
          const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
          if (updateError) throw updateError;
          await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
          setAvatarUrl(publicUrl);
          showToast('Photo profil berhasil diupload!', 'success');
          setTimeout(() => window.location.reload(), 1500);
      } catch (error: unknown) {
          showToast('Gagal upload: ' + getErrorMessage(error), 'error');
      } finally {
          setLoading(false);
      }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    if (newPassword !== confirmPassword) {
        showToast('Konfirmasi password tidak cocok.', 'error');
        return;
    }
    if (newPassword.length < 6) {
        showToast('Password minimal 6 karakter.', 'error');
        return;
    }
    setPassLoading(true);
    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        showToast('Password berhasil diperbarui!', 'success');
        setNewPassword('');
        setConfirmPassword('');
    } catch (err: unknown) {
        showToast(getErrorMessage(err), 'error');
    } finally {
        setPassLoading(false);
    }
  };


  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'APAKAH ANDA YAKIN? Tindakan ini akan MENGHAPUS SEMUA DATA LOGIN DAN PROFIL ANDA secara permanen dari UNUGHA Event.'
    );
    
    if (confirmed) {
      setLoading(true);
      try {
        // Call the RPC function created in Supabase Dashboard
        const { error: rpcError } = await supabase.rpc('delete_user_account');
        
        if (rpcError) throw rpcError;

        showToast('Akun Anda telah dihapus secara permanen.', 'success');
        
        // Wait a bit for toast, then logout and navigate
        setTimeout(async () => {
            await signOut();
            navigate('/');
        }, 1500);
        
      } catch (err: unknown) {
        showToast('Gagal menghapus akun: ' + getErrorMessage(err), 'error');
        setLoading(false);
      }
    }
  };

  const displayAvatar = avatarUrl 
      ? avatarUrl 
      : `https://api.dicebear.com/9.x/adventurer/svg?seed=${user?.email}&backgroundColor=b6e3f4`;

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">Pengaturan</h1>
          <div className="flex gap-8 border-b border-slate-200 pb-px">
            {['Akun', 'Preferensi', 'Pembayaran'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase() as 'akun' | 'preferensi' | 'pembayaran')}
                className={`pb-3 text-sm font-bold transition-all relative ${
                  activeTab === tab.toLowerCase() ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab}
                {activeTab === tab.toLowerCase() && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </header>

        {activeTab === 'akun' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Section: Your Profile */}
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Profil Anda</h2>
                <p className="text-sm text-slate-500 mt-1">Pilih bagaimana Anda ditampilkan sebagai tuan rumah atau tamu.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 items-start">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Depan</label>
                       <input 
                         type="text" 
                         value={firstName}
                         onChange={(e) => setFirstName(e.target.value)}
                         className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 placeholder:text-slate-300 transition-all shadow-sm"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Belakang</label>
                       <input 
                         type="text" 
                         value={lastName}
                         onChange={(e) => setLastName(e.target.value)}
                         className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 placeholder:text-slate-300 transition-all shadow-sm"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Pengguna</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                      <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 placeholder:text-slate-300 transition-all shadow-sm"
                        placeholder="nama-pengguna"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bio</label>
                    <textarea 
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 placeholder:text-slate-300 transition-all shadow-sm resize-none"
                      placeholder="Bagikan sedikit tentang latar belakang dan minat Anda."
                    />
                  </div>
                </div>

                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest self-start md:self-center">Foto Profil</label>
                  <div className="relative group">
                    <div className="w-36 h-36 rounded-[40px] border-8 border-white overflow-hidden bg-indigo-50 shadow-xl shadow-indigo-500/10 transition-transform group-hover:scale-105 duration-500">
                      <img src={displayAvatar} className="w-full h-full object-cover" alt="Profile" />
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 p-3 bg-indigo-600 text-white rounded-2xl shadow-lg ring-4 ring-white hover:bg-indigo-700 transition-all hover:rotate-12"
                    >
                      <UploadCloud size={18} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-4 pt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tautan Sosial</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'instagram', icon: Instagram, prefix: 'instagram.com/' },
                    { id: 'x', icon: Twitter, prefix: 'x.com/' },
                    { id: 'youtube', icon: Youtube, prefix: 'youtube.com/@' },
                    { id: 'tiktok', icon: Globe, prefix: 'tiktok.com/@' },
                    { id: 'linkedin', icon: Linkedin, prefix: 'linkedin.com/in/' },
                    { id: 'website', icon: Globe, placeholder: 'Situs web Anda' },
                  ].map((social) => (
                    <div key={social.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3.5 hover:border-indigo-200 transition-all shadow-sm focus-within:ring-4 focus-within:ring-indigo-500/5">
                      <social.icon size={18} className="text-slate-400" />
                      {social.prefix && <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">{social.prefix}</span>}
                      <input 
                        type="text" 
                        placeholder={social.placeholder || 'nama pengguna'}
                        value={(socials as Record<string, string>)[social.id] || ''}
                        onChange={(e) => setSocials(prev => ({ ...prev, [social.id]: e.target.value }))}
                        className="bg-transparent border-none text-sm font-medium focus:outline-none text-slate-900 w-full placeholder:text-slate-200"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={loading}
                  className="bg-indigo-600 text-white hover:bg-indigo-700 border-none px-6 py-4 rounded-xl font-bold text-sm flex gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Simpan Perubahan
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="text-slate-500 hover:text-red-500 hover:bg-red-50 border-none px-6 py-4 rounded-xl font-semibold flex gap-2"
                >
                  <LogOut size={18} /> Keluar
                </Button>
              </div>
            </section>

            <div className="h-px bg-slate-200 w-full"></div>

            {/* Section: Email */}
            <section className="space-y-6">
               <div className="flex justify-between items-center">
                 <h2 className="text-xl font-black text-slate-900">Email</h2>
                 <Button variant="secondary" className="bg-slate-100 border-none text-[11px] text-slate-600 font-bold uppercase tracking-wider px-4 py-2 rounded-lg hover:bg-slate-200 shadow-sm transition-colors">
                   <Plus size={14} className="mr-1.5" /> Tambah
                 </Button>
               </div>
               <p className="text-sm text-slate-500">Email tambahan untuk menerima undangan acara.</p>
               
               <div className="bg-white border border-slate-100 rounded-[32px] p-8 flex justify-between items-center group shadow-sm hover:shadow-md transition-all">
                 <div className="space-y-2">
                   <div className="flex items-center gap-3">
                     <span className="text-base font-bold text-slate-900">{email}</span>
                     <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg uppercase tracking-widest">Utama</span>
                   </div>
                   <p className="text-xs text-slate-400">Email yang dibagikan dengan penyelenggara saat pendaftaran.</p>
                 </div>
                 <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                    <MoreHorizontal size={20} />
                 </button>
               </div>
            </section>

            <div className="h-px bg-slate-200 w-full"></div>

            {/* Section: Phone */}
            <section className="space-y-6">
               <h2 className="text-xl font-black text-slate-900">Nomor Telepon</h2>
               <p className="text-sm text-slate-500">Kelola nomor telepon untuk masuk dan SMS.</p>
               
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor HP</label>
                 <div className="flex flex-col sm:flex-row gap-4 max-w-lg">
                   <div className="relative flex-grow">
                     <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-900 font-black">+62</span>
                     <input 
                       type="text" 
                       value={phone}
                       onChange={(e) => setPhone(e.target.value)}
                       className="w-full bg-white border border-slate-200 rounded-[20px] pl-14 pr-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 shadow-sm"
                       placeholder="8xx xxxx xxxx"
                     />
                   </div>
                   <Button variant="secondary" className="bg-slate-900 text-white hover:bg-slate-800 border-none px-6 rounded-xl font-bold text-xs uppercase tracking-wider h-12 transition-all active:scale-95">Perbarui</Button>
                 </div>
               </div>
            </section>

            <div className="h-px bg-slate-200 w-full"></div>

            {/* Section: Password & Security */}
            <section className="space-y-6">
              <h2 className="text-xl font-black text-slate-900">Keamanan</h2>
              <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden divide-y divide-slate-50 shadow-sm">
                <div className="p-8 flex justify-between items-center group">
                  <div className="flex gap-5">
                    <div className="w-14 h-14 bg-indigo-50 rounded-[22px] text-indigo-600 flex items-center justify-center shadow-inner"><Lock size={22} /></div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Ubah Password</h4>
                      <p className="text-sm text-slate-400 mt-1">Gunakan formulir di bawah untuk mengganti password.</p>
                    </div>
                  </div>
                </div>

                <div className="p-10 space-y-6 bg-slate-50/30">
                  <form onSubmit={handleUpdatePassword} className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input 
                            id="newPassword"
                            label="Password Baru" 
                            type="password" 
                            placeholder="Min. 6 karakter" 
                            icon={Lock}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-white border-slate-200 text-slate-900 h-14 rounded-2xl"
                        />
                        <Input 
                            id="confirmPassword"
                            label="Konfirmasi Password" 
                            type="password" 
                            placeholder="Ulangi password" 
                            icon={Lock}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="bg-white border-slate-200 text-slate-900 h-14 rounded-2xl"
                        />
                     </div>
                     <Button type="submit" variant="secondary" disabled={passLoading} className="bg-slate-900 text-white hover:bg-slate-800 border-none font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg shadow-slate-900/10 transition-all active:scale-95">
                        {passLoading ? <Loader2 className="animate-spin" /> : 'Update Password'}
                     </Button>
                  </form>
                </div>
              </div>
            </section>

             <div className="h-px bg-slate-200 w-full"></div>

            {/* Section: Third-party Accounts */}
            <section className="space-y-6">
               <h2 className="text-xl font-black text-slate-900">Koneksi Akun</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { id: 'google', name: 'Google', connected: true, info: email },
                    { id: 'apple', name: 'Apple', connected: false, info: 'Link Account' },
                    { id: 'zoom', name: 'Zoom', connected: false, info: 'Link Account' }
                  ].map((app) => (
                    <div key={app.id} className="bg-white border border-slate-100 rounded-[32px] p-6 flex flex-col gap-6 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
                      <div className="flex items-center justify-between">
                         <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-lg text-slate-900">
                           {app.name[0]}
                         </div>
                         <div className={`p-2.5 rounded-xl transition-all ${app.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                           {app.connected ? <CheckCircle2 size={18} /> : <Plus size={18} />}
                         </div>
                      </div>
                      <div>
                         <h4 className="text-base font-bold text-slate-900">{app.name}</h4>
                         <p className="text-xs font-medium text-slate-400 mt-1">{app.info}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </section>

            <div className="h-px bg-slate-200 w-full"></div>

            {/* Section: Active Devices */}
            <section className="space-y-6">
               <h2 className="text-xl font-black text-slate-900">Perangkat</h2>
               <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden divide-y divide-slate-50 shadow-sm">
                 <div className="p-8 flex justify-between items-center group">
                    <div className="flex gap-5">
                      <div className="w-14 h-14 bg-indigo-50 rounded-[22px] text-indigo-600 flex items-center justify-center shadow-inner"><Chrome size={22} /></div>
                      <div>
                        <div className="flex items-center gap-3">
                           <h4 className="text-base font-bold text-slate-900">Chrome on Windows</h4>
                           <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg tracking-widest uppercase">Current</span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">Yogyakarta, Indonesia</p>
                      </div>
                    </div>
                    <button className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
                 </div>
               </div>
            </section>

            <div className="h-px bg-slate-200 w-full"></div>

            {/* Section: Danger Zone */}
            <section className="space-y-6 pt-10 pb-20">
               <h2 className="text-xl font-black text-red-500 uppercase tracking-widest">Danger Zone</h2>
               <div className="bg-red-50/30 border border-red-100 rounded-[32px] p-8 md:p-12 space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-left">
                       <h3 className="text-xl font-black text-red-600">Hapus Akun Permanen</h3>
                       <p className="text-slate-500 text-sm mt-2 max-w-md">Menghapus akun akan menghilangkan semua data pendaftaran, biodata, dan histori event kamu selamanya.</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={handleDeleteAccount}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-white border-none rounded-xl px-8 py-4 font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-500/10 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Trash2 size={16} className="mr-2" />}
                      Hapus Sekarang
                    </Button>
                  </div>
               </div>
            </section>

          </div>
        )}

        {activeTab !== 'akun' && (
          <div className="py-32 text-center animate-in fade-in duration-500">
             <div className="w-24 h-24 bg-white rounded-[40px] shadow-xl shadow-indigo-500/5 flex items-center justify-center mx-auto mb-8 text-indigo-500 border border-slate-50">
               <ShieldCheck size={40} />
             </div>
             <h3 className="text-2xl font-black text-slate-900 mb-2">Halaman {activeTab}</h3>
             <p className="text-slate-500 max-w-xs mx-auto font-medium">Fitur ini sedang dalam pengembangan untuk sistem UNUGHA.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProfileSettings;
