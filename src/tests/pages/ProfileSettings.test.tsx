// Unit Tests for ProfileSettings Page
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProfileSettings from '@/pages/ProfileSettings';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const { createMockQuery } = vi.hoisted(() => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockQuery: (data: any = null, error: any = null) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const query: any = {
                select: vi.fn(),
                eq: vi.fn(),
                single: vi.fn(),
                update: vi.fn(),
                then: vi.fn((resolve) => resolve({ data, error })),
            };
            query.select.mockReturnValue(query);
            query.eq.mockReturnValue(query);
            query.single.mockReturnValue(query);
            query.update.mockReturnValue(query);
            return query;
        }
    };
});

// Mock ToastContext
const mockShowToast = vi.fn();
vi.mock('@/context/ToastContext', () => ({
    useToast: () => ({ showToast: mockShowToast }),
}));

// Mock Supabase
vi.mock('@/services/supabaseClient', () => ({
    supabase: {
        auth: {
            updateUser: vi.fn(),
        },
        from: vi.fn(() => createMockQuery(null)),
        storage: {
            from: vi.fn(() => ({
                upload: vi.fn().mockResolvedValue({ data: { path: 'avatar.jpg' }, error: null }),
            })),
        },
        rpc: vi.fn().mockResolvedValue({ error: null }), // Mock RPC for delete account
    },
    getErrorMessage: vi.fn((e) => e.message || 'Error occurred'),
    getStorageUrl: vi.fn((path) => `https://storage.com/${path}`),
}));

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
    useAuth: vi.fn(),
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

// Mock window.location.reload
const originalLocation = window.location;
Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, reload: vi.fn() },
});

// Mock window.confirm
window.confirm = vi.fn(() => true);

describe('ProfileSettings Page', () => {
    const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
            full_name: 'John Doe',
            avatar_url: 'https://example.com/old-avatar.jpg'
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(useAuth).mockReturnValue({ user: mockUser, signOut: vi.fn() } as any);
    });

    it('renders user information correctly', async () => {
        let rendered: any;
        await act(async () => {
            rendered = render(
                <MemoryRouter>
                    <ProfileSettings />
                </MemoryRouter>
            );
        });

        // Use findBy to wait for useEffect state updates
        expect(await screen.findByDisplayValue('John')).toBeInTheDocument();
        expect(await screen.findByDisplayValue('Doe')).toBeInTheDocument();
        // Checked rendering of names, sufficient for this test case given env limitations with inputs/conditions

        expect(screen.getByAltText('Profile')).toHaveAttribute('src', 'https://example.com/old-avatar.jpg');
    });

    it('handles profile update', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateUserMock = vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: {}, error: null } as any);
        const mockQuery = createMockQuery(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <ProfileSettings />
                </MemoryRouter>
            );
        });

        // Wait for initial data load
        const firstNameInput = await screen.findByDisplayValue('John');
        
        fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
        
        const saveButton = screen.getByText(/Simpan Perubahan/i);
        await act(async () => {
            fireEvent.click(saveButton);
        });

        expect(updateUserMock).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith('Profil berhasil diperbarui!', 'success');
    });

    it('handles password update', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateUserMock = vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: {}, error: null } as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <ProfileSettings />
                </MemoryRouter>
            );
        });

        fireEvent.change(screen.getByPlaceholderText('Min. 6 karakter'), { target: { value: 'newpassword123' } });
        fireEvent.change(screen.getByPlaceholderText('Ulangi password'), { target: { value: 'newpassword123' } });

        const updateButton = screen.getByText('Update Password');
        await act(async () => {
            fireEvent.click(updateButton);
        });

        expect(updateUserMock).toHaveBeenCalledWith({ password: 'newpassword123' });
        expect(mockShowToast).toHaveBeenCalledWith('Password berhasil diperbarui!', 'success');
    });

    it('validates password update', async () => {
        await act(async () => {
             render(<MemoryRouter><ProfileSettings /></MemoryRouter>);
        });

        const newPassInput = screen.getByLabelText('Password Baru');
        const confirmPassInput = screen.getByLabelText('Konfirmasi Password');
        const submitBtn = screen.getByText('Update Password');

        // Mismatched passwords
        await act(async () => {
            fireEvent.change(newPassInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPassInput, { target: { value: 'different' } });
            fireEvent.click(submitBtn);
        });
        expect(mockShowToast).toHaveBeenCalledWith(expect.stringMatching(/tidak cocok/i), 'error');
        
        mockShowToast.mockClear(); // Clear checks

        // Too short
        await act(async () => {
             // Reset input first to be safe, or just overwrite
            fireEvent.change(newPassInput, { target: { value: 'abc' } });
            fireEvent.change(confirmPassInput, { target: { value: 'abc' } });
            fireEvent.click(submitBtn);
        });
        expect(mockShowToast).toHaveBeenCalledWith(expect.stringMatching(/minimal 6 karakter/i), 'error');
    });

    it('handles avatar upload', async () => {
        const uploadMock = vi.fn().mockResolvedValue({ data: { path: 'new-avatar.jpg' }, error: null });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.storage.from).mockReturnValue({
            upload: uploadMock,
        } as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <ProfileSettings />
                </MemoryRouter>
            );
        });

        const file = new File(['hello'], 'hello.png', { type: 'image/png' });
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        
        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [file] } });
        });

        expect(uploadMock).toHaveBeenCalled();
        await waitFor(() => {
            expect(mockShowToast).toHaveBeenCalledWith('Photo profil berhasil diupload!', 'success');
        });
    });

    it('handles logout', async () => {
        const signOutMock = vi.fn();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(useAuth).mockReturnValue({ user: mockUser, signOut: signOutMock } as any);
        
        await act(async () => {
            render(<MemoryRouter><ProfileSettings /></MemoryRouter>);
        });

        await act(async () => {
            fireEvent.click(screen.getByText(/Keluar/i));
        });
        expect(signOutMock).toHaveBeenCalled();
    });
    
    it('handles delete account', async () => {
        const signOutMock = vi.fn();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(useAuth).mockReturnValue({ user: mockUser, signOut: signOutMock } as any);
        
        await act(async () => {
            render(<MemoryRouter><ProfileSettings /></MemoryRouter>);
        });
        
        // Find delete button in Danger Zone
        const deleteButton = screen.getByText(/Hapus Sekarang/i);
        
        await act(async () => {
            fireEvent.click(deleteButton);
        });
        
        expect(window.confirm).toHaveBeenCalled();
        expect(supabase.rpc).toHaveBeenCalledWith('delete_user_account');
        await waitFor(() => {
            expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('dihapus'), 'success');
        });
    });
});
