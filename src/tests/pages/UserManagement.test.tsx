import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserManagement from '../../pages/UserManagement';
import { supabase } from '../../services/supabaseClient';

// Mock AuthContext
const mockCurrentUser = { id: 'admin-1', email: 'admin@test.com' };
vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({ user: mockCurrentUser }),
}));

// Mock Supabase
vi.mock('../../services/supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis(),
        })),
        removeChannel: vi.fn(),
    },
    getErrorMessage: vi.fn((e) => e.message || 'Error occurred'),
}));

// Mock window.confirm
window.confirm = vi.fn(() => true);
window.alert = vi.fn();

describe('UserManagement Page', () => {
    const mockUsers = [
        { id: 'admin-1', full_name: 'Admin User', email: 'admin@test.com', role: 'admin', created_at: '2025-01-01' },
        { id: 'user-2', full_name: 'Regular User', email: 'user@test.com', role: 'participant', created_at: '2025-01-02' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setupSupabaseMock = (users = mockUsers, error: any = null) => {
        vi.mocked(supabase.from).mockImplementation(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const builder: any = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => {
                    if (error) return Promise.resolve({ error }).then(cb);
                    const isCount = vi.mocked(builder.select).mock.calls.some(c => c[1]?.count);
                    if (isCount) {
                        return Promise.resolve({ count: users.length, error: null }).then(cb);
                    }
                    return Promise.resolve({ data: users, error: null }).then(cb);
                })
            };
            return builder;
        });
    };

    it('renders user list and stats', async () => {
         setupSupabaseMock();
         await act(async () => { render(<UserManagement />); });
         expect(await screen.findByText('Admin User')).toBeInTheDocument();
         expect(screen.getByText('Regular User')).toBeInTheDocument();
    });

    it('filters users by search', async () => {
         setupSupabaseMock();
         await act(async () => { render(<UserManagement />); });
         await screen.findByText('Admin User');
         const searchInput = screen.getByPlaceholderText(/Cari nama/i);
         fireEvent.change(searchInput, { target: { value: 'Regular' } });
         expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
         expect(screen.getByText('Regular User')).toBeInTheDocument();
    });

    it('prevents updating self role', async () => {
         setupSupabaseMock();
         await act(async () => { render(<UserManagement />); });
         const adminUserEl = await screen.findByText('Admin User');
         const adminRow = adminUserEl.closest('tr');
         const participantBtn = adminRow?.querySelectorAll('button')[2]; 
         await act(async () => { fireEvent.click(participantBtn!); });
         expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Anda tidak dapat mengubah role akun Anda sendiri'));
    });

    it('updates user role successfully', async () => {
         setupSupabaseMock();
         await act(async () => { render(<UserManagement />); });
         const regUserEl = await screen.findByText('Regular User');
         const userRow = regUserEl.closest('tr');
         const adminBtn = userRow?.querySelectorAll('button')[0]; 
         await act(async () => { fireEvent.click(adminBtn!); });
         expect(window.confirm).toHaveBeenCalled();
    });

    it('filters users by role', async () => {
         setupSupabaseMock();
         await act(async () => { render(<UserManagement />); });
         const organizerFilter = screen.getByText('Organizer', { selector: 'button' });
         fireEvent.click(organizerFilter);
         expect(organizerFilter).toHaveClass('bg-indigo-500');
    });

    it('handles refresh data click', async () => {
        setupSupabaseMock();
        await act(async () => { render(<UserManagement />); });
        const refreshBtn = screen.getByText(/Refresh Data/i);
        await act(async () => { fireEvent.click(refreshBtn); });
        expect(supabase.from).toHaveBeenCalled();
    });

    it('handles update role failure', async () => {
        let callCount = 0;
        vi.mocked(supabase.from).mockImplementation(() => {
            callCount++;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const builder: any = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => {
                    // Failure case for update call (which is the 5th call to 'from' usually)
                    // 1-3 stats, 4 fetch, 5 update
                    if (callCount >= 5) {
                        return Promise.resolve({ error: { message: 'Update failed' } }).then(cb);
                    }
                    const isCount = vi.mocked(builder.select).mock.calls.some(c => c[1]?.count);
                    if (isCount) return Promise.resolve({ count: 2, error: null }).then(cb);
                    return Promise.resolve({ data: mockUsers, error: null }).then(cb);
                })
            };
            return builder;
        });

        await act(async () => { render(<UserManagement />); });
        const regUserEl = await screen.findByText('Regular User');
        const adminBtn = regUserEl.closest('tr')?.querySelectorAll('button')[0];
        await act(async () => { fireEvent.click(adminBtn!); });
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Gagal mengubah role'));
    });

    it('handles realtime postgres_changes event', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let callback: any;
        vi.mocked(supabase.channel).mockReturnValue({
            on: vi.fn().mockImplementation((_event, _filter, cb) => {
                callback = cb;
                return { subscribe: vi.fn() };
            }),
            subscribe: vi.fn(),
            removeChannel: vi.fn(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        setupSupabaseMock();
        await act(async () => { render(<UserManagement />); });

        // Trigger the realtime callback
        await act(async () => {
            if (callback) callback();
        });

        // fetchData should be called again (initial + realtime)
        // Each fetchData calls from('profiles') multiple times (stats + fetch)
        expect(supabase.from).toHaveBeenCalledTimes(8); 
    });
});
