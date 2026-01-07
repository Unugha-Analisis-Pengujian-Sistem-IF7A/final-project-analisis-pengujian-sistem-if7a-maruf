import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Discover from '@/pages/Discover';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';

// Helper for Supabase Multi-Chaining - Hoisted
const { createMockQuery } = vi.hoisted(() => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockQuery: (data: any = [], error: any = null) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const query: any = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                ilike: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                single: vi.fn().mockReturnThis(),
                range: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                then: (onfulfilled?: (value: any) => any) => {
                     // Simulate async resolution
                     return Promise.resolve({ data, error }).then(onfulfilled);
                }
            };
            return query;
        }
    };
});

// Mock Supabase
vi.mock('@/services/supabaseClient', () => {
    return {
        supabase: {
            from: vi.fn(() => createMockQuery([])),
        },
        getStorageUrl: vi.fn((path) => path ? `https://storage.com/${path}` : null),
    };
});

// Mock ToastContext
const mockShowToast = vi.fn();
vi.mock('@/context/ToastContext', () => ({
    useToast: () => ({ showToast: mockShowToast }),
}));

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ user: null }),
}));

describe('Discover Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders search header and loading state', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <Discover />
                </MemoryRouter>
            );
        });

        expect(screen.getByText('Temukan Event Seru')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Cari event...')).toBeInTheDocument();
    });

    it('renders empty state when no events found', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockReturnValue(createMockQuery([], null) as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <Discover />
                </MemoryRouter>
            );
        });

        expect(await screen.findByText('Tidak ada event ditemukan.')).toBeInTheDocument();
    });

    it('renders events list from supabase', async () => {
        const mockEvents = [
            {
                id: '1',
                title: 'Tech Conference 2025',
                date: '2025-05-20',
                location: 'Grand Ballroom',
                type: 'Teknologi',
                status: 'Terbuka',
                organizations: { id: 'org1', name: 'Tech Org' }
            }
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockReturnValue(createMockQuery(mockEvents, null) as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <Discover />
                </MemoryRouter>
            );
        });

        // Check for card content
        expect(await screen.findByText(/Tech Conference 2025/i, {}, { timeout: 3000 })).toBeInTheDocument();
        expect(screen.getAllByText('Teknologi')[0]).toBeInTheDocument();
    });

    it('filters events by category', async () => {
        const mockQuery = createMockQuery([]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <Discover />
                </MemoryRouter>
            );
        });

        // Click 'Teknologi' filter
        const techFilter = screen.getByText('Teknologi');
        await act(async () => {
            fireEvent.click(techFilter);
        });

        // Check if eq was called with 'type', 'Teknologi'
        expect(mockQuery.eq).toHaveBeenCalledWith('type', 'Teknologi');
    });

    it('searches events by title', async () => {
        const mockQuery = createMockQuery([]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <Discover />
                </MemoryRouter>
            );
        });

        const searchInput = screen.getByPlaceholderText('Cari event...');
        fireEvent.change(searchInput, { target: { value: 'Music' } });

        await waitFor(() => {
            expect(mockQuery.ilike).toHaveBeenCalledWith('title', '%Music%');
        });
    });

    it('opens event preview modal when event card is clicked', async () => {
        const mockEvents = [
            {
                id: '1',
                title: 'Preview Event',
                date: '2025-05-20',
                location: 'Grand Ballroom',
                type: 'Seminar',
                organizations: { id: 'org1', name: 'Tech Org' }
            }
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockReturnValue(createMockQuery(mockEvents, null) as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <Discover />
                </MemoryRouter>
            );
        });

        const eventEl = await screen.findByText('Preview Event');
        
        await act(async () => {
            fireEvent.click(eventEl);
        });

        // Modal should open
        expect(await screen.findByTestId('modal-close-btn', {}, { timeout: 3000 })).toBeInTheDocument();
    });

    it('syncs search state with URL query parameter', async () => {
        const mockQuery = createMockQuery([]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/discover?q=Festival']}>
                    <Discover />
                </MemoryRouter>
            );
        });

        expect(screen.getByPlaceholderText('Cari event...')).toHaveValue('Festival');
        expect(mockQuery.ilike).toHaveBeenCalledWith('title', '%Festival%');
    });

    it('closes event preview modal', async () => {
        const mockEvents = [{ id: '1', title: 'Close Me', date: '2025-05-20', location: 'Here', type: 'Seminar' }];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockReturnValue(createMockQuery(mockEvents) as any);

        render(<MemoryRouter><Discover /></MemoryRouter>);

        const eventEl = await screen.findByText('Close Me');
        fireEvent.click(eventEl);
        
        const closeBtn = await screen.findByTestId('modal-close-btn');
        fireEvent.click(closeBtn);
        
        await waitFor(() => {
            expect(screen.queryByTestId('modal-close-btn')).not.toBeInTheDocument();
        });
    });
});
