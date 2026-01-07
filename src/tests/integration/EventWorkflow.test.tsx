import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { supabase } from '@/services/supabaseClient';
import CreateEvent from '@/pages/CreateEvent';
import Dashboard from '@/pages/Dashboard';

// --- Mocks ---
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn((callback) => {
        // Immediately invoke callback with mock session
        const mockSession = { user: { id: 'org-123', email: 'org@example.com', user_metadata: { full_name: 'Organizer' } } };
        callback('SIGNED_IN', mockSession);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
    from: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
      })),
    }
  },
  getStorageUrl: vi.fn((url) => url),
  getErrorMessage: vi.fn((e) => e.message || 'Error'),
}));

// Mock Crypto
Object.defineProperty(window, 'crypto', {
    value: {
        getRandomValues: vi.fn((arr) => {
            for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 100);
            return arr;
        }),
    },
});

// Mock Types
interface MockChain {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    then: ReturnType<typeof vi.fn>;
}

describe('Integration Test: Event Workflow', () => {
  const mockUser = { id: 'org-123', email: 'org@example.com', user_metadata: { full_name: 'Organizer' } };

  beforeEach(() => {
    vi.clearAllMocks();
    // Hide logs during test
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
        data: { session: { user: mockUser } as unknown as any }, 
        error: null 
    } as any);
    
    // Global mock for supabase.from
    vi.mocked(supabase.from).mockImplementation((table: string): any => {
        const chain: MockChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: vi.fn(function(this: any, cb) {
                let data: unknown = [];
                if (table === 'profiles') data = { role: 'admin' };
                if (table === 'events') data = [];
                return Promise.resolve({ data, error: null }).then(cb);
            }),
        };
        return chain;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows an organizer to create an event and see it in dashboard', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={['/create-event']}>
              <Routes>
                <Route path="/create-event" element={<CreateEvent />} />
                <Route path="/dashboard" element={<Dashboard />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </AuthProvider>
      );
    });

    // Fill Form
    fireEvent.change(screen.getByPlaceholderText('Nama Acara'), { target: { value: 'New Integration Event' } });
    
    const startDateBtns = screen.getAllByText('Pilih Tanggal');
    fireEvent.click(startDateBtns[0]);
    await waitFor(() => expect(screen.getByText('20')).toBeInTheDocument());
    fireEvent.click(screen.getByText('20'));

    const startTimeBtns = screen.getAllByText('--:--');
    fireEvent.click(startTimeBtns[0]);
    await waitFor(() => expect(screen.getByText('14:00')).toBeInTheDocument());
    fireEvent.click(screen.getByText('14:00'));

    fireEvent.change(screen.getByPlaceholderText('Online / Nama Gedung / Alamat...'), { target: { value: 'Virtual' } });
    fireEvent.change(screen.getByPlaceholderText('Jelaskan tentang acara ini secara detail...'), { target: { value: 'Test description content' } });

    fireEvent.click(screen.getByTitle('Ganti Gambar Cover Secara Acak'));

    const submitBtn = screen.getByText('Buat Acara');
    
    // We don't need to re-mock here, the global mock handles it
    await act(async () => {
        fireEvent.click(submitBtn);
    });

    expect(await screen.findByText('Event berhasil dibuat!')).toBeInTheDocument();
  });
});
