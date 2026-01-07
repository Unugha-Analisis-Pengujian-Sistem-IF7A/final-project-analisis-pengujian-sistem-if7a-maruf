import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BottomNavigation } from '../../App';

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock('@/context/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

describe('BottomNavigation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders navigation links for participant', () => {
        mockUseAuth.mockReturnValue({ role: 'participant' });
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <BottomNavigation />
            </MemoryRouter>
        );

        expect(screen.getByText('Beranda')).toBeInTheDocument();
        expect(screen.getByText('Kalender')).toBeInTheDocument();
        expect(screen.getByText('Explore')).toBeInTheDocument();
        expect(screen.getByText('Profil')).toBeInTheDocument();
        // Plus icon link for 'Buat' should NOT be present for participant
        expect(screen.queryByText('Buat')).not.toBeInTheDocument();
    });

    it('renders admin specific links', () => {
        mockUseAuth.mockReturnValue({ role: 'admin' });
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <BottomNavigation />
            </MemoryRouter>
        );

        expect(screen.getByText('Beranda')).toBeInTheDocument();
        expect(screen.getByText('Kalender')).toBeInTheDocument();
        expect(screen.getByText('Buat')).toBeInTheDocument();
        expect(screen.getByText('Explore')).toBeInTheDocument();
        expect(screen.getByText('Profil')).toBeInTheDocument();
    });

    it('highlights active link', () => {
        mockUseAuth.mockReturnValue({ role: 'participant' });
        const { container } = render(
            <MemoryRouter initialEntries={['/calendar']}>
                <BottomNavigation />
            </MemoryRouter>
        );

        // Check for active styles (text-indigo-600)
        const calendarLink = screen.getByText('Kalender').closest('a');
        expect(calendarLink).toHaveClass('text-indigo-600');
        
        const dashboardLink = screen.getByText('Beranda').closest('a');
        expect(dashboardLink).toHaveClass('text-slate-400');
    });
});
