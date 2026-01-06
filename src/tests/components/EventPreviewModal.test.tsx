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

    it('handles keyboard navigation for accessibility', () => {
        const mockOnClose = vi.fn();
        render(
            <MemoryRouter>
                <EventPreviewModal isOpen={true} onClose={mockOnClose} event={mockEvent} />
            </MemoryRouter>
        );

        // Backdrop Escape/Enter
        const backdrop = screen.getByTestId('modal-backdrop');
        fireEvent.keyDown(backdrop, { key: 'Escape' });
        expect(mockOnClose).toHaveBeenCalled();

        // Calendar Enter
        const mockOpen = vi.fn();
        window.open = mockOpen;
        const dateSection = screen.getByTitle('Tambahkan ke Google Calendar');
        fireEvent.keyDown(dateSection, { key: 'Enter' });
        expect(mockOpen).toHaveBeenCalled();
    });

    it('shows error toast if date is invalid for calendar', () => {
        const invalidEvent = { ...mockEvent, date: 'invalid-date' };
        window.alert = vi.fn();
        
        render(
            <MemoryRouter>
                <EventPreviewModal isOpen={true} onClose={vi.fn()} event={invalidEvent} />
            </MemoryRouter>
        );

        const dateSection = screen.getByTitle('Tambahkan ke Google Calendar');
        fireEvent.click(dateSection);
        
        expect(window.alert).toHaveBeenCalledWith("Format tanggal tidak valid.");
    });

    it('renders differently for online events', () => {
        const onlineEvent = { ...mockEvent, location: 'Virtual Zoom Meeting' };
        render(
            <MemoryRouter>
                <EventPreviewModal isOpen={true} onClose={vi.fn()} event={onlineEvent} />
            </MemoryRouter>
        );

        expect(screen.getByText('Virtual')).toBeInTheDocument();
        expect(screen.getByText(/Virtual Zoom Meeting/i)).toBeInTheDocument();
    });

    it('displays user avatar and name in preparing section', async () => {
        mockUseAuth.mockReturnValue({
            user: { 
                id: '1', 
                email: 'john@example.com',
                user_metadata: { full_name: 'John Doe', avatar_url: 'https://avatar.com/john.jpg' } 
            },
            session: { user: { id: '1' } }, 
            role: 'participant',
            loading: false, 
        });

        render(
            <MemoryRouter>
                <EventPreviewModal isOpen={true} onClose={vi.fn()} event={mockEvent} />
            </MemoryRouter>
        );

        expect(await screen.findByText('John Doe')).toBeInTheDocument();
        const avatar = screen.getByAltText('Profile');
        expect(avatar).toHaveAttribute('src', 'https://avatar.com/john.jpg');
    });

    it('handles keyboard navigation for notification toggles in modal', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: '1', email: 'john@example.com' },
            session: { user: { id: '1' } }, 
            role: 'participant',
            loading: false, 
        });

        render(
            <MemoryRouter>
                <EventPreviewModal isOpen={true} onClose={vi.fn()} event={mockEvent} />
            </MemoryRouter>
        );
        
        const emailToggle = await screen.findByTestId('email-toggle');
        fireEvent.keyDown(emailToggle, { key: 'Enter' });
        expect(screen.getByText(/Pengingat dijadwalkan/i)).toBeInTheDocument();

        const waToggle = screen.getByTestId('wa-toggle');
        fireEvent.keyDown(waToggle, { key: ' ' });
        expect(screen.getByText(/Notifikasi WhatsApp aktif/i)).toBeInTheDocument();
    });

    it('handles keyboard navigation for location in modal', () => {
        render(
            <MemoryRouter>
                <EventPreviewModal isOpen={true} onClose={vi.fn()} event={{...mockEvent, location: 'Virtual Zoom'}} />
            </MemoryRouter>
        );

        const locWidget = screen.getByTitle('Buka Link Meeting');
        fireEvent.keyDown(locWidget, { key: 'Enter' });
        expect(window.open).toHaveBeenCalledWith(expect.stringContaining('zoom.us'), '_blank', expect.anything());
    });
});
