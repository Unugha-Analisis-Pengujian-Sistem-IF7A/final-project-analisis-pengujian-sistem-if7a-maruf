// Integration Tests: Authentication Flow
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '@/pages/Login';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { supabase } from '@/services/supabaseClient';

// --- Mocks ---
// Mock Supabase
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((cb) => Promise.resolve({ data: [], error: null }).then(cb)),
    })),
  },
}));

describe('Integration Test: Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: No user logged in initially
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as any);
  });

  it('allows a user to login and redirects to dashboard', async () => {
    // 1. Setup: Mock successful login response
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSession = { user: mockUser, access_token: 'fake-token' };

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { user: mockUser, session: mockSession } as any,
      error: null
    });

    // Capture the auth state change listener
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let authListener: ((event: string, session: any) => void) | undefined;
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
        authListener = callback;
        return { data: { subscription: { unsubscribe: vi.fn(), id: 'mock-id', callback: () => {} } } };
    });

    await act(async () => {
        render(
          <AuthProvider>
            <ToastProvider>
              <MemoryRouter initialEntries={['/login']}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/dashboard" element={<div>Dashboard Page</div>} />
                </Routes>
              </MemoryRouter>
            </ToastProvider>
          </AuthProvider>
        );
    });

    // 2. Verify we are on Login Page
    expect(screen.getByText(/Selamat Datang Kembali/i)).toBeInTheDocument();

    // 3. User Interaction: Fill Form
    const emailInput = screen.getByPlaceholderText(/mahasiswa@unugha.ac.id/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    // Use partial match because of potential icons or extra text
    const loginButton = screen.getByText('Masuk Sekarang').closest('button');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // 4. Submit
    await act(async () => {
      fireEvent.click(loginButton!);
    });

    // 5. Verify API Call
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });

    // 6. Simulate Auth State Change (Integration Step)
    if (authListener) {
        await act(async () => {
            authListener('SIGNED_IN', mockSession);
        });
    }

    // 7. Verify Redirect to Dashboard
    await waitFor(() => {
      expect(screen.getByText(/Dashboard Page/i)).toBeInTheDocument();
      expect(screen.queryByText(/Selamat Datang Kembali/i)).not.toBeInTheDocument();
    });
  });
});
