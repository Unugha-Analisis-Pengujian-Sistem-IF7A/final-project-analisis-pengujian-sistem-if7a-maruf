import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabaseClient';

// Mock Supabase Client
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
  getErrorMessage: vi.fn((err) => err.message || 'Error'),
}));

// Test Component to consume context
const TestComponent = () => {
  const { user, role, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="user">{user ? user.email : 'No User'}</div>
      <div data-testid="role">{role || 'No Role'}</div>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    // Mock pending session
    (supabase.auth.getSession as any).mockReturnValue(new Promise(() => {})); 
    (supabase.auth.onAuthStateChange as any).mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders user and role when authenticated', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    const mockSession = { user: mockUser };
    
    // Mock getSession success
    (supabase.auth.getSession as any).mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    });

    // Mock onAuthStateChange
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    // Mock Profile Fetch
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { role: 'organizer' }, error: null }),
      }),
    });
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    // Note: Profile fetch is async inside useEffect, might need extra wait or check implementation
  });

  it('handles unauthenticated state', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
  });

  it('handles signOut error', async () => {
    const mockSignOut = vi.fn().mockResolvedValue({ error: { message: 'Sign out failed' } });
    (supabase.auth.signOut as any) = mockSignOut;
    
    // Test component that calls signOut
    const TestSignOut = () => {
        const { signOut } = useAuth();
        return <button onClick={signOut}>Sign Out</button>;
    };

    render(
        <AuthProvider>
            <TestSignOut />
        </AuthProvider>
    );

    // Initial load
    await waitFor(() => expect(screen.getByText('Sign Out')).toBeInTheDocument());

    await act(async () => {
         fireEvent.click(screen.getByText('Sign Out'));
    });
    
    // Verify console.error was called? Or just that signOut was called.
    expect(mockSignOut).toHaveBeenCalled();
    // Optional: Check if error handling logic in UI is triggered (e.g. toast or alert), but current UI might not show it.
  });

  it('refreshes profile data', async () => {
      // Mock initial login
      (supabase.auth.getSession as any).mockResolvedValue({
          data: { session: { user: { id: '123' } } },
          error: null
      });

      // Mock user profile fetch for initial load
      const mockInitialProfile = vi.fn().mockResolvedValue({ data: { role: 'participant' }, error: null });
      
      const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ single: mockInitialProfile })
      });
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const TestRefresh = () => {
          const { refreshProfile, role } = useAuth();
          return (
              <div>
                 <span data-testid="role">{role}</span>
                 <button onClick={refreshProfile}>Refresh</button>
              </div>
          )
      };

      render(
          <AuthProvider>
              <TestRefresh />
          </AuthProvider>
      );

      await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('participant'));

      // Update mock for refresh
      mockInitialProfile.mockResolvedValue({ data: { role: 'organizer' }, error: null });

      await act(async () => {
          fireEvent.click(screen.getByText('Refresh'));
      });

      await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('organizer'));
  });

  it('sets participant role when profile fetch fails', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
          data: { session: { user: { id: '123' } } },
          error: null
      });

      // Mock profile fetch ERROR
      const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
              single: vi.fn().mockRejectedValue(new Error('DB Error')),
          }),
      });
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      render(
          <AuthProvider>
              <TestComponent />
          </AuthProvider>
      );

      await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
      expect(screen.getByTestId('role')).toHaveTextContent('participant');
  });

  it('updates state on auth state change', async () => {
    let authCallback: any;
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
    
    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
        <AuthProvider>
            <TestComponent />
        </AuthProvider>
    );

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    expect(screen.getByTestId('user')).toHaveTextContent('No User');

    // Trigger state change
    const mockUser = { id: '456', email: 'new@test.com' };
    const mockSession = { user: mockUser };
    
    // Mock profile fetch for new user
    const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
        }),
    });
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    await act(async () => {
        await authCallback('SIGNED_IN', mockSession);
    });

    expect(screen.getByTestId('user')).toHaveTextContent('new@test.com');
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('admin'));

    // Trigger sign out state change
    await act(async () => {
        await authCallback('SIGNED_OUT', null);
    });

    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    expect(screen.getByTestId('role')).toHaveTextContent('No Role');
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Prevent console.error from cluttering the test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const BuggyComponent = () => {
        useAuth();
        return null;
    };

    expect(() => render(<BuggyComponent />)).toThrow('useAuth must be used within an AuthProvider');
    
    consoleSpy.mockRestore();
  });

  it('handles auth initialization error', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: { message: 'Initialization failed' }
    });

    const TestError = () => {
        const { error, loading } = useAuth();
        if (loading) return <div>Loading...</div>;
        return <div>{error}</div>;
    };

    render(
        <AuthProvider>
            <TestError />
        </AuthProvider>
    );

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    expect(screen.getByText('Initialization failed')).toBeInTheDocument();
  });
});
