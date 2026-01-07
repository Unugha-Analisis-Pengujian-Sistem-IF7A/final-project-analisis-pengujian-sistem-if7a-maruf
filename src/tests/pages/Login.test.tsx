// Unit Tests for Login Page
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from '@/pages/Login';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';

// Mock useToast
const mockShowToast = vi.fn();
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock Supabase
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { role: 'participant' }, error: null }),
        })),
      })),
    })),
  },
  getErrorMessage: vi.fn((err) => {
      if (typeof err === 'string') return err;
      if (err?.message) return err.message;
      return 'Error';
  }),
}));

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form by default', async () => {
     await act(async () => {
         render(<MemoryRouter><Login /></MemoryRouter>);
     });
     expect(screen.getByText('Selamat Datang Kembali')).toBeInTheDocument();
     expect(screen.getByPlaceholderText('mahasiswa@unugha.ac.id')).toBeInTheDocument();
     expect(screen.getByText('Masuk Sekarang')).toBeInTheDocument();
  });

  it('navigates to dashboard on successful login', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: { id: '123' } },
        error: null
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    await act(async () => {
        render(<MemoryRouter><Login /></MemoryRouter>);
    });

    await act(async () => {
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@test.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
        fireEvent.click(screen.getByText('Masuk Sekarang'));
    });

    await waitFor(() => expect(supabase.auth.signInWithPassword).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('displays error message on login failure', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' }
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    await act(async () => {
        render(<MemoryRouter><Login /></MemoryRouter>);
    });

    await act(async () => {
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'wrong@test.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByText('Masuk Sekarang'));
    });

    await waitFor(() => expect(screen.getByText(/GAGAL LOGIN/i)).toBeInTheDocument());
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('switches to register mode', async () => {
    await act(async () => {
        render(<MemoryRouter><Login /></MemoryRouter>);
    });
    
    await act(async () => {
        fireEvent.click(screen.getByText('Daftar Sekarang'));
    });
    
    expect(screen.getByText('Daftar Akun Baru')).toBeInTheDocument();
    expect(screen.getByText('Daftar Sekarang', { selector: 'button' })).toBeInTheDocument();
  });

  it('handles admin only mode restriction', async () => {
     // Mock login success but profile check failure (not admin)
     // Mock login success but profile check failure (not admin)
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: { user: { id: '123' } }, error: null } as any);
     
     // Mock profile check returning "participant"
     const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { role: 'participant' } });
     const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
     const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

     await act(async () => {
        render(<MemoryRouter><Login adminOnly={true} /></MemoryRouter>);
     });
     
     expect(screen.getByText('Admin Portal')).toBeInTheDocument();

     await act(async () => {
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@test.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
        fireEvent.click(screen.getByText('Masuk Sekarang'));
     });

     await waitFor(() => expect(supabase.auth.signOut).toHaveBeenCalled());
     expect(screen.getByText(/AKSES DITOLAK/i)).toBeInTheDocument();
  });



  it('handles forgot password mode', async () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    
    // Switch to forgot
    await act(async () => {
        fireEvent.click(screen.getByText('Lupa password?'));
    });
    expect(screen.getByText('Reset Password')).toBeInTheDocument();

    // Submit form
    // Submit form
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {}, error: null } as any);
    
    await act(async () => {
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'reset@test.com' } });
        fireEvent.click(screen.getByText('Kirim Link Reset'));
    });

    await waitFor(() => expect(screen.getByText('Email Reset Terkirim!')).toBeInTheDocument());

    // Back to login
    await act(async () => {
        fireEvent.click(screen.getByText('Kembali'));
    });
    expect(screen.queryByText('Email Reset Terkirim!')).not.toBeInTheDocument();
  });

  it('handles registration success', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(supabase.auth.signUp).mockResolvedValue({ data: { user: { id: '456' } }, error: null } as any);

    await act(async () => {
        render(<MemoryRouter><Login /></MemoryRouter>);
    });
    
    await act(async () => {
        fireEvent.click(screen.getByText('Daftar Sekarang'));
    });

    await act(async () => {
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@test.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
        fireEvent.click(screen.getByText('Daftar Sekarang', { selector: 'button' }));
    });

    await waitFor(() => expect(supabase.auth.signUp).toHaveBeenCalled());
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('cek email Anda untuk verifikasi akun'), 'success');
  });

  it('handles registration failure', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(supabase.auth.signUp).mockResolvedValue({ data: { user: null }, error: { message: 'Sign up failed' } } as any);

    await act(async () => {
        render(<MemoryRouter><Login /></MemoryRouter>);
    });
    
    await act(async () => {
        fireEvent.click(screen.getByText('Daftar Sekarang'));
    });

    await act(async () => {
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'fail@test.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
        fireEvent.click(screen.getByText('Daftar Sekarang', { selector: 'button' }));
    });

    await waitFor(() => expect(screen.getByText(/GAGAL LOGIN/i)).toBeInTheDocument());
    expect(screen.getByText('Sign up failed')).toBeInTheDocument();
  });

  it('handles invalid credentials specific error', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' }
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    await act(async () => {
        render(<MemoryRouter><Login /></MemoryRouter>);
    });

    await act(async () => {
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@test.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
        fireEvent.click(screen.getByText('Masuk Sekarang'));
    });

    await waitFor(() => expect(screen.getByText(/Kredensial login salah/i)).toBeInTheDocument());
  });

  it('handles database connection failure', async () => {
    vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        then: (onfulfilled: any) => Promise.resolve({ data: null, error: { code: 'PGRST301', message: 'Unauthorized' } }).then(onfulfilled)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await act(async () => {
        render(<MemoryRouter><Login /></MemoryRouter>);
    });

    await waitFor(() => {
        const wifiOff = document.querySelector('.lucide-wifi-off');
        expect(wifiOff).toBeInTheDocument();
    });
  });

  it('renders register mode via query params', async () => {
    vi.stubGlobal('location', { search: '?mode=register' });

    await act(async () => {
        render(<MemoryRouter initialEntries={['/login?mode=register']}><Login /></MemoryRouter>);
    });
    expect(screen.getByText('Daftar Akun Baru')).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it('handles reset password failure', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: null, error: { message: 'Reset failed' } } as any);
    await act(async () => {
        render(<MemoryRouter><Login /></MemoryRouter>);
    });
    await act(async () => {
        fireEvent.click(screen.getByText('Lupa password?'));
    });
    await act(async () => {
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'fail@test.com' } });
        fireEvent.click(screen.getByText('Kirim Link Reset'));
    });
    expect(await screen.findByText('Reset failed')).toBeInTheDocument();
  });

  it('handles connection check exception', async () => {
    vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ 
            then: (_: unknown) => { throw new Error('Crashed'); }
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    await act(async () => { render(<MemoryRouter><Login /></MemoryRouter>); });
    await waitFor(() => {
        expect(document.querySelector('.lucide-wifi-off')).toBeInTheDocument();
    });
  });
});
