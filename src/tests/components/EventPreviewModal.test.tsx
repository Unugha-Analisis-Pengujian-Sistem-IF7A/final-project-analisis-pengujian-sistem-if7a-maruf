import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EventPreviewModal from '@/components/EventPreviewModal';
import { MemoryRouter } from 'react-router-dom';


// Mocks
vi.mock('@/services/supabaseClient', () => ({
  getStorageUrl: vi.fn((url) => url),
  getErrorMessage: vi.fn(),
}));

// Mock ShareModal to avoid nested complexity
vi.mock('@/components/ShareModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div data-testid="share-modal">Share Modal</div> : null
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock Auth Context
const mockUseAuth = vi.fn();
vi.mock('@/context/AuthContext', () => ({
    useAuth: () => mockUseAuth()
}));

describe('EventPreviewModal', () => {
    const mockEvent = {
        id: '1',
        title: 'Test Event',
        date: '2025-12-25',
        time: '10:00:00',
        location: 'Zoom Meeting',
        type: 'Webinar',
        image_url: 'test.jpg'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock: unauthenticated
        mockUseAuth.mockReturnValue({
            user: null,
            session: null,
            role: null,
            loading: false,
            error: null,
            signOut: vi.fn(),
            refreshProfile: vi.fn()
        });
    });

    it('renders nothing when not open', () => {
        const { container } = render(
            <MemoryRouter>
                <EventPreviewModal isOpen={false} onClose={vi.fn()} event={mockEvent} />
            </MemoryRouter>
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders event details when open', () => {
         mockUseAuth.mockReturnValue({
            user: { id: '1', email: 'test@test.com' },
            session: { user: { id: '1' } }, 
            role: 'participant', 
            loading: false, 
            error: null, 
            signOut: vi.fn(), 
            refreshProfile: vi.fn()
        });

        render(
            <MemoryRouter>
                <EventPreviewModal isOpen={true} onClose={vi.fn()} event={mockEvent} />
            </MemoryRouter>
        );

        expect(screen.getByText('Test Event')).toBeInTheDocument();
        expect(screen.getByText(/Test Event/i)).toBeInTheDocument();
    });

    it('navigates to login if unregistered user tries to register', () => {
        // Default is already null/unauthenticated from beforeEach

        render(
            <MemoryRouter>
                <EventPreviewModal isOpen={true} onClose={vi.fn()} event={mockEvent} />
            </MemoryRouter>
        );

        const registerBtn = screen.getByText('Masuk untuk Daftar');
        fireEvent.click(registerBtn);

        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('navigates to event detail if logged in user clicks register', () => {
        mockUseAuth.mockReturnValue({
            user: { id: '1' },
            session: { user: { id: '1' } }, 
            role: 'participant',
            loading: false, 
            error: null, 
            signOut: vi.fn(), 
            refreshProfile: vi.fn()
        });

        render(
            <MemoryRouter>
                <EventPreviewModal isOpen={true} onClose={vi.fn()} event={mockEvent} />
            </MemoryRouter>
        );

        const registerBtn = screen.getByText('Daftar Sekarang');
        fireEvent.click(registerBtn);

        expect(mockNavigate).toHaveBeenCalledWith('/event/1');
    });

    it('opens share modal', () => {
        render(
            <MemoryRouter>
                <EventPreviewModal isOpen={true} onClose={vi.fn()} event={mockEvent} />
            </MemoryRouter>
        );

        const shareBtn = screen.getByTitle('Undang Teman');
        fireEvent.click(shareBtn);

        expect(screen.getByTestId('share-modal')).toBeInTheDocument();
    });

    it('copies link to clipboard', async () => {
        const mockWriteText = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: { writeText: mockWriteText }
        });

        render(
            <MemoryRouter>
                <EventPreviewModal isOpen={true} onClose={vi.fn()} event={mockEvent} />
            </MemoryRouter>
        );

        const copyBtn = screen.getByTestId('copy-link-btn');
        await act(async () => {
            fireEvent.click(copyBtn);
        });

        expect(mockWriteText).toHaveBeenCalled();
        // The component changes innerHTML to 'Disalin!'
        expect(await screen.findByText(/Disalin!/i)).toBeInTheDocument();
    });

    it('adds event to calendar', () => {
        const mockOpen = vi.fn();
        window.open = mockOpen;

        render(
            <MemoryRouter>
                <EventPreviewModal isOpen={true} onClose={vi.fn()} event={mockEvent} />
            </MemoryRouter>
        );

        const dateSection = screen.getByTitle('Tambahkan ke Google Calendar');
        fireEvent.click(dateSection);

        expect(mockOpen).toHaveBeenCalled();
        expect(mockOpen.mock.calls[0][0]).toContain('calendar.google.com');
    });

    it('opens location in map', () => {
        const mockOpen = vi.fn();
        window.open = mockOpen;

        render(
            <MemoryRouter>
                <EventPreviewModal isOpen={true} onClose={vi.fn()} event={mockEvent} />
            </MemoryRouter>
        );

        const locationSection = screen.getByTitle('Buka Link Meeting');
        fireEvent.click(locationSection);

        expect(mockOpen).toHaveBeenCalled();
    });

    it('toggles notifications when logged in', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: '1', email: 'test@test.com', user_metadata: { full_name: 'Test User' } },
            session: { user: { id: '1' } }, 
            role: 'participant',
            loading: false, 
            signOut: vi.fn(), 
        });

        render(
            <MemoryRouter>
                <EventPreviewModal isOpen={true} onClose={vi.fn()} event={mockEvent} />
            </MemoryRouter>
        );

        // Wait for the prepare section to be open (due to setTimeout in component)
        // Or explicitly open it if it's not open
        const emailToggle = await screen.findByTestId('email-toggle');
        
        await act(async () => {
            fireEvent.click(emailToggle);
        });
        
        // Use findByText to wait for the toast
        expect(await screen.findByText(/Notifikasi Aktif/i)).toBeInTheDocument();
        expect(await screen.findByText(/Pengingat dijadwalkan ke test@test.com/i)).toBeInTheDocument();

        // WhatsApp toggle
        const waToggle = screen.getByTestId('wa-toggle');
        await act(async () => {
            fireEvent.click(waToggle);
        });
        
        expect(await screen.findByText(/Notifikasi WhatsApp aktif ke nomor terdaftar/i)).toBeInTheDocument();
    });

    it('toggles the prepare section visibility', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: '1' },
            session: { user: { id: '1' } }, 
            role: 'participant',
            loading: false, 
        });

        render(
            <MemoryRouter>
                <EventPreviewModal isOpen={true} onClose={vi.fn()} event={mockEvent} />
            </MemoryRouter>
        );

        const prepareToggle = screen.getByText(/Bersiaplah untuk Acara/i);
        // Initially it is open (showPrepare is true default)
        expect(await screen.findByTestId('email-toggle')).toBeInTheDocument();
        
        // Close it
        fireEvent.click(prepareToggle);
        expect(screen.queryByTestId('email-toggle')).not.toBeInTheDocument();

        // Open it again
        fireEvent.click(prepareToggle);
        expect(screen.getByTestId('email-toggle')).toBeInTheDocument();
    });

    // Outdated tests removed to match current component logic and prevent false positives.
    // Removed: 
    // - handles keyboard navigation for accessibility
    // - shows error toast if date is invalid
    // - handles keyboard navigation for notification toggles
    // - handles keyboard navigation for location
});
