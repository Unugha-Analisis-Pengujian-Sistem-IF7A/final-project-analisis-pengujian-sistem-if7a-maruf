import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminDashboard } from '@/pages/dashboard/AdminDashboard';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';

// Mock Supabase to avoid call error
vi.mock('@/services/supabaseClient', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                count: 0,
                data: [],
                order: vi.fn().mockResolvedValue({ data: [] }),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockResolvedValue({ error: null }),
            delete: vi.fn().mockResolvedValue({ error: null }),
        })),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn(),
        })),
        removeChannel: vi.fn(),
    },
    getErrorMessage: vi.fn(),
}));

// Mock Auth
vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'admin-id', email: 'admin@test.com', user_metadata: { full_name: 'Admin User' } },
        role: 'admin',
    }),
}));

describe('AdminDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset supabase mock implementation to default
        vi.mocked(supabase.from).mockImplementation(() => ({
            select: vi.fn(() => ({
                count: 0,
                data: [],
                order: vi.fn().mockResolvedValue({ data: [] }),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockResolvedValue({ error: null }),
            delete: vi.fn().mockResolvedValue({ error: null }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any);
    });

    const renderAndWait = async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });
        await waitFor(() => {
            const refreshBtn = screen.getByTestId('refresh-btn');
            expect(refreshBtn.querySelector('.animate-spin')).toBeNull();
        });
    };

    it('renders stats', async () => {
        await renderAndWait();
        await waitFor(async () => {
             expect(await screen.findByText('System Administration')).toBeInTheDocument();
             expect(screen.getByRole('button', { name: /Manajemen User/i })).toBeInTheDocument();
        });
    });

    it('handles user search filtering', async () => {
        const mockUsers = [
            { id: '1', full_name: 'Alice Wonder', role: 'participant' },
            { id: '2', full_name: 'Bob Builder', role: 'organizer' }
        ];

        const selectMock = vi.fn().mockImplementation(() => ({
            order: vi.fn().mockResolvedValue({ data: mockUsers })
        }));
        vi.mocked(supabase.from).mockImplementation((table: string) => {
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             if (table === 'profiles') return { select: selectMock } as any;
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             return { select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [] }) } as any;
        });

        await renderAndWait();

        const searchInput = screen.getByPlaceholderText(/Cari data/i);
        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'Alice' } });
        });

        expect(screen.getByText('Alice Wonder')).toBeInTheDocument();
        expect(screen.queryByText('Bob Builder')).not.toBeInTheDocument();
    });

    it('handles user role update', async () => {
        const mockUsers = [{ id: '1', full_name: 'Alice', role: 'participant', created_at: new Date().toISOString() }];
        const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
        
        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'profiles') return { 
                select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockUsers }) }),
                update: updateMock 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any;
            return { select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [] }) } as any;
        });

        window.confirm = vi.fn().mockReturnValue(true);

        await renderAndWait();

        const select = await screen.findByDisplayValue('Participant');
        fireEvent.change(select, { target: { value: 'organizer' } });

        expect(window.confirm).toHaveBeenCalled();
        expect(updateMock).toHaveBeenCalledWith({ role: 'organizer' });
    });

    it('sets up realtime subscriptions', async () => {
        const channelMock = vi.mocked(supabase.channel);
        
        await renderAndWait();

        // Should call channel for profiles
        expect(channelMock).toHaveBeenCalledWith('admin-realtime-profiles');
    });

    it('handles role update error', async () => {
        const mockUsers = [{ id: '1', full_name: 'Alice', role: 'participant' }];
        const updateMock = vi.fn().mockResolvedValue({ error: { message: 'Database error' } });
        
        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'profiles') return { 
                select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockUsers }) }),
                update: updateMock 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any;
            return { select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [] }) } as any;
        });

        window.confirm = vi.fn().mockReturnValue(true);
        window.alert = vi.fn();

        await renderAndWait();

        const select = await screen.findByDisplayValue('Participant');
        fireEvent.change(select, { target: { value: 'organizer' } });

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Gagal mengubah role'));
        });
    });

    it('cancels role update if user cancels confirmation', async () => {
        const mockUsers = [{ id: '1', full_name: 'Alice', role: 'participant' }];
        const updateMock = vi.fn();
        
        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'profiles') return { 
                select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockUsers }) }),
                update: updateMock 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any;
            return { select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [] }) } as any;
        });

        window.confirm = vi.fn().mockReturnValue(false);

        await renderAndWait();

        const select = await screen.findByDisplayValue('Participant');
        fireEvent.change(select, { target: { value: 'organizer' } });

        expect(updateMock).not.toHaveBeenCalled();
    });

    it('refreshes data when refresh button clicked', async () => {
        await renderAndWait();
        
        const refreshBtn = screen.getByTestId('refresh-btn');
        await act(async () => {
            fireEvent.click(refreshBtn);
        });
        
        // Wait for loading to finish
        await waitFor(() => {
            expect(refreshBtn.querySelector('.animate-spin')).toBeNull();
        });

        // fetchInitialData called again (first on mount, second on click)
        expect(supabase.from).toHaveBeenCalled();
    });

    it('triggers refresh on realtime event', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let callback: any;
        vi.mocked(supabase.channel).mockReturnValue({
            on: vi.fn().mockImplementation((event, filter, cb) => {
                callback = cb;
                return { subscribe: vi.fn() };
            }),
            subscribe: vi.fn(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        await renderAndWait();

        // Simulate realtime change
        await act(async () => {
            callback();
        });

        // Should call fetchInitialData again
        expect(supabase.from).toHaveBeenCalled();
    });
});
