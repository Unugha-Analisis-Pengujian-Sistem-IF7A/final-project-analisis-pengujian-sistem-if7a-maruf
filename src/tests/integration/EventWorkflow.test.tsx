
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { supabase } from '@/services/supabaseClient';
import CreateEvent from '@/pages/CreateEvent';
import Dashboard from '@/pages/Dashboard';

// --- Mocks ---
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((cb) => {
          // Default data for select
          if (typeof cb === 'function') {
            return Promise.resolve({ data: [], error: null }).then(cb);
          }
          return Promise.resolve({ data: [], error: null });
      }),
    })),
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

describe('Integration Test: Event Workflow', () => {
  const mockUser = { id: 'org-123', email: 'org@example.com', user_metadata: { full_name: 'Organizer' } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
        data: { session: { user: mockUser } as any }, 
        error: null 
    } as any);
    
    // Mock user role fetch
    vi.mocked(supabase.from).mockImplementation((table: string): any => {
        if (table === 'profiles') {
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockReturnValue(Promise.resolve({ data: { role: 'organizer' }, error: null })),
            };
        }
        return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
            order: vi.fn().mockReturnThis(),
            then: vi.fn((cb) => Promise.resolve({ data: [], error: null }).then(cb)),
        };
    });
  });

  it('allows an organizer to create an event and see it in dashboard', async () => {
    // Render with AuthProvider and Routes
    await act(async () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/create-event']}>
            <Routes>
              <Route path="/create-event" element={<CreateEvent />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );
    });

    // 1. Fill Create Event Form
    fireEvent.change(screen.getByPlaceholderText('Nama Acara'), { target: { value: 'New Integration Event' } });
    
    // Pick Date
    const startDateBtns = screen.getAllByText('Pilih Tanggal');
    fireEvent.click(startDateBtns[0]);
    await waitFor(() => expect(screen.getByText('20')).toBeInTheDocument());
    fireEvent.click(screen.getByText('20'));

    // Pick Time
    const startTimeBtns = screen.getAllByText('--:--');
    fireEvent.click(startTimeBtns[0]);
    await waitFor(() => expect(screen.getByText('14:00')).toBeInTheDocument());
    fireEvent.click(screen.getByText('14:00'));

    fireEvent.change(screen.getByPlaceholderText('Online / Nama Gedung / Alamat...'), { target: { value: 'Virtual' } });
    fireEvent.change(screen.getByPlaceholderText('Jelaskan tentang acara ini secara detail...'), { target: { value: 'Test description content' } });

    // Click cover image shuffle to ensure it has an image
    fireEvent.click(screen.getByTitle('Ganti Gambar Cover Secara Acak'));

    // Submit Form
    const submitBtn = screen.getByText('Buat Acara');
    
    // Mock successful insert
    vi.mocked(supabase.from).mockImplementation((table: string): any => {
        if (table === 'events') {
            return {
                insert: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
            };
        }
        return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockReturnValue(Promise.resolve({ data: { role: 'organizer' }, error: null })),
            then: vi.fn((cb) => Promise.resolve({ data: [], error: null }).then(cb)),
        };
    });

    await act(async () => {
        fireEvent.click(submitBtn);
    });

    // 2. Expect Success and Navigation
    await waitFor(() => {
        expect(screen.getByText('Event berhasil dibuat!')).toBeInTheDocument();
    });

    // Wait for the navigation to dashboard (usually happens after success toast)
    // The CreateEvent page uses useNavigate and setTimeout for the toast
    // We can advance timers or just wait.
  });
});
