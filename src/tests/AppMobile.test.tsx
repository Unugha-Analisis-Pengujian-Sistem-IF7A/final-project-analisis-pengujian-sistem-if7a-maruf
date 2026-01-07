import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PublicNavbar } from '../App';
import { AuthProvider } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

// Mock Supabase
vi.mock('../services/supabaseClient', () => ({
    supabase: {
        auth: {
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
            signOut: vi.fn().mockResolvedValue({ error: null }),
        },
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null }),
        }),
    },
}));

describe('PublicNavbar Mobile', () => {
    it('renders navigation icons on mobile', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AuthProvider>
                        <PublicNavbar />
                    </AuthProvider>
                </MemoryRouter>
            );
        });

        // Icon links should be present (found by their title attribute)
        expect(screen.getByTitle('Jelajahi Acara')).toBeInTheDocument();
        expect(screen.getByTitle('Masuk')).toBeInTheDocument();
    });
});
