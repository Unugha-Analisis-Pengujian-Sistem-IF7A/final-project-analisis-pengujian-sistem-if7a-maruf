
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CalendarPage from '@/pages/CalendarPage';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';

const { createMockQuery } = vi.hoisted(() => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockQuery: (data: any = [], error: any = null) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const query: any = {
                select: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                then: (onfulfilled?: (value: any) => any) => {
                     return Promise.resolve({ data, error }).then(onfulfilled);
                }
            };
            return query;
        }
    };
});

vi.mock('@/services/supabaseClient', () => ({
    supabase: {
        from: vi.fn(() => createMockQuery([])),
    },
    getStorageUrl: vi.fn((path) => path ? path : null),
}));

// Mock ToastContext
const mockShowToast = vi.fn();
vi.mock('@/context/ToastContext', () => ({
    useToast: () => ({ showToast: mockShowToast }),
}));

// Mock EventPreviewModal since it's tested separately
vi.mock('@/components/EventPreviewModal', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: ({ isOpen, onClose, event }: any) => isOpen ? (
        <div data-testid="event-modal">
            <button data-testid="modal-close" onClick={onClose}>Close</button>
            <span>{event.title}</span>
        </div>
    ) : null,
}));

// Also mock relative path to be safe
vi.mock('../../components/EventPreviewModal', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: ({ isOpen, onClose, event }: any) => isOpen ? (
        <div data-testid="event-modal">
            <button data-testid="modal-close" onClick={onClose}>Close</button>
            <span>{event.title}</span>
        </div>
    ) : null,
}));

describe('CalendarPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders calendar header and grid', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <CalendarPage />
                </MemoryRouter>
            );
        });

        expect(screen.getByText('Kalender Kegiatan')).toBeInTheDocument();
        const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        days.forEach(d => expect(screen.getByText(d)).toBeInTheDocument());
    });

    it('fetches and displays events', async () => {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        const mockEvents = [
            {
                id: '1',
                title: 'Meeting Penting',
                date: dateStr,
                time: '10:00:00',
                is_public: true
            }
        ];

        const mockQuery = createMockQuery(mockEvents);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <CalendarPage />
                </MemoryRouter>
            );
        });

        await waitFor(() => {
            expect(screen.getByText('Meeting Penting')).toBeInTheDocument();
        });
        expect(screen.getByText('10:00')).toBeInTheDocument();
    });

    it('navigates to previous and next month', async () => {
        const mockQuery = createMockQuery([]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <CalendarPage />
                </MemoryRouter>
            );
        });

        const prevBtn = screen.getAllByRole('button')[0]; // ChevronLeft
        const nextBtn = screen.getAllByRole('button')[1]; // ChevronRight

        // Initial fetch
        expect(mockQuery.gte).toHaveBeenCalledTimes(1);

        await act(async () => {
            fireEvent.click(prevBtn);
        });
        
        // Should fetch again
        expect(mockQuery.gte).toHaveBeenCalledTimes(2);

        await act(async () => {
            fireEvent.click(nextBtn);
        });

        // Should fetch again (3 times total)
        expect(mockQuery.gte).toHaveBeenCalledTimes(3);
    });

    it('opens modal when clicking event', async () => {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        const mockEvents = [
            {
                id: '1',
                title: 'Event Clickable',
                date: dateStr,
                time: '12:00:00',
                is_public: true
            }
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(supabase.from).mockImplementation(() => createMockQuery(mockEvents) as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <CalendarPage />
                </MemoryRouter>
            );
        });

        // Use findByTitle because the div has title={ev.title}
        const eventEl = await screen.findByTitle('Event Clickable');
        
        await act(async () => {
             fireEvent.click(eventEl);
        });

        await waitFor(() => {
             expect(screen.getByTestId('event-modal')).toBeInTheDocument();
        }, { timeout: 3000 });
        
        const modal = screen.getByTestId('event-modal');
        expect(modal).toHaveTextContent('Event Clickable');
        
        await act(async () => {
            fireEvent.click(screen.getByTestId('modal-close'));
        });
        
        await waitFor(() => {
            expect(screen.queryByTestId('event-modal')).not.toBeInTheDocument();
        });
    });
});
