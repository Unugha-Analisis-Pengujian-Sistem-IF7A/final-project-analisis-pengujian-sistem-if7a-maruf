
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { supabase } from '@/services/supabaseClient';
import EventDetail from '@/pages/EventDetail';
import ParticipantDashboard from '@/pages/dashboard/ParticipantDashboard';

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
          if (typeof cb === 'function') {
            return Promise.resolve({ data: [], error: null }).then(cb);
          }
          return Promise.resolve({ data: [], error: null });
      }),
    })),
  },
  getStorageUrl: vi.fn((url) => url),
  getErrorMessage: vi.fn((e) => e.message || 'Error'),
}));

describe('Integration Test: Registration Flow', () => {
  const mockUser = { id: 'part-123', email: 'part@example.com' };
  const mockEvent = {
    id: 'event-456',
    title: 'Testing Integration',
    date: '2025-12-30',
    time: '10:00:00',
    location: 'Campus A',
    description: 'Detailed description',
    price: 0,
    capacity: 100,
    type: 'Seminar'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
        data: { session: { user: mockUser } }, 
        error: null 
    } as any);
  });

  it('allows a participant to register for an event via EventDetail', async () => {
    // Mock user role fetch and event fetch
    vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockReturnValue(Promise.resolve({ data: { role: 'participant' }, error: null })),
            } as any;
        }
        if (table === 'events') {
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockReturnValue(Promise.resolve({ data: mockEvent, error: null })),
            } as any;
        }
        if (table === 'registrations') {
             return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => Promise.resolve({ data: [], error: null }).then(cb)),
                insert: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
                single: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
            } as any;
        }
        return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((cb) => Promise.resolve({ data: [], error: null }).then(cb)),
        } as any;
    });

    await act(async () => {
        render(
          <AuthProvider>
            <MemoryRouter initialEntries={['/event/event-456']}>
              <Routes>
                <Route path="/event/:id" element={<EventDetail />} />
                <Route path="/dashboard" element={<ParticipantDashboard />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        );
    });

    // 1. Verify Event Data is Loaded
    expect(await screen.findByText('Testing Integration')).toBeInTheDocument();

    // 2. Click Register
    const registerBtn = screen.getByText(/Daftar Sekarang/i);
    
    await act(async () => {
        fireEvent.click(registerBtn);
    });

    // 3. Verify Success
    await waitFor(() => {
        expect(screen.getByText(/Pendaftaran Berhasil!/i)).toBeInTheDocument();
    });
  });
});
