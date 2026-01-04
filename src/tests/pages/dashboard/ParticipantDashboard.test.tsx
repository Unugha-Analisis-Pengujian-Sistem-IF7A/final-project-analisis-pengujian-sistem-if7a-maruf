import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ParticipantDashboard } from '@/pages/dashboard/ParticipantDashboard';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import * as AuthContext from '@/context/AuthContext';


// Mock Supabase
vi.mock('@/services/supabaseClient', () => ({
    supabase: {
        from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        order: vi.fn().mockResolvedValue({ data: [] }),
                    })),
                })),
                insert: vi.fn().mockResolvedValue({ error: null }),
        })),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn(),
        })),
        removeChannel: vi.fn(),
    },
    getErrorMessage: vi.fn(),
    getStorageUrl: vi.fn(),
}));

const mockUser = { id: 'user-id', email: 'user@test.com', user_metadata: { full_name: 'Participant User' } };
vi.mock('@/context/AuthContext', () => ({
    useAuth: vi.fn(() => ({
        user: mockUser,
        role: 'participant',
    })),
}));

describe('ParticipantDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(supabase.from).mockImplementation(() => ({
            select: vi.fn(() => ({
                count: 0,
                data: [],
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any);
    });
    it('renders welcome banner and empty state when no tickets', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <ParticipantDashboard />
                </MemoryRouter>
            );
        });
        expect(screen.getByText(/Halo, Participant User!/i)).toBeInTheDocument();
        expect(screen.getByText(/Kamu belum mendaftar event apapun/i)).toBeInTheDocument();
    });

    it('renders tickets retrieved from supabase', async () => {
        const mockTickets = [
            {
                id: 'reg-1',
                status: 'confirmed',
                ticket_code: 'TESTCODE123',
                events: {
                    id: 'event-1',
                    title: 'Sample Event',
                    date: '2025-01-01',
                    time: '18:00',
                    location: 'Room 101',
                    status: 'Open',
                    image_url: 'event.jpg'
                }
            }
        ];

        // Update mock for this specific test
        const selectMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockTickets })
            })
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <ParticipantDashboard />
                </MemoryRouter>
            );
        });

        expect(await screen.findByText('Sample Event')).toBeInTheDocument();
        expect(screen.getByText(/ID: TESTCODE/i)).toBeInTheDocument();
        expect(screen.getByText('TERDAFTAR')).toBeInTheDocument();
    });

    it('opens event preview modal when ticket is clicked', async () => {
        const mockTickets = [
            {
                id: 'reg-1',
                events: {
                    id: 'event-1',
                    title: 'Sample Event',
                    date: '2025-01-01',
                    time: '18:00',
                    location: 'Room 101',
                    status: 'Open'
                }
            }
        ];
        
        const selectMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockTickets })
            })
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <ParticipantDashboard />
                </MemoryRouter>
            );
        });

        const ticketCard = screen.getByText('Sample Event').closest('.cursor-pointer');
        fireEvent.click(ticketCard!);

        // Modal should render (event title appears again in modal)
        // Since we mocked EventPreviewModal in other tests but NOT here, 
        // it will render the real one, which is fine as we want to cover it too.
        expect(await screen.findAllByText('Sample Event')).toHaveLength(2); // One in list, one in modal

        // Close it
        const closeBtn = screen.getByTestId('modal-close-btn');
        fireEvent.click(closeBtn);
        await waitFor(() => {
            expect(screen.getAllByText('Sample Event')).toHaveLength(1);
        });
    });

    it('renders with missing user name fallback', async () => {
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [] }) }) })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        // Mock Auth with missing name
        vi.mocked(AuthContext.useAuth).mockReturnValue({
            user: { id: 'u1', email: 'u1@t.com', user_metadata: {} },
            role: 'participant'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        await act(async () => { render(<MemoryRouter><ParticipantDashboard /></MemoryRouter>); });
        expect(screen.getByText(/Halo, Mahasiswa!/i)).toBeInTheDocument();
    });

    it('renders ticket with fallbacks for missing data', async () => {
        const mockTickets = [{
            id: 'reg-2',
            // missing ticket_code
            events: {
                id: 'e2',
                title: 'No Status Event',
                // missing image_url, status
                date: '2025-02-01',
                time: '19:00',
                location: 'Secret'
            }
        }];
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockTickets }) }) })
        } as any);

        await act(async () => { render(<MemoryRouter><ParticipantDashboard /></MemoryRouter>); });
        expect(await screen.findByText('No Status Event')).toBeInTheDocument();
        expect(screen.getByText('Upcoming')).toBeInTheDocument(); // Background status fallback
        expect(screen.getByText(/ID:/i)).toBeInTheDocument(); // substring(0,8) of undefined/null is usually handled by ?
    });

    it('returns null if event is missing in ticket', async () => {
        const mockTickets = [{ id: 'reg-3', events: null }];
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockTickets }) }) })
        } as any);

        await act(async () => { render(<MemoryRouter><ParticipantDashboard /></MemoryRouter>); });
        // Empty state is not shown because tickets.length is 1, but nothing is rendered in map
        // So we just check it doesn't crash
        expect(screen.queryByText('Upcoming')).not.toBeInTheDocument();
    });

    it('handles keyboard navigation on ticket card', async () => {
        const mockTickets = [{
            id: 'reg-1',
            ticket_code: 'KBD-TEST',
            events: {
                id: 'event-1',
                title: 'Keyboard Event',
                date: '2025-01-01',
                time: '10:00',
                location: 'Room 101'
            }
        }];
        
        const selectMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockTickets })
            })
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

        await act(async () => {
            render(<MemoryRouter><ParticipantDashboard /></MemoryRouter>);
        });

        const ticketCard = (await screen.findByText('Keyboard Event')).closest('[role="button"]') as HTMLElement;
        
        // Enter key
        await act(async () => {
            fireEvent.keyDown(ticketCard, { key: 'Enter', code: 'Enter' });
        });
        expect(screen.getAllByText('Keyboard Event')).toHaveLength(2); // In list and in modal

        // Close modal
        fireEvent.click(screen.getByTestId('modal-close-btn'));
        await waitFor(() => {
            expect(screen.getAllByText('Keyboard Event')).toHaveLength(1);
        });

        // Space key
        await act(async () => {
             fireEvent.keyDown(ticketCard, { key: ' ', code: 'Space' });
        });
        expect(screen.getAllByText('Keyboard Event')).toHaveLength(2);
    });
});
