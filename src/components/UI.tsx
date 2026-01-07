
import React from 'react';
import { LucideIcon, X } from 'lucide-react';

// --- Buttons ---

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: LucideIcon;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  icon: Icon,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300 active:scale-95";
  
  const variants = {
    primary: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5",
    secondary: "bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-50 shadow-sm",
    ghost: "text-slate-600 hover:bg-slate-100/50 hover:text-indigo-600"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

// --- Inputs ---

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
}

export const Input: React.FC<InputProps> = ({ label, icon: Icon, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={props.id} className="block text-sm font-medium text-slate-700 mb-2 ml-1">{label}</label>}
      <div className="relative group">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            <Icon size={20} />
          </div>
        )}
        <input 
          className={`w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 ${className}`}
          {...props} 
        />
      </div>
    </div>
  );
};

// --- Cards ---

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', glass = false, ...props }) => {
  const base = "rounded-[24px] p-6";
  const style = glass 
    ? "bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
    : "bg-white border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.08)] transition-shadow duration-300";

  return (
    <div className={`${base} ${style} ${className}`} {...props}>
      {children}
    </div>
  );
};

// --- Badge ---

export const Badge: React.FC<{ status: string; className?: string }> = ({ status, className = '' }) => {
  let colors = "bg-slate-100 text-slate-600";
  
  switch (status) {
    case 'Mendatang':
    case 'Terbuka':
      colors = "bg-indigo-100 text-indigo-700";
      break;
    case 'Ditutup':
    case 'Selesai':
      colors = "bg-orange-100 text-orange-700";
      break;
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${colors} ${className}`}>
      {status}
    </span>
  );
};
// --- Modal ---

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'max-w-md' 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button 
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300 w-full h-full border-none p-0 cursor-default" 
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Enter' && onClose()}
        aria-label="Close modal backdrop"
      ></button>
      <Card 
        className={`relative w-full ${maxWidth} p-8 animate-in zoom-in-95 duration-200 shadow-2xl border-none`}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        </div>

        {children}
      </Card>
    </div>
  );
};
