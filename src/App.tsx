
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  Plus, 
  Bell, 
  Search, 
  LogOut,
  User as UserIcon,
  Settings,
  ChevronDown,
  ArrowUpRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Globe,
  LayoutDashboard,
  Calendar
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { supabase } from './services/supabaseClient';
import { Notification as NotificationType } from './types';
import { Footer } from './components/Footer';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateEvent from './pages/CreateEvent';
import EventDetail from './pages/EventDetail';
import Discover from './pages/Discover';
import CalendarPage from './pages/CalendarPage';

import ProfileSettings from './pages/ProfileSettings';

import UserManagement from './pages/UserManagement';

// Types
import { User } from './types';

// --- Helper Components ---

const TimeDisplay = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="hidden lg:block text-sm font-medium text-slate-500 tabular-nums tracking-wide">
      {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', '.')} WIB
    </span>
  );
};

// --- Navigation Components ---

export const PublicNavbar = () => {
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/80 backdrop-blur-xl border-b border-transparent">
      <div className="w-full max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Left: Logo */}
        <Link to="/" className="flex-shrink-0 flex items-center gap-2 cursor-pointer group">
           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
              U
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight hidden sm:block">UNUGHA Events</span>
        </Link>

        {/* Right: Actions (Luma Style) */}
        <div className="flex items-center gap-2 sm:gap-6">
            
            {/* Time Display */}
            <TimeDisplay />

            {/* Explore Link - Responsive Icon/Text */}
            <Link 
                to="/discover" 
                className="flex items-center gap-1.5 p-2 text-slate-500 hover:text-slate-900 transition-colors"
                title="Jelajahi Acara"
            >
                <Globe size={20} className="sm:hidden" />
                <span className="hidden sm:inline text-sm font-medium">Jelajahi Acara</span>
                <ArrowUpRight size={16} className="text-slate-400 hidden sm:block" />
            </Link>

            {/* Login/Dashboard Button - Responsive Icon/Button */}
            {user ? (
                <Link to="/dashboard" title="Dashboard">
                    <button className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-semibold transition-colors hidden sm:block">
                        Dashboard
                    </button>
                    <div className="p-2 bg-slate-100 rounded-full sm:hidden text-slate-900">
                        <LayoutDashboard size={20} />
                    </div>
                </Link>
            ) : (
                <Link to="/login" title="Masuk">
                    <button className="px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-semibold transition-all hover:scale-105 active:scale-95 hidden sm:block">
                        Masuk
                    </button>
                    <div className="p-2 bg-slate-100 rounded-full sm:hidden text-slate-900">
                        <UserIcon size={20} />
                    </div>
                </Link>
            )}
        </div>
      </div>
    </nav>
  );
};

