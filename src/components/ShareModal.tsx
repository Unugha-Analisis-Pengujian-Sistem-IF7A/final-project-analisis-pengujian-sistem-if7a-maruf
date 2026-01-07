
import React, { useState, useEffect } from 'react';
import { X, Globe, Hash, Briefcase, Mail, Share2, MessageCircle, Copy, Check } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url?: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, title, url }) => {
  const [copied, setCopied] = useState(false);
  
  // Use current window location if url is not provided
  const shareUrl = url || globalThis.location.href;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  useEffect(() => {
    if (isOpen) {
        setTimeout(() => setCopied(false), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const socialActions = [
    {
      id: 'facebook',
      label: 'Bagikan',
      icon: Globe,
      action: () => globalThis.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank', 'noopener,noreferrer')
    },
    {
      id: 'twitter',
      label: 'Tweet',
      icon: Hash,
      action: () => globalThis.open(`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, '_blank', 'noopener,noreferrer')
    },
    {
      id: 'linkedin',
      label: 'Pos',
      icon: Briefcase,
      action: () => globalThis.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, '_blank', 'noopener,noreferrer')
    },
    {
      id: 'email',
      label: 'Surel',
      icon: Mail,
      action: () => globalThis.open(`mailto:?subject=${encodedTitle}&body=Cek event ini: ${encodedUrl}`, '_self')
    },
    {
      id: 'native',
      label: 'Bagikan',
      icon: Share2,
      action: async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title, url: shareUrl });
            } catch {
                // Share cancelled
            }
        } else {
            handleCopy();
        }
      }
    }
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <button 
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in w-full h-full border-none p-0 cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 pb-2 relative">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-600">
                <Share2 size={24} />
            </div>
            
            <button 
                onClick={onClose} 
                aria-label="Close"
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
                <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-slate-900">Undang Teman</h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                Selalu lebih menyenangkan dengan teman-teman. Kami akan memberi tahu Anda ketika teman-teman Anda menerima undangan Anda.
            </p>
        </div>

        {/* Social Grid */}
        <div className="px-6 py-4">
            <div className="flex justify-between gap-2 mb-6">
                {socialActions.map((item) => (
                    <button 
                        key={item.id}
                        onClick={item.action}
                        className="flex flex-col items-center gap-2 group min-w-[56px]"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 group-hover:scale-110 group-hover:bg-slate-100 group-hover:text-indigo-600 transition-all duration-300">
                            <item.icon size={22} strokeWidth={1.5} />
                        </div>
                        <span className="text-xs font-medium text-slate-500 group-hover:text-slate-800 transition-colors">
                            {item.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* SMS Option */}
            <button 
                 onClick={() => globalThis.open(`sms:?body=${encodedTitle} ${encodedUrl}`, '_blank', 'noopener,noreferrer')}
                 className="flex flex-col items-center gap-2 group w-fit"
            >
                <div className="w-12 h-12 rounded-2xl bg-slate-600 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-slate-800 transition-all duration-300 shadow-md shadow-slate-200">
                    <MessageCircle size={22} fill="currentColor" strokeWidth={0} />
                </div>
                <span className="text-xs font-medium text-slate-500 group-hover:text-slate-800 transition-colors">
                    Pesan Teks
                </span>
            </button>
        </div>

        {/* Copy Link Section */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Bagikan tautannya:</p>
            <div className="flex gap-2">
                <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 truncate font-medium select-all">
                    {shareUrl}
                </div>
                <button 
                    onClick={handleCopy}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm rounded-xl transition-colors flex items-center gap-2"
                >
                    {copied ? (
                        <><Check size={18} /> Disalin</>
                    ) : (
                        <><Copy size={18} /> Salin</>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
