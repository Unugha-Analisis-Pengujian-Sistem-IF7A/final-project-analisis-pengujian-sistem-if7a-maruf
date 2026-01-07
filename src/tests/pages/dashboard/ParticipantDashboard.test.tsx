import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ParticipantDashboard } from '@/pages/dashboard/ParticipantDashboard';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import * as AuthContext from '@/context/AuthContext';

// Helper for Mock Query Chain
const createMockQuery = (data: any = [], error: any = null) => {
    const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => Promise.resolve({ data, error }).then(resolve)),
    };
    return query;
};

// Mock ToastContext
vi.mock('@/context/ToastContext', () => ({
    useToast: () => ({ showToast: vi.fn() }),
}));

// Mock Supabase
vi.mock('@/services/supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn(),
        })),
        removeChannel: vi.fn(),
    },
    getErrorMessage: vi.fn((e) => e?.message || 'Error error'),
    getStorageUrl: vi.fn((path) => path),
}));

const mockUser = { id: 'user-id', email: 'user@test.com', user_metadata: { full_name: 'Participant User' } };
vi.mock('@/context/AuthContext', () => ({
    useAuth: vi.fn(() => ({
        user: mockUser,
        role: 'participant',
        loading: false,
        signOut: vi.fn(),
        refreshProfile: vi.fn(),
    })),
}));

describe('ParticipantDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockImplementation(() => createMockQuery([]) as any);
    });

    it('renders welcome banner and empty state when no tickets', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <ParticipantDashboard />
                </MemoryRouter>
            );
        });
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /^Acara$/i })).toBeInTheDocument();
            expect(screen.getByText(/Belum ada acara mendatang/i)).toBeInTheDocument();
        });
    });

    it('renders tickets retrieved from supabase', async () => {
        const mockTickets = [
            {
                id: 'reg-1',
                event_id: 'event-1',
                status: 'confirmed',
                ticket_code: 'TESTCODE123',
                events: {
                    id: 'event-1',
                    title: 'Sample Event',
                    date: '2099-01-01',
                    time: '18:00',
                    location: 'Room 101',
                    image_url: 'event.jpg'
                }
            }
        ];
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockImplementation(() => createMockQuery(mockTickets) as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <ParticipantDashboard />
                </MemoryRouter>
            );
        });

        expect(await screen.findByText('Sample Event')).toBeInTheDocument();
        // Expect date to be rendered - appears in both desktop and mobile views
        expect(screen.getAllByText(/1 Jan 2099/).length).toBeGreaterThan(0);
    });

    it('opens event preview modal when ticket is clicked', async () => {
        const mockTickets = [
            {
                id: 'reg-1',
                event_id: 'event-1',
                status: 'confirmed',
                events: {
                    id: 'event-1',
                    title: 'Sample Event',
                    date: '2099-01-01',
                    time: '18:00',
                    location: 'Room 101',
                }
            }
        ];
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockImplementation(() => createMockQuery(mockTickets) as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <ParticipantDashboard />
                </MemoryRouter>
            );
        });

        const eventTitle = await screen.findByText('Sample Event');
        fireEvent.click(eventTitle);

        expect(await screen.findAllByText('Sample Event')).toHaveLength(2); 

        // Close it
        const closeBtn = screen.getByTestId('modal-close-btn'); 
        fireEvent.click(closeBtn);
        
        await waitFor(() => {
            expect(screen.getAllByText('Sample Event')).toHaveLength(1);
        });
    });

    it('renders with missing user name fallback', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockImplementation(() => createMockQuery([]) as any);

        // Mock Auth with missing name
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(AuthContext.useAuth).mockReturnValue({
            user: { id: 'u1', email: 'u1@t.com', user_metadata: {} },
            role: 'participant',
            loading: false,
            signOut: vi.fn(),
            refreshProfile: vi.fn()
        } as any);

        await act(async () => { render(<MemoryRouter><ParticipantDashboard /></MemoryRouter>); });
        expect(screen.getByRole('heading', { name: /^Acara$/i })).toBeInTheDocument();
    });

    it('renders ticket with fallbacks for missing data', async () => {
        const mockTickets = [{
            id: 'reg-2',
            event_id: 'e2',
            status: 'confirmed',
            events: {
                id: 'e2',
                title: 'No Status Event',
                date: '2099-02-01',
                time: '19:00',
                location: 'Secret'
            }
        }];
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockImplementation(() => createMockQuery(mockTickets) as any);

        await act(async () => { render(<MemoryRouter><ParticipantDashboard /></MemoryRouter>); });
        expect(await screen.findByText('No Status Event')).toBeInTheDocument();
    });

    it('returns null if event is missing in ticket', async () => {
        const mockTickets = [{ id: 'reg-3', event_id: 'ev-null', status: 'confirmed', events: null }];
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockImplementation(() => createMockQuery(mockTickets) as any);

        await act(async () => { render(<MemoryRouter><ParticipantDashboard /></MemoryRouter>); });
        
        expect(await screen.findByText(/Belum ada acara/i)).toBeInTheDocument();
    });
});
