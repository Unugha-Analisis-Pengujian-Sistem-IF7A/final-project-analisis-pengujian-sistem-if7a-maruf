import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button, Badge } from '@/components/UI';

describe('Button Component', () => {
  it('renders button with correct text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders primary variant by default', () => {
    // Isolate by unmounting previous or just rely on new render
    const { container } = render(<Button>Primary</Button>);
    // Use container to find the specific button rendered here to avoid interference if any leaks (though RTL usually cleans up)
    const button = screen.getByRole('button', { name: 'Primary' });
    expect(button).toHaveClass('bg-gradient-to-r');
  });

  it('renders secondary variant when specified', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button', { name: 'Secondary' });
    expect(button).toHaveClass('bg-white');
    expect(button).toHaveClass('text-indigo-600');
  });
});

describe('Badge Component', () => {
    it('renders Badge with correct styles for different statuses', () => {
        const statuses = [
            { label: 'Mendatang', class: 'bg-indigo-100' },
            { label: 'Terbuka', class: 'bg-indigo-100' },
            { label: 'Ditutup', class: 'bg-orange-100' },
            { label: 'Selesai', class: 'bg-orange-100' },
            { label: 'Draft', class: 'bg-slate-100' },
            { label: 'Unknown', class: 'bg-slate-100' }
        ];

        statuses.forEach(({ label, class: expectedClass }) => {
            const { unmount } = render(<Badge status={label} />);
            const badge = screen.getByText(label);
            expect(badge).toHaveClass(expectedClass);
            unmount();
        });
    });
});
