import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToastProvider, useToast } from '@/context/ToastContext';
import React from 'react';

// Helper component to use the toast
const TestComponent: React.FC = () => {
    const { showToast } = useToast();
    return (
        <div>
            <button onClick={() => showToast('Success Message', 'success')}>Show Success</button>
            <button onClick={() => showToast('Error Message', 'error')}>Show Error</button>
            <button onClick={() => showToast('Info Message', 'info')}>Show Info</button>
            <button onClick={() => showToast('Default Message')}>Show Default</button>
        </div>
    );
};

describe('ToastContext', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('renders toast provider and shows success toast', async () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        );

        const btn = screen.getByText('Show Success');
        fireEvent.click(btn);

        expect(screen.getByText('Success Message')).toBeInTheDocument();
        
        // Wait for it to disappear
        act(() => {
            vi.advanceTimersByTime(4500);
        });

        expect(screen.queryByText('Success Message')).not.toBeInTheDocument();
    });

    it('shows error and info toasts', () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText('Show Error'));
        expect(screen.getByText('Error Message')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Show Info'));
        expect(screen.getByText('Info Message')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Show Default'));
        expect(screen.getByText('Default Message')).toBeInTheDocument();
    });

    it('removes toast when close button is clicked', () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText('Show Success'));
        const toastMessage = screen.getByText('Success Message');
        expect(toastMessage).toBeInTheDocument();

        const closeButtons = screen.getAllByRole('button');
        // Index 0-3 are from TestComponent, 4+ are toasts close buttons
        fireEvent.click(closeButtons[4]);

        expect(screen.queryByText('Success Message')).not.toBeInTheDocument();
    });

    it('throws error when useToast is used outside of ToastProvider', () => {
        // Prevent console.error from cluttering the output
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        const BadComponent = () => {
            useToast();
            return null;
        };

        expect(() => render(<BadComponent />)).toThrow('useToast must be used within ToastProvider');
        
        consoleSpy.mockRestore();
    });
});