export const DashboardNavbar = () => {
  const location = useLocation();
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Notification State
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (path: string) => location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));

  const handleLogout = async () => {
      await signOut();
      navigate('/');
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      navigate(`/discover?q=${encodeURIComponent(searchTerm)}`);
    }
  };



  useEffect(() => {
    if (!user) return;

    // 1. Initial Fetch
    const fetchNotifications = async () => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (!error && data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
    };

    fetchNotifications();

    // 2. Realtime Subscription for Push Notifications
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationType;
          
          // Update internal state
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Trigger Native Browser Notification (Push)
          if (Notification.permission === 'granted') {
             try {
                 const n = new Notification(newNotif.title, {
                     body: newNotif.message,
                     icon: 'https://cdn-icons-png.flaticon.com/512/3119/3119338.png', // Generic Icon
                     tag: newNotif.id
                 });
                 n.onclick = () => {
                     window.focus();
                     if (newNotif.action_url) {
                        if (newNotif.action_url.startsWith('http')) window.open(newNotif.action_url, '_blank', 'noopener,noreferrer');
                     else {
                        navigate(newNotif.action_url);
                     }
                     }
                     n.close();
                 };
             } catch {
                 // Ignore
             }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const markAsRead = async (id: string, actionUrl?: string) => {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Backend update
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);

      // Navigate if link exists
      if (actionUrl) {
          setIsNotifOpen(false);
          // If external
          if(actionUrl.startsWith('http')) window.open(actionUrl, '_blank', 'noopener,noreferrer');
          else navigate(actionUrl);
      }
  };

  const markAllRead = async () => {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user?.id).eq('is_read', false);
  };

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get user display name
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  
  // Logic Avatar: Uploaded -> Metadata -> 3D Char Fallback
  const avatarSrc = user?.user_metadata?.avatar_url 
    ? user.user_metadata.avatar_url 
    : `https://api.dicebear.com/9.x/adventurer/svg?seed=${user?.email}&backgroundColor=b6e3f4`;

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-2 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-18 py-2 md:py-3">
          
          {/* Left: Logo & Nav */}
          <div className="flex items-center gap-8">
             <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                U
              </div>
            </Link>

            <div className="hidden md:flex items-center bg-slate-100/50 p-1 rounded-full border border-slate-200/50">
              <Link to="/dashboard">
                <div className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive('/dashboard') ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  Dashboard
                </div>
              </Link>
              <Link to="/calendar">
                <div className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive('/calendar') ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  Kalender
                </div>
              </Link>
              
              


              <Link to="/discover">
                <div className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive('/discover') ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  Explore
                </div>
              </Link>
              
              {role === 'admin' && (
                <Link to="/users">
                   <div className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive('/users') ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                     Manajemen User
                   </div>
                </Link>
              )}
            </div>
          </div>

          {/* Center: Search (Desktop) */}
          <div className="hidden md:block w-96">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari event..." 
                className="w-full bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-full pl-10 pr-4 py-2 text-sm transition-all outline-none border"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>
          </div>

          {/* Right: User & Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            
            {/* Show Create Button ONLY if ADMIN */}
            {role === 'admin' && (
              <Link to="/create-event">
                <button className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20">
                  <Plus size={16} />
                  <span>Buat</span>
                </button>
              </Link>
            )}
            
            {/* Notification Dropdown */}
            <div className="relative" ref={notifRef}>
                <button 
                    data-testid="notif-btn"
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-white animate-pulse"></span>
                    )}
                </button>

                {isNotifOpen && (
                    <div className="absolute top-full right-0 mt-2 w-[calc(100vw-32px)] sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-sm font-bold text-slate-800">Notifikasi</h3>
                            {unreadCount > 0 && (
                                <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline">
                                    Tandai semua dibaca
                                </button>
                            )}
                        </div>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <Bell size={24} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-xs">Belum ada notifikasi.</p>
                                </div>
                            ) : (
                                <div>
                                    {notifications.map(notif => (
                                        <div 
                                            key={notif.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => markAsRead(notif.id, notif.action_url)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    markAsRead(notif.id, notif.action_url);
                                                }
                                            }}
                                            className={`p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${!notif.is_read ? 'bg-indigo-50/40' : ''}`}
                                        >
                                            <div className="flex gap-3">
                                                <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                                    notif.type === 'success' ? 'bg-green-100 text-green-600' : 
                                                    notif.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                                                    'bg-indigo-100 text-indigo-600'
                                                }`}>
                                                    {notif.type === 'success' ? <CheckCircle2 size={16} /> :
                                                     notif.type === 'warning' ? <AlertTriangle size={16} /> :
                                                     <Info size={16} />}
                                                </div>
                                                <div>
                                                    <h4 className={`text-sm ${!notif.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                        {notif.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                                    <p className="text-[10px] text-slate-400 mt-2">
                                                        {new Date(notif.created_at).toLocaleDateString('id-ID')} • {new Date(notif.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                                                    </p>
                                                </div>
                                                {!notif.is_read && (
                                                    <div className="shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-2"></div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Link to="/settings" className="block p-3 text-center text-xs font-medium text-slate-500 hover:bg-slate-50 border-t border-slate-100">
                            Lihat Pengaturan Notifikasi
                        </Link>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 relative" ref={userMenuRef}>
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 hover:bg-slate-50 p-1 pr-2 rounded-full transition-colors"
              >
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-semibold text-slate-800 leading-none truncate max-w-[100px]">{displayName}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-indigo-50 border-2 border-white shadow-sm overflow-hidden">
                   <img 
                     src={avatarSrc}
                     alt="User" 
                     className="w-full h-full object-cover" 
                   />
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <Link 
                    to="/settings" 
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Settings size={16} /> Pengaturan Profil
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors mt-1"
                  >
                    <LogOut size={16} /> Keluar Aplikasi
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </nav>
  );
};

export const BottomNavigation = () => {
    const location = useLocation();
    const { role } = useAuth();
    const isActive = (path: string) => location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 px-6 py-2 pb-safe">
            <div className="flex justify-between items-center max-w-lg mx-auto">
                <Link to="/dashboard" className={`flex flex-col items-center gap-1 p-2 ${isActive('/dashboard') ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <LayoutDashboard size={20} />
                    <span className="text-[10px] font-bold">Beranda</span>
                </Link>
                <Link to="/calendar" className={`flex flex-col items-center gap-1 p-2 ${isActive('/calendar') ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <Calendar size={20} />
                    <span className="text-[10px] font-bold">Kalender</span>
                </Link>
                
                {role === 'admin' && (
                    <Link to="/create-event" className="flex flex-col items-center -mt-8">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/40 flex items-center justify-center text-white ring-4 ring-white">
                            <Plus size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 mt-1">Buat</span>
                    </Link>
                )}

                <Link to="/discover" className={`flex flex-col items-center gap-1 p-2 ${isActive('/discover') ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <Globe size={20} />
                    <span className="text-[10px] font-bold">Explore</span>
                </Link>

                <Link to="/settings" className={`flex flex-col items-center gap-1 p-2 ${isActive('/settings') ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <Settings size={20} />
                    <span className="text-[10px] font-bold">Profil</span>
                </Link>
            </div>
        </div>
    );
};

// --- Layout Wrapper ---

const AppLayout = ({ type = 'public' }: { type?: 'public' | 'dashboard' | 'auth' }) => {
  const { user } = useAuth();
  const location = useLocation();

  let effectiveType = type;
  
  // Exception: Landing page (/) selalu pakai public navbar biar cantik
  const isLanding = location.pathname === '/';

  if (type === 'public' && user && !isLanding) {
    effectiveType = 'dashboard';
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900">
      {effectiveType === 'public' && <PublicNavbar />}
      {effectiveType === 'dashboard' && <DashboardNavbar />}
      {effectiveType === 'dashboard' && <BottomNavigation />}
      
      {/* Padding adjustment: Public navbar is fixed (needs pt-20), Dashboard is sticky (needs no padding) */}
      <main className={`flex-grow ${effectiveType === 'public' ? 'pt-20' : ''} ${effectiveType === 'dashboard' ? 'pb-20 md:pb-0' : ''} ${effectiveType === 'auth' ? 'flex items-center justify-center p-4' : ''}`}>
        <Outlet />
      </main>

      {(effectiveType === 'public' || effectiveType === 'dashboard') && (
        <Footer />
      )}
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router basename={import.meta.env.BASE_URL}>
          <Routes>
            {/* Public / Landing Layout */}
            <Route element={<AppLayout type="public" />}>
              <Route path="/" element={<Landing />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/event/:id" element={<EventDetail />} />
            </Route>

            {/* Auth Layout */}
            <Route element={<AppLayout type="auth" />}>
              <Route path="/login" element={<Login />} />
              <Route path="/admin-login" element={<Login adminOnly />} />
            </Route>

            {/* Dashboard Layout */}
            <Route element={<AppLayout type="dashboard" />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/create-event" element={<CreateEvent />} />
              <Route path="/settings" element={<ProfileSettings />} />
              <Route path="/users" element={<UserManagement />} />
            </Route>
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
