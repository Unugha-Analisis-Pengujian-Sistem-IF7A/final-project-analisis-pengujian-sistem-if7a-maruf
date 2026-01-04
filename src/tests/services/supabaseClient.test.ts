import { describe, it, expect } from 'vitest';
import { getStorageUrl, getErrorMessage } from '@/services/supabaseClient';

// Mock env vars if needed, but for these unit tests, we are mostly testing pure functions.
// Note: vitest automatically loads .env but we might need to handle the throw error in the file if envs are missing in test context.
// However, since we are testing imported functions, the module level code runs first.
// We assume setupTests or vitest config handles envs, or we might need to mock import.meta.env.

describe('supabaseClient Service', () => {
    
    describe('getStorageUrl', () => {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost';

        it('returns null for empty path', () => {
            expect(getStorageUrl('')).toBeNull();
            expect(getStorageUrl(null)).toBeNull();
        });

        it('returns path as is if it starts with http', () => {
            const url = 'https://example.com/image.png';
            expect(getStorageUrl(url)).toBe(url);
        });

        it('constructs correct supabase storage url for relative path', () => {
            const path = 'folder/image.png';
            const expected = `${baseUrl}/storage/v1/object/public/banners/${path}`;
            expect(getStorageUrl(path)).toBe(expected);
        });

        it('uses custom bucket if provided', () => {
             const path = 'avatar.png';
             const bucket = 'avatars';
             const expected = `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;
             expect(getStorageUrl(path, bucket)).toBe(expected);
        });
    });

    describe('getErrorMessage', () => {
        it('returns "Unknown error" for null/undefined', () => {
            expect(getErrorMessage(null)).toBe('Unknown error');
            expect(getErrorMessage(undefined)).toBe('Unknown error');
        });

        it('handles string errors', () => {
            expect(getErrorMessage('Custom error')).toBe('Custom error');
            expect(getErrorMessage('[object Object]')).toBe('An unexpected error occurred (empty or object string)');
        });

        it('extracts message from Error object', () => {
            const error = new Error('System failure');
            expect(getErrorMessage(error)).toBe('System failure');
        });

        it('handles object with nested message object', () => {
            const err = { message: { message: 'Deep error' } };
            expect(getErrorMessage(err)).toBe('Deep error');
        });

        it('handles object with no message but stringifiable', () => {
            const err = { foo: 'bar' };
            expect(getErrorMessage(err)).toBe('{"foo":"bar"}');
        });

        it('handles non-stringifiable object (fallback)', () => {
            const circular: any = {};
            circular.self = circular;
            expect(getErrorMessage(circular)).toBe('An error occurred that could not be stringified');
        });

        it('handles Postgrest error with code and details', () => {
            const err = { message: 'Primary error', code: 'P0001', details: 'More info' };
            expect(getErrorMessage(err)).toBe('[P0001] Primary error - More info');
        });

        it('detects network errors', () => {
            expect(getErrorMessage('Failed to fetch')).toContain('Koneksi ke server gagal');
            expect(getErrorMessage({ message: 'NetworkError' })).toContain('Koneksi ke server gagal');
        });
        
        it('extracts message from Supabase-like error object', () => {
            const error = { message: 'Database error', code: '23505' };
            expect(getErrorMessage(error)).toBe('[23505] Database error');
        });

        it('extracts error_description if message is missing', () => {
            const error = { error_description: 'Invalid token' };
            expect(getErrorMessage(error)).toBe('Invalid token');
        });

        it('handles nested message object', () => {
            const error = { message: { msg: 'Nested error' } };
            expect(getErrorMessage(error)).toBe('Nested error');
        });

        it('detects network errors and provides friendly message', () => {
             const error = new Error('Failed to fetch');
             expect(getErrorMessage(error)).toContain('Koneksi ke server gagal');
        });
        
        it('handles complex error object with details', () => {
            const error = { message: 'Bad Request', details: 'Field missing', code: 400 };
            expect(getErrorMessage(error)).toBe('[400] Bad Request - Field missing');
        });
    });
});
