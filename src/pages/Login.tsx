import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, AlertTriangle, ArrowLeft, CheckCircle2, ShieldCheck, User, Wifi, WifiOff, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Card } from '../components/UI';
import { supabase, getErrorMessage } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

interface LoginProps {
  adminOnly?: boolean;
}

const checkDbConnection = async (): Promise<boolean> => {
    try {
        const { error } = await supabase.from('events').select('id', { count: 'exact', head: true });
        if (error && (error.code === 'PGRST301' || error.message.includes('apiKey'))) {
            return false;
        }
        return true;
    } catch {
        // Log error in production monitoring service here if needed
        return false;
    }
};

const LoginHeader = ({ 
    adminOnly, 
    mode, 
    isDbConnected 
}: { 
    adminOnly: boolean, 
    mode: string, 
    isDbConnected: boolean | null 
}) => {
    const getHeaderContent = () => {
        if (adminOnly) return { title: 'Admin Portal', desc: 'Login khusus Administrator System' };
        if (mode === 'forgot') return { title: 'Reset Password', desc: 'Masukkan email untuk instruksi reset.' };
        if (mode === 'register') return { title: 'Daftar Akun Baru', desc: 'Mulai perjalanan organisasimu di sini' };
        return { title: 'Selamat Datang Kembali', desc: 'Masuk untuk mengelola event kampusmu' };
    };

    const content = getHeaderContent();

    return (
        <div className="text-center mb-8">
            <div className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl shadow-lg ${adminOnly ? 'bg-slate-900 shadow-slate-500/30' : 'bg-indigo-600 shadow-indigo-500/30'}`}>
                {adminOnly ? <ShieldCheck size={24} /> : 'U'}
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{content.title}</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
                <p className="text-slate-500 text-sm">{content.desc}</p>
                <div title={isDbConnected ? "Connected" : "Disconnected"}>
                    {isDbConnected === true ? <Wifi size={12} className="text-green-500" /> : isDbConnected === false ? <WifiOff size={12} className="text-red-500" /> : null}
                </div>
            </div>
        </div>
    );
};

const ErrorAlert = ({ error }: { error: string | null }) => {
    if (!error) return null;
    return (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2">
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl">
                <div className="flex gap-2 font-bold mb-1 text-xs items-center">
                    <AlertTriangle size={14} className="shrink-0" />
                    GAGAL LOGIN
                </div>
                <p className="text-xs leading-relaxed">{error}</p>
            </div>
        </div>
    );
};

const SuccessReset = ({ onBack }: { onBack: () => void }) => (
    <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-center">
        <CheckCircle2 size={32} className="mx-auto mb-2" />
        <p className="font-bold">Email Reset Terkirim!</p>
        <p className="text-xs mt-1">Cek inbox email Anda.</p>
        <button onClick={onBack} className="mt-4 text-xs font-bold underline">Kembali</button>
    </div>
);

const handleSignInError = (error: { message: string }) => {
    if (error.message.toLowerCase().includes('email not confirmed')) {
        throw new Error('Email Anda belum terverifikasi. Silakan cek inbox email Anda untuk verifikasi.');
    }
    if (error.message === 'Invalid login credentials') {
        throw new Error('Kredensial login salah atau akun belum terverifikasi.');
    }
    throw error;
};

const validateAdminAccess = async (userId: string) => {
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

    if (profileError || !profile) {
        throw new Error(profileError ? `DATABASE ERROR: ${profileError.message}` : 'Data profil tidak ditemukan.');
    }

    if (profile.role !== 'admin') {
        throw new Error('Akses ditolak: Anda bukan Admin.');
    }
};

const Login: React.FC<LoginProps> = ({ adminOnly = false }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  
  // State
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(
      searchParams.get('mode') === 'register' && !adminOnly ? 'register' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    checkDbConnection().then(setIsDbConnected);
  }, []);

  const handleLoginAction = async () => {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
      });
      
      if (signInError) {
          handleSignInError(signInError);
      }
      
      if (data.user) {
          // Admin Check
          if (adminOnly) {
              try {
                  await validateAdminAccess(data.user.id);
              } catch (err: unknown) {
                   await supabase.auth.signOut();
                   throw err;
              }
          }
          navigate('/dashboard');
      }
  };

  const handleRegisterAction = async () => {
      const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
              data: {
                  full_name: email.split('@')[0],
                  role: 'participant'
              }
          }
      });
      if (signUpError) throw signUpError;
      
      showToast('Registrasi berhasil! Silakan cek email Anda untuk verifikasi akun.', 'success');
      setMode('login');
  };

  const handleForgotAction = async () => {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: globalThis.location.origin + import.meta.env.BASE_URL + 'settings', 
      });
      if (resetError) throw resetError;
      setResetSuccess(true);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResetSuccess(false);

    try {
        if (mode === 'login') await handleLoginAction();
        else if (mode === 'register') await handleRegisterAction();
        else if (mode === 'forgot') await handleForgotAction();
    } catch (err: unknown) {
        setError(getErrorMessage(err));
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10 py-10">
        <Card glass className={`relative p-8 md:p-10 shadow-2xl overflow-hidden ${adminOnly ? 'border-t-4 border-t-red-600' : ''}`}>
            <LoginHeader adminOnly={adminOnly} mode={mode} isDbConnected={isDbConnected} />
            <ErrorAlert error={error} />

            {resetSuccess ? (
                <SuccessReset onBack={() => setResetSuccess(false)} />
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
                        <div className="relative">
                            <Input 
                                id="password"
                                type={showPassword ? "text" : "password"} 
                                label="Password" 
                                placeholder="••••••••" 
                                icon={Lock} 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="pr-12"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 bottom-[14px] text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
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
                    {adminOnly ? (
                        <Link to="/login" className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                            <User size={14} /> Login Mahasiswa
                        </Link>
                    ) : (
                        <Link to="/admin-login" className="text-xs font-bold text-slate-400 hover:text-slate-900 flex items-center gap-1">
                            <ShieldCheck size={14} /> Login Admin
                        </Link>
                    )}
                </div>
            </div>
        </Card>
    </div>
  );
};

export default Login;
