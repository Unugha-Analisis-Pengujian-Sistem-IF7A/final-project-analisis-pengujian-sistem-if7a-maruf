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
    },
    getErrorMessage: vi.fn((e) => e.message || 'Error occurred'),
    getStorageUrl: vi.fn((path) => `https://storage.com/${path}`),
}));

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

// Mock Notification API
const mockNotification = vi.fn();
(mockNotification as any).permission = 'default';
(mockNotification as any).requestPermission = vi.fn().mockResolvedValue('granted');
vi.stubGlobal('Notification', mockNotification);

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

describe('ProfileSettings Page', () => {
    const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        user_metadata: {
            full_name: 'John Doe',
            avatar_url: 'https://example.com/old-avatar.jpg'
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({ user: mockUser, signOut: vi.fn() } as any);
        (Notification as any).permission = 'default';
    });

    it('renders user information correctly', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <ProfileSettings />
                </MemoryRouter>
            );
        });

        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
        expect(screen.getByAltText('Profile')).toHaveAttribute('src', 'https://example.com/old-avatar.jpg');
    });

    it('handles profile update', async () => {
        const updateUserMock = vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: {}, error: null } as any);
        const mockQuery = createMockQuery(null);
        vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <ProfileSettings />
                </MemoryRouter>
            );
        });

        const nameInput = screen.getByPlaceholderText('Masukkan nama lengkap');
        fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });

        const saveButton = screen.getByText(/Simpan Profil/i);
        await act(async () => {
            fireEvent.click(saveButton);
        });

        expect(updateUserMock).toHaveBeenCalledWith({ data: { full_name: 'Jane Doe' } });
        expect(mockQuery.update).toHaveBeenCalledWith({ full_name: 'Jane Doe' });
        
        await waitFor(() => {
            expect(screen.getByText('Profil berhasil diperbarui!')).toBeInTheDocument();
        });
    });

    it('handles password update', async () => {
        const updateUserMock = vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: {}, error: null } as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <ProfileSettings />
                </MemoryRouter>
            );
        });

        fireEvent.change(screen.getByPlaceholderText('Min. 6 karakter'), { target: { value: 'newpassword123' } });
        fireEvent.change(screen.getByPlaceholderText('Ulangi password baru'), { target: { value: 'newpassword123' } });

        const updateButton = screen.getByText('Update Password');
        await act(async () => {
            fireEvent.click(updateButton);
        });

        expect(updateUserMock).toHaveBeenCalledWith({ password: 'newpassword123' });
        await waitFor(() => {
             expect(screen.getByText('Password berhasil diperbarui!')).toBeInTheDocument();
        });
    });

    it('toggles push notifications', async () => {
        // Mock Notification API properly as a constructor
        const mockRequestPermission = vi.fn().mockResolvedValue('granted');
        const MockNotification = vi.fn();
        (MockNotification as any).permission = 'default';
        (MockNotification as any).requestPermission = mockRequestPermission;
        
        vi.stubGlobal('Notification', MockNotification);
        
        await act(async () => {
            render(<MemoryRouter><ProfileSettings /></MemoryRouter>);
        });

        const toggle = screen.getByTestId('push-toggle');
        await act(async () => {
            fireEvent.click(toggle);
        });

        expect(mockRequestPermission).toHaveBeenCalled();
        expect(MockNotification).toHaveBeenCalledWith('Notifikasi Diaktifkan', expect.any(Object));
        expect(toggle).toHaveClass('bg-indigo-600');
    });

    it('validates password update', async () => {
        await act(async () => {
             render(<MemoryRouter><ProfileSettings /></MemoryRouter>);
        });

        const newPassInput = screen.getByLabelText('Password Baru');
        const confirmPassInput = screen.getByLabelText('Konfirmasi Password Baru');
        const submitBtn = screen.getByText('Update Password');

        // Mismatched passwords
        await act(async () => {
            fireEvent.change(newPassInput, { target: { value: 'password123' } });
            fireEvent.change(confirmPassInput, { target: { value: 'different' } });
            fireEvent.click(submitBtn);
        });
        expect(screen.getByText(/Konfirmasi password tidak cocok/i)).toBeInTheDocument();

        // Too short
        await act(async () => {
            fireEvent.change(newPassInput, { target: { value: 'abc' } });
            fireEvent.change(confirmPassInput, { target: { value: 'abc' } });
            fireEvent.click(submitBtn);
        });
        expect(screen.getByText(/Password minimal 6 karakter/i)).toBeInTheDocument();
    });

    it('handles denied notification permission', async () => {
        window.Notification = {
            permission: 'denied',
            requestPermission: vi.fn(),
        } as any;
        window.alert = vi.fn();

         await act(async () => {
             render(<MemoryRouter><ProfileSettings /></MemoryRouter>);
        });

        const toggle = screen.getByTestId('push-toggle');
        await act(async () => {
            fireEvent.click(toggle);
        });
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('DIBLOKIR'));
    });

    it('handles avatar upload', async () => {
        const uploadMock = vi.fn().mockResolvedValue({ data: { path: 'new-avatar.jpg' }, error: null });
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
            expect(screen.getByText('Photo profil berhasil diupload!')).toBeInTheDocument();
        });
    });

    it('handles logout', async () => {
        const signOutMock = vi.fn();
        vi.mocked(useAuth).mockReturnValue({ user: mockUser, signOut: signOutMock } as any);
        
        await act(async () => {
            render(<MemoryRouter><ProfileSettings /></MemoryRouter>);
        });

        await act(async () => {
            fireEvent.click(screen.getByText(/Keluar/i));
        });
        expect(signOutMock).toHaveBeenCalled();
    });

    it('toggles push notifications OFF', async () => {
        // Force granted state initially
        (Notification as any).permission = 'granted';
        
        await act(async () => {
            render(<MemoryRouter><ProfileSettings /></MemoryRouter>);
        });

        const toggle = screen.getByTestId('push-toggle');
        // Initial state should be ON because permission is granted
        expect(toggle).toHaveClass('bg-indigo-600');

        await act(async () => {
            fireEvent.click(toggle);
        });

        expect(toggle).toHaveClass('bg-slate-200');
        expect(screen.getByText(/Notifikasi dimatikan/i)).toBeInTheDocument();
    });

    it('handles failed or rejected notification permission', async () => {
        const mockRequestPermission = vi.fn().mockResolvedValue('denied');
        const MockNotification = vi.fn();
        (MockNotification as any).permission = 'default';
        (MockNotification as any).requestPermission = mockRequestPermission;
        vi.stubGlobal('Notification', MockNotification);
        window.alert = vi.fn();

        await act(async () => {
            render(<MemoryRouter><ProfileSettings /></MemoryRouter>);
        });

        fireEvent.click(screen.getByTestId('push-toggle'));
        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Izin notifikasi ditolak'));
        });
    });

    it('handles notification request throw error', async () => {
        const mockRequestPermission = vi.fn().mockRejectedValue(new Error('API failed'));
        const MockNotification = vi.fn();
        (MockNotification as any).permission = 'default';
        (MockNotification as any).requestPermission = mockRequestPermission;
        vi.stubGlobal('Notification', MockNotification);
        window.alert = vi.fn();

        await act(async () => {
            render(<MemoryRouter><ProfileSettings /></MemoryRouter>);
        });

        fireEvent.click(screen.getByTestId('push-toggle'));
        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Gagal meminta izin'));
        });
    });

    it('shows error when notification not supported', async () => {
        delete (window as any).Notification;
        window.alert = vi.fn();

        await act(async () => {
            render(<MemoryRouter><ProfileSettings /></MemoryRouter>);
        });

        fireEvent.click(screen.getByTestId('push-toggle'));
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('tidak mendukung'));
    });
});
