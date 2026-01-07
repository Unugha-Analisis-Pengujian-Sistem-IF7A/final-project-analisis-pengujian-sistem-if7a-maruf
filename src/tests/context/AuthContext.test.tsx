import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabaseClient';

// Mock ToastContext
const mockShowToast = vi.fn();
vi.mock('@/context/ToastContext', () => ({
    useToast: () => ({ showToast: mockShowToast }),
}));

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
    // Mock console to keep test output clean
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    // Mock pending session and NO state change (loading stays true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.auth.getSession as any).mockReturnValue(new Promise(() => {})); 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    
    // Mock Profile Fetch
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { role: 'organizer' }, error: null }),
      }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    // Mock onAuthStateChange to TRIGGER callback immediately
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
        callback('SIGNED_IN', mockSession);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
  });

  it('handles unauthenticated state', async () => {
    // Mock onAuthStateChange to TRIGGER callback with null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
        callback('SIGNED_OUT', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.auth.signOut as any) = mockSignOut;

    // Use null session to be safe (already handled by default mocks if not specified?) 
    // Need to init auth state so it renders children
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
        callback('SIGNED_OUT', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    
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
    
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('refreshes profile data', async () => {
      // Mock user profile fetch for initial load
      const mockInitialProfile = vi.fn().mockResolvedValue({ data: { role: 'participant' }, error: null });
      
      const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ single: mockInitialProfile })
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      // Init session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
          callback('SIGNED_IN', { user: { id: '123' } });
          return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

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
      // Mock profile fetch ERROR
      const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
              single: vi.fn().mockRejectedValue(new Error('DB Error')),
          }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      // Init session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
          callback('SIGNED_IN', { user: { id: '123' } });
          return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      render(
          <AuthProvider>
              <TestComponent />
          </AuthProvider>
      );

      await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
      expect(screen.getByTestId('role')).toHaveTextContent('participant');
  });

  it('updates state on auth state change', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let authCallback: any;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
        authCallback = cb;
        // Init as null
        cb('SIGNED_OUT', null);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

});
