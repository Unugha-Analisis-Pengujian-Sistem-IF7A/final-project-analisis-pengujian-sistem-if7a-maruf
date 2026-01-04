// Integration Tests: Authentication Flow
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '@/pages/Login';

import { AuthProvider } from '@/context/AuthContext';
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

// We need to spy on the real AuthProvider or use the real one but mock the backend calls it makes.
// Here we use the REAL AuthProvider but mocked Supabase to simulate the INTEGRATION between AuthContext and Pages.

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

    // Mock getSession to return user AFTER login (for AuthContext to update)
    // In a real integration test, onAuthStateChange would trigger, 
    // but in mocked environment we might need to rely on the manual call or successful promise resolution.
    
    // Render the App-like structure with Routing
    // We use the REAL AuthProvider to test the integration of Context + Page + Logic
    // Capture the auth state change listener
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
            <MemoryRouter initialEntries={['/login']}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<div>Dashboard Page</div>} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        );
    });

    // 2. Verify we are on Login Page
    expect(screen.getByText(/Selamat Datang Kembali/i)).toBeInTheDocument();

    // 3. User Interaction: Fill Form
    const emailInput = screen.getByPlaceholderText(/mahasiswa@unugha.ac.id/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const loginButton = screen.getByRole('button', { name: /Masuk Sekarang/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // 4. Submit
    await act(async () => {
      fireEvent.click(loginButton);
    });

    // 5. Verify API Call
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });

    // 6. Simulate Auth State Change (Integration Step)
    // In real app, Supabase client triggers this. In test, we manually trigger it to update Context.
    if (authListener) {
        await act(async () => {
            authListener('SIGNED_IN', mockSession);
        });
    }

    // 7. Verify Redirect to Dashboard
    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
      expect(screen.queryByText(/Selamat Datang Kembali/i)).not.toBeInTheDocument();
    });
  });
});
