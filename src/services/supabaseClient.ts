import { createClient } from '@supabase/supabase-js';

// Konfigurasi Database Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Anon Key');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper untuk mendapatkan URL gambar
export const getStorageUrl = (path: string, bucket = 'banners') => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
};

/**
 * Helper safe extraction untuk error message yang lebih robust.
 * Mencegah output "[object Object]" dan memberikan konteks pada error jaringan.
 */
export const getErrorMessage = (error: any): string => {
  if (!error) return 'Unknown error';
  
  // 1. Handle common browser/network errors early
  let strError = '';
  if (typeof error === 'string') {
      strError = error;
  } else if (typeof error === 'object' && error !== null) {
      strError = String(error.message || error.error_description || '');
  }
  
  if (strError.includes('Failed to fetch') || strError.includes('Load failed') || strError.includes('NetworkError')) {
      return 'Koneksi ke server gagal. Ini biasanya disebabkan oleh AdBlocker, koneksi internet terputus, atau URL database yang tidak valid.';
  }

  // 2. Handle string errors directly
  if (typeof error === 'string') {
      return (error === '[object Object]' || error.trim() === '') 
        ? 'An unexpected error occurred (empty or object string)' 
        : error;
  }

  // 3. Extract potential message and details
  let message = '';
  let details = '';
  let code = '';

  if (error instanceof Error) {
      message = error.message;
  } else if (typeof error === 'object' && error !== null) {
      // Check for common Supabase/Postgrest error structures
      const rawMessage = error.message || error.error_description || error.msg || error.error;
      
      // Crucial: if the message property itself is an object, stringify it properly
      if (rawMessage && typeof rawMessage === 'object') {
          message = rawMessage.message || rawMessage.msg || JSON.stringify(rawMessage);
      } else {
          message = String(rawMessage || '');
      }

      details = typeof error.details === 'string' ? error.details : '';
      code = typeof error.code === 'string' || typeof error.code === 'number' ? String(error.code) : '';
  }

  // 4. Fallback for empty or invalid message
  if (!message || message === '[object Object]' || message.trim() === '') {
      try {
          const stringified = JSON.stringify(error);
          message = (stringified && stringified !== '{}') ? stringified : 'An unidentifiable error occurred';
      } catch {
          message = 'An error occurred that could not be stringified';
      }
  }

  // 5. Construct final string safely
  let finalMsg = message;
  if (code && code !== 'undefined') finalMsg = `[${code}] ${finalMsg}`;
  if (details && details !== message && details !== 'undefined') finalMsg += ` - ${details}`;

  // Final sanity check to never return the literal string "[object Object]"
  return finalMsg.includes('[object Object]') ? 'An unexpected system error occurred' : finalMsg;
};