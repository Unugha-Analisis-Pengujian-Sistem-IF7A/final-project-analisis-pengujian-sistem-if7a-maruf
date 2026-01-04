import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';
import * as AuthContext from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

// Mock Pages - Render simplified versions
vi.mock('../pages/Landing', () => ({ default: () => <div data-testid="landing-page">Landing Page</div> }));
vi.mock('../pages/Login', () => ({ default: () => <div data-testid="login-page">Login Page</div> }));
vi.mock('../pages/Dashboard', () => ({ default: () => <div data-testid="dashboard-page">Dashboard Page</div> }));
vi.mock('../pages/CreateEvent', () => ({ default: () => <div data-testid="create-event-page">Create Event Page</div> }));
vi.mock('../pages/EventDetail', () => ({ default: () => <div data-testid="event-detail-page">Event Detail Page</div> }));
vi.mock('../pages/Discover', () => ({ default: () => <div data-testid="discover-page">Discover Page</div> }));
vi.mock('../pages/CalendarPage', () => ({ default: () => <div data-testid="calendar-page">Calendar Page</div> }));

vi.mock('../pages/ProfileSettings', () => ({ default: () => <div data-testid="profile-settings-page">Profile Settings Page</div> }));
vi.mock('../pages/UserManagement', () => ({ default: () => <div data-testid="user-management-page">User Management Page</div> }));

// Define mocks using vi.hoisted to ensure they are available to the mock factory
const { 
    mockSelect, 
    mockInsert, 
    mockUpdate, 
    mockDelete, 
    mockEq, 
    mockOrder, 
    mockLimit, 
    mockSingle 
} = vi.hoisted(() => ({
    mockSelect: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
    mockDelete: vi.fn(),
    mockEq: vi.fn(),
    mockOrder: vi.fn(),
    mockLimit: vi.fn(),
    mockSingle: vi.fn(),
}));

// Chainable mock builder
const createChainableMock = () => {
    const chain: any = {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
        single: mockSingle,
    };

    // Standard Chaining
    mockSelect.mockReturnValue(chain);
    mockEq.mockReturnValue(chain);
    mockOrder.mockReturnValue(chain);
    mockInsert.mockReturnValue(chain);
    mockUpdate.mockReturnValue(chain);
    mockDelete.mockReturnValue(chain);
    
    // Make the chain itself thenable
    chain.then = (resolve: any) => resolve({ data: [], error: null });

    return chain;
};

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(), 
  },
}));

vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }: any) => <>{children}</>,
  useAuth: vi.fn(),
}));

