import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Users, Zap, Globe, Activity, Monitor, CheckCircle2, XCircle, AlertCircle, Database } from 'lucide-react';
import { Button, Card } from '../components/UI';
import { supabase, getErrorMessage } from '../services/supabaseClient';

const Landing: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<{status: 'checking' | 'connected' | 'error' | 'warning', message: string}>({ status: 'checking', message: 'Checking connection...' });
  const [showDebug, setShowDebug] = useState(false);

  // --- Typewriter Effect State ---
  const [loopNum, setLoopNum] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [text, setText] = useState('');
  const [delta, setDelta] = useState(150);
  const toRotate = [ "di sini.", "sekarang.", "bersama UNUGHA.", "tanpa ribet." ];
  const period = 2000;

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // 1. Cek Auth Service (Ping sederhana)
        // Jika Failed to fetch terjadi, biasanya berhenti di sini
        const { error: authError } = await supabase.auth.getSession();
        if (authError) throw authError;

        // 2. Cek Database (Akses table events)
        const { error: dbError, count } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true });

        if (dbError) {
            // Kode error 42P01 berarti table tidak ditemukan
            if (dbError.code === '42P01') {
                setDbStatus({ 
                    status: 'warning', 
                    message: 'Terhubung ke Supabase, namun table belum dibuat. Silakan pastikan migrations sudah dijalankan.' 
                });
            } else {
                throw dbError;
            }
        } else {
            setDbStatus({ 
                status: 'connected', 
                message: `Berhasil terhubung. Database siap digunakan (${count || 0} event ditemukan).` 
            });
        }
      } catch (err: any) {
        // Ignore
        
        // Deep extraction of error message
        const msg = getErrorMessage(err);
        
        // Special mapping for landing page context
        let displayMsg = msg;
        if (msg.includes('Koneksi ke server gagal')) {
            displayMsg = 'Supabase unreachable. Matikan AdBlocker atau periksa koneksi internet Anda. Pastikan URL Supabase di services/supabaseClient.ts sudah benar.';
        }
        
        setDbStatus({ status: 'error', message: displayMsg });
      }
    };

    checkConnection();
  }, []);

  // --- Typewriter Logic ---
  useEffect(() => {
    const ticker = setInterval(() => {
      tick();
    }, delta);

    return () => { clearInterval(ticker) };
  }, [text, delta]);

  const tick = () => {
    const i = loopNum % toRotate.length;
    const fullText = toRotate[i];
    const updatedText = isDeleting 
      ? fullText.substring(0, text.length - 1) 
      : fullText.substring(0, text.length + 1);

    setText(updatedText);

    if (isDeleting) {
      setDelta(prevDelta => prevDelta / 2);
    }

    if (!isDeleting && updatedText === fullText) {
      setIsDeleting(true);
      setDelta(period);
    } else if (isDeleting && updatedText === '') {
      setIsDeleting(false);
      setLoopNum(loopNum + 1);
      setDelta(150);
    } else if (!isDeleting && updatedText !== fullText) {
      const randomBuffer = new Uint32Array(1);
      crypto.getRandomValues(randomBuffer);
      const randomFloat = randomBuffer[0] / 0xFFFFFFFF;
      setDelta(150 - randomFloat * 50); 
    }
  };

  return (
    <div className="overflow-hidden relative">
      {/* Connection Status Indicator (Floating Bottom Right) */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
          {showDebug && (
             <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono shadow-2xl max-w-xs mb-2 animate-in slide-in-from-bottom-5 border border-slate-700">
                <p className="font-bold text-white mb-2 border-b border-slate-700 pb-1 flex justify-between">
                    System Diagnostic{" "}
                    <button onClick={() => setShowDebug(false)} className="text-slate-500 hover:text-white">×</button>
                </p>
                <p>Status: <span className={
                    dbStatus.status === 'connected' ? 'text-green-400' : 
                    dbStatus.status === 'warning' ? 'text-yellow-400' : 
                    dbStatus.status === 'error' ? 'text-red-400' : 'text-blue-400'
                }>{dbStatus.status.toUpperCase()}</span></p>
                <div className="mt-2 text-slate-400 leading-tight bg-black/40 p-2 rounded border border-slate-800 break-words">
                    {dbStatus.message}
                </div>

             </div>
          )}
          
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm shadow-lg backdrop-blur-md border transition-all duration-300 hover:scale-105 ${
                dbStatus.status === 'connected' ? 'bg-green-500/90 text-white border-green-400' : 
                dbStatus.status === 'warning' ? 'bg-yellow-500/90 text-white border-yellow-400' :
                dbStatus.status === 'error' ? 'bg-red-500/90 text-white border-red-400' :
                'bg-slate-800/90 text-white border-slate-600'
            }`}
          >
             {dbStatus.status === 'connected' && <CheckCircle2 size={16} />}
             {dbStatus.status === 'warning' && <AlertCircle size={16} />}
             {dbStatus.status === 'error' && <XCircle size={16} />}
             {dbStatus.status === 'checking' && <Database size={16} className="animate-pulse" />}
             
             <span>
                {dbStatus.status === 'connected' ? 'System Online' : 
                 dbStatus.status === 'checking' ? 'Connecting...' : 
                 'Connection Issue'}
             </span>
          </button>
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 pb-32 lg:pt-24 lg:pb-40">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
           <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-indigo-300/30 rounded-full blur-[100px] animate-pulse" />
           <div className="absolute bottom-0 left-20 w-[400px] h-[400px] bg-orange-200/40 rounded-full blur-[80px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-semibold mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>{" "}
                Platform Event Kampus #1
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1] min-h-[160px] lg:min-h-[220px]">
                Acara seru <br/>
                dimulai <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 inline-block min-w-[100px]">
                  {text}
                </span>
                <span className="text-indigo-600 animate-pulse ml-1">|</span>
              </h1>
              <p className="text-lg text-slate-600 mb-10 max-w-lg leading-relaxed">
                Platform kolaborasi event dan organisasi UNUGHA. Kelola acara kampus, temukan kegiatan seru, dan bangun komunitasmu dalam satu tempat.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/dashboard">
                    <Button className="w-full sm:w-auto h-14 px-8 text-lg">Buat Acara Pertama</Button>
                </Link>
                <Link to="/discover">
                    <Button variant="secondary" className="w-full sm:w-auto h-14 px-8 text-lg bg-white/50 backdrop-blur-sm">Jelajahi Event</Button>
                </Link>
              </div>
            </div>

            <div className="relative lg:h-[600px] flex items-center justify-center">
               {/* 3D Mockup Representation */}
               <div className="relative w-[320px] h-[500px] bg-slate-900 rounded-[40px] border-[8px] border-slate-900 shadow-2xl rotate-[-6deg] hover:rotate-0 transition-transform duration-500 z-20 overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-white">
                    {/* Mock App UI */}
                    <div className="h-40 bg-indigo-600 p-6 text-white">
                        <div className="flex justify-between items-center mb-6">
                            <div className="w-8 h-8 bg-white/20 rounded-full"></div>
                            <div className="w-8 h-8 bg-white/20 rounded-full"></div>
                        </div>
                        <div className="h-4 w-32 bg-white/40 rounded mb-2"></div>
                        <div className="h-8 w-48 bg-white rounded"></div>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="h-32 bg-slate-100 rounded-2xl w-full"></div>
                        <div className="h-32 bg-slate-100 rounded-2xl w-full"></div>
                        <div className="h-32 bg-slate-100 rounded-2xl w-full"></div>
                    </div>
                  </div>
               </div>

               <div className="absolute top-20 right-10 w-[280px] h-[160px] bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-30 p-5 animate-bounce-slow">
                  <div className="flex gap-4 items-center mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
                        <Calendar />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900">Workshop AI</h4>
                        <p className="text-sm text-slate-500">Besok, 09:00 WIB</p>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full w-[70%] bg-orange-500 rounded-full"></div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-slate-500 font-medium">
                    <span>70 Terdaftar</span>
                    <span>30 Sisa</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid md:grid-cols-3 gap-8">
              <Card className="p-8 hover:-translate-y-2 transition-transform duration-300">
                 <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6">
                    <Zap size={28} />
                 </div>
                 <h3 className="text-xl font-bold mb-3 text-slate-900">Manajemen Terpusat</h3>
                 <p className="text-slate-600 leading-relaxed">Kelola pendaftaran, tiket, dan absensi peserta dalam satu dashboard yang intuitif.</p>
              </Card>
              <Card className="p-8 hover:-translate-y-2 transition-transform duration-300">
                 <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mb-6">
                    <Calendar size={28} />
                 </div>
                 <h3 className="text-xl font-bold mb-3 text-slate-900">Kalender Otomatis</h3>
                 <p className="text-slate-600 leading-relaxed">Hindari bentrok jadwal. Event organisasi otomatis tersinkronisasi ke kalender kampus.</p>
              </Card>
              <Card className="p-8 hover:-translate-y-2 transition-transform duration-300">
                 <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 mb-6">
                    <Users size={28} />
                 </div>
                 <h3 className="text-xl font-bold mb-3 text-slate-900">Registrasi Simple</h3>
                 <p className="text-slate-600 leading-relaxed">Mahasiswa dapat mendaftar event dengan satu klik menggunakan akun universitas.</p>
              </Card>
           </div>
        </div>
      </section>

      {/* Categories Marquee */}
      <section className="py-20 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 mb-10 text-center">
            <h2 className="text-3xl font-bold text-slate-900">Jelajahi Minatmu</h2>
        </div>
        <div className="flex overflow-x-auto gap-4 px-4 no-scrollbar pb-8 max-w-7xl mx-auto">
            {[
                { name: 'Seminar', icon: Users },
                { name: 'Workshop', icon: Monitor },
                { name: 'Lomba', icon: Activity },
                { name: 'Seni Budaya', icon: Globe },
                { name: 'Teknologi', icon: Zap },
                { name: 'Bisnis', icon: Activity },
                { name: 'Olahraga', icon: Activity },
                { name: 'UKM', icon: Users },
            ].map((cat, idx) => (
                <button key={idx} className="flex-shrink-0 flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-full hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 transition-all group">
                    <cat.icon size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    <span className="font-medium text-slate-700 group-hover:text-indigo-700">{cat.name}</span>
                </button>
            ))}
        </div>
      </section>
    </div>
  );
};

export default Landing;