
import React from 'react';
import { LucideIcon } from 'lucide-react';

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
    case 'Draft':
      colors = "bg-slate-100 text-slate-600";
      break;
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${colors} ${className}`}>
      {status}
    </span>
  );
};
