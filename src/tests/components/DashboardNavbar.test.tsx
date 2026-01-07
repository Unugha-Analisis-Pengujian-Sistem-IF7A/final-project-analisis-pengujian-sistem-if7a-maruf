import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DashboardNavbar } from '../../App';
import { supabase } from '@/services/supabaseClient';

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock('@/context/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
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
}));

// Mock Notification API
const mockNotification = vi.fn();
(mockNotification as any).permission = 'granted';
(mockNotification as any).requestPermission = vi.fn().mockResolvedValue('granted');
vi.stubGlobal('Notification', mockNotification);

describe('DashboardNavbar', () => {
    const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User', avatar_url: 'http://test.com/avatar.jpg' }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({
            user: mockUser,
            role: 'organizer',
            signOut: vi.fn(),
        });

        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    beforeEach(() => {
        // Default Supabase mock for notifications
        vi.mocked(supabase.from).mockImplementation((table) => {
            if (table === 'notifications') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockResolvedValue({ 
                        data: [
                            { id: '1', title: 'Notif 1', message: 'Msg 1', is_read: false, created_at: new Date().toISOString() },
                            { id: '2', title: 'Notif 2', message: 'Msg 2', is_read: true, created_at: new Date().toISOString() }
                        ], 
                        error: null 
                    }),
                    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
                } as any;
            }
            return {
                select: vi.fn().mockReturnThis(),
            } as any;
        });
    });

    it('renders user info and navigation links', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <DashboardNavbar />
                </MemoryRouter>
            );
        });

        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Kalender')).toBeInTheDocument();
    });

    it('handles search input', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <DashboardNavbar />
                </MemoryRouter>
            );
        });

        const searchInput = screen.getByPlaceholderText('Cari event...');
        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'Concert' } });
        });
        expect(searchInput).toHaveValue('Concert');
        
        await act(async () => {
            fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
        });
    });

    it('opens and closes notification dropdown', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <DashboardNavbar />
                </MemoryRouter>
            );
        });

        const bellBtn = screen.getByTestId('notif-btn');
        
        await waitFor(() => expect(screen.queryByText('Notif 1')).not.toBeInTheDocument());
        
        await act(async () => {
             fireEvent.click(bellBtn);
        });

        expect(screen.getByText('Notifikasi')).toBeInTheDocument();
        expect(screen.getByText('Notif 1')).toBeInTheDocument();
        
        await act(async () => {
            fireEvent.mouseDown(document.body);
        });
        expect(screen.queryByText('Notif 1')).not.toBeInTheDocument();
    });

    it('marks notification as read', async () => {
         await act(async () => {
            render(
                <MemoryRouter>
                    <DashboardNavbar />
                </MemoryRouter>
            );
        });

        const bellBtn = screen.getByTestId('notif-btn');
        await act(async () => {
             fireEvent.click(bellBtn);
        });
        
        const notifItem = screen.getByText('Notif 1');
        await act(async () => {
            fireEvent.click(notifItem);
        });
        expect(supabase.from).toHaveBeenCalledWith('notifications');
    });

    it('opens and actions user menu', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <DashboardNavbar />
                </MemoryRouter>
            );
        });

        const userBtn = screen.getByText('Test User').closest('button');
        await act(async () => {
            fireEvent.click(userBtn!);
        });

        expect(screen.getByText('Pengaturan Profil')).toBeInTheDocument();
        expect(screen.getByText('Keluar Aplikasi')).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(screen.getByText('Keluar Aplikasi'));
        });
        expect(mockUseAuth().signOut).toHaveBeenCalled();
    });

    it('receives realtime notification and triggers push', async () => {
        let channelCallback: any;
        vi.mocked(supabase.channel).mockReturnValue({
            on: vi.fn().mockImplementation((event, filter, callback) => {
                channelCallback = callback;
                return { subscribe: vi.fn().mockReturnThis() };
            }),
            subscribe: vi.fn(),
        } as any);

        await act(async () => {
            render(<MemoryRouter><DashboardNavbar /></MemoryRouter>);
        });

        await act(async () => {
            channelCallback({
                new: { id: 'push-1', title: 'New Event', message: 'Join now!', type: 'info', user_id: 'user-1', is_read: false }
            });
        });

        expect(mockNotification).toHaveBeenCalledWith('New Event', expect.objectContaining({ body: 'Join now!' }));
    });
});
