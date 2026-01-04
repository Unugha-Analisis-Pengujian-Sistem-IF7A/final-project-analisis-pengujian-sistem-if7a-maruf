
import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-white text-slate-900 border-t border-slate-200 pt-16 pb-8 mt-20">
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Top Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20">
            {/* Left: Newsletter & Socials */}
            <div className="max-w-md">
                <h3 className="text-xl md:text-2xl font-medium mb-8 leading-tight text-slate-800">
                    Tetap terhubung untuk akses awal ke fitur terbaru dan event local kampus.
                </h3>
                <div className="flex flex-wrap items-center gap-4">
                    <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-slate-900 flex items-center justify-center hover:bg-slate-100 transition-colors group">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-slate-900 group-hover:scale-110 transition-transform"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"/></svg>
                    </a>
                    <a href="https://reddit.com" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-slate-900 flex items-center justify-center hover:bg-slate-100 transition-colors group">
                         <svg viewBox="0 0 24 24" className="w-5 h-5 fill-slate-900 group-hover:scale-110 transition-transform"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm5.74-6.194a3.176 3.176 0 00-1.253-1.321 3.18 3.18 0 00-1.25-2.536 3.17 3.17 0 001.352-2.31c.212-1.709-1.107-3.17-2.813-3.17a2.86 2.86 0 00-1.57.48l2.16-1.922a.962.962 0 10-1.3-1.42l-2.6 2.31a6.66 6.66 0 00-2.466-.462 6.66 6.66 0 00-2.466.462l-2.6-2.31a.962.962 0 10-1.298 1.42l2.158 1.92a2.87 2.87 0 00-1.57-.48c-1.705 0-3.023 1.46-2.813 3.17a3.17 3.17 0 001.353 2.31 3.18 3.18 0 00-1.25 2.536 3.176 3.176 0 00-1.253 1.321c-1.306 2.66 1.79 4.88 5.617 4.88 3.827 0 6.923-2.22 5.617-4.88z"/></svg>
                    </a>
                    <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-slate-900 flex items-center justify-center hover:bg-slate-100 transition-colors group">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-900 group-hover:scale-110 transition-transform"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
                    </a>
                    
                    <button className="h-12 px-6 rounded-full border border-slate-900 font-bold text-sm hover:bg-slate-900 hover:text-white transition-all">
                        Daftar Newsletter
                    </button>
                </div>
            </div>

            {/* Right: Navigation Links */}
            <div className="flex gap-12 sm:gap-24 text-sm">
                <div>
                    <h4 className="font-bold mb-6 text-slate-900">Navigasi</h4>
                    <ul className="space-y-4 text-slate-600 font-medium">
                        <li><Link to="/about" className="hover:text-indigo-600 transition-colors">Tentang</Link></li>
                        <li><Link to="/discover" className="hover:text-indigo-600 transition-colors">Explore</Link></li>
                        <li><Link to="/calendar" className="hover:text-indigo-600 transition-colors">Kalender</Link></li>
                        <li><Link to="/login" className="hover:text-indigo-600 transition-colors">Komunitas</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold mb-6 text-slate-900">Unit & Lembaga</h4>
                    <ul className="space-y-4 text-slate-600 font-medium">
                        <li><Link to="/" className="hover:text-indigo-600 transition-colors">BEM Universitas</Link></li>
                        <li><Link to="/" className="hover:text-indigo-600 transition-colors">LPPM</Link></li>
                        <li><Link to="/" className="hover:text-indigo-600 transition-colors">Kemahasiswaan</Link></li>
                        <li><Link to="/" className="hover:text-indigo-600 transition-colors">Pusat Karir</Link></li>
                    </ul>
                </div>
            </div>
        </div>

        {/* Big Text */}
        <div className="mb-8 overflow-hidden">
            <h1 className="text-[12vw] sm:text-[11vw] leading-[0.9] font-bold tracking-tighter text-center text-slate-900 select-none pointer-events-none whitespace-nowrap">
                UNUGHA EVENTS
            </h1>
        </div>

        {/* Bottom Links */}
        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-xs font-bold text-slate-500">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                <span className="text-slate-900 text-lg tracking-tight">UNUGHA</span>
                <Link to="/" className="hover:text-slate-900 transition-colors">Tentang Kami</Link>
                <Link to="/" className="hover:text-slate-900 transition-colors">Produk</Link>
                <Link to="/" className="hover:text-slate-900 transition-colors">Privasi</Link>
                <Link to="/" className="hover:text-slate-900 transition-colors">Ketentuan</Link>
                <Link to="/" className="hover:text-slate-900 transition-colors">Bantuan</Link>
            </div>
        </div>
      </div>
    </footer>
  );
};
