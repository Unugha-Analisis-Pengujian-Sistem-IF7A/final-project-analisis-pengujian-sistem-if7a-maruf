
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, AlertTriangle, ArrowLeft, CheckCircle2, ShieldCheck, User, Wifi, WifiOff } from 'lucide-react';
import { Button, Input, Card } from '../components/UI';
import { supabase, getErrorMessage } from '../services/supabaseClient';

interface LoginProps {
  adminOnly?: boolean;
}

const Login: React.FC<LoginProps> = ({ adminOnly = false }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' && !adminOnly ? 'register' : 'login';
  
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // Check if we can at least ping the database
      const { error } = await supabase.from('events').select('id', { count: 'exact', head: true });
      if (error && (error.code === 'PGRST301' || error.message.includes('apiKey'))) {
          setIsDbConnected(false);
          return;
      }
      setIsDbConnected(true);
    } catch (e) {
      setIsDbConnected(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResetSuccess(false);

    try {
        if (mode === 'login') {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });
            
            if (error) {
                if (error.message === 'Invalid login credentials') {
                    throw new Error('Kredensial login salah atau akun belum terverifikasi.');
                }
                throw error;
            }
            
            if (data.user) {
                // Check Role for Admin Login
                if (adminOnly) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', data.user.id)
                        .single();
                    
                    if (profile?.role !== 'admin') {
                         await supabase.auth.signOut();
                         throw new Error('AKSES DITOLAK: Akun Anda bukan Administrator.');
                    }
                }

                // Redirect logic
                navigate('/dashboard');
            }
        } 
        else if (mode === 'register') {
            const { error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        full_name: email.split('@')[0],
                        role: 'participant'
                    }
                }
            });
            if (error) throw error;
            alert('Registrasi berhasil! Silakan login.');
            setMode('login');
        }
        else if (mode === 'forgot') {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: window.location.origin + '/#/settings', 
            });
            if (error) throw error;
            setResetSuccess(true);
        }
    } catch (err: any) {
        setError(getErrorMessage(err));
    } finally {
        setIsLoading(false);
    }
  };

  const getHeader = () => {
      if (adminOnly) return { title: 'Admin Portal', desc: 'Login khusus Administrator System' };
      if (mode === 'forgot') return { title: 'Reset Password', desc: 'Masukkan email untuk instruksi reset.' };
      if (mode === 'register') return { title: 'Daftar Akun Baru', desc: 'Mulai perjalanan organisasimu di sini' };
      return { title: 'Selamat Datang Kembali', desc: 'Masuk untuk mengelola event kampusmu' };
  };

  const header = getHeader();

  return (
    <div className="w-full max-w-md relative z-10 py-10">
        <Card glass className={`relative p-8 md:p-10 shadow-2xl overflow-hidden ${adminOnly ? 'border-t-4 border-t-red-600' : ''}`}>
            {/* Header */}
            <div className="text-center mb-8">
                <div className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl shadow-lg ${adminOnly ? 'bg-slate-900 shadow-slate-500/30' : 'bg-indigo-600 shadow-indigo-500/30'}`}>
                    {adminOnly ? <ShieldCheck size={24} /> : 'U'}
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{header.title}</h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                    <p className="text-slate-500 text-sm">{header.desc}</p>
                    <div title={isDbConnected ? "Connected" : "Disconnected"}>
                        {isDbConnected === true ? <Wifi size={12} className="text-green-500" /> : isDbConnected === false ? <WifiOff size={12} className="text-red-500" /> : null}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl">
                        <div className="flex gap-2 font-bold mb-1 text-xs items-center">
                            <AlertTriangle size={14} className="shrink-0" />
                            GAGAL LOGIN
                        </div>
                        <p className="text-xs leading-relaxed">{error}</p>
                    </div>
                </div>
            )}

            {resetSuccess ? (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-center">
                    <CheckCircle2 size={32} className="mx-auto mb-2" />
                    <p className="font-bold">Email Reset Terkirim!</p>
                    <p className="text-xs mt-1">Cek inbox email Anda.</p>
                    <button onClick={() => setResetSuccess(false)} className="mt-4 text-xs font-bold underline">Kembali</button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    <Input 
                        id="email"
                        type="email" 
                        label="Email" 
                        placeholder={adminOnly ? "admin@unugha.ac.id" : "mahasiswa@unugha.ac.id"}
                        icon={Mail} 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    
                    {mode !== 'forgot' && (
                        <Input 
                            id="password"
                            type="password" 
                            label="Password" 
                            placeholder="••••••••" 
                            icon={Lock} 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    )}

                    {mode === 'login' && (
                        <div className="flex items-center justify-between text-xs font-medium">
                            <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
                                <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />{" "}
                                Ingat saya
                            </label>
                            <button type="button" onClick={() => setMode('forgot')} className="text-indigo-600 font-bold">Lupa password?</button>
                        </div>
                    )}

                    <Button type="submit" className={`w-full justify-center h-12 ${adminOnly ? 'bg-slate-900 hover:bg-slate-800' : ''}`} disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : (
                            mode === 'login' ? 'Masuk Sekarang' : mode === 'register' ? 'Daftar Sekarang' : 'Kirim Link Reset'
                        )} 
                        {!isLoading && <ArrowRight size={18} className="ml-2" />}
                    </Button>
                </form>
            )}

            <div className="mt-8 text-center">
                {!adminOnly && (
                    <p className="text-sm text-slate-500 mb-6">
                        {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}
                        <button 
                            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
                            className="ml-2 text-indigo-600 font-bold hover:underline"
                        >
                            {mode === 'login' ? 'Daftar Sekarang' : 'Masuk di sini'}
                        </button>
                    </p>
                )}
                
                <div className="flex justify-center gap-6">
                    <Link to="/" className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">
                        <ArrowLeft size={14} /> Beranda
                    </Link>
                    {!adminOnly ? (
                        <Link to="/admin-login" className="text-xs font-bold text-slate-400 hover:text-slate-900 flex items-center gap-1">
                            <ShieldCheck size={14} /> Login Admin
                        </Link>
                    ) : (
                        <Link to="/login" className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                            <User size={14} /> Login Mahasiswa
                        </Link>
                    )}
                </div>
            </div>
        </Card>
    </div>
  );
};

export default Login;
