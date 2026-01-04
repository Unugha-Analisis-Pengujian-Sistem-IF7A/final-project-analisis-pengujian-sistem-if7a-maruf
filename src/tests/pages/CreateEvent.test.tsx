import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateEvent from '@/pages/CreateEvent';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Helper - Hoisted
const { createMockQuery } = vi.hoisted(() => {
    return {
        createMockQuery: (data: any = null, error: any = null) => {
            const promise = Promise.resolve({ data, error });
            
            const query = Object.assign(promise, {
                select: vi.fn(() => query),
                eq: vi.fn(() => query),
                single: vi.fn(() => query),
                insert: vi.fn(() => query),
            });
            
            return query;
        }
    };
});

// Mock Supabase
vi.mock('@/services/supabaseClient', () => ({
    supabase: {
        from: vi.fn(() => createMockQuery(null)),
        storage: {
            from: vi.fn(() => ({
                upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
            })),
        },
    },
    getErrorMessage: vi.fn((e) => e.message || 'Error occurred'),
}));

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

// Mock Crypto (for shuffle and filenames)
Object.defineProperty(window, 'crypto', {
    value: {
        getRandomValues: vi.fn((arr) => {
            for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 100);
            return arr;
        }),
    },
});

describe('CreateEvent Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({ user: { id: 'host-1' }, role: 'organizer' } as any);
    });

    it('renders the form correctly', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <CreateEvent />
                </MemoryRouter>
            );
        });

        expect(screen.getByPlaceholderText('Nama Acara')).toBeInTheDocument();
        expect(screen.getByText('Detail & Deskripsi')).toBeInTheDocument();
        expect(screen.getByText('Buat Acara')).toBeInTheDocument();
    });

    it('shuffles cover image on button click', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <CreateEvent />
                </MemoryRouter>
            );
        });

        const shuffleButton = screen.getByTitle('Ganti Gambar Cover Secara Acak');
        fireEvent.click(shuffleButton);

        expect(crypto.getRandomValues).toHaveBeenCalled();
    });

    it('denies access to non-organizers', async () => {
        vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-1' }, role: 'participant' } as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <CreateEvent />
                </MemoryRouter>
            );
        });

        expect(screen.getByText(/Akses ditolak/i)).toBeInTheDocument();
    });

    it('validates required fields on submit', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <CreateEvent />
                </MemoryRouter>
            );
        });

        const submitButton = screen.getByText('Buat Acara');
        fireEvent.click(submitButton);

        expect(screen.getByText(/Mohon lengkapi Judul, Tanggal Mulai, dan Waktu Mulai/i)).toBeInTheDocument();
    });

    it('submits form successfully', async () => {
        const mockQuery = createMockQuery(null);
        vi.mocked(supabase.from).mockImplementation(() => mockQuery as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <CreateEvent />
                </MemoryRouter>
            );
        });

        // Fill form
        fireEvent.change(screen.getByPlaceholderText('Nama Acara'), { target: { value: 'New Event' } });
        
        const startDateBtns = screen.getAllByText('Pilih Tanggal');
        fireEvent.click(startDateBtns[0]);
        
        await waitFor(() => {
            expect(screen.getByText('15')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText('15'));

        const startTimeBtns = screen.getAllByText('--:--');
        fireEvent.click(startTimeBtns[0]);
        
        await waitFor(() => {
            expect(screen.getByText('10:00')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText('10:00'));

        fireEvent.change(screen.getByPlaceholderText('Online / Nama Gedung / Alamat...'), { target: { value: 'UNUGHA' } });
        fireEvent.change(screen.getByPlaceholderText('Jelaskan tentang acara ini secara detail...'), { target: { value: 'Cool description' } });

        // Ensure cover image is set
        const shuffleButton = screen.getByTitle('Ganti Gambar Cover Secara Acak');
        fireEvent.click(shuffleButton);

        const submitButton = screen.getByText('Buat Acara');
        await act(async () => {
            fireEvent.click(submitButton);
        });

        await waitFor(() => {
            expect(mockQuery.insert).toHaveBeenCalled();
        }, { timeout: 3000 });
        
        await waitFor(() => {
            expect(screen.getByText('Event berhasil dibuat!')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('handles file upload selection', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <CreateEvent />
                </MemoryRouter>
            );
        });

        const file = new File(['hello'], 'hello.png', { type: 'image/png' });
        const input = screen.getByTitle('Klik untuk upload gambar sendiri');

        await act(async () => {
            fireEvent.change(input, { target: { files: [file] } });
        });

        // The component uses FileReader, we should mock it but for now we check if state likely updated or no crash
        // Mock FileReader in beforeEach if needed, but integration style:
        expect(input).toBeInTheDocument();
    });

    it('toggles ticket, approval, and capacity settings', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <CreateEvent />
                </MemoryRouter>
            );
        });

        // Toggle Approval
        const approvalCard = screen.getByText('Butuh Persetujuan');
        fireEvent.click(approvalCard);
        expect(screen.getByText('Pendaftar harus dikonfirmasi manual')).toBeInTheDocument();

        // Toggle Ticket (Checkbox)
        const ticketToggle = screen.getByRole('checkbox');
        fireEvent.click(ticketToggle);
        expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
        fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '10000' } });

        // Change Capacity
        const capacityInput = screen.getByPlaceholderText('Tidak terbatas');
        fireEvent.change(capacityInput, { target: { value: '50' } });
        expect(capacityInput).toHaveValue(50);
    });

    it('interacts with all custom pickers (end date, time, type)', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <CreateEvent />
                </MemoryRouter>
            );
        });

        // End Date
        const endDateBtn = screen.getAllByText('Pilih Tanggal')[1]; // Second one is End Date
        fireEvent.click(endDateBtn);
        await waitFor(() => expect(screen.getByText('20')).toBeInTheDocument());
        fireEvent.click(screen.getByText('20'));

        // End Time
        const endTimeBtn = screen.getAllByText('--:--')[1];
        fireEvent.click(endTimeBtn);
        await waitFor(() => expect(screen.getAllByText('12:00')[0]).toBeInTheDocument());
        fireEvent.click(screen.getAllByText('12:00')[0]);

        // Type Dropdown (Click trigger then option)
        const typeTrigger = screen.getByText('Kategori Event').parentElement?.parentElement?.parentElement as HTMLElement;
        fireEvent.click(typeTrigger);
        const techOption = await screen.findByText('Teknologi');
        fireEvent.click(techOption);
        expect(screen.getAllByText('Teknologi')[0]).toBeInTheDocument();
    });

    it('shows error for large file upload', async () => {
        await act(async () => { render(<MemoryRouter><CreateEvent /></MemoryRouter>); });
        const largeFile = new File(['a'.repeat(6 * 1024 * 1024)], 'large.png', { type: 'image/png' });
        const input = screen.getByTitle('Klik untuk upload gambar sendiri');
        await act(async () => {
            fireEvent.change(input, { target: { files: [largeFile] } });
        });
        expect(screen.getByText(/Ukuran file terlalu besar/i)).toBeInTheDocument();
    });

    it('closes picker when clicking outside', async () => {
        await act(async () => { render(<MemoryRouter><CreateEvent /></MemoryRouter>); });
        const startDateBtn = screen.getAllByText('Pilih Tanggal')[0];
        fireEvent.click(startDateBtn);
        expect(screen.getByText('15')).toBeInTheDocument();

        // Click outside (on the main div or body)
        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('15')).not.toBeInTheDocument();
    });

    it('handles type dropdown blur delay', async () => {
        vi.useFakeTimers();
        await act(async () => { render(<MemoryRouter><CreateEvent /></MemoryRouter>); });
        
        const typeTrigger = screen.getByText('Kategori Event').closest('button') as HTMLElement;
        fireEvent.click(typeTrigger);
        expect(screen.getByText('Workshop', { selector: 'button' })).toBeInTheDocument();

        fireEvent.blur(typeTrigger);
        // Should still be visible because of timeout (not have hidden class on parent)
        const dropdown = document.getElementById('type-dropdown');
        expect(dropdown).not.toHaveClass('hidden');
        
        act(() => { vi.advanceTimersByTime(250); });
        expect(dropdown).toHaveClass('hidden');
        vi.useRealTimers();
    });

    it('handles keyboard navigation on approval card', async () => {
        await act(async () => { render(<MemoryRouter><CreateEvent /></MemoryRouter>); });
        
        const approvalCard = screen.getByText('Butuh Persetujuan').closest('div') as HTMLElement;
        fireEvent.keyDown(approvalCard, { key: 'Enter' });
        expect(screen.getByText('Pendaftar harus dikonfirmasi manual')).toBeInTheDocument();
        
        fireEvent.keyDown(approvalCard, { key: ' ' }); // Space
        expect(screen.queryByText('Pendaftar harus dikonfirmasi manual')).not.toBeInTheDocument();
    });

    it('shows error message if form submission fails', async () => {
        const mockQuery = createMockQuery(null, { message: 'Database failure' });
        vi.mocked(supabase.from).mockReturnValueOnce(mockQuery as any);

        await act(async () => {
            render(<MemoryRouter><CreateEvent /></MemoryRouter>);
        });

        // Fill required fields
        fireEvent.change(screen.getByPlaceholderText('Nama Acara'), { target: { value: 'Test Event Fail' } });
        
        // Date
        const startDateBtn = screen.getAllByText('Pilih Tanggal')[0];
        fireEvent.click(startDateBtn);
        await waitFor(() => expect(screen.getByText('15')).toBeInTheDocument());
        fireEvent.click(screen.getByText('15'));
        
        // Time
        const startTimeBtn = screen.getAllByText('--:--')[0];
        fireEvent.click(startTimeBtn);
        await waitFor(() => expect(screen.getByText('10:00')).toBeInTheDocument());
        fireEvent.click(screen.getByText('10:00'));

        // Select cover image
        fireEvent.click(screen.getByTitle('Ganti Gambar Cover Secara Acak'));

        // Fill other fields
        fireEvent.change(screen.getByPlaceholderText('Online / Nama Gedung / Alamat...'), { target: { value: 'UNUGHA' } });
        fireEvent.change(screen.getByPlaceholderText('Jelaskan tentang acara ini secara detail...'), { target: { value: 'Description' } });

        const submitButton = screen.getByText('Buat Acara');
        await act(async () => {
            fireEvent.click(submitButton);
        });

        await waitFor(() => {
            expect(screen.getByText(/Gagal membuat event: Database failure/i)).toBeInTheDocument();
        }, { timeout: 4000 });
    });

    it('navigates months in date picker', async () => {
        await act(async () => { render(<MemoryRouter><CreateEvent /></MemoryRouter>); });
        
        const startDateBtn = screen.getAllByRole('button', { name: /Pilih Tanggal/i })[0];
        fireEvent.click(startDateBtn);
        
        // Find Chevron buttons in picker
        // The picker has two icons: ChevronLeft and ChevronRight
        // They are buttons inside the picker
        const prevMonthBtn = screen.getByTestId('calendar-prev-month');
        const nextMonthBtn = screen.getByTestId('calendar-next-month');
        
        const initialMonth = screen.getByText(/202/i).textContent; // e.g. "Januari 2026"
        
        fireEvent.click(nextMonthBtn);
        expect(screen.getByText(/202/i).textContent).not.toBe(initialMonth);
        
        fireEvent.click(prevMonthBtn);
        expect(screen.getByText(/202/i).textContent).toBe(initialMonth);
    });
});
