// Usability and Accessibility Tests for ShareModal
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ShareModal from '@/components/ShareModal';

describe('ShareModal Component', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        title: 'Amazing Event',
        url: 'https://example.com/event/123'
    };

    const originalClipboard = navigator.clipboard;
    const originalShare = navigator.share;
    const originalOpen = window.open;

    beforeEach(() => {
        // Mock clipboard
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn(),
            },
        });
        
        // Mock window.open
        window.open = vi.fn();
    });

    afterEach(() => {
        // Restore mocks
        Object.assign(navigator, { clipboard: originalClipboard });
        Object.assign(navigator, { share: originalShare });
        window.open = originalOpen;
        vi.clearAllMocks();
    });

    it('does not render when isOpen is false', () => {
        render(<ShareModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText('Undang Teman')).not.toBeInTheDocument();
    });

    it('renders correctly when open', () => {
        render(<ShareModal {...defaultProps} />);
        expect(screen.getByText('Undang Teman')).toBeInTheDocument();
        expect(screen.getByText(defaultProps.url)).toBeInTheDocument();
        // Check for presence of Bagikan buttons (at least one)
        expect(screen.getAllByText('Bagikan').length).toBeGreaterThan(0);
    });

    it('calls onClose when close button is clicked', () => {
        render(<ShareModal {...defaultProps} />);
        
        // Use the new aria-label
        const closeBtn = screen.getByLabelText('Close');
        fireEvent.click(closeBtn);
        
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('copies to clipboard when Copy button is clicked', async () => {
        render(<ShareModal {...defaultProps} />);
        const copyBtn = screen.getByText('Salin'); // Original button text
        fireEvent.click(copyBtn);
        
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(defaultProps.url);
        expect(await screen.findByText('Disalin')).toBeInTheDocument();
    });

    it('opens social share links', () => {
        render(<ShareModal {...defaultProps} />);
        
        // Facebook is the first 'Bagikan'
        screen.getAllByText('Bagikan');
        // const facebookBtn = shareButtons[0];  <-- Referenced in comment but variable unused
        
        // We test one unique button like Tweet to ensure window.open called
        const tweetBtn = screen.getByText('Tweet');
        fireEvent.click(tweetBtn);
        
        expect(window.open).toHaveBeenCalledWith(
            expect.stringContaining('twitter.com/intent/tweet'),
            '_blank',
            'noopener,noreferrer'
        );
    });

    it('uses navigator.share if available when clicking native share', async () => {
        const mockShare = vi.fn();
        Object.assign(navigator, { share: mockShare });
        
        render(<ShareModal {...defaultProps} />);
        
        const shareBtns = screen.getAllByText('Bagikan');
        const nativeShareBtn = shareBtns[shareBtns.length - 1]; // Last one is the native share
        
        await fireEvent.click(nativeShareBtn);
        expect(mockShare).toHaveBeenCalledWith({
            title: defaultProps.title,
            url: defaultProps.url
        });
    });

    it('opens other social sharing links', () => {
        render(<ShareModal {...defaultProps} />);
        
        // Facebook (Label is 'Bagikan')
        const shareBtns = screen.getAllByText('Bagikan');
        fireEvent.click(shareBtns[0].closest('button')!);
        expect(window.open).toHaveBeenCalledWith(expect.stringContaining('facebook.com'), '_blank', 'noopener,noreferrer');

        // LinkedIn (Label is 'Pos')
        fireEvent.click(screen.getByText('Pos').closest('button')!);
        expect(window.open).toHaveBeenCalledWith(expect.stringContaining('linkedin.com'), '_blank', 'noopener,noreferrer');

        // Mail (Label is 'Surel')
        fireEvent.click(screen.getByText('Surel').closest('button')!);
        expect(window.open).toHaveBeenCalledWith(expect.stringContaining('mailto:'), '_self');

        // SMS
        fireEvent.click(screen.getByText('Pesan Teks').closest('button')!);
        expect(window.open).toHaveBeenCalledWith(expect.stringContaining('sms:'), '_blank', 'noopener,noreferrer');
    });

    it('falls back to copy if navigator.share fails or not available', async () => {
        delete navigator.share;
        render(<ShareModal {...defaultProps} />);
        
        const shareBtns = screen.getAllByText('Bagikan');
        const nativeShareBtn = shareBtns[shareBtns.length - 1];
        
        fireEvent.click(nativeShareBtn);
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(defaultProps.url);
    });
});
