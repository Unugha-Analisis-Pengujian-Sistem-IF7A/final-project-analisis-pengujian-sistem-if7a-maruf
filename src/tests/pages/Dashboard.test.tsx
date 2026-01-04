
// Unit Tests for Dashboard Page
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '@/pages/Dashboard';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// Mock Sub-Dashboards
vi.mock('@/pages/dashboard/AdminDashboard', () => ({
    AdminDashboard: () => <div data-testid="admin-dashboard">Admin Dashboard</div>
}));
vi.mock('@/pages/dashboard/ParticipantDashboard', () => ({
    ParticipantDashboard: () => <div data-testid="participant-dashboard">Participant Dashboard</div>
}));

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
    useAuth: vi.fn(),
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

describe('Dashboard Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows loader when loading', async () => {
        vi.mocked(useAuth).mockReturnValue({ loading: true, user: null, role: null } as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        // Search for loader class or component if mocked, but here it renders a div with class
        // We can check if dashboard components are NOT present
        expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument();
        // Or check for spinner container
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });

    it('redirects to login if not authenticated', async () => {
        vi.mocked(useAuth).mockReturnValue({ loading: false, user: null, role: null } as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('renders AdminDashboard for admin role', async () => {
        vi.mocked(useAuth).mockReturnValue({ loading: false, user: { id: '1' }, role: 'admin' } as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
    });

    it('renders ParticipantDashboard for organizer role (since OrganizerDashboard removed)', async () => {
        vi.mocked(useAuth).mockReturnValue({ loading: false, user: { id: '2' }, role: 'organizer' } as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        expect(screen.getByTestId('participant-dashboard')).toBeInTheDocument();
    });

    it('renders ParticipantDashboard for participant role (default)', async () => {
        vi.mocked(useAuth).mockReturnValue({ loading: false, user: { id: '3' }, role: 'participant' } as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        expect(screen.getByTestId('participant-dashboard')).toBeInTheDocument();
    });
    
    it('renders ParticipantDashboard for unknown role (fallback)', async () => {
        vi.mocked(useAuth).mockReturnValue({ loading: false, user: { id: '4' }, role: 'unknown' } as any);

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        expect(screen.getByTestId('participant-dashboard')).toBeInTheDocument();
    });
});
