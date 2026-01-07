// Unit Tests for Landing Page
import { render, screen, act } from '@testing-library/react';
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

// Mock ToastContext (if used, though Landing doesn't seem to use it, good practice to match env)
vi.mock('@/context/ToastContext', () => ({
    useToast: () => ({ showToast: vi.fn() }),
}));

describe('Landing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock crypto for typewriter logic
    Object.defineProperty(global, 'crypto', {
      value: {
        getRandomValues: (arr: Uint32Array) => {
          for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 0xFFFFFFFF);
          return arr;
        }
      },
      configurable: true
    });
  });

  it('renders hero section text', () => {
    // Basic render without async logic interfering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(supabase.auth.getSession).mockImplementation(() => new Promise(() => {}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(supabase.from).mockReturnValue({ select: vi.fn() } as any); 

    act(() => {
        render(
            <MemoryRouter>
                <Landing />
            </MemoryRouter>
        );
    });

    expect(screen.getByText('Platform Event Kampus #1')).toBeInTheDocument();
    expect(screen.getByText('Acara seru', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Buat Acara Pertama')).toBeInTheDocument();
    expect(screen.getByText('Jelajahi Event')).toBeInTheDocument();
  });

  it('runs the typewriter animation', async () => {
    vi.useFakeTimers();
    // Deterministic random mock
    const cryptoMock = {
        getRandomValues: (arr: Uint32Array) => {
            for (let i = 0; i < arr.length; i++) arr[i] = 0; // randomFloat will be 0, delta 150
            return arr;
        }
    };
    Object.defineProperty(global, 'crypto', { value: cryptoMock, configurable: true });
    if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'crypto', { value: cryptoMock, configurable: true });
    }

    act(() => {
        render(<MemoryRouter><Landing /></MemoryRouter>);
    });
    
    // Advance in steps to be safe
    for (let i = 0; i < 20; i++) {
        act(() => {
            vi.advanceTimersByTime(150);
        });
    }
    
    expect(screen.getByText(/di sini/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('covers full typewriter lifecycle (typing, pausing, deleting)', async () => {
    vi.useFakeTimers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ error: null } as any);
    
    await act(async () => {
        render(<MemoryRouter><Landing /></MemoryRouter>);
    });

    // 1. Typing phase: Advance till first word finished ("di sini.")
    // "di sini." has 8 chars. ~150ms per char.
    for (let i = 0; i < 15; i++) {
        await act(async () => { vi.advanceTimersByTime(200); });
    }
    expect(screen.getByText('di sini.')).toBeInTheDocument();
    
    // 2. Pause phase
    await act(async () => { vi.advanceTimersByTime(2500); });

    // 3. Deleting phase
    // It should be deleting now.
    for (let i = 0; i < 15; i++) {
        await act(async () => { vi.advanceTimersByTime(100); });
    }
    
    // 4. Reset phase
    await act(async () => { vi.advanceTimersByTime(1000); });
    
    // Should start typing next word or have cleared
    expect(screen.queryByText('di sini.')).not.toBeInTheDocument();
    
    vi.useRealTimers();
  });
});
