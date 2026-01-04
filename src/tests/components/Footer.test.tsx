import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Footer } from '@/components/Footer';
import { BrowserRouter } from 'react-router-dom';

describe('Footer Component', () => {
    it('renders the "Navigasi" section', () => {
        render(
            <BrowserRouter>
              <Footer />
            </BrowserRouter>
        );
        expect(screen.getByText('Navigasi')).toBeInTheDocument();
        expect(screen.getByText('Tentang')).toBeInTheDocument();
        expect(screen.getByText('Explore')).toBeInTheDocument();
    });

    it('renders the "Unit & Lembaga" section', () => {
        render(
            <BrowserRouter>
              <Footer />
            </BrowserRouter>
        );
        expect(screen.getByText('Unit & Lembaga')).toBeInTheDocument();
        expect(screen.getByText('BEM Universitas')).toBeInTheDocument();
    });

    it('renders the big UNUGHA EVENTS text', () => {
        render(
            <BrowserRouter>
                <Footer />
            </BrowserRouter>
        );
        expect(screen.getByText('UNUGHA EVENTS')).toBeInTheDocument();
    });
});
