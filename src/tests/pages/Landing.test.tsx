import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Landing from '@/pages/Landing';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';

// Mock Supabase
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
  getErrorMessage: vi.fn((err) => err.message || 'Error'),
}));

describe('Landing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders hero section text', () => {
    // Basic render without async logic interfering
    vi.mocked(supabase.auth.getSession).mockImplementation(() => new Promise(() => {}));
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn() } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    act(() => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );
    });

    expect(screen.getByText('Platform Event Kampus #1')).toBeInTheDocument();
    expect(screen.getByText('Acara seru', { exact: false })).toBeInTheDocument();
  });

  it('shows system online status when connection checks pass', async () => {
    // Mock Success
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ error: null } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const mockSelect = vi.fn().mockResolvedValue({ error: null, count: 5 });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    act(() => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );
    });

    // Initial state
    expect(screen.getByText('Connecting...')).toBeInTheDocument();

    // After async
    await waitFor(() => {
        expect(screen.getByText('System Online')).toBeInTheDocument();
    });
  });

    it('shows debug diagnostic on click', async () => {
        // Mock Success for this specific test
        vi.mocked(supabase.auth.getSession).mockResolvedValue({ error: null } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        const mockSelect = vi.fn().mockResolvedValue({ error: null, count: 5 });
        vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        act(() => {
            render(<MemoryRouter><Landing /></MemoryRouter>);
        });

        // Wait for System Online to appear
        await waitFor(() => expect(screen.getByText('System Online')).toBeInTheDocument());

        // Click system online button to show debug
        const debugBtn = screen.getByText('System Online');
        await act(async () => {
            fireEvent.click(debugBtn);
        });

        expect(screen.getByText('System Diagnostic')).toBeInTheDocument();
        
        // Hide it
        const closeBtn = screen.getByText('×');
        await act(async () => {
            fireEvent.click(closeBtn);
        });
        expect(screen.queryByText('System Diagnostic')).not.toBeInTheDocument();
    });

  it('shows warning if table missing', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ error: null } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const mockSelect = vi.fn().mockResolvedValue({ error: { code: '42P01' }, count: null });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    act(() => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );
    });

    await waitFor(() => expect(screen.getByText('Connection Issue')).toBeInTheDocument());
    
    // Check detailed message in debug via button click (if visible) or implicitly
    // The button color logic:
    // warning = bg-yellow-500
    const statusBtn = screen.getByText('Connection Issue').closest('button');
    expect(statusBtn).toHaveClass('bg-yellow-500/90');
  });

  it('shows error on network failure', async () => {
    vi.mocked(supabase.auth.getSession).mockRejectedValue(new Error('Network Error'));
    
    act(() => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );
    });

    await waitFor(() => expect(screen.getByText('Connection Issue')).toBeInTheDocument());
    const statusBtn = screen.getByText('Connection Issue').closest('button');
    expect(statusBtn).toHaveClass('bg-red-500/90');
  });

  it('shows special message for network failure mapping', async () => {
    vi.mocked(supabase.auth.getSession).mockRejectedValue(new Error('Koneksi ke server gagal'));
    
    act(() => {
        render(<MemoryRouter><Landing /></MemoryRouter>);
    });

    await waitFor(() => expect(screen.getByText('Connection Issue')).toBeInTheDocument());
    
    // Check message inside debug
    fireEvent.click(screen.getByText('Connection Issue'));
    expect(screen.getByText(/Matikan AdBlocker/i)).toBeInTheDocument();
  });

  it('runs the typewriter animation', async () => {
    vi.useFakeTimers();
    act(() => {
        render(<MemoryRouter><Landing /></MemoryRouter>);
    });
    
    // Advance time to allow typewriter to run
    await act(async () => {
        vi.advanceTimersByTime(2000);
    });
    
    // The text should have changed from empty to something
    expect(screen.getByText(/dimulai/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('covers the case of unexpected database error (branch not 42P01)', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ error: null } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    vi.mocked(supabase.from).mockReturnValue({ 
        select: vi.fn().mockResolvedValue({ 
            error: { code: 'OTHER', message: 'Strange Error' }, 
            count: null 
        }) 
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    await act(async () => {
        render(<MemoryRouter><Landing /></MemoryRouter>);
    });

    await waitFor(() => expect(screen.getByText('Connection Issue')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Connection Issue'));
    expect(screen.getByText(/Strange Error/i)).toBeInTheDocument();
  });

  it('covers full typewriter lifecycle (typing, pausing, deleting)', async () => {
    vi.useFakeTimers();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ error: null } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    
    await act(async () => {
        render(<MemoryRouter><Landing /></MemoryRouter>);
    });

    // 1. Typing phase: Advance till first word finished ("di sini.")
    // "di sini." has 8 chars. ~150ms per char.
    for (let i = 0; i < 15; i++) {
        await act(async () => { vi.advanceTimersByTime(200); });
    }
    expect(screen.getByText('di sini.')).toBeInTheDocument();
    
    // 2. Pause phase: Hit line 90-91
    await act(async () => { vi.advanceTimersByTime(2500); });

    // 3. Deleting phase: Hit line 86
    // It should be deleting now.
    for (let i = 0; i < 15; i++) {
        await act(async () => { vi.advanceTimersByTime(100); });
    }
    // After deletion, text should be empty or partial. 
    // Since we ran enough deletion steps, it should be empty or close to it.
    // The component renders text inline. If empty, the span might be empty.
    
    // 4. Reset phase: Hit line 93-95
    // After finishing deleting, it resets to next word.
    await act(async () => { vi.advanceTimersByTime(1000); });
    
    // Should start typing next word: "sekarang."
    // Minimal assertion that previous word is gone and *some* text is likely there or process continued
    expect(screen.queryByText('di sini.')).not.toBeInTheDocument();
    
    vi.useRealTimers();
  });
});
