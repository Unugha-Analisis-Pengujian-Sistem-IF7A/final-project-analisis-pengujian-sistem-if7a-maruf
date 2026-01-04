import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EventDetail from '@/pages/EventDetail';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockQuery = (data: any = null, error: any = null) => {
    return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => Promise.resolve({ data, error }).then(callback)),
    };
};

// Mock Supabase
vi.mock('@/services/supabaseClient', () => ({
    supabase: {
        from: vi.fn(() => createMockQuery(null)),
    },
    getStorageUrl: vi.fn((path) => path ? `https://storage.com/${path}` : null),
    getErrorMessage: vi.fn((e) => e.message || 'Error occurred'),
}));

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

// Mock Navigator Clipboard
Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
    },
});

// Mock Window Confirm and Open
window.confirm = vi.fn(() => true);
window.open = vi.fn();
window.alert = vi.fn();

describe('EventDetail Page', () => {
    const mockEvent = {
        id: '123',
        title: 'Mastering Vitest',
        description: 'Learn how to test your React apps',
        date: '2025-12-25',
        time: '14:00:00',
        location: 'Virtual Zoom',
        type: 'Workshop',
        image_url: 'test-image.jpg',
        host_id: 'host-1'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(useAuth).mockReturnValue({ user: null } as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockReturnValue(createMockQuery(mockEvent) as any);
    });

    it('renders event details for public visitor', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/events/123']}>
                    <Routes>
                        <Route path="/events/:id" element={<EventDetail />} />
                    </Routes>
                </MemoryRouter>
            );
        });

        expect(await screen.findByText('Mastering Vitest')).toBeInTheDocument();
        expect(screen.getByText('Learn how to test your React apps')).toBeInTheDocument();
        expect(screen.getByText(/Virtual Zoom/i)).toBeInTheDocument();
        expect(screen.getByText('Masuk untuk Daftar')).toBeInTheDocument();
    });

    it('handles registration for logged-in user', async () => {
        const user = { id: 'user-1', email: 'user@test.com' };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(useAuth).mockReturnValue({ user } as any);

        // Mock check registration: not registered yet
        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'events') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return createMockQuery(mockEvent) as any;
            }
            if (table === 'registrations') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return createMockQuery(null) as any; // Not registered
            }
            return {} as any;
        });

        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/events/123']}>
                    <Routes>
                        <Route path="/events/:id" element={<EventDetail />} />
                    </Routes>
                </MemoryRouter>
            );
        });

        const regButton = screen.getByText('Daftar Sekarang');
        await act(async () => {
            fireEvent.click(regButton);
        });

        // Should show success state
        expect(await screen.findByText('Pendaftaran Berhasil!')).toBeInTheDocument();
    });

    it('shows notification toggles for registered user', async () => {
        const user = { id: 'user-1', email: 'user@test.com' };
        vi.mocked(useAuth).mockReturnValue({ user } as any);

        // Mock check registration: already registered
        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'events') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return createMockQuery(mockEvent) as any;
            }
            if (table === 'registrations') {
                return createMockQuery({ id: 'reg-1' }) as any; // Registered
            }
            return {} as any;
        });

        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/events/123']}>
                    <Routes>
                        <Route path="/events/:id" element={<EventDetail />} />
                    </Routes>
                </MemoryRouter>
            );
        });

        expect(await screen.findByText('Kamu Sudah Terdaftar!')).toBeInTheDocument();
        expect(screen.getByText('Pengaturan Notifikasi')).toBeInTheDocument();
        expect(screen.getByText('Email Reminder')).toBeInTheDocument();
        expect(screen.getByText('WhatsApp Info')).toBeInTheDocument();
    });

    it('handles host delete action', async () => {
        const user = { id: 'host-1' }; // User is the host
        vi.mocked(useAuth).mockReturnValue({ user } as any);
        
        const mockQuery = createMockQuery(mockEvent);
        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'events') return mockQuery as any;
            return createMockQuery(null) as any;
        });

        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/events/123']}>
                    <Routes>
                        <Route path="/events/:id" element={<EventDetail />} />
                        <Route path="/dashboard" element={<div>Dashboard</div>} />
                    </Routes>
                </MemoryRouter>
            );
        });

        const deleteButton = await screen.findByText('Hapus Event');
        await act(async () => {
            fireEvent.click(deleteButton);
        });

        expect(mockQuery.delete).toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalledWith('Event berhasil dihapus.');
    });

    it('adds event to calendar on click', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/events/123']}>
                    <Routes>
                        <Route path="/events/:id" element={<EventDetail />} />
                    </Routes>
                </MemoryRouter>
            );
        });

        const dateWidget = await screen.findByTitle('Tambahkan ke Google Calendar');
        fireEvent.click(dateWidget);

        expect(window.open).toHaveBeenCalledWith(expect.stringContaining('calendar.google.com'), '_blank', 'noopener,noreferrer');
    });

    it('copies link to clipboard', async () => {
        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/events/123']}>
                    <Routes>
                        <Route path="/events/:id" element={<EventDetail />} />
                    </Routes>
                </MemoryRouter>
            );
        });

        const copyButton = await screen.findByTitle('Salin Link');
        fireEvent.click(copyButton);

        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalledWith('Tautan berhasil disalin!');
    });

    it('toggles notifications', async () => {
        const user = { id: 'user-1', email: 'user@test.com' };
        vi.mocked(useAuth).mockReturnValue({ user } as any);

        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'events') return createMockQuery(mockEvent) as any;
            if (table === 'registrations') return createMockQuery({ id: 'reg-1' }) as any;
            return {} as any;
        });

        await act(async () => {
            render(
                <MemoryRouter initialEntries={['/events/123']}>
                    <Routes>
                        <Route path="/events/:id" element={<EventDetail />} />
                    </Routes>
                </MemoryRouter>
            );
        });

        await screen.findByText('Pengaturan Notifikasi');
        
        // Toggle Email (Default is ON, so this turns it OFF)
        const emailToggle = screen.getByText('Email Reminder').closest('div[class*="cursor-pointer"]');
        fireEvent.click(emailToggle!);
        // No alert on turn off
        expect(window.alert).not.toHaveBeenCalled();
        
        // Turn it back on
        fireEvent.click(emailToggle!);
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Berhasil! Pengingat email'));

        // Toggle WA
        const waToggle = screen.getByText('WhatsApp Info').closest('div[class*="cursor-pointer"]');
        fireEvent.click(waToggle!);
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Notifikasi WhatsApp aktif'));
        
        // Turn it off
        fireEvent.click(waToggle!);
    });

    it('opens location map correctly based on location type', async () => {
        // 1. Online Location
        const onlineEvent = { ...mockEvent, location: 'https://zoom.us/j/123' };
        vi.mocked(supabase.from).mockReturnValue(createMockQuery(onlineEvent) as any);

        const { unmount } = render(
            <MemoryRouter initialEntries={['/events/123']}>
                <Routes>
                    <Route path="/events/:id" element={<EventDetail />} />
                </Routes>
            </MemoryRouter>
        );

        const onlineWidget = await screen.findByTitle('Buka Link Meeting');
        fireEvent.click(onlineWidget);
        expect(window.open).toHaveBeenCalledWith('https://zoom.us/j/123', '_blank', 'noopener,noreferrer');
        
        unmount();

        // 2. Physical Location
        const physicalEvent = { ...mockEvent, location: 'UNUGHA Cilacap' };
        vi.mocked(supabase.from).mockReturnValue(createMockQuery(physicalEvent) as any);
        
        render(
            <MemoryRouter initialEntries={['/events/456']}>
                <Routes>
                    <Route path="/events/:id" element={<EventDetail />} />
                </Routes>
            </MemoryRouter>
        );

        const mapWidget = await screen.findByTitle('Buka Google Maps');
        fireEvent.click(mapWidget);
        expect(window.open).toHaveBeenCalledWith(expect.stringContaining('google.com/maps'), '_blank', 'noopener,noreferrer');
    });

    it('handles registration failure', async () => {
        const user = { id: 'user-1' };
        vi.mocked(useAuth).mockReturnValue({ user } as any);
        const insertMock = vi.fn().mockImplementation((onfulfilled: any) => Promise.resolve({ error: { message: 'Database error' } }).then(onfulfilled));

        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'events') return createMockQuery(mockEvent) as any;
            if (table === 'registrations') return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockReturnThis(),
                insert: insertMock,
                // Mock then for the select call on mount
                then: (onfulfilled: any) => Promise.resolve({ data: null }).then(onfulfilled)
            } as any;
            return {} as any;
        });

        await act(async () => {
             render(<MemoryRouter initialEntries={['/events/123']}><Routes><Route path="/events/:id" element={<EventDetail />} /></Routes></MemoryRouter>);
        });

        const regButton = await screen.findByText('Daftar Sekarang');
        await act(async () => {
            fireEvent.click(regButton);
        });
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Gagal mendaftar'));
    });

    it('handles event deletion failure', async () => {
        const user = { id: 'host-1' };
        vi.mocked(useAuth).mockReturnValue({ user } as any);
        const deleteMock = vi.fn().mockImplementation((onfulfilled: any) => Promise.resolve({ error: { message: 'Delete failed' } }).then(onfulfilled));

        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'events') return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockReturnThis(),
                delete: vi.fn().mockReturnThis(),
                then: (onfulfilled: any) => {
                    // Check if called for select (on mount) or delete
                    if (vi.mocked(supabase.from).mock.calls.length > 2) {
                         return deleteMock(onfulfilled);
                    }
                    return createMockQuery(mockEvent).then(onfulfilled);
                }
            } as any;
            return createMockQuery(null) as any;
        });

        await act(async () => {
             render(<MemoryRouter initialEntries={['/events/123']}><Routes><Route path="/events/:id" element={<EventDetail />} /></Routes></MemoryRouter>);
        });

        const deleteButton = await screen.findByText('Hapus Event');
        await act(async () => {
            fireEvent.click(deleteButton);
        });
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Gagal menghapus event'));
    });

    it('handles online mapping fallback', async () => {
        const platformEvent = { ...mockEvent, location: 'Online Zoom Class' };
        vi.mocked(supabase.from).mockReturnValue(createMockQuery(platformEvent) as any);

        render(<MemoryRouter initialEntries={['/events/123']}><Routes><Route path="/events/:id" element={<EventDetail />} /></Routes></MemoryRouter>);

        const onlineWidget = await screen.findByTitle('Buka Link Meeting');
        fireEvent.click(onlineWidget);
        expect(window.open).toHaveBeenCalledWith('https://zoom.us/join', '_blank', 'noopener,noreferrer');
    });

    it('cancels deletion', async () => {
        const user = { id: 'host-1' };
        vi.mocked(useAuth).mockReturnValue({ user } as any);
        window.confirm = vi.fn().mockReturnValue(false);
        const deleteMock = vi.fn();

        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'events') return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockReturnThis(),
                delete: deleteMock,
                then: (onfulfilled: any) => createMockQuery(mockEvent).then(onfulfilled)
            } as any;
            return createMockQuery(null) as any;
        });

        render(<MemoryRouter initialEntries={['/events/123']}><Routes><Route path="/events/:id" element={<EventDetail />} /></Routes></MemoryRouter>);

        const deleteBtn = await screen.findByText('Hapus Event');
        fireEvent.click(deleteBtn);
        expect(deleteMock).not.toHaveBeenCalled();
    });

    it('handles keyboard navigation for accessibility widgets', async () => {
        const mockOpen = vi.fn();
        window.open = mockOpen;
        
        await act(async () => {
             render(<MemoryRouter initialEntries={['/events/1']}><Routes><Route path="/events/:id" element={<EventDetail />} /></Routes></MemoryRouter>);
        });

        // Date Widget
        const dateWidget = await screen.findByTitle('Tambahkan ke Google Calendar');
        fireEvent.keyDown(dateWidget, { key: 'Enter' });
        expect(mockOpen).toHaveBeenCalled();

        // Location Widget
        const locWidget = screen.getByTitle('Buka Link Meeting');
        fireEvent.keyDown(locWidget, { key: ' ' }); // Space
        expect(mockOpen).toHaveBeenCalledTimes(2);
    });

    it('shows error alert if registration fails', async () => {
        vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-1' } } as any);
        const mockQuery = createMockQuery(null, { message: 'Limit' });
        vi.mocked(supabase.from).mockImplementation((table) => {
            if (table === 'registrations') return mockQuery as any;
            return createMockQuery(mockEvent) as any;
        });

        window.alert = vi.fn();
        await act(async () => {
             render(<MemoryRouter initialEntries={['/events/1']}><Routes><Route path="/events/:id" element={<EventDetail />} /></Routes></MemoryRouter>);
        });

        const regBtn = await screen.findByText('Daftar Sekarang');
        await act(async () => { fireEvent.click(regBtn); });
        expect(window.alert).toHaveBeenCalled();
    });

    it('shows error if online platform link is missing', async () => {
        vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-1' } } as any);
        const onlineNoLinkEvent = { ...mockEvent, location: 'Virtual Online' };
        vi.mocked(supabase.from).mockReturnValue(createMockQuery(onlineNoLinkEvent) as any);

        window.alert = vi.fn();
        await act(async () => {
             render(<MemoryRouter initialEntries={['/events/1']}><Routes><Route path="/events/:id" element={<EventDetail />} /></Routes></MemoryRouter>);
        });

        const locWidget = (await screen.findByText(/Virtual Event/i)).closest('[role="button"]') as HTMLElement;
        fireEvent.click(locWidget);
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Link meeting spesifik belum tersedia'));
    });

    it('handles keyboard navigation for notification toggles', async () => {
        vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-1', email: 'test@example.com' } } as any);
        const registeredEvent = { ...mockEvent, is_registered: true };
        vi.mocked(supabase.from).mockImplementation((table) => {
            if (table === 'registrations') return createMockQuery({ id: 'reg1' }) as any;
            return createMockQuery(registeredEvent) as any;
        });

        await act(async () => {
             render(<MemoryRouter initialEntries={['/events/1']}><Routes><Route path="/events/:id" element={<EventDetail />} /></Routes></MemoryRouter>);
        });

        const emailToggle = await screen.findByText('Email Reminder');
        fireEvent.keyDown(emailToggle.closest('[role="button"]')!, { key: 'Enter' });
        expect(screen.getByText('Notifikasi email dimatikan')).toBeInTheDocument();

        const waToggle = screen.getByText('WhatsApp Info');
        fireEvent.keyDown(waToggle.closest('[role="button"]')!, { key: ' ' }); // Space
        expect(screen.getByText('Update info via WhatsApp aktif')).toBeInTheDocument();
    });

    it('navigates to dashboard when ticket button clicked', async () => {
        vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-1' } } as any);
        const registeredEvent = { ...mockEvent, is_registered: true };
        vi.mocked(supabase.from).mockImplementation((table) => {
            if (table === 'registrations') return createMockQuery({ id: 'reg1' }) as any;
            return createMockQuery(registeredEvent) as any;
        });

        await act(async () => {
             render(
                 <MemoryRouter initialEntries={['/events/1']}>
                     <Routes>
                         <Route path="/events/:id" element={<EventDetail />} />
                         <Route path="/dashboard" element={<div>Dashboard Page</div>} />
                     </Routes>
                 </MemoryRouter>
             );
        });

        const dashboardBtn = await screen.findByText(/Lihat Tiket di Dashboard/i);
        await act(async () => {
             fireEvent.click(dashboardBtn);
        });
        
        expect(await screen.findByText('Dashboard Page')).toBeInTheDocument();
    });

    it('opens share modal', async () => {
        vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-1' } } as any);
        vi.mocked(supabase.from).mockImplementation((table) => {
            if (table === 'registrations') return createMockQuery(null) as any;
            return createMockQuery(mockEvent) as any;
        });

        await act(async () => {
             render(
                 <MemoryRouter initialEntries={['/events/1']}>
                     <Routes>
                         <Route path="/events/:id" element={<EventDetail />} />
                     </Routes>
                 </MemoryRouter>
             );
        });

        const shareBtn = await screen.findByTitle('Undang Teman');
        fireEvent.click(shareBtn);

        // Check for modal content
        expect(await screen.findByText('Bagikan tautannya:')).toBeInTheDocument();
        
        // Close modal
        const closeBtn = screen.getByLabelText('Close');
        fireEvent.click(closeBtn);
    });
});