describe('App Integration', () => {
    const mockAuth = {
        user: null,
        role: 'participant',
        signOut: vi.fn(),
        signIn: vi.fn(),
        signUp: vi.fn(),
        session: null,
        loading: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        window.history.pushState({}, 'Test', '/');
        
        // Setup Supabase Mock
        const mockChain = createChainableMock();
        (supabase.from as any).mockReturnValue(mockChain);
        
        // Defaults
        mockLimit.mockResolvedValue({ data: [], error: null });
        mockSingle.mockResolvedValue({ data: null, error: null });
        
        // Window mocks
        window.open = vi.fn();
    });
    
    afterEach(() => {
        vi.useRealTimers();
    });

    const setupAuth = (overrides = {}) => {
        vi.mocked(AuthContext.useAuth).mockReturnValue({ ...mockAuth, ...overrides } as any);
    };

    it('renders landing page by default (public layout)', async () => {
        setupAuth();
        await act(async () => {
            render(<App />);
        });
        expect(screen.getByTestId('landing-page')).toBeInTheDocument();
        expect(screen.getByText('UNUGHA Events')).toBeInTheDocument();
        
        vi.useFakeTimers();
        await act(async () => {
             vi.advanceTimersByTime(2000);
        });
    });

    it('renders login page on /login', async () => {
        setupAuth();
        window.history.pushState({}, 'Test', '/login');
        await act(async () => {
            render(<App />);
        });
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('renders discover page on /discover', async () => {
         setupAuth();
         window.history.pushState({}, 'Test', '/discover');
         await act(async () => {
             render(<App />);
         });
         expect(screen.getByTestId('discover-page')).toBeInTheDocument();
    });

    it('renders dashboard page when logged in and navigating to /dashboard', async () => {
         setupAuth({ user: { id: '123', email: 'test@example.com' } });
         window.history.pushState({}, 'Test', '/dashboard');

         await act(async () => {
             render(<App />);
         });

         expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
         // Check for Search bar presence which indicates DashboardNavbar
         expect(screen.getByPlaceholderText('Cari event...')).toBeInTheDocument();
    });

    it('switches to dashboard layout when logged in user visits public page (not landing)', async () => {
        setupAuth({ user: { id: '123', email: 'test@example.com' } });
        window.history.pushState({}, 'Test', '/discover');

        await act(async () => {
            render(<App />);
        });

        expect(screen.getByTestId('discover-page')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Cari event...')).toBeInTheDocument();
    });

    it('handles user menu interactions', async () => {
        setupAuth({ 
            user: { id: '123', email: 'user@test.com', user_metadata: { full_name: 'Test User' } } 
        });
        window.history.pushState({}, 'Test', '/dashboard');

        await act(async () => {
            render(<App />);
        });

        // Click user menu button
        const userMenuBtn = screen.getByText('Test User').closest('button');
        await act(async () => {
            fireEvent.click(userMenuBtn!);
        });
        
        const settingsLink = screen.getByText('Pengaturan Profil');
        expect(settingsLink).toBeInTheDocument();
        
        // Test Clicking Logout
        // Need to reopen menu if settings link navigation closes it? 
        // Settings link is Link. It navigates.
        // Let's just click Logout directly on the open menu
        const logoutBtn = screen.getByText('Keluar Aplikasi');
        await act(async () => {
             fireEvent.click(logoutBtn);
        });
        
        expect(mockAuth.signOut).toHaveBeenCalled();
    });

    it('handles notifications: fetch, mark read, mark all read', async () => {
        const mockNotifs = [
            { id: '1', title: 'Test 1', message: 'Msg 1', is_read: false, created_at: new Date().toISOString() },
            { id: '2', title: 'Test 2', message: 'Msg 2', is_read: false, created_at: new Date().toISOString(), action_url: 'http://external.com' }
        ];

        mockLimit.mockResolvedValue({ data: mockNotifs, error: null });

        setupAuth({ user: { id: '123', email: 'user@test.com' } });
        window.history.pushState({}, 'Test', '/dashboard');

        await act(async () => {
             render(<App />);
        });

        // Wait for notification button and data fetch
        await waitFor(() => {
             expect(screen.getByTestId('notif-btn')).toBeInTheDocument();
             expect(mockLimit).toHaveBeenCalled();
        });

        const notifBtn = screen.getByTestId('notif-btn');
        await act(async () => {
             fireEvent.click(notifBtn);
        });
        
        expect(screen.getByText('Notifikasi')).toBeInTheDocument();
        expect(screen.getByText('Test 1')).toBeInTheDocument();

        // 1. Test clicking a notification item (Mark As Read + External Link)
        const itemTitle = screen.getByText('Test 2');
        await act(async () => {
             fireEvent.click(itemTitle);
        });
        
        await waitFor(() => {
            // Note: window.open might be blocked or tricky, but we mocked it.
            expect(mockUpdate).toHaveBeenCalledWith({ is_read: true });
        });

        // Dropdown closes after clicking link, so we need to reopen it
        await act(async () => {
             fireEvent.click(notifBtn);
        });

        // 2. Test Mark All Read
        const markAllBtn = screen.getByText('Tandai semua dibaca');
        await act(async () => {
             fireEvent.click(markAllBtn);
        });
        
        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith({ is_read: true });
        });
    });

    it('handles public navbar logout (mobile menu)', async () => {
        setupAuth({ user: { id: '123' } });
        await act(async () => { render(<App />); });
        
        // Open mobile menu
        const toggleBtn = screen.getByLabelText('Toggle Mobile Menu');
        fireEvent.click(toggleBtn);
        
        // Click Logout
        const logoutBtn = screen.getByText('Keluar', { selector: 'button' });
        await act(async () => {
            fireEvent.click(logoutBtn);
        });
        expect(mockAuth.signOut).toHaveBeenCalled();
    });

    it('handles notification click with internal action_url', async () => {
        const mockNotifs = [
            { id: '3', title: 'Internal', message: 'Go to Discover', is_read: false, action_url: '/discover' }
        ];
        mockLimit.mockResolvedValue({ data: mockNotifs, error: null });
        setupAuth({ user: { id: '123' } });
        window.history.pushState({}, 'Test', '/dashboard');
        
        await act(async () => { render(<App />); });
        await act(async () => { fireEvent.click(screen.getByTestId('notif-btn')); });
        
        const notifItem = screen.getByText('Internal');
        fireEvent.click(notifItem);
        
        await waitFor(() => {
            expect(window.location.pathname).toBe('/discover');
        });
    });

    it('closes menus when clicking outside', async () => {
        setupAuth({ user: { id: '123', user_metadata: { full_name: 'Outside User' } } });
        window.history.pushState({}, 'Test', '/dashboard');
        await act(async () => { render(<App />); });
        
        // Open User Menu
        fireEvent.click(screen.getByText('Outside User'));
        expect(screen.getByText('Keluar Aplikasi')).toBeInTheDocument();
        
        // Click outside
        fireEvent.mouseDown(document.body);
        await waitFor(() => {
            expect(screen.queryByText('Keluar Aplikasi')).not.toBeInTheDocument();
        });
    });

    it('handles realtime notification INSERT', async () => {
        let callback: any;
        vi.mocked(supabase.channel).mockReturnValue({
            on: vi.fn().mockImplementation((_event, _filter, cb) => {
                callback = cb;
                return { subscribe: vi.fn() };
            }),
            subscribe: vi.fn()
        } as any);

        setupAuth({ user: { id: '123' } });
        
        // Mock Notification constructor
        const mockNotificationInstance = {
            close: vi.fn(),
            onclick: null as any
        }; // eslint-disable-line @typescript-eslint/no-explicit-any

        const mockNotificationCtor = vi.fn().mockImplementation(function () {
            return mockNotificationInstance;
        });
        vi.stubGlobal('Notification', mockNotificationCtor);
        (mockNotificationCtor as any).permission = 'granted';

        window.history.pushState({}, 'Test', '/dashboard');
        await act(async () => { render(<App />); });
        
        // Wait for it to subscribe and set callback
        await waitFor(() => {
            if (!callback) throw new Error('Callback not yet set');
            expect(callback).toBeDefined();
        });

        // Trigger realtime insert
        await act(async () => {
            callback({ new: { id: 'new-1', title: 'New Notif', message: 'Hello', action_url: 'http://link.com' } });
        });

        await waitFor(() => {
            expect(mockNotificationCtor).toHaveBeenCalledWith('New Notif', expect.any(Object));
            expect(mockNotificationInstance.onclick).toBeInstanceOf(Function);
        });
        
        // Test notification click
        await act(async () => {
            mockNotificationInstance.onclick();
        });
        expect(window.open).toHaveBeenCalledWith('http://link.com', '_blank', 'noopener,noreferrer');
    });
});
