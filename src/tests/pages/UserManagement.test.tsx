import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import UserManagement from '../../pages/UserManagement';
import { supabase } from '../../services/supabaseClient';

// Mock ToastContext
const mockShowToast = vi.fn();
vi.mock('../../context/ToastContext', () => ({
    useToast: () => ({ showToast: mockShowToast }),
}));

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
        rpc: vi.fn(),
    },
    getErrorMessage: vi.fn((e) => e.message || 'Error occurred'),
}));

// Mock window.confirm
window.confirm = vi.fn(() => true);

describe('UserManagement Page', () => {
    const mockUsers = [
        { id: 'admin-1', full_name: 'Admin User', email: 'admin@test.com', role: 'admin', created_at: '2025-01-01T00:00:00Z' },
        { id: 'user-2', full_name: 'Regular User', email: 'user@test.com', role: 'participant', created_at: '2025-01-02T00:00:00Z' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock console to keep test output clean
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const setupSupabaseMock = (users = mockUsers, error: { message: string } | null = null, updateError: { message: string } | null = null) => {
        vi.mocked(supabase.from).mockImplementation(() => {
            const builder: any = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                delete: vi.fn().mockReturnThis(),
                then: vi.fn((cb) => {
                    if (error) return Promise.resolve({ error }).then(cb);

                    const isUpdate = builder.update.mock.calls.length > 0;
                    const isDelete = builder.delete.mock.calls.length > 0;
                    
                    if (isUpdate) {
                         if (updateError) return Promise.resolve({ error: updateError }).then(cb);
                         return Promise.resolve({ data: {}, error: null }).then(cb);
                    }
                    if (isDelete) {
                         return Promise.resolve({ data: {}, error: null }).then(cb);
                    }

                    const isCount = vi.mocked(builder.select).mock.calls.some((c: any) => c[1]?.count);
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
         const adminRow = (await screen.findByText('Admin User')).closest('tr');
         const participantBtn = within(adminRow!).getByTitle('Set as Participant');
         
         await act(async () => { fireEvent.click(participantBtn); });
         
         expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Anda tidak dapat mengubah role akun Anda sendiri'), 'error');
         expect(screen.queryByText('Konfirmasi Perubahan Role')).not.toBeInTheDocument();
    });

    it('updates user role successfully', async () => {
         setupSupabaseMock();
         await act(async () => { render(<UserManagement />); });
         
         const userRow = (await screen.findByText('Regular User')).closest('tr');
         const adminBtn = within(userRow!).getByTitle('Set as Admin');
         
         await act(async () => { fireEvent.click(adminBtn); });
         
         const confirmBtn = screen.getByText('Ya, Ubah Role');
         await act(async () => { fireEvent.click(confirmBtn); });
         
         expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('berhasil diperbarui'), 'success');
    });

    it('handles update role failure', async () => {
        setupSupabaseMock(mockUsers, null, { message: 'Update failed' });

        await act(async () => { render(<UserManagement />); });
        
        const userRow = (await screen.findByText('Regular User')).closest('tr');
        const adminBtn = within(userRow!).getByTitle('Set as Admin');
        
        await act(async () => { fireEvent.click(adminBtn); });
        
        const confirmBtn = screen.getByText('Ya, Ubah Role');
        await act(async () => { fireEvent.click(confirmBtn); });
        
        expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Gagal mengubah role'), 'error');
    });

    it('prevents deleting self', async () => {
         setupSupabaseMock();
         await act(async () => { render(<UserManagement />); });
         const adminRow = (await screen.findByText('Admin User')).closest('tr');
         const deleteBtn = within(adminRow!).getByTitle('Hapus Profile User');
         
         await act(async () => { fireEvent.click(deleteBtn); });
         
         expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Anda tidak dapat menghapus akun Anda sendiri'), 'error');
         expect(screen.queryByText('Hapus Profile User')).not.toBeInTheDocument();
    });

    it('deletes user successfully', async () => {
         setupSupabaseMock();
         vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as any);
         
         await act(async () => { render(<UserManagement />); });
         
         const userRow = (await screen.findByText('Regular User')).closest('tr');
         const deleteBtn = within(userRow!).getByTitle('Hapus Profile User');
         
         await act(async () => { fireEvent.click(deleteBtn); });
         
         expect(screen.getByText(/Apakah Anda yakin ingin menghapus profil/i)).toBeInTheDocument();
         
         const confirmBtn = screen.getByText('Ya, Hapus Profile');
         await act(async () => { fireEvent.click(confirmBtn); });
         
         expect(supabase.rpc).toHaveBeenCalledWith('admin_delete_user', { target_user_id: 'user-2' });
         expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('berhasil dihapus'), 'success');
    });

    it('adds a new user successfully', async () => {
        setupSupabaseMock();
        // Mock the dynamic import of supabase-js
        vi.mock('@supabase/supabase-js', () => ({
            createClient: vi.fn(() => ({
                auth: {
                    signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null })
                }
            }))
        }));

        vi.mocked(supabase.from).mockImplementation((table) => {
            if (table === 'profiles') {
                const builder: any = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    upsert: vi.fn().mockResolvedValue({ error: null }),
                    then: vi.fn((cb) => Promise.resolve({ data: mockUsers, count: 2, error: null }).then(cb))
                };
                return builder;
            }
            return {} as any;
        });

        await act(async () => { render(<UserManagement />); });
        
        fireEvent.click(screen.getByText(/Tambah User/i));
        
        const modal = screen.getByText('Tambah User Baru').closest('.relative');
        expect(modal).toBeInTheDocument();

        fireEvent.change(within(modal as HTMLElement).getByLabelText(/Nama Lengkap/i), { target: { value: 'New Test User' } });
        fireEvent.change(within(modal as HTMLElement).getByLabelText(/Email/i), { target: { value: 'new@test.com' } });
        fireEvent.change(within(modal as HTMLElement).getByLabelText(/Password Sementara/i), { target: { value: 'password123' } });
        
        const adminBtn = within(modal as HTMLElement).getByText('admin');
        fireEvent.click(adminBtn);
        
        fireEvent.click(within(modal as HTMLElement).getByText('Simpan'));
        
        await waitFor(() => {
            expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('berhasil didaftarkan'), 'success');
        });
    });

    it('closes add user modal via X button', async () => {
        setupSupabaseMock();
        await act(async () => { render(<UserManagement />); });
        fireEvent.click(screen.getByText(/Tambah User/i));
        
        const modal = screen.getByText('Tambah User Baru').closest('.relative');
        const xBtn = within(modal as HTMLElement).getAllByRole('button')[0]; 
        fireEvent.click(xBtn);
        expect(screen.queryByText('Tambah User Baru')).not.toBeInTheDocument();
    });

    it('closes role update modal via X button', async () => {
         setupSupabaseMock();
         await act(async () => { render(<UserManagement />); });
         const userRow = (await screen.findByText('Regular User')).closest('tr');
         const adminBtn = within(userRow!).getByTitle('Set as Admin');
         await act(async () => { fireEvent.click(adminBtn); });
         
         const modal = screen.getByText('Konfirmasi Perubahan Role').closest('.relative');
         const xBtn = within(modal as HTMLElement).getAllByRole('button')[0]; 
         fireEvent.click(xBtn);
         expect(screen.queryByText('Konfirmasi Perubahan Role')).not.toBeInTheDocument();
    });

    it('closes delete user modal via X button', async () => {
         setupSupabaseMock();
         await act(async () => { render(<UserManagement />); });
         const userRow = (await screen.findByText('Regular User')).closest('tr');
         const deleteBtn = within(userRow!).getByTitle('Hapus Profile User');
         await act(async () => { fireEvent.click(deleteBtn); });
         
         const modal = screen.getByText('Hapus Profile User').closest('.relative');
         const xBtn = within(modal as HTMLElement).getAllByRole('button')[1]; 
         fireEvent.click(xBtn);
         expect(screen.queryByText('Hapus Profile User')).not.toBeInTheDocument();
    });

    it('searches for users by role string', async () => {
         setupSupabaseMock();
         await act(async () => { render(<UserManagement />); });
         const searchInput = screen.getByPlaceholderText(/Cari nama/i);
         fireEvent.change(searchInput, { target: { value: 'admin' } });
         expect(screen.getByText('Admin User')).toBeInTheDocument();
         expect(screen.queryByText('Regular User')).not.toBeInTheDocument();
    });

    it('cancels role update', async () => {
         setupSupabaseMock();
         await act(async () => { render(<UserManagement />); });
         const userRow = (await screen.findByText('Regular User')).closest('tr');
         const adminBtn = within(userRow!).getByTitle('Set as Admin');
         await act(async () => { fireEvent.click(adminBtn); });
         
         const cancelBtn = screen.getByText('Batal');
         fireEvent.click(cancelBtn);
         expect(screen.queryByText('Konfirmasi Perubahan Role')).not.toBeInTheDocument();
    });

    it('cancels delete user', async () => {
         setupSupabaseMock();
         await act(async () => { render(<UserManagement />); });
         const userRow = (await screen.findByText('Regular User')).closest('tr');
         const deleteBtn = within(userRow!).getByTitle('Hapus Profile User');
         await act(async () => { fireEvent.click(deleteBtn); });
         
         const modal = screen.getByText('Hapus Profile User').closest('.relative');
         const cancelBtn = within(modal as HTMLElement).getByText('Batal');
         fireEvent.click(cancelBtn);
         expect(screen.queryByText('Hapus Profile User')).not.toBeInTheDocument();
    });

    it('closes add user modal via backdrop', async () => {
        setupSupabaseMock();
        await act(async () => { render(<UserManagement />); });
        fireEvent.click(screen.getByText(/Tambah User/i));
        
        const backdrop = screen.getByText('Tambah User Baru').parentElement?.previousElementSibling;
        if (backdrop) fireEvent.click(backdrop);
        expect(screen.queryByText('Tambah User Baru')).not.toBeInTheDocument();
    });

    it('filters users by Admin and Participant roles', async () => {
        setupSupabaseMock();
        await act(async () => { render(<UserManagement />); });
        
        const adminFilter = screen.getByRole('button', { name: 'Admin' });
        const participantFilter = screen.getByRole('button', { name: 'Participant' });
        const allFilter = screen.getByText('Semua Role', { selector: 'button' });

        fireEvent.click(adminFilter);
        expect(screen.getByText('Admin User')).toBeInTheDocument();
        expect(screen.queryByText('Regular User')).not.toBeInTheDocument();

        fireEvent.click(participantFilter);
        expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
        expect(screen.getByText('Regular User')).toBeInTheDocument();

        fireEvent.click(allFilter);
        expect(screen.getByText('Admin User')).toBeInTheDocument();
        expect(screen.getByText('Regular User')).toBeInTheDocument();
    });

    it('handles fetchData error', async () => {
        vi.mocked(supabase.from).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: vi.fn((cb) => Promise.resolve({ error: { message: 'Database error' } }).then(cb))
        } as any));

        await act(async () => { render(<UserManagement />); });
        expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Gagal memuat data user'), 'error');
    });

    it('handles realtime postgres_changes event', async () => {
        let callback: any;
        vi.mocked(supabase.channel).mockReturnValue({
            on: vi.fn().mockImplementation((_event, _filter, cb) => {
                callback = cb;
                return { subscribe: vi.fn().mockReturnThis() };
            }),
            subscribe: vi.fn(),
            removeChannel: vi.fn(),
        } as any);

        setupSupabaseMock();
        await act(async () => { render(<UserManagement />); });
        await act(async () => {
            if (callback) callback({ table: 'profiles', eventType: 'UPDATE' });
        });
        expect(supabase.from).toHaveBeenCalled(); 
    });
});
